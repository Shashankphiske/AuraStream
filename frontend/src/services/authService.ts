import api from './api';
import { IUser } from '../types';

export interface AuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken?: string;
}

export const authService = {
  async register(data: { name: string; email: string; password: string; interests?: string[] }): Promise<AuthResponse> {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getMe(): Promise<IUser> {
    const res = await api.get('/users/me');
    return res.data.data;
  },

  async updateInterests(interests: string[]): Promise<IUser> {
    const res = await api.patch('/users/me/interests', { interests });
    return res.data.data;
  },

  async updateProfile(data: { name?: string; avatar?: string }): Promise<IUser> {
    const res = await api.patch('/users/me/profile', data);
    return res.data.data;
  },
};
