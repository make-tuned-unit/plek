import { getSupabaseClient } from './supabaseService';

export interface UploadedCommercialFile {
  path: string;
  publicUrl: string;
  originalName: string;
}

export class CommercialStorageService {
  private getBucketName(): string {
    return process.env['SUPABASE_COMMERCIAL_STORAGE_BUCKET'] || 'commercial-intake';
  }

  private getSupabase() {
    return getSupabaseClient();
  }

  async uploadLeadFile(file: Express.Multer.File, leadId: string): Promise<UploadedCommercialFile> {
    const fileExt = file.originalname.split('.').pop() || 'bin';
    const path = `leads/${leadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const supabase = this.getSupabase();

    const { error } = await supabase.storage
      .from(this.getBucketName())
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload commercial intake file: ${error.message}`);
    }

    const { data } = supabase.storage.from(this.getBucketName()).getPublicUrl(path);

    return {
      path,
      publicUrl: data.publicUrl,
      originalName: file.originalname,
    };
  }
}

export const commercialStorageService = new CommercialStorageService();
