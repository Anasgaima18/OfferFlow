import { supabaseAdmin } from '../config/supabase';
import { UserInput, IUser, OAuthProfile, UpdateUserInput } from '../models/User';

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

    async findByUsername(username: string): Promise<IUser | null> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as IUser;
    }

    async findByProvider(provider: string, providerId: string): Promise<IUser | null> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('auth_provider', provider)
            .eq('provider_id', providerId)
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
            .select('id, email, name, username, avatar, auth_provider, provider_id, created_at, updated_at')
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
                username: userData.username || null,
                password: passwordHash,
                avatar: userData.avatar || null,
                auth_provider: 'local',
            })
            .select('id, email, name, username, avatar, auth_provider, provider_id, created_at, updated_at')
            .single();

        if (error) throw error;
        return data as IUser;
    }

    async createOAuthUser(profile: OAuthProfile): Promise<IUser> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
                email: profile.email,
                name: profile.name,
                username: this.buildUsername(profile.email, profile.name),
                password: null,
                avatar: profile.avatar || null,
                auth_provider: profile.provider,
                provider_id: profile.providerId,
            })
            .select('id, email, name, username, avatar, auth_provider, provider_id, created_at, updated_at')
            .single();

        if (error) throw error;
        return data as IUser;
    }

    async linkOAuthIdentity(userId: string, profile: OAuthProfile): Promise<IUser> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({
                avatar: profile.avatar || null,
                auth_provider: profile.provider,
                provider_id: profile.providerId,
            })
            .eq('id', userId)
            .select('id, email, name, username, avatar, auth_provider, provider_id, created_at, updated_at')
            .single();

        if (error) throw error;
        return data as IUser;
    }

    async updateProfile(userId: string, updates: UpdateUserInput): Promise<IUser> {
        const payload: Record<string, string | null> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.username !== undefined) payload.username = updates.username || null;
        if (updates.avatar !== undefined) payload.avatar = updates.avatar || null;

        const { data, error } = await supabaseAdmin
            .from('users')
            .update(payload)
            .eq('id', userId)
            .select('id, email, name, username, avatar, auth_provider, provider_id, created_at, updated_at')
            .single();

        if (error) throw error;
        return data as IUser;
    }

    private buildUsername(email: string, name: string) {
        const source = name || email.split('@')[0] || 'offerflow';
        return source.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30);
    }
}
