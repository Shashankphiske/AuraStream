import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { playlistService } from '../services/playlistService';
import { favoriteService } from '../services/favoriteService';
import { historyService } from '../services/historyService';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Heart, History, Plus, Disc, Globe, Lock, Music, HardDrive } from 'lucide-react';
import { Button } from '../components/common/Button';

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const { data: myPlaylists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => playlistService.getMyPlaylists(),
    enabled: isAuthenticated,
  });

  const { data: publicPlaylists = [] } = useQuery({
    queryKey: ['featured-playlists'],
    queryFn: () => playlistService.getFeaturedPlaylists(),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteService.getFavorites(1),
    enabled: isAuthenticated,
  });

  const { data: historyStats } = useQuery({
    queryKey: ['history-stats'],
    queryFn: () => historyService.getStats(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
          <Disc className="w-8 h-8 animate-spin-slow" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Personal Music Library</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Sign in to create playlists, bookmark your favorite tracks, and build your personalized streaming profile.
        </p>
        <Button variant="primary" size="md" onClick={() => openModal('login')}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading">
            Your Library
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage your playlists, liked tracks, and listening history</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => openModal('createPlaylist')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </Button>
      </div>

      {/* Quick Access Highlights (Liked Songs, History, Local Offline Music) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Liked Songs Box */}
        <div
          onClick={() => navigate('/favorites')}
          className="group relative p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-pink-900/20 border border-white/10 hover:border-pink-500/40 cursor-pointer transition-all duration-300 shadow-xl flex items-center justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-pink-400">Collection</span>
            <h3 className="text-2xl font-bold text-white">Liked Songs</h3>
            <p className="text-xs text-slate-300">Quick access to all your favorited tracks</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-lg group-hover:scale-110 transition-transform">
            <Heart className="w-7 h-7 fill-current" />
          </div>
        </div>

        {/* Listening History Box */}
        <div
          onClick={() => navigate('/history')}
          className="group relative p-6 rounded-2xl bg-gradient-to-br from-slate-900/60 via-indigo-950/30 to-cyan-900/20 border border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all duration-300 shadow-xl flex items-center justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Analytics</span>
            <h3 className="text-2xl font-bold text-white">Listening History</h3>
            <p className="text-xs text-slate-300">
              {historyStats ? `${historyStats.totalPlays} total plays logged` : 'View recently played songs'}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg group-hover:scale-110 transition-transform">
            <History className="w-7 h-7" />
          </div>
        </div>

        {/* Local Offline Music Box */}
        <div
          onClick={() => navigate('/local')}
          className="group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-zinc-900/50 to-teal-950/30 border border-white/10 hover:border-emerald-500/40 cursor-pointer transition-all duration-300 shadow-xl flex items-center justify-between"
        >
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Offline Ready</span>
            <h3 className="text-2xl font-bold text-white">Local Music</h3>
            <p className="text-xs text-slate-300">Play songs from device folder with zero internet</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg group-hover:scale-110 transition-transform">
            <HardDrive className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* User Playlists */}
      <div>
        <h3 className="text-xl font-bold text-white tracking-tight mb-4">Your Playlists</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Create New Card */}
          <div
            onClick={() => openModal('createPlaylist')}
            className="group aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-violet-500/50 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-white/5"
          >
            <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-violet-400">Create Playlist</span>
          </div>

          {/* Existing Playlists */}
          {myPlaylists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="group p-3.5 rounded-2xl glass-card cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-900 border border-white/5 shadow-md flex items-center justify-center">
                {pl.cover_image ? (
                  <img src={pl.cover_image} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Music className="w-10 h-10 text-slate-600 group-hover:text-violet-400 transition-colors" />
                )}
                <div className="absolute top-2 right-2 p-1 rounded-md bg-black/50 text-[10px] text-slate-300 backdrop-blur-md">
                  {pl.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">{pl.title}</h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">{pl.track_count || 0} tracks</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Community Playlists */}
      {publicPlaylists.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight mb-4">Community Playlists</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {publicPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                className="group p-3.5 rounded-2xl glass-card cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-slate-900 border border-white/5 shadow-md flex items-center justify-center">
                  {pl.cover_image ? (
                    <img src={pl.cover_image} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Music className="w-10 h-10 text-slate-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-violet-300 transition-colors">{pl.title}</h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{pl.user_name || 'AuraStream'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
