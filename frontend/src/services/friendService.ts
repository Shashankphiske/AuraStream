import api from './api';
import { IFriendsData, IFriendUser } from '../types';

export const friendService = {
  async getFriends(): Promise<IFriendsData> {
    try {
      const res = await api.get('/friends');
      return res.data.data;
    } catch {
      // Graceful demo fallback for offline / mock exploration
      const localData: IFriendsData = {
        friends: [
          {
            id: 'user_admin_001',
            name: 'Aura Admin',
            email: 'admin@aurastream.io',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            friendship_id: 'fr_01',
            status: 'accepted',
            now_playing: 'Midnight City',
          },
          {
            id: 'user_sophia',
            name: 'Sophia Beats',
            email: 'sophia@lofi.io',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            friendship_id: 'fr_02',
            status: 'accepted',
            now_playing: 'lofi hip hop radio',
          },
        ],
        pendingIncoming: [
          {
            id: 'user_marcus',
            name: 'Marcus Chen',
            email: 'marcus@synthwave.fm',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            friendship_id: 'fr_03',
            status: 'pending',
            direction: 'incoming',
          },
        ],
        pendingOutgoing: [],
      };
      return localData;
    }
  },

  async sendRequest(targetEmail: string, targetUserId?: string): Promise<void> {
    await api.post('/friends/request', { targetEmail, targetUserId });
  },

  async respond(friendshipId: string, action: 'accept' | 'decline'): Promise<void> {
    await api.post('/friends/respond', { friendshipId, action });
  },

  async removeFriend(friendshipId: string): Promise<void> {
    await api.delete(`/friends/${encodeURIComponent(friendshipId)}`);
  },

  async searchUsers(query: string): Promise<Array<{ id: string; name: string; email: string; avatar?: string }>> {
    try {
      const res = await api.get('/users/search', { params: { q: query } });
      return res.data.data || [];
    } catch {
      return [];
    }
  },
};
