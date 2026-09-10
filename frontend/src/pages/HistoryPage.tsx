import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { historyService } from '../services/historyService';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { TrackRow } from '../components/music/TrackRow';
import { Button } from '../components/common/Button';
import { History, Trash2, Clock, Music, Headphones } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => historyService.getHistory(50),
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery({
    queryKey: ['history-stats'],
    queryFn: () => historyService.getStats(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-850 border border-zinc-700/60 text-zinc-300 flex items-center justify-center">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Listening History</h3>
        <p className="text-xs text-zinc-400 max-w-xs">
          Sign in to view your streaming timeline and track listening habits.
        </p>
        <Button variant="primary" size="sm" onClick={() => openModal('login')}>
          Sign In
        </Button>
      </div>
    );
  }

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your listening history?')) return;
    try {
      await historyService.clearHistory();
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['history-stats'] });
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const totalMinutes = stats ? Math.round(stats.totalSeconds / 60) : 0;

  return (
    <div className="space-y-8">
      {/* Header & Stats Cards */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading">
            Listening History
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Tracks and sessions you've streamed on AuraStream</p>
        </div>

        {history.length > 0 && (
          <Button
            variant="glass"
            size="sm"
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </Button>
        )}
      </div>

      {/* Analytics Highlights */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Total Plays</p>
              <h3 className="text-xl font-bold text-white mt-0.5">{stats.totalPlays}</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Time Listened</p>
              <h3 className="text-xl font-bold text-white mt-0.5">{totalMinutes} mins</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Top Genre</p>
              <h3 className="text-xl font-bold text-white mt-0.5">
                {stats.topGenres?.[0]?.genre || 'Diverse'}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* History Track List */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <Music className="w-10 h-10 mx-auto stroke-1" />
            <p className="text-base font-bold text-slate-400">No playback history yet</p>
            <p className="text-xs">Songs you listen to will appear here</p>
          </div>
        ) : (
          history.map((track, i) => (
            <TrackRow key={`${track.youtube_id}_${i}`} track={track} index={i} queueContext={history} />
          ))
        )}
      </div>
    </div>
  );
};
