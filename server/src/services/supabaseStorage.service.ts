import { supabaseAdmin } from '../config/supabase';
import { Logger } from '../utils/logger';

export class SupabaseStorageService {
    private readonly bucket = process.env.SUPABASE_RESUME_BUCKET || 'resumes';

    async uploadResume(userId: string, file: Express.Multer.File): Promise<{ objectPath: string; signedUrl: string | null } | null> {
        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `${userId}/${Date.now()}-${safeFileName}`;
        const { error } = await supabaseAdmin.storage.from(this.bucket).upload(objectPath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

        if (error) {
            Logger.warn(`[supabase-storage] upload failed for ${objectPath}: ${error.message}`);
            return null;
        }

        const signed = await supabaseAdmin.storage.from(this.bucket).createSignedUrl(objectPath, 3600);
        if (signed.error) {
            Logger.warn(`[supabase-storage] signed URL failed for ${objectPath}: ${signed.error.message}`);
            return { objectPath, signedUrl: null };
        }

        return { objectPath, signedUrl: signed.data.signedUrl };
    }
}
