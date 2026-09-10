import React, { useState } from 'react';
import { Play, Pause, MoreVertical, ListPlus, Plus, Heart } from 'lucide-react';
import { ITrack } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { favoriteService } from '../../services/favoriteService';
import { useNavigate } from 'react-router-dom';

interface TrackCardProps {
  track: ITrack;
  queueContext?: ITrack[];
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, queueContext }) => {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue, playNext } = usePlayerStore();
  const { openModal } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const isCurrent = currentTrack?.youtube_id === track.youtube_id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      onClick={() => navigate(`/track/${track.youtube_id}`)}
      className="group relative p-3 rounded-2xl bg-zinc-900/40 hover:bg-zinc-850/60 border border-white/[0.05] hover:border-white/[0.1] cursor-pointer flex flex-col justify-between transition-all duration-200"
    >
      {/* Artwork with Overlay Play Button */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-zinc-900 border border-white/5 shadow-md">
        <img
          src={track.thumbnail_url}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

        {/* Play / Pause floating circle */}
        <button
          onClick={handlePlayClick}
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
          className={`absolute bottom-2.5 right-2.5 p-3 rounded-full bg-white text-black shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer ${
            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Favorite icon on top-right of image */}
        <button
          onClick={handleLike}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 backdrop-blur-md transition-opacity cursor-pointer ${
            isLiked ? 'opacity-100 text-rose-500' : 'opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Info & Options */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-medium truncate transition-colors ${
              isCurrent ? 'text-white font-semibold' : 'text-zinc-200 group-hover:text-white'
            }`}
            title={track.title}
          >
            {track.title}
          </h4>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
        </div>

        {/* Options Menu Toggle */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
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
