import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { musicService } from '../services/musicService';
import { Search } from 'lucide-react';
import { TrackRow } from '../components/music/TrackRow';
import { TrackCard } from '../components/music/TrackCard';
import { GenreCard } from '../components/music/GenreCard';
import { GENRE_ITEMS, MOOD_CATEGORIES } from '../constants';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<'all' | 'tracks' | 'videos'>('all');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      if (query.trim()) {
        setSearchParams({ q: query.trim() });
      } else {
        setSearchParams({});
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Sync state if URL search param changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) {
      setQuery(q);
      setDebouncedQuery(q);
    }
  }, [searchParams]);

  const { data: searchResults = [], isLoading, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => musicService.search(debouncedQuery, 30),
    enabled: debouncedQuery.length > 0,
  });

  const hasQuery = debouncedQuery.length > 0;
  const topResult = searchResults[0];

  return (
    <div className="space-y-8">
      {/* 1. Large Search Bar */}
      <div className="max-w-2xl space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = query.trim();
            setDebouncedQuery(trimmed);
            if (trimmed) setSearchParams({ q: trimmed });
          }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, genres, or YouTube hits..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm md:text-base outline-none focus:border-zinc-500 transition-all shadow-lg"
            autoFocus
          />
          {isFetching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
            </div>
          )}
        </form>

        {/* Filter Chips */}
        {hasQuery && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              All Results
            </button>
            <button
              onClick={() => setFilterType('tracks')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'tracks'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Tracks
            </button>
            <button
              onClick={() => setFilterType('videos')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterType === 'videos'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Grid View
            </button>
          </div>
        )}
      </div>

      {/* 2. Search Results View */}
      {hasQuery ? (
        isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-zinc-900/50 animate-pulse" />
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 space-y-2">
            <Search className="w-10 h-10 mx-auto stroke-1 text-zinc-600" />
            <h4 className="text-base font-semibold text-zinc-300">No tracks found</h4>
            <p className="text-xs text-zinc-500">Try searching for a different song title or artist name</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Match & Side List (when 'all' is selected) */}
            {filterType === 'all' && topResult && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Top Result
                  </h3>
                  <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between h-[210px]">
                    <div className="flex items-center gap-4">
                      <img
                        src={topResult.thumbnail_url}
                        alt={topResult.title}
                        className="w-20 h-20 rounded-xl object-cover shadow-md flex-shrink-0 bg-zinc-950"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          Track
                        </span>
                        <h4 className="text-base font-semibold text-white truncate mt-1.5">{topResult.title}</h4>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{topResult.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                      <span className="text-xs text-zinc-500">
                        YouTube Stream
                      </span>
                      <span className="text-xs font-medium text-zinc-300">
                        High Fidelity
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Songs
                  </h3>
                  <div className="space-y-1">
                    {searchResults.slice(0, 4).map((track, i) => (
                      <TrackRow key={track.youtube_id} track={track} index={i} queueContext={searchResults} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Grid / List Results */}
            <div>
              <h3 className="text-base font-bold text-white mb-3">
                {filterType === 'videos' ? 'Video Streams' : 'All Matching Songs'}
              </h3>

              {filterType === 'videos' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {searchResults.map((track) => (
                    <TrackCard key={track.youtube_id} track={track} queueContext={searchResults} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((track, i) => (
                    <TrackRow key={track.youtube_id} track={track} index={i} queueContext={searchResults} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* 3. Browse Categories & Moods Grid (Empty Query) */
        <div className="space-y-8">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight mb-4">Explore Moods</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {MOOD_CATEGORIES.map((m) => (
                <GenreCard key={m.id} title={m.title} query={m.query} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight mb-4">Browse Genres</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {GENRE_ITEMS.map((genre) => (
                <GenreCard
                  key={genre}
                  title={genre}
                  query={`${genre} music`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
