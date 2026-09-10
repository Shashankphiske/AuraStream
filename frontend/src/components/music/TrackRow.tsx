import React, { useState } from 'react';
import { Play, Pause, Heart, MoreHorizontal, Plus, ListPlus } from 'lucide-react';
import { ITrack } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { favoriteService } from '../../services/favoriteService';
import { useNavigate } from 'react-router-dom';

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '3:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface TrackRowProps {
  track: ITrack;
  index: number;
  queueContext?: ITrack[];
}

export const TrackRow: React.FC<TrackRowProps> = ({ track, index, queueContext }) => {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, playNext } = usePlayerStore();
  const { openModal } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const isCurrent = currentTrack?.youtube_id === track.youtube_id;

  const handleRowClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    try {
      const res = await favoriteService.toggleFavorite(track);
      setIsLiked(res.isFavorite);
    } catch {}
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between px-3.5 py-2 rounded-xl transition-colors cursor-pointer select-none ${
        isCurrent ? 'bg-zinc-850 text-white font-medium' : 'hover:bg-zinc-900/60 text-zinc-300'
      }`}
    >
      {/* 1. Index / Play Icon & Track Info (Left) */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-5 text-center text-xs text-zinc-500 flex items-center justify-center flex-shrink-0">
          <span className="group-hover:hidden">{isCurrent && isPlaying ? '▶' : index + 1}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick();
            }}
            aria-label="Play track"
            className="hidden group-hover:flex items-center justify-center text-white"
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        <img
          src={track.thumbnail_url}
          alt={track.title}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-zinc-950 border border-white/5"
          loading="lazy"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.src.includes('hqdefault.jpg')) {
              el.src = el.src.replace('hqdefault.jpg', 'mqdefault.jpg');
            } else if (!el.src.includes('unsplash.com')) {
              el.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
            }
          }}
        />

        <div className="min-w-0 flex-1 pr-4">
          <h4
            className={`text-sm truncate transition-colors ${
              isCurrent ? 'text-white font-semibold' : 'text-zinc-200 group-hover:text-white'
            }`}
            title={track.title}
          >
            {track.title}
          </h4>
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* 2. Genre / Album metadata (Center, hidden on small screens) */}
      <div className="hidden md:block w-36 text-xs text-zinc-500 truncate">
        {track.genre || 'Music'}
      </div>

      {/* 3. Duration, Favorite & Actions (Right) */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleLike}
          aria-label="Favorite track"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isLiked ? 'text-rose-500' : 'text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <span className="text-xs font-mono text-zinc-400 w-10 text-right">
          {formatSeconds(track.duration)}
        </span>

        {/* More actions menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            aria-label="Track options"
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/track/${track.youtube_id}`);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <span>Track Details</span>
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openModal('addToPlaylist', track);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Playlist</span>
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  addToQueue(track);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Add to Queue</span>
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  playNext(track);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 text-left transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Play Next</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
