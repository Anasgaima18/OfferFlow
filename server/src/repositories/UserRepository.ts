import { supabaseAdmin } from '../config/supabase';
import { UserInput, IUser } from '../models/User';

export class UserRepository {
    async findByEmail(email: string): Promise<IUser | null> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as IUser;
    }

    async findById(id: string): Promise<IUser | null> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, avatar, created_at, updated_at')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as IUser;
    }

    async create(userData: UserInput, passwordHash: string): Promise<IUser> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
                email: userData.email,
                name: userData.name,
                password: passwordHash,
                avatar: userData.avatar || null,
            })
            .select('id, email, name, avatar, created_at, updated_at')
            .single();

        if (error) throw error;
        return data as IUser;
    }
}
