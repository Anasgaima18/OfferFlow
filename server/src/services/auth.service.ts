import { supabaseAdmin } from '../config/supabase';
import { AppError } from '../utils/appError';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserInput, IUser } from '../models/User';
import { env } from '../config/env';

export class AuthService {
    // Sign Up
    async signup(userData: UserInput): Promise<{ user: IUser; token: string }> {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .single();

        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user in Supabase
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .insert({
                email: userData.email,
                name: userData.name,
                password: hashedPassword,
                avatar: userData.avatar || null,
            })
            .select('id, email, name, avatar, created_at, updated_at')
            .single();

        if (error || !user) {
            throw new AppError(error?.message || 'Failed to create user', 500);
        }

        // Generate JWT token
        const token = this.signToken(user.id);

        return { user: user as IUser, token };
    }

    // Login
    async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        // Find user by email (including password for verification)
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            throw new AppError('Incorrect email or password', 401);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Incorrect email or password', 401);
        }

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        const token = this.signToken(user.id);
        return { user: userWithoutPassword as IUser, token };
    }

    // Get user by ID (excludes password hash)
    async getUserById(id: string): Promise<IUser | null> {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, avatar, created_at, updated_at')
            .eq('id', id)
            .single();

        if (error) return null;
        return user as IUser;
    }

    private signToken(id: string): string {
        return jwt.sign({ id, iat: Math.floor(Date.now() / 1000) }, env.JWT_SECRET, {
            expiresIn: '24h',
        });
    }
}

export const authService = new AuthService();
