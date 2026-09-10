import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { musicService } from '../services/musicService';
import { recommendationService } from '../services/recommendationService';
import { favoriteService } from '../services/favoriteService';
import { usePlayerStore } from '../store/usePlayerStore';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { Play, Pause, Video, Heart, Plus, Eye, Clock, Disc, Radio, ExternalLink } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { TrackRow } from '../components/music/TrackRow';

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '3:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const TrackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, setVideoMode } = usePlayerStore();
  const { openModal } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  const [isLiked, setIsLiked] = useState(false);

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', id],
    queryFn: () => musicService.getTrackDetails(id!),
    enabled: Boolean(id),
  });

  const { data: similarTracks = [] } = useQuery({
    queryKey: ['similar-tracks', id],
    queryFn: () => recommendationService.getSimilarTracks(id!, 8),
    enabled: Boolean(id),
  });

  // Check liked status
  useEffect(() => {
    if (track && isAuthenticated) {
      favoriteService.checkIsFavorite(track.youtube_id).then(setIsLiked).catch(() => {});
    }
  }, [track, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-72 rounded-3xl bg-slate-900/60" />
        <div className="h-48 rounded-2xl bg-slate-900/40" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-bold text-white">Track not found</h3>
        <Button variant="primary" size="sm" onClick={() => navigate('/')} className="mt-4">
          Return to Home
        </Button>
      </div>
    );
  }

  const isCurrent = currentTrack?.youtube_id === track.youtube_id;

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, [track, ...similarTracks]);
    }
  };

  const handleWatchVideo = () => {
    if (!isCurrent) {
      playTrack(track, [track, ...similarTracks]);
    }
    setVideoMode(true);
  };

  const handleToggleLike = async () => {
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
    <div className="space-y-10">
      {/* 1. Track Hero Header */}
      <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 bg-zinc-900/50 border border-zinc-800/80 shadow-sm">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
          <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-md bg-zinc-950 border border-white/10 flex-shrink-0">
            <img
              src={track.thumbnail_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2.5">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/60">
                {track.genre || 'Music'}
              </span>
              <span className="text-xs text-zinc-500">YouTube Stream</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {track.title}
            </h1>

            <p className="text-base text-zinc-400 font-medium">{track.artist}</p>

            <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-zinc-400 font-mono pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatSeconds(track.duration)}
              </span>
              {track.views ? (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {track.views.toLocaleString()} views
                </span>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handlePlay}
                className="flex items-center gap-2"
              >
                {isCurrent && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                    <span>Play Audio</span>
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={handleWatchVideo}
                className="flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>Watch Video</span>
              </Button>

              <Button
                variant="secondary"
                size="icon"
                onClick={handleToggleLike}
                aria-label="Favorite"
                className={`rounded-full ${isLiked ? 'text-rose-500' : 'text-zinc-400'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </Button>

              <Button
                variant="secondary"
                size="icon"
                onClick={() => openModal('addToPlaylist', track)}
                aria-label="Add to playlist"
                className="rounded-full text-zinc-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>

              <a
                href={`https://www.youtube.com/watch?v=${track.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                title="Watch on official YouTube (Opens in new tab)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                <span>Watch on YouTube</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lyrics & Story Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-2xl glass-panel p-6 border border-white/10 space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Lyrics</span>
            <span className="text-xs font-normal text-slate-400">• High Fidelity Stream</span>
          </h3>

          <div className="space-y-3 text-zinc-300 font-medium leading-relaxed py-4 text-center select-text">
            <p className="text-zinc-500 italic text-xs mb-2">Synced lyrics from YouTube Music community</p>
            <p className="text-zinc-400 text-base">
              Listen to the waves in motion
            </p>
            <p className="text-white font-bold text-lg scale-105 transition-all">
              Midnight reverie across the digital horizon
            </p>
            <p className="text-zinc-400 text-base">
              Drifting through neon frequencies and glowing stars
            </p>
            <p className="text-zinc-500 text-sm">
              Lost in pure soundscapes where memories belong
            </p>
          </div>
        </div>

        {/* 3. Recommended Tracks / Related Music */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-zinc-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Recommended Related</h3>
          </div>

          <div className="space-y-1">
            {similarTracks.map((item, idx) => (
              <TrackRow
                key={item.youtube_id}
                track={item}
                index={idx}
                queueContext={[track, ...similarTracks]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
