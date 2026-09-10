import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../store/useAuthStore';
import { ShieldCheck, Users, Disc, ListMusic, Play, Trash2, Eye } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useNavigate } from 'react-router-dom';

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminService.getOverview(),
    enabled: user?.role === 'admin',
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.getUsers(50),
    enabled: user?.role === 'admin',
  });

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-20 space-y-3">
        <ShieldCheck className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">Access Restricted</h3>
        <p className="text-xs text-slate-400">Only authorized AuraStream administrators can access this console.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminService.deleteUser(userId);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading">
            Admin Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Platform management, system statistics, and user moderation</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            {overviewLoading ? '...' : overview?.totalUsers || 0}
          </h3>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Catalog Tracks</span>
            <Disc className="w-4 h-4 text-zinc-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            {overviewLoading ? '...' : overview?.totalTracks || 0}
          </h3>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Playlists</span>
            <ListMusic className="w-4 h-4 text-zinc-400" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            {overviewLoading ? '...' : overview?.totalPlaylists || 0}
          </h3>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Stream Plays</span>
            <Play className="w-4 h-4 text-zinc-400 fill-current" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            {overviewLoading ? '...' : overview?.totalPlays || 0}
          </h3>
        </div>
      </div>

      {/* User Management Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">Registered Users</h3>

        <div className="rounded-2xl border border-white/10 overflow-hidden glass-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/5 uppercase font-semibold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Interests</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          u.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate">
                      {u.interests && u.interests.length > 0 ? u.interests.join(', ') : 'None specified'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
