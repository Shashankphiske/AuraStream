import { UserModel } from './user.model.js';
import { IUserProfile } from '../../types/index.js';

export class UserService {
  static async getProfile(userId: string): Promise<IUserProfile | null> {
    const user = await UserModel.findById(userId);
    return user ? UserModel.toProfile(user) : null;
  }

  static async updateInterests(userId: string, interests: string[]): Promise<IUserProfile | null> {
    return UserModel.updateInterests(userId, interests);
  }

  static async updateProfile(userId: string, data: { name?: string; avatar?: string }): Promise<IUserProfile | null> {
    return UserModel.updateProfile(userId, data);
  }
}
