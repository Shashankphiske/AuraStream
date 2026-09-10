import React from 'react';
import { X, Mic2 } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const LyricsDrawer: React.FC = () => {
  const { currentTrack, isLyricsOpen, toggleLyrics } = usePlayerStore();

  if (!isLyricsOpen || !currentTrack) return null;

  return (
    <div className="fixed top-0 right-0 bottom-24 w-80 md:w-96 glass-panel border-l border-white/10 z-30 flex flex-col p-6 animate-in slide-in-from-right duration-300 shadow-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Mic2 className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-white text-base">Lyrics</h3>
        </div>
        <button
          onClick={toggleLyrics}
          aria-label="Close lyrics drawer"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="py-4">
        <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
        <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 text-center py-6 text-slate-300 font-medium leading-relaxed select-text">
        <p className="text-slate-500 italic text-xs mb-4">Lyrics synced with YouTube stream</p>
        <p className="hover:text-white transition-colors cursor-default text-sm">
          Feel the neon rhythm in the midnight glow
        </p>
        <p className="text-violet-400 font-bold text-base scale-105 transition-all">
          Streaming melodies that guide you home
        </p>
        <p className="hover:text-white transition-colors cursor-default text-sm">
          Lost in soundscapes, drifting high and low
        </p>
        <p className="hover:text-white transition-colors cursor-default text-sm">
          Through the city lights we wander alone
        </p>
        <div className="pt-6 border-t border-white/5 text-xs text-slate-500">
          Source: YouTube Music Community
        </div>
      </div>
    </div>
  );
};
