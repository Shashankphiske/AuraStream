import { create } from 'zustand';
import { ITrack, RepeatMode } from '../types';
import { historyService } from '../services/historyService';

interface PlayerState {
  currentTrack: ITrack | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  queue: ITrack[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isVideoMode: boolean;
  isPipMinimized: boolean;
  playbackNotice: { code: number; message: string; videoId: string } | null;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  seekTarget: number | null; // Used to signal YouTube bridge to seek

  // Actions
  playTrack: (track: ITrack, newQueue?: ITrack[]) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  seekTo: (seconds: number) => void;
  clearSeekTarget: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addToQueue: (track: ITrack) => void;
  playNext: (track: ITrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleVideoMode: () => void;
  setVideoMode: (enabled: boolean) => void;
  togglePipMinimized: () => void;
  setPipMinimized: (minimized: boolean) => void;
  setPlaybackNotice: (notice: { code: number; message: string; videoId: string } | null) => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
}

// Load initial volume from localStorage if available
const initialVolume = Number(localStorage.getItem('aurastream_volume') || '80');

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: initialVolume,
  isMuted: false,
  currentTime: 0,
  duration: 0,
  queue: [],
  queueIndex: -1,
  isShuffle: false,
  repeatMode: 'off',
  isVideoMode: false,
  isPipMinimized: false,
  playbackNotice: null,
  isQueueOpen: false,
  isLyricsOpen: false,
  seekTarget: null,

  playTrack: (track, newQueue) => {
    const state = get();
    let updatedQueue = state.queue;
    let newIndex = 0;

    if (newQueue && newQueue.length > 0) {
      updatedQueue = newQueue;
      newIndex = newQueue.findIndex(t => t.youtube_id === track.youtube_id);
      if (newIndex === -1) newIndex = 0;
    } else if (!state.queue.some(t => t.youtube_id === track.youtube_id)) {
      updatedQueue = [track, ...state.queue];
      newIndex = 0;
    } else {
      newIndex = state.queue.findIndex(t => t.youtube_id === track.youtube_id);
    }

    set({
      currentTrack: track,
      isPlaying: true,
      queue: updatedQueue,
      queueIndex: newIndex,
      currentTime: 0,
      duration: track.duration || 0,
      playbackNotice: null,
    });

    // Log playback to backend history asynchronously
    historyService.logPlay(track, 0).catch(() => {});
  },

  togglePlay: () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  setVolume: (volume) => {
    localStorage.setItem('aurastream_volume', String(volume));
    set({ volume, isMuted: volume === 0 });
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    set({ isMuted: !isMuted, volume: !isMuted ? 0 : (volume || 80) });
  },

  setCurrentTime: (currentTime) => set({ currentTime }),

  setDuration: (duration) => set({ duration }),

  seekTo: (seconds) => set({ seekTarget: seconds, currentTime: seconds }),

  clearSeekTarget: () => set({ seekTarget: null }),

  nextTrack: () => {
    const { queue, queueIndex, isShuffle, repeatMode, currentTrack } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one' && currentTrack) {
      set({ currentTime: 0, isPlaying: true, seekTarget: 0 });
      return;
    }

    if (isShuffle && queue.length > 1) {
      let randomIndex = Math.floor(Math.random() * queue.length);
      if (randomIndex === queueIndex) {
        randomIndex = (randomIndex + 1) % queue.length;
      }
      const nextSong = queue[randomIndex];
      set({ currentTrack: nextSong, queueIndex: randomIndex, currentTime: 0, isPlaying: true });
      historyService.logPlay(nextSong, 0).catch(() => {});
      return;
    }

    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      const nextSong = queue[nextIndex];
      set({ currentTrack: nextSong, queueIndex: nextIndex, currentTime: 0, isPlaying: true });
      historyService.logPlay(nextSong, 0).catch(() => {});
    } else if (repeatMode === 'all') {
      const firstSong = queue[0];
      set({ currentTrack: firstSong, queueIndex: 0, currentTime: 0, isPlaying: true });
      historyService.logPlay(firstSong, 0).catch(() => {});
    } else {
      set({ isPlaying: false });
    }
  },

  prevTrack: () => {
    const { queue, queueIndex, currentTime } = get();
    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      set({ currentTime: 0, seekTarget: 0 });
      return;
    }

    if (queue.length === 0) return;
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      const prevSong = queue[prevIndex];
      set({ currentTrack: prevSong, queueIndex: prevIndex, currentTime: 0, isPlaying: true });
      historyService.logPlay(prevSong, 0).catch(() => {});
    }
  },

  addToQueue: (track) => {
    const { queue } = get();
    set({ queue: [...queue, track] });
  },

  playNext: (track) => {
    const { queue, queueIndex } = get();
    const updated = [...queue];
    updated.splice(queueIndex + 1, 0, track);
    set({ queue: updated });
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    const updated = queue.filter((_, i) => i !== index);
    let newIndex = queueIndex;
    if (index < queueIndex) newIndex--;
    set({ queue: updated, queueIndex: Math.max(0, newIndex) });
  },

  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  toggleRepeat: () => {
    const { repeatMode } = get();
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    set({ repeatMode: nextMode });
  },

  toggleVideoMode: () => set((state) => ({ isVideoMode: !state.isVideoMode })),

  setVideoMode: (enabled) => set({ isVideoMode: enabled }),

  togglePipMinimized: () => set((state) => ({ isPipMinimized: !state.isPipMinimized })),

  setPipMinimized: (minimized) => set({ isPipMinimized: minimized }),

  setPlaybackNotice: (notice) => set({ playbackNotice: notice }),

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),

  toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen })),
}));
