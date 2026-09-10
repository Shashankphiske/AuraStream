import { create } from 'zustand';
import { IUser } from '../types';
import { authService } from '../services/authService';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, interests?: string[]) => Promise<IUser>;
  logout: () => Promise<void>;
  updateInterests: (interests: string[]) => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: IUser) => void;
}

const savedToken = localStorage.getItem('aurastream_token');
const savedUser = localStorage.getItem('aurastream_user');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken,
  isAuthenticated: Boolean(savedToken),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authService.login({ email, password });
      localStorage.setItem('aurastream_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('aurastream_refresh_token', data.refreshToken);
      }
      localStorage.setItem('aurastream_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password, interests = []) => {
    set({ isLoading: true });
    try {
      const data = await authService.register({ name, email, password, interests });
      localStorage.setItem('aurastream_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('aurastream_refresh_token', data.refreshToken);
      }
      localStorage.setItem('aurastream_user', JSON.stringify(data.user));

      set({
        user: data.user,
        token: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {}
    localStorage.removeItem('aurastream_token');
    localStorage.removeItem('aurastream_refresh_token');
    localStorage.removeItem('aurastream_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateInterests: async (interests) => {
    const updated = await authService.updateInterests(interests);
    localStorage.setItem('aurastream_user', JSON.stringify(updated));
    set({ user: updated });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('aurastream_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    try {
      const me = await authService.getMe();
      localStorage.setItem('aurastream_user', JSON.stringify(me));
      set({ user: me, isAuthenticated: true });
    } catch {
      localStorage.removeItem('aurastream_token');
      localStorage.removeItem('aurastream_refresh_token');
      localStorage.removeItem('aurastream_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user) => {
    localStorage.setItem('aurastream_user', JSON.stringify(user));
    set({ user });
  },
}));
