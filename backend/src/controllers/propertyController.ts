import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService';

// Types for property data
interface PropertyData {
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  hourly_rate: number;
  property_type?: string;
  max_vehicles?: number;
  features?: string[];
  restrictions?: string[];
  access_instructions?: string;
}

interface PropertyPhoto {
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
    const { city, state, min_price, max_price, property_type } = req.query;
    
    let query = supabase
      .from('properties')
      .select(`
        *,
        host:users!properties_host_id_fkey(first_name, last_name, rating, review_count),
        photos:property_photos(url, caption, is_primary, order_index)
      `)
      .eq('status', 'active')
      .eq('is_available', true);
    
    // Apply filters
    if (city) query = query.eq('city', city as string);
    if (state) query = query.eq('state', state as string);
    if (property_type) query = query.eq('property_type', property_type as string);
    if (min_price) query = query.gte('hourly_rate', parseFloat(min_price as string));
    if (max_price) query = query.lte('hourly_rate', parseFloat(max_price as string));
    
    const { data: properties, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: properties,
      count: properties?.length || 0
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
        host:users!properties_host_id_fkey(
          id, first_name, last_name, phone, rating, review_count, 
          total_bookings, total_earnings, created_at
        ),
        photos:property_photos(url, caption, is_primary, order_index),
        availability:availability(date, is_available, price_override)
      `)
      .eq('id', id)
      .eq('status', 'active')
      .single();
    
    if (error) throw error;
    
    if (!property) {
      res.status(404).json({
        success: false,
        error: 'Property not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: property
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
      access_instructions: req.body.access_instructions || ''
    };
    
    // Create the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        ...propertyData,
        host_id: hostId,
        status: 'pending_review'
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
      data: property,
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
    const updateData: Partial<PropertyData> = {};
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
    
    res.json({
      success: true,
      data: properties,
      count: properties?.length || 0
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
