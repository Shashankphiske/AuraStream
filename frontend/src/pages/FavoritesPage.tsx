import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { favoriteService } from '../services/favoriteService';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useUIStore } from '../store/useUIStore';
import { TrackRow } from '../components/music/TrackRow';
import { Button } from '../components/common/Button';
import { Heart, Play, Shuffle, Music } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();
  const { playTrack, toggleShuffle } = usePlayerStore();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteService.getFavorites(50),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
          <Heart className="w-8 h-8 fill-current" />
        </div>
        <h3 className="text-xl font-bold text-white">Liked Songs</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          Sign in to view and play all your favorited tracks in one place.
        </p>
        <Button variant="primary" size="sm" onClick={() => openModal('login')}>
          Sign In
        </Button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      playTrack(favorites[0], favorites);
    }
  };

  const handleShuffleAll = () => {
    if (favorites.length > 0) {
      const randomIndex = Math.floor(Math.random() * favorites.length);
      toggleShuffle();
      playTrack(favorites[randomIndex], favorites);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 md:p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 shadow-sm">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-zinc-850 border border-zinc-700/60 flex items-center justify-center text-white shadow-md flex-shrink-0">
          <Heart className="w-14 h-14 fill-current text-white" />
        </div>

        <div className="space-y-1.5 text-center sm:text-left">
          <span className="text-xs uppercase font-medium tracking-wider text-zinc-400">Collection</span>
          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight font-heading">
            Liked Songs
          </h1>
          <p className="text-xs text-zinc-400">
            {favorites.length} track{favorites.length !== 1 ? 's' : ''} saved
          </p>
        </div>
      </div>

      {/* Play Controls */}
      {favorites.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handlePlayAll}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play All</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleShuffleAll}
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </Button>
        </div>
      )}

      {/* Track List */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <Music className="w-10 h-10 mx-auto stroke-1" />
            <p className="text-base font-bold text-slate-400">No liked songs yet</p>
            <p className="text-xs">Tap the heart icon on any song to save it here</p>
          </div>
        ) : (
          favorites.map((track, i) => (
            <TrackRow key={track.youtube_id} track={track} index={i} queueContext={favorites} />
          ))
        )}
      </div>
    </div>
  );
};
