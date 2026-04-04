import { supabaseAdmin } from '../config/supabase';
import { UserInput, IUser, OAuthProfile, UpdateUserInput } from '../models/User';

type QueryResult = { data: unknown; error: { code?: string; message?: string } | null };

export class UserRepository {
    private usernameColumnAvailable: boolean | null = null;

    async findByEmail(email: string): Promise<IUser | null> {
        return this.findSingle('email', email, { includePassword: true });
    }

    async findByUsername(username: string): Promise<IUser | null> {
        if (this.usernameColumnAvailable === false) {
            return null;
        }

        try {
            return await this.findSingle('username', username);
        } catch (error) {
            if (this.isMissingUsernameColumnError(error)) {
                this.usernameColumnAvailable = false;
                return null;
            }

            throw error;
        }
    }

    async findByProvider(provider: string, providerId: string): Promise<IUser | null> {
        const { data, error } = await this.runSelectQuery(
            (columns) => supabaseAdmin
                .from('users')
                .select(columns)
                .eq('auth_provider', provider)
                .eq('provider_id', providerId)
                .single(),
            { includePassword: true }
        );

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return this.mapUser(data);
    }

    async findById(id: string): Promise<IUser | null> {
        return this.findSingle('id', id);
    }

    async create(userData: UserInput, passwordHash: string): Promise<IUser> {
        const payload: Record<string, string | null> = {
            email: userData.email,
            name: userData.name,
            password: passwordHash,
            avatar: userData.avatar || null,
            auth_provider: 'local',
        };

        if (this.usernameColumnAvailable !== false) {
            payload.username = userData.username || null;
        }

        const { data, error } = await this.runMutatingQuery(
            (columns) => supabaseAdmin
                .from('users')
                .insert(payload)
                .select(columns)
                .single(),
            payload
        );

        if (error) throw error;
        return this.mapUser(data);
    }

    async createOAuthUser(profile: OAuthProfile): Promise<IUser> {
        const payload: Record<string, string | null> = {
            email: profile.email,
            name: profile.name,
            password: null,
            avatar: profile.avatar || null,
            auth_provider: profile.provider,
            provider_id: profile.providerId,
        };

        if (this.usernameColumnAvailable !== false) {
            payload.username = this.buildUsername(profile.email, profile.name);
        }

        const { data, error } = await this.runMutatingQuery(
            (columns) => supabaseAdmin
                .from('users')
                .insert(payload)
                .select(columns)
                .single(),
            payload
        );

        if (error) throw error;
        return this.mapUser(data);
    }

    async linkOAuthIdentity(userId: string, profile: OAuthProfile): Promise<IUser> {
        const { data, error } = await this.runMutatingQuery(
            (columns) => supabaseAdmin
                .from('users')
                .update({
                    avatar: profile.avatar || null,
                    auth_provider: profile.provider,
                    provider_id: profile.providerId,
                })
                .eq('id', userId)
                .select(columns)
                .single()
        );

        if (error) throw error;
        return this.mapUser(data);
    }

    async updateProfile(userId: string, updates: UpdateUserInput): Promise<IUser> {
        const payload: Record<string, string | null> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.avatar !== undefined) payload.avatar = updates.avatar || null;

        if (this.usernameColumnAvailable !== false && updates.username !== undefined) {
            payload.username = updates.username || null;
        }

        const { data, error } = await this.runMutatingQuery(
            (columns) => supabaseAdmin
                .from('users')
                .update(payload)
                .eq('id', userId)
                .select(columns)
                .single(),
            payload
        );

        if (error) throw error;
        return this.mapUser(data);
    }

    private buildUsername(email: string, name: string) {
        const source = name || email.split('@')[0] || 'offerflow';
        return source.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 30);
    }

    private async findSingle(column: string, value: string, options?: { includePassword?: boolean }): Promise<IUser | null> {
        const { data, error } = await this.runSelectQuery(
            (selectedColumns) => supabaseAdmin
                .from('users')
                .select(selectedColumns)
                .eq(column, value)
                .single(),
            options
        );

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return this.mapUser(data);
    }

    private async runSelectQuery(
        queryFactory: (columns: string) => PromiseLike<QueryResult>,
        options?: { includePassword?: boolean }
    ) {
        if (this.usernameColumnAvailable === false) {
            return queryFactory(this.getSelectColumns({ ...options, includeUsername: false }));
        }

        const result = await queryFactory(this.getSelectColumns({ ...options, includeUsername: true }));

        if (result.error && this.isMissingUsernameColumnError(result.error)) {
            this.usernameColumnAvailable = false;
            return queryFactory(this.getSelectColumns({ ...options, includeUsername: false }));
        }

        if (!result.error) {
            this.usernameColumnAvailable = true;
        }

        return result;
    }

    private async runMutatingQuery(
        queryFactory: (columns: string) => PromiseLike<QueryResult>,
        payload?: Record<string, string | null>
    ) {
        if (this.usernameColumnAvailable === false) {
            if (payload) {
                delete payload.username;
            }

            return queryFactory(this.getSelectColumns({ includeUsername: false }));
        }

        const result = await queryFactory(this.getSelectColumns({ includeUsername: true }));

        if (result.error && this.isMissingUsernameColumnError(result.error)) {
            this.usernameColumnAvailable = false;

            if (payload) {
                delete payload.username;
            }

            return queryFactory(this.getSelectColumns({ includeUsername: false }));
        }

        if (!result.error) {
            this.usernameColumnAvailable = true;
        }

        return result;
    }

    private getSelectColumns(options?: { includePassword?: boolean; includeUsername?: boolean }) {
        const columns = ['id', 'email', 'name'];

        if (options?.includeUsername) {
            columns.push('username');
        }

        if (options?.includePassword) {
            columns.push('password');
        }

        columns.push('avatar', 'auth_provider', 'provider_id', 'created_at', 'updated_at');
        return columns.join(', ');
    }

    private isMissingUsernameColumnError(error: { code?: string; message?: string } | unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const databaseError = error as { code?: string; message?: string };
        return databaseError.code === '42703' && databaseError.message?.toLowerCase().includes('username') === true;
    }

    private mapUser(data: unknown): IUser {
        const user = data as Record<string, unknown>;

        return {
            id: String(user.id),
            email: String(user.email),
            name: String(user.name),
            username: typeof user.username === 'string' ? user.username : null,
            password: typeof user.password === 'string' ? user.password : undefined,
            avatar: typeof user.avatar === 'string' ? user.avatar : null,
            auth_provider: typeof user.auth_provider === 'string' ? user.auth_provider as IUser['auth_provider'] : null,
            provider_id: typeof user.provider_id === 'string' ? user.provider_id : null,
            created_at: String(user.created_at),
            updated_at: String(user.updated_at),
        };
    }
}
