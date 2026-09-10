import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Library,
  Radio,
  HardDrive,
  Heart,
  History,
  PlusSquare,
  ShieldCheck,
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useQuery } from '@tanstack/react-query';
import { playlistService } from '../../services/playlistService';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const { currentRoom } = useRoomStore();

  const { data: userPlaylists = [] } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => playlistService.getMyPlaylists(),
    enabled: isAuthenticated,
  });

  const handleCreatePlaylist = () => {
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    openModal('createPlaylist');
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
      isActive
        ? 'bg-zinc-800/80 text-white font-semibold'
        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
    }`;

  return (
    <aside className="w-64 h-screen pb-28 bg-[#09090b] border-r border-zinc-850/80 flex flex-col select-none flex-shrink-0">
      {/* Brand Header */}
      <div
        onClick={() => navigate('/')}
        className="px-6 py-6 flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center p-1.5 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <rect x="3" y="9" width="3" height="6" rx="1.5" fill="currentColor" />
            <rect x="8.5" y="4" width="3" height="16" rx="1.5" fill="currentColor" />
            <rect x="14" y="2" width="3" height="20" rx="1.5" fill="currentColor" />
            <rect x="19.5" y="7" width="3" height="10" rx="1.5" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1 font-heading">
            AuraStream
          </h1>
          <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">Music & Video</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-3 space-y-1">
        <NavLink to="/" end className={navItemClass}>
          <Home className="w-4 h-4" />
          <span>Home</span>
        </NavLink>
        <NavLink to="/search" className={navItemClass}>
          <Search className="w-4 h-4" />
          <span>Search</span>
        </NavLink>
        <NavLink to="/rooms" className={navItemClass}>
          <Radio className="w-4 h-4 text-rose-400" />
          <span className="flex-1 flex items-center justify-between">
            <span>Listen Together</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full">
              Live
            </span>
          </span>
        </NavLink>
        <NavLink to="/library" className={navItemClass}>
          <Library className="w-4 h-4" />
          <span>Library</span>
        </NavLink>
      </div>

      {/* Active Room Session Floating Alert if in room */}
      {currentRoom && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-xs font-semibold text-white truncate">{currentRoom.name}</p>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Code: {currentRoom.code}</p>
          </div>
          <button
            onClick={() => navigate(`/room/${currentRoom.code}`)}
            className="text-[11px] px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-medium cursor-pointer"
          >
            Enter
          </button>
        </div>
      )}

      {/* Library Quick Access */}
      <div className="mt-6 px-3">
        <p className="px-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Collections
        </p>
        <div className="space-y-0.5">
          <NavLink to="/local" className={navItemClass}>
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span className="flex-1 flex items-center justify-between">
              <span>Local Files</span>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                Offline
              </span>
            </span>
          </NavLink>
          <NavLink to="/favorites" className={navItemClass}>
            <Heart className="w-4 h-4" />
            <span>Liked Songs</span>
          </NavLink>
          <NavLink to="/history" className={navItemClass}>
            <History className="w-4 h-4" />
            <span>History</span>
          </NavLink>
          <button
            onClick={handleCreatePlaylist}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50 transition-colors text-left cursor-pointer"
          >
            <PlusSquare className="w-4 h-4" />
            <span>Create Playlist</span>
          </button>
        </div>
      </div>

      {/* Admin Panel Link if Admin */}
      {user?.role === 'admin' && (
        <div className="mt-4 px-3">
          <NavLink to="/admin" className={navItemClass}>
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Console</span>
          </NavLink>
        </div>
      )}

      {/* User Playlists Scroll Area */}
      <div className="mt-6 flex-1 px-3 min-h-0 flex flex-col border-t border-zinc-850/80 pt-4">
        <div className="px-3.5 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Playlists</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {userPlaylists.length === 0 ? (
            <p className="px-3.5 py-2 text-xs text-zinc-500 italic">No playlists yet</p>
          ) : (
            userPlaylists.map((pl) => (
              <NavLink
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className={({ isActive }) =>
                  `block px-3.5 py-2 rounded-lg text-xs truncate transition-colors ${
                    isActive ? 'text-white font-medium bg-zinc-850' : 'text-zinc-400 hover:text-white'
                  }`
                }
              >
                {pl.title}
              </NavLink>
            ))
          )}
        </div>
      </div>

      {/* Footer / YouTube API Compliance Notice */}
      <div className="px-4 py-3 border-t border-zinc-850/60 mt-auto">
        <button
          onClick={() => openModal('compliance')}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>YouTube API Policies & Terms</span>
        </button>
      </div>
    </aside>
  );
};

