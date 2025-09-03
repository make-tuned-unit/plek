import { getSupabaseClient } from './supabaseService';

export interface UploadedPhoto {
  url: string;
  caption?: string;
  is_primary: boolean;
  order_index: number;
}

export class PhotoService {
  private supabase = getSupabaseClient();
  private bucketName = 'property-photos';

  // Upload a single photo to Supabase Storage
  async uploadPhoto(file: Express.Multer.File, propertyId: string, caption?: string): Promise<UploadedPhoto> {
    try {
      // Generate unique filename
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        caption: caption || '',
        is_primary: false,
        order_index: 0
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error('Failed to upload photo');
    }
  }

  // Upload multiple photos for a property
  async uploadMultiplePhotos(files: Express.Multer.File[], propertyId: string, captions?: string[]): Promise<UploadedPhoto[]> {
    try {
      const uploadPromises = files.map((file, index) => 
        this.uploadPhoto(file, propertyId, captions?.[index])
      );

      const uploadedPhotos = await Promise.all(uploadPromises);
      
      // Set the first photo as primary
      if (uploadedPhotos.length > 0) {
        uploadedPhotos[0].is_primary = true;
        uploadedPhotos.forEach((photo, index) => {
          photo.order_index = index;
        });
      }

      return uploadedPhotos;
    } catch (error) {
      console.error('Error uploading multiple photos:', error);
      throw new Error('Failed to upload photos');
    }
  }

  // Delete a photo from storage and database
  async deletePhoto(photoId: string, propertyId: string): Promise<boolean> {
    try {
      // Get photo info from database first
      const { data: photo, error: fetchError } = await this.supabase
        .from('property_photos')
        .select('url')
        .eq('id', photoId)
        .eq('property_id', propertyId)
        .single();

      if (fetchError || !photo) {
        throw new Error('Photo not found');
      }

      // Extract filename from URL
      const urlParts = photo.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const fullPath = `${propertyId}/${fileName}`;

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(this.bucketName)
        .remove([fullPath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('property_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw new Error('Failed to delete photo');
    }
  }

  // Get all photos for a property
  async getPropertyPhotos(propertyId: string): Promise<UploadedPhoto[]> {
    try {
      const { data: photos, error } = await this.supabase
        .from('property_photos')
        .select('url, caption, is_primary, order_index')
        .eq('property_id', propertyId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return photos || [];
    } catch (error) {
      console.error('Error fetching property photos:', error);
      throw new Error('Failed to fetch property photos');
    }
  }

  // Update photo order and primary status
  async updatePhotoOrder(propertyId: string, photoUpdates: { id: string; order_index: number; is_primary: boolean }[]): Promise<boolean> {
    try {
      // Reset all photos to not primary first
      await this.supabase
        .from('property_photos')
        .update({ is_primary: false })
        .eq('property_id', propertyId);

      // Update each photo
      for (const update of photoUpdates) {
        const { error } = await this.supabase
          .from('property_photos')
          .update({
            order_index: update.order_index,
            is_primary: update.is_primary
          })
          .eq('id', update.id)
          .eq('property_id', propertyId);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating photo order:', error);
      throw new Error('Failed to update photo order');
    }
  }
}

export const photoService = new PhotoService();
