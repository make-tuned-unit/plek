import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';
import { photoService } from '../services/photoService';
import { calculateDistance } from '../utils/distance';

// Types for property data
interface PropertyData {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  hourly_rate: number;
  property_type: string;
  max_vehicles: number;
  features?: string[];
  restrictions?: string[];
  access_instructions?: string;
  instant_booking: boolean;
  require_approval: boolean;
}

interface PropertyPhoto {
  property_id: string;
  url: string;
  caption?: string;
  is_primary: boolean;
  order_index: number;
}

// Get all properties (public)
export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    
    // Get query parameters for filtering
    const { city, state, min_price, max_price, property_type, lat, lng, radius } = req.query;
    
    let query = supabase
      .from('properties')
      .select(`
        *,
        host:users!properties_host_id_fkey(first_name, last_name, rating, review_count),
        photos:property_photos(url, caption, is_primary, order_index)
      `)
      .eq('status', 'active');
    
    // Apply filters
    if (city) query = query.eq('city', city as string);
    if (state) query = query.eq('state', state as string);
    if (property_type) query = query.eq('property_type', property_type as string);
    if (min_price) query = query.gte('hourly_rate', parseFloat(min_price as string));
    if (max_price) query = query.lte('hourly_rate', parseFloat(max_price as string));
    
    const { data: properties, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Sort photos for each property (primary first, then by order_index)
    const propertiesWithSortedPhotos = properties?.map((property: any) => {
      if (property.photos && Array.isArray(property.photos)) {
        property.photos.sort((a: any, b: any) => {
          // Primary photos first
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          // Then by order_index
          return (a.order_index || 0) - (b.order_index || 0);
        });
      }
      return property;
    }) || [];
    
    // Calculate distances if coordinates are provided
    let propertiesWithDistance = propertiesWithSortedPhotos;
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      
      propertiesWithDistance = propertiesWithSortedPhotos.map((property: any) => {
        if (property.latitude && property.longitude) {
          const distance = calculateDistance(
            userLat, 
            userLng, 
            property.latitude, 
            property.longitude
          );
          return { ...property, distance };
        }
        return property;
      });
      
      // Sort by distance if radius is specified
      if (radius) {
        const radiusKm = parseFloat(radius as string);
        propertiesWithDistance = propertiesWithDistance.filter((property: any) => {
          if (typeof property.distance !== 'number') {
            // Keep listings without geocoded coordinates so hosts aren't hidden
            return true;
          }
          return property.distance <= radiusKm;
        });
      }
      
      // Sort by distance (closest first)
      propertiesWithDistance.sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));
    }
    
    res.json({
      success: true,
      data: {
        properties: propertiesWithDistance,
        count: propertiesWithDistance?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties',
      message: error.message
    });
  }
};

// Get single property by ID
export const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    
    const { data: property, error } = await supabase
      .from('properties')
      .select(`
        *,
        host:users!properties_host_id_fkey(id, first_name, last_name, email, phone, rating, review_count),
        photos:property_photos(url, caption, is_primary, order_index)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Sort photos (primary first, then by order_index)
    if (property.photos && Array.isArray(property.photos)) {
      property.photos.sort((a: any, b: any) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return (a.order_index || 0) - (b.order_index || 0);
      });
    }
    
    res.json({
      success: true,
      data: { property }
    });
  } catch (error: any) {
    console.error('Error fetching property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property',
      message: error.message
    });
  }
};

// Create new property
export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const hostId = (req as any).user.id;
    
    // Extract property data from request
    const instantBookingRequest =
      typeof req.body.instant_booking === 'boolean'
        ? req.body.instant_booking
        : typeof req.body.instantBooking === 'boolean'
        ? req.body.instantBooking
        : undefined;

    const requireApprovalRequest =
      typeof req.body.require_approval === 'boolean'
        ? req.body.require_approval
        : typeof req.body.requireApproval === 'boolean'
        ? req.body.requireApproval
        : undefined;

    const propertyData: PropertyData = {
      title: req.body.title,
      description: req.body.description,
      address: req.body.address,
      city: req.body.city || '',
      state: req.body.state || '',
      zip_code: req.body.zip_code || '',
      hourly_rate: parseFloat(req.body.price),
      property_type: req.body.property_type || 'driveway',
      max_vehicles: req.body.max_vehicles || 1,
      features: req.body.features || [],
      restrictions: req.body.restrictions || [],
      access_instructions: req.body.access_instructions || '',
      instant_booking: instantBookingRequest !== undefined ? instantBookingRequest : true,
      require_approval: requireApprovalRequest !== undefined ? requireApprovalRequest : false
    };
    
    // Extract coordinates if provided (Mapbox returns [longitude, latitude])
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (req.body.coordinates && Array.isArray(req.body.coordinates) && req.body.coordinates.length === 2) {
      longitude = req.body.coordinates[0]; // Mapbox format: [longitude, latitude]
      latitude = req.body.coordinates[1];
      console.log('[createProperty] Saving coordinates:', { latitude, longitude, coordinates: req.body.coordinates });
    } else {
      console.log('[createProperty] No coordinates provided:', { coordinates: req.body.coordinates });
    }
    
    // Create the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        host_id: hostId,
        status: 'pending_review',
        latitude: latitude,
        longitude: longitude
      } as any)
      .select()
      .single();
    
    if (propertyError) throw propertyError;
    
    // Handle photo uploads if any
    if (req.body.photos && req.body.photos.length > 0) {
      const photoData: PropertyPhoto[] = req.body.photos.map((photo: any, index: number) => ({
        property_id: property.id,
        url: photo.url,
        caption: photo.caption || '',
        is_primary: index === 0, // First photo is primary
        order_index: index
      }));
      
      const { error: photoError } = await supabase
        .from('property_photos')
        .insert(photoData as any);
      
      if (photoError) {
        console.error('Error saving photos:', photoError);
        // Don't fail the whole request if photos fail
      }
    }
    
    // Update user to be a host if they aren't already
    await supabase
      .from('users')
      .update({ is_host: true })
      .eq('id', hostId);
    
    res.status(201).json({
      success: true,
      data: { property },
      message: 'Property created successfully'
    });
  } catch (error: any) {
    console.error('Error creating property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property',
      message: error.message
    });
  }
};

// Update property
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Verify ownership
    const { data: existingProperty, error: fetchError } = await supabase
      .from('properties')
      .select('host_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingProperty) {
      res.status(404).json({
        success: false,
        error: 'Property not found'
      });
      return;
    }
    
    if (existingProperty.host_id !== hostId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to update this property'
      });
      return;
    }
    
    // Update property data
    const updateData: Partial<PropertyData & { latitude?: number; longitude?: number }> = {};
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.address) updateData.address = req.body.address;
    if (req.body.city) updateData.city = req.body.city;
    if (req.body.state) updateData.state = req.body.state;
    if (req.body.zip_code) updateData.zip_code = req.body.zip_code;
    if (req.body.price) updateData.hourly_rate = parseFloat(req.body.price);
    if (req.body.property_type) updateData.property_type = req.body.property_type;
    if (req.body.max_vehicles) updateData.max_vehicles = req.body.max_vehicles;
    if (req.body.features) updateData.features = req.body.features;
    if (req.body.restrictions) updateData.restrictions = req.body.restrictions;
    if (req.body.access_instructions) updateData.access_instructions = req.body.access_instructions;

    if (typeof req.body.instant_booking === 'boolean') {
      updateData.instant_booking = req.body.instant_booking;
    } else if (typeof req.body.instantBooking === 'boolean') {
      updateData.instant_booking = req.body.instantBooking;
    }

    if (typeof req.body.require_approval === 'boolean') {
      updateData.require_approval = req.body.require_approval;
    } else if (typeof req.body.requireApproval === 'boolean') {
      updateData.require_approval = req.body.requireApproval;
    }
    
    // Extract coordinates if provided (Mapbox returns [longitude, latitude])
    if (req.body.coordinates && Array.isArray(req.body.coordinates) && req.body.coordinates.length === 2) {
      updateData.longitude = req.body.coordinates[0]; // Mapbox format: [longitude, latitude]
      updateData.latitude = req.body.coordinates[1];
      console.log('[updateProperty] Saving coordinates:', { latitude: updateData.latitude, longitude: updateData.longitude, coordinates: req.body.coordinates });
    } else {
      console.log('[updateProperty] No coordinates provided:', { coordinates: req.body.coordinates });
    }
    
    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    res.json({
      success: true,
      data: updatedProperty,
      message: 'Property updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property',
      message: error.message
    });
  }
};

// Delete property
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Verify ownership
    const { data: existingProperty, error: fetchError } = await supabase
      .from('properties')
      .select('host_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingProperty) {
      res.status(404).json({
        success: false,
        error: 'Property not found'
      });
      return;
    }
    
    if (existingProperty.host_id !== hostId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to delete this property'
      });
      return;
    }
    
    // Soft delete by updating status
    const { error: deleteError } = await supabase
      .from('properties')
      .update({ status: 'deleted' })
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property',
      message: error.message
    });
  }
};

// Get user's own properties
export const getUserProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        *,
        photos:property_photos(url, caption, is_primary, order_index),
        bookings:bookings(count)
      `)
      .eq('host_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Sort photos for each property
    const propertiesWithSortedPhotos = properties?.map((property: any) => {
      if (property.photos && Array.isArray(property.photos)) {
        property.photos.sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.order_index || 0) - (b.order_index || 0);
        });
      }
      return property;
    }) || [];
    
    res.json({
      success: true,
      data: {
        properties: propertiesWithSortedPhotos || [],
        count: propertiesWithSortedPhotos?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching user properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user properties',
      message: error.message
    });
  }
};

// @desc    Get pending properties (Admin only)
// @route   GET /api/properties/admin/pending
// @access  Private (Admin)
export const getPendingProperties = async (_req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        *,
        host:users!properties_host_id_fkey(id, first_name, last_name, email, phone),
        photos:property_photos(url, caption, is_primary, order_index)
      `)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: {
        properties: properties || [],
        count: properties?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching pending properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending properties',
      message: error.message
    });
  }
};

// @desc    Approve property (Admin only)
// @route   PUT /api/properties/:id/approve
// @access  Private (Admin)
export const approveProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    
    // Get property
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !property) {
      res.status(404).json({
        success: false,
        error: 'Property not found',
      });
      return;
    }
    
    // Update property status to active
    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({ 
        status: 'active',
        is_verified: true 
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Create notification for host
    await supabase.from('notifications').insert({
      user_id: property.host_id,
      type: 'property_approved',
      title: 'Property Approved',
      message: `Your property "${property.title}" has been approved and is now live!`,
      data: { property_id: id },
      is_read: false,
    } as any);
    
    res.json({
      success: true,
      data: updatedProperty,
      message: 'Property approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve property',
      message: error.message,
    });
  }
};

// @desc    Delete property (Admin only)
// @route   DELETE /api/properties/:id/admin
// @access  Private (Admin)
export const adminDeleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    
    // Get property to verify it exists
    const { data: existingProperty, error: fetchError } = await supabase
      .from('properties')
      .select('id, title, host_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !existingProperty) {
      res.status(404).json({
        success: false,
        error: 'Property not found'
      });
      return;
    }
    
    // Soft delete by updating status (admin can delete any property)
    const { error: deleteError } = await supabase
      .from('properties')
      .update({ status: 'deleted' })
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting property (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property',
      message: error.message
    });
  }
};

// @desc    Reject property (Admin only)
// @route   PUT /api/properties/:id/reject
// @access  Private (Admin)
export const rejectProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const supabase = getSupabaseClient();
    
    // Get property
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !property) {
      res.status(404).json({
        success: false,
        error: 'Property not found',
      });
      return;
    }
    
    // Update property status to inactive
    const { data: updatedProperty, error: updateError } = await supabase
      .from('properties')
      .update({ 
        status: 'inactive',
        admin_notes: reason || 'Property rejected by admin'
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Create notification for host
    await supabase.from('notifications').insert({
      user_id: property.host_id,
      type: 'property_rejected',
      title: 'Property Rejected',
      message: `Your property "${property.title}" was not approved. ${reason ? `Reason: ${reason}` : ''}`,
      data: { property_id: id, reason: reason || '' },
      is_read: false,
    } as any);
    
    res.json({
      success: true,
      data: updatedProperty,
      message: 'Property rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting property:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject property',
      message: error.message,
    });
  }
};

// @desc    Upload photo for property
// @route   POST /api/properties/:id/photos
// @access  Private (Host)
export const uploadPropertyPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;
    const supabase = getSupabaseClient();
    
    // Verify ownership
    const { data: property, error: fetchError } = await supabase
      .from('properties')
      .select('host_id')
      .eq('id', id)
      .single();
    
    if (fetchError || !property) {
      res.status(404).json({
        success: false,
        error: 'Property not found'
      });
      return;
    }
    
    if (property.host_id !== hostId) {
      res.status(403).json({
        success: false,
        error: 'Not authorized to upload photos for this property'
      });
      return;
    }
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('No file in request. Request body:', req.body);
      console.error('Request files:', req.files);
      res.status(400).json({
        success: false,
        error: 'No photo file provided'
      });
      return;
    }
    
    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    });
    
    // Upload photo to Supabase Storage
    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
      return;
    }
    
    let uploadedPhoto;
    try {
      uploadedPhoto = await photoService.uploadPhoto(req.file, id);
      console.log('Photo uploaded successfully:', uploadedPhoto.url);
    } catch (uploadError: any) {
      console.error('Photo upload error details:', {
        error: uploadError,
        message: uploadError?.message,
        stack: uploadError?.stack
      });
      throw uploadError;
    }
    
    // Get existing photos count to determine order_index
    const { data: existingPhotos } = await supabase
      .from('property_photos')
      .select('id')
      .eq('property_id', id);
    
    const orderIndex = existingPhotos?.length || 0;
    const isPrimary = orderIndex === 0; // First photo is primary
    
    // Save photo to database
    const { data: savedPhoto, error: saveError } = await supabase
      .from('property_photos')
      .insert({
        property_id: id,
        url: uploadedPhoto.url,
        caption: uploadedPhoto.caption || '',
        is_primary: isPrimary,
        order_index: orderIndex
      } as any)
      .select()
      .single();
    
    if (saveError) throw saveError;
    
    // If this is the first photo, make sure it's marked as primary
    if (isPrimary && existingPhotos && existingPhotos.length > 0 && savedPhoto?.id) {
      // Update other photos to not be primary
      await supabase
        .from('property_photos')
        .update({ is_primary: false })
        .eq('property_id', id)
        .neq('id', savedPhoto.id);
    }
    
    res.json({
      success: true,
      data: {
        id: savedPhoto.id,
        url: savedPhoto.url,
        caption: savedPhoto.caption,
        is_primary: savedPhoto.is_primary,
        order_index: savedPhoto.order_index
      },
      message: 'Photo uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photo',
      message: error.message
    });
  }
};
