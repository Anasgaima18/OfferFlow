import { supabaseAdmin } from '../config/supabase';
import { Logger } from '../utils/logger';

type AuthEmailTemplate = 'verify_email' | 'reset_password';

type SendAuthEmailParams = {
    to: string;
    template: AuthEmailTemplate;
    token: string;
};

export class SupabaseMailerService {
    constructor(private readonly functionName: string = process.env.SUPABASE_AUTH_MAILER_FUNCTION || 'auth-mailer') {}

    async sendAuthEmail(params: SendAuthEmailParams): Promise<void> {
        const { error } = await supabaseAdmin.functions.invoke(this.functionName, {
            body: {
                to: params.to,
                template: params.template,
                token: params.token,
            },
        });

        if (error) {
            Logger.warn(`[supabase-mailer] edge function invoke failed: ${error.message}`);
        }
    }
}
