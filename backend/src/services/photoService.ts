import { getSupabaseClient } from './supabaseService';

export interface UploadedPhoto {
  url: string;
  caption?: string;
  is_primary: boolean;
  order_index: number;
}

export class PhotoService {
  // Load bucket name dynamically to ensure env vars are loaded
  private getBucketName(): string {
    return process.env['SUPABASE_STORAGE_BUCKET'] || 'property=photos';
  }
  
  private getSupabase() {
    return getSupabaseClient();
  }

  // Check if bucket exists (optional verification)
  private async verifyBucketExists(): Promise<void> {
    try {
      const supabase = this.getSupabase();
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        // If we can't list buckets (permission issue), skip verification
        // The upload will fail with a clearer error if bucket doesn't exist
        console.warn('Could not list buckets (may be a permission issue):', error.message);
        return;
      }
      
      if (buckets && buckets.length > 0) {
        const bucketName = this.getBucketName();
        const bucketExists = buckets.some((bucket: { name: string }) => bucket.name === bucketName);
        if (!bucketExists) {
          const availableBuckets = buckets.map((b: { name: string }) => b.name).join(', ');
          throw new Error(
            `Storage bucket "${bucketName}" not found. ` +
            `Available buckets: ${availableBuckets}. ` +
            `Please check your SUPABASE_STORAGE_BUCKET environment variable.`
          );
        }
      }
    } catch (error: any) {
      // If verification fails, log but don't throw - let the upload attempt fail naturally
      console.warn('Bucket verification skipped:', error.message);
    }
  }

  // Upload a single photo to Supabase Storage
  async uploadPhoto(file: Express.Multer.File, propertyId: string, caption?: string): Promise<UploadedPhoto> {
    // Generate unique filename
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    try {
      const supabase = this.getSupabase();
      
      // Verify bucket exists before attempting upload
      await this.verifyBucketExists();
      
      const bucketName = this.getBucketName();
      console.log(`[PhotoService] Attempting to upload to bucket: "${bucketName}", file: ${fileName}`);
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`[PhotoService] Upload error for bucket "${bucketName}":`, error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        caption: caption || '',
        is_primary: false,
        order_index: 0
      };
    } catch (error: any) {
      console.error('Error uploading photo to Supabase Storage:', {
        error,
        message: error?.message,
        statusCode: error?.statusCode,
        errorCode: error?.error,
        bucketName: this.getBucketName(),
        fileName,
        fileSize: file.size,
        hasBuffer: !!file.buffer
      });
      throw new Error(`Failed to upload photo: ${error?.message || 'Unknown error'}`);
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
        if (uploadedPhotos[0]) {
          uploadedPhotos[0].is_primary = true;
        }
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
      const supabase = this.getSupabase();
      
      // Get photo info from database first
      const { data: photo, error: fetchError } = await supabase
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
      const { error: storageError } = await supabase.storage
        .from(this.getBucketName())
        .remove([fullPath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
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
      const supabase = this.getSupabase();
      const { data: photos, error } = await supabase
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
      const supabase = this.getSupabase();
      
      // Reset all photos to not primary first
      await supabase
        .from('property_photos')
        .update({ is_primary: false })
        .eq('property_id', propertyId);

      // Update each photo
      for (const update of photoUpdates) {
        const { error } = await supabase
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
