import { AppError } from '../utils/appError';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserInput, IUser } from '../models/User';
import { config } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';

export class AuthService {
    constructor(private readonly userRepository: UserRepository) {}

    // Sign Up
    async signup(userData: UserInput): Promise<{ user: IUser; token: string }> {
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(userData.email);

        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await this.userRepository.create(userData, hashedPassword);

        if (!user) {
            throw new AppError('Failed to create user', 500);
        }

        // Generate JWT token
        const token = this.signToken(user.id);

        return { user, token };
    }

    // Login
    async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        // Find user by email (including password for verification)
        const user = await this.userRepository.findByEmail(email);

        if (!user || (!user.password)) {
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
        return await this.userRepository.findById(id);
    }

    private signToken(id: string): string {
        return jwt.sign({ id, iat: Math.floor(Date.now() / 1000) }, config.JWT_SECRET, {
            expiresIn: '24h',
        });
    }
}
