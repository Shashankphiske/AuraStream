import { UserModel } from '../users/user.model.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/tokens.js';
import { IUserProfile, IJwtPayload } from '../../types/index.js';

export interface AuthResult {
  user: IUserProfile;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async register(data: {
    name: string;
    email: string;
    password: string;
    interests?: string[];
  }): Promise<AuthResult> {
    const existing = await UserModel.findByEmail(data.email);
    if (existing) {
      const err: any = new Error('An account with this email address already exists');
      err.statusCode = 409;
      throw err;
    }

    const password_hash = await hashPassword(data.password);
    const user = await UserModel.create({
      name: data.name,
      email: data.email,
      password_hash,
      interests: data.interests || [],
      role: 'user',
    });

    const jwtPayload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    return { user, accessToken, refreshToken };
  }

  static async login(data: { email: string; password: string }): Promise<AuthResult> {
    const userRecord = await UserModel.findByEmail(data.email);
    if (!userRecord) {
      const err: any = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await comparePassword(data.password, userRecord.password_hash);
    if (!isMatch) {
      const err: any = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const user = UserModel.toProfile(userRecord);
    const jwtPayload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    return { user, accessToken, refreshToken };
  }

  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string; user: IUserProfile }> {
    const decoded = verifyRefreshToken(token);
    const userRecord = await UserModel.findById(decoded.userId);
    if (!userRecord) {
      const err: any = new Error('User no longer exists or session has been invalidated');
      err.statusCode = 401;
      throw err;
    }

    const user = UserModel.toProfile(userRecord);
    const jwtPayload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Rotate both access and refresh tokens for security
    const newAccessToken = generateAccessToken(jwtPayload);
    const newRefreshToken = generateRefreshToken(jwtPayload);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
  }
}
