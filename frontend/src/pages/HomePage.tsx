import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { recommendationService } from '../services/recommendationService';
import { useAuthStore } from '../store/useAuthStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackCard } from '../components/music/TrackCard';
import { GenreCard } from '../components/music/GenreCard';
import { MOOD_CATEGORIES } from '../constants';
import { Play } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useNavigate } from 'react-router-dom';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { playTrack } = usePlayerStore();

  const { data: feed, isLoading } = useQuery({
    queryKey: ['home-feed', user?.id],
    queryFn: () => recommendationService.getHomeFeed(),
  });

  const featuredTrack = feed?.trending?.[0];

  return (
    <div className="space-y-10">
      {/* 1. Refined Editorial Hero Banner */}
      {featuredTrack && (
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900/50 border border-zinc-800/80 p-6 md:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0 bg-zinc-950">
              <img
                src={featuredTrack.thumbnail_url}
                alt={featuredTrack.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src.includes('hqdefault.jpg')) {
                    el.src = el.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                  } else if (!el.src.includes('unsplash.com')) {
                    el.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
                  }
                }}
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-zinc-300 text-xs font-medium border border-white/10">
                <span>Featured Stream</span>
              </div>

              <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight leading-snug line-clamp-2">
                {featuredTrack.title}
              </h2>

              <p className="text-sm text-zinc-400">{featuredTrack.artist}</p>

              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => playTrack(featuredTrack, feed?.trending)}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Stream</span>
                </Button>

                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(`/track/${featuredTrack.youtube_id}`)}
                >
                  Track Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Contextual Greeting & Quick Picks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              {getGreeting()}{user ? `, ${user.name}` : ''}
            </h3>
            {user?.interests && user.interests.length > 0 && (
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                Tailored
              </span>
            )}
          </div>
        </div>

        {/* Quick Picks Grid */}
        {feed?.jumpBackIn && feed.jumpBackIn.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {feed.jumpBackIn.slice(0, 6).map((track) => (
              <div
                key={track.youtube_id}
                onClick={() => playTrack(track, feed.jumpBackIn)}
                className="group flex items-center gap-3 p-2 rounded-xl bg-zinc-900/40 hover:bg-zinc-850/70 border border-white/[0.05] hover:border-white/[0.1] cursor-pointer transition-all duration-150"
              >
                <img
                  src={track.thumbnail_url}
                  alt={track.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-zinc-950"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.src.includes('hqdefault.jpg')) {
                      el.src = el.src.replace('hqdefault.jpg', 'mqdefault.jpg');
                    } else if (!el.src.includes('unsplash.com')) {
                      el.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600';
                    }
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                </div>
                <button
                  aria-label="Play"
                  className="p-2 rounded-full bg-white text-black shadow-md opacity-0 group-hover:opacity-100 transition-opacity mr-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Made For You (Daily Mixes) */}
      {feed?.madeForYou && feed.madeForYou.length > 0 && (
        <div>
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight mb-4">Made For You</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {feed.madeForYou.map((mix) => (
              <div
                key={mix.id}
                onClick={() => {
                  if (mix.tracks.length > 0) {
                    playTrack(mix.tracks[0], mix.tracks);
                  }
                }}
                className="group relative rounded-2xl overflow-hidden bg-zinc-900/40 hover:bg-zinc-850/60 border border-white/[0.05] hover:border-white/[0.1] p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-zinc-950">
                  <img
                    src={mix.cover_image}
                    alt={mix.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-[11px] font-medium text-zinc-300">
                      {mix.tracks.length} tracks
                    </span>
                  </div>
                  <button
                    aria-label="Play Mix"
                    className="absolute bottom-2.5 right-2.5 p-2.5 rounded-full bg-white text-black shadow-md opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {mix.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{mix.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Trending Hits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">Trending</h3>
          <button
            onClick={() => navigate('/search?q=trending hits')}
            className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-zinc-900/60 animate-pulse" />
              ))
            : feed?.trending?.slice(0, 12).map((track) => (
                <TrackCard key={track.youtube_id} track={track} queueContext={feed.trending} />
              ))}
        </div>
      </div>

      {/* 5. Soundscapes & Moods */}
      <div>
        <h3 className="text-lg md:text-xl font-bold text-white tracking-tight mb-4">Soundscapes & Moods</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {MOOD_CATEGORIES.map((mood) => (
            <GenreCard
              key={mood.id}
              title={mood.title}
              query={mood.query}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
