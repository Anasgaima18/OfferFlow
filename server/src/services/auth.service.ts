import { AppError } from '../utils/appError';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import axios from 'axios';
import crypto from 'crypto';
import { UserInput, IUser, OAuthProfile, OAuthProvider, UpdateUserInput } from '../models/User';
import { config } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';
import { Logger } from '../utils/logger';
import { invalidateCachedUser } from '../utils/userCache';

const oauthExchangeStore = new Map<string, { user: IUser; expiresAt: number }>();
const OAUTH_CODE_TTL_MS = 5 * 60 * 1000;

/**
 * F10: Down from cost-12 to cost-10. Cost-12 = ~250-400ms CPU per call on a
 * 0.1 vCPU Render plan, which means 5 concurrent logins fully saturate the
 * event loop. Cost-10 keeps it at ~60-100ms while still well above OWASP's
 * 2024 recommendation of cost-10 minimum for bcrypt. Override via env if you
 * upgrade to a beefier plan.
 */
const BCRYPT_COST = Number(process.env.BCRYPT_COST || 10);

/**
 * F6: Janitor for the in-process oauthExchangeStore. Without this, abandoned
 * OAuth flows (user closes tab between callback and exchange) leak entries
 * forever. We sweep every minute and additionally cap the map size as a
 * second line of defence against pathological abuse.
 */
const OAUTH_STORE_MAX = Number(process.env.OAUTH_STORE_MAX || 10_000);
const OAUTH_JANITOR_INTERVAL_MS = 60_000;

export function startOAuthJanitor(): NodeJS.Timeout {
    const handle = setInterval(() => {
        const now = Date.now();
        let expired = 0;
        for (const [code, entry] of oauthExchangeStore) {
            if (entry.expiresAt < now) {
                oauthExchangeStore.delete(code);
                expired++;
            }
        }
        if (oauthExchangeStore.size > OAUTH_STORE_MAX) {
            const toDelete = oauthExchangeStore.size - OAUTH_STORE_MAX;
            const iterator = oauthExchangeStore.keys();
            for (let i = 0; i < toDelete; i++) {
                const next = iterator.next();
                if (next.done) break;
                oauthExchangeStore.delete(next.value);
            }
            Logger.warn(`[oauth] janitor evicted ${toDelete} oldest entries (cap=${OAUTH_STORE_MAX})`);
        }
        if (expired > 0) {
            Logger.debug(`[oauth] janitor swept ${expired} expired entries`);
        }
    }, OAUTH_JANITOR_INTERVAL_MS);
    handle.unref?.();
    return handle;
}

type OAuthProviderConfig = {
    clientId?: string;
    clientSecret?: string;
    authUrl: string;
    tokenUrl: string;
    scope: string;
    userInfo: (accessToken: string) => Promise<OAuthProfile>;
};

export class AuthService {
    constructor(private readonly userRepository: UserRepository) {}

    // Sign Up
    async signup(userData: UserInput): Promise<{ user: IUser; token: string }> {
        // Check if user already exists
        const existingUser = await this.userRepository.findByEmail(userData.email);

        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }

        if (userData.username) {
            const existingUsername = await this.userRepository.findByUsername(userData.username);
            if (existingUsername) {
                throw new AppError('Username already in use', 400);
            }
        }

        // F10: bcrypt cost lowered from 12 → 10 (configurable via BCRYPT_COST).
        const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_COST);

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

    async updateProfile(userId: string, updates: UpdateUserInput): Promise<IUser> {
        if (updates.username) {
            const existingUsername = await this.userRepository.findByUsername(updates.username);
            if (existingUsername && existingUsername.id !== userId) {
                throw new AppError('Username already in use', 400);
            }
        }

        const updated = await this.userRepository.updateProfile(userId, updates);
        // F4: invalidate cached user so next request sees the fresh profile.
        invalidateCachedUser(userId);
        return updated;
    }

    buildOAuthAuthorizationUrl(provider: OAuthProvider, requestBaseUrl?: string) {
        const providerConfig = this.getOAuthConfig(provider);
        if (!providerConfig.clientId || !providerConfig.clientSecret) {
            throw new AppError(`${provider} OAuth is not configured`, 503);
        }

        const state = this.signOAuthState(provider);
        const callbackUrl = this.getOAuthCallbackUrl(provider, requestBaseUrl);
        const params = new URLSearchParams({
            client_id: providerConfig.clientId,
            redirect_uri: callbackUrl,
            response_type: 'code',
            scope: providerConfig.scope,
            state,
        });

        return `${providerConfig.authUrl}?${params.toString()}`;
    }

    async handleOAuthCallback(provider: OAuthProvider, code: string, state: string, requestBaseUrl?: string) {
        this.verifyOAuthState(provider, state);
        const providerConfig = this.getOAuthConfig(provider);

        if (!providerConfig.clientId || !providerConfig.clientSecret) {
            throw new AppError(`${provider} OAuth is not configured`, 503);
        }

        const callbackUrl = this.getOAuthCallbackUrl(provider, requestBaseUrl);
        const tokenResponse = await axios.post(providerConfig.tokenUrl,
            new URLSearchParams({
                client_id: providerConfig.clientId,
                client_secret: providerConfig.clientSecret,
                code,
                redirect_uri: callbackUrl,
                grant_type: 'authorization_code',
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
                timeout: 15000,
            }
        );

        const accessToken = tokenResponse.data.access_token as string | undefined;
        if (!accessToken) {
            throw new AppError(`Failed to exchange ${provider} OAuth code`, 400);
        }

        const profile = await providerConfig.userInfo(accessToken);
        const user = await this.findOrCreateOAuthUser(profile);
        return this.createOAuthExchangeCode(user);
    }

    async exchangeOAuthLoginCode(code: string): Promise<{ user: IUser; token: string }> {
        const entry = oauthExchangeStore.get(code);
        if (!entry || entry.expiresAt < Date.now()) {
            oauthExchangeStore.delete(code);
            throw new AppError('OAuth login session has expired. Please try again.', 400);
        }

        oauthExchangeStore.delete(code);
        return {
            user: entry.user,
            token: this.signToken(entry.user.id),
        };
    }

    private signToken(id: string): string {
        return jwt.sign({ id, iat: Math.floor(Date.now() / 1000) }, config.JWT_SECRET, {
            expiresIn: '24h',
        });
    }

    private getOAuthConfig(provider: OAuthProvider): OAuthProviderConfig {
        const configs: Record<OAuthProvider, OAuthProviderConfig> = {
            google: {
                clientId: config.GOOGLE_CLIENT_ID,
                clientSecret: config.GOOGLE_CLIENT_SECRET,
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenUrl: 'https://oauth2.googleapis.com/token',
                scope: 'openid email profile',
                userInfo: async (accessToken: string) => {
                    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        timeout: 15000,
                    });
                    return {
                        provider: 'google',
                        providerId: response.data.sub,
                        email: response.data.email,
                        name: response.data.name || response.data.email,
                        avatar: response.data.picture || null,
                    };
                },
            },
            github: {
                clientId: config.GITHUB_CLIENT_ID,
                clientSecret: config.GITHUB_CLIENT_SECRET,
                authUrl: 'https://github.com/login/oauth/authorize',
                tokenUrl: 'https://github.com/login/oauth/access_token',
                scope: 'read:user user:email',
                userInfo: async (accessToken: string) => {
                    const headers = {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github+json',
                        'User-Agent': 'OfferFlow',
                    };
                    const [userResponse, emailsResponse] = await Promise.all([
                        axios.get('https://api.github.com/user', { headers, timeout: 15000 }),
                        axios.get('https://api.github.com/user/emails', { headers, timeout: 15000 }),
                    ]);
                    const primaryEmail = (emailsResponse.data as Array<{ email: string; primary: boolean; verified: boolean }>).find((entry) => entry.primary && entry.verified)
                        || (emailsResponse.data as Array<{ email: string }>)[0];
                    if (!primaryEmail?.email) {
                        throw new AppError('GitHub account does not expose a usable email address', 400);
                    }
                    return {
                        provider: 'github',
                        providerId: String(userResponse.data.id),
                        email: primaryEmail.email,
                        name: userResponse.data.name || userResponse.data.login,
                        avatar: userResponse.data.avatar_url || null,
                    };
                },
            },
        };

        return configs[provider];
    }

    private signOAuthState(provider: OAuthProvider) {
        return jwt.sign({ provider, nonce: crypto.randomUUID() }, config.JWT_SECRET, { expiresIn: '10m' });
    }

    private verifyOAuthState(provider: OAuthProvider, state: string) {
        try {
            const payload = jwt.verify(state, config.JWT_SECRET) as { provider: OAuthProvider };
            if (payload.provider !== provider) {
                throw new AppError('Invalid OAuth state', 400);
            }
        } catch {
            throw new AppError('Invalid or expired OAuth state', 400);
        }
    }

    private getOAuthCallbackUrl(provider: OAuthProvider, requestBaseUrl?: string) {
        const baseUrl = config.API_BASE_URL || requestBaseUrl || 'http://localhost:5000';
        return `${baseUrl.replace(/\/$/, '')}/api/v1/auth/oauth/${provider}/callback`;
    }

    private async findOrCreateOAuthUser(profile: OAuthProfile) {
        if (!profile.email) {
            throw new AppError('OAuth provider did not return an email address', 400);
        }

        const providerUser = await this.userRepository.findByProvider(profile.provider, profile.providerId);
        if (providerUser) {
            return providerUser;
        }

        const existingUser = await this.userRepository.findByEmail(profile.email);
        if (existingUser) {
            return await this.userRepository.linkOAuthIdentity(existingUser.id, profile);
        }

        return await this.userRepository.createOAuthUser(profile);
    }

    private createOAuthExchangeCode(user: IUser) {
        const code = crypto.randomUUID();
        oauthExchangeStore.set(code, { user, expiresAt: Date.now() + OAUTH_CODE_TTL_MS });
        return code;
    }
}
