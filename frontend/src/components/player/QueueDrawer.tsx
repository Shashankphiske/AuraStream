import React from 'react';
import { X, Play, Trash2, Music } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentTrack,
    isQueueOpen,
    toggleQueue,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed top-0 right-0 bottom-24 w-80 md:w-96 glass-panel border-l border-white/10 z-30 flex flex-col p-5 animate-in slide-in-from-right duration-300 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-white text-base">Playback Queue</h3>
          <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">
            {queue.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              title="Clear Queue"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleQueue}
            aria-label="Close queue drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Now Playing Section */}
      {currentTrack && (
        <div className="py-4 border-b border-white/10">
          <p className="text-xs uppercase font-semibold tracking-wider text-violet-400 mb-2">Now Playing</p>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-violet-600/10 border border-violet-500/20">
            <img
              src={currentTrack.thumbnail_url}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{currentTrack.artist}</p>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1.5">
        <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-2">Next In Queue</p>
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <Music className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs text-slate-600 mt-1">Play or add tracks to build your queue</p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const isCurrent = idx === queueIndex;
            return (
              <div
                key={`${track.youtube_id}_${idx}`}
                className={`group flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer ${
                  isCurrent ? 'bg-white/10 text-violet-400' : 'hover:bg-white/5 text-slate-300'
                }`}
                onClick={() => playTrack(track, queue)}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={track.thumbnail_url} alt={track.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-3.5 h-3.5 text-white fill-current" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-white group-hover:text-violet-400">
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{track.artist}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromQueue(idx);
                  }}
                  title="Remove from queue"
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
