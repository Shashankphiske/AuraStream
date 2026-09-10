import api from './api';
import { IUser } from '../types';

export const adminService = {
  async getOverview() {
    const res = await api.get('/admin/overview');
    return res.data.data;
  },

  async getUsers(limit: number = 50, offset: number = 0): Promise<IUser[]> {
    const res = await api.get('/admin/users', { params: { limit, offset } });
    return res.data.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${encodeURIComponent(userId)}`);
  },
};
