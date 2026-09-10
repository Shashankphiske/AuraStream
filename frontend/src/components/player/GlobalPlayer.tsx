import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Mic2,
  Video,
  Heart,
  Maximize2,
  ExternalLink,
  Radio,
  Wifi,
  HardDrive,
  X,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useRoomStore } from '../../store/useRoomStore';
import { useHotspotStore } from '../../store/useHotspotStore';
import { favoriteService } from '../../services/favoriteService';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const GlobalPlayer: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    queue,
    isShuffle,
    repeatMode,
    isQueueOpen,
    isLyricsOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleVideoMode,
    toggleQueue,
    toggleLyrics,
    closePlayer,
  } = usePlayerStore();

  const { currentRoom, isHost, broadcastSync, leaveRoom } = useRoomStore();
  const { isPartyActive, partyCode, broadcastPlayback } = useHotspotStore();
  const [isLiked, setIsLiked] = useState(false);

  if (!currentTrack) return null;

  const handleClosePlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    closePlayer();
    if (currentRoom) {
      leaveRoom();
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openModal('login');
      return;
    }
    try {
      const res = await favoriteService.toggleFavorite(currentTrack);
      setIsLiked(res.isFavorite);
    } catch {}
  };

  const handleTogglePlay = () => {
    togglePlay();
    if (currentRoom) {
      if (currentRoom.dj_mode === 'collaborative' || isHost) {
        broadcastSync(isPlaying ? 'PAUSE' : 'PLAY', {
          isPlaying: !isPlaying,
          time: currentTime,
          track: currentTrack,
        });
      }
    }
    if (isPartyActive) {
      broadcastPlayback(isPlaying ? 'PAUSE' : 'PLAY', {
        isPlaying: !isPlaying,
        time: currentTime,
        track: currentTrack,
      });
    }
  };

  const handleSeek = (newTime: number) => {
    seekTo(newTime);
    if (currentRoom) {
      if (currentRoom.dj_mode === 'collaborative' || isHost) {
        broadcastSync('SEEK', {
          isPlaying,
          time: newTime,
          track: currentTrack,
        });
      }
    }
    if (isPartyActive) {
      broadcastPlayback('SEEK', {
        isPlaying,
        time: newTime,
        track: currentTrack,
      });
    }
  };

  const handleNext = () => {
    nextTrack();
    if (currentRoom) {
      if (currentRoom.dj_mode === 'collaborative' || isHost) {
        setTimeout(() => {
          const fresh = usePlayerStore.getState().currentTrack;
          broadcastSync('NEXT_TRACK', {
            isPlaying: true,
            time: 0,
            track: fresh,
          });
        }, 100);
      }
    }
    if (isPartyActive) {
      setTimeout(() => {
        const fresh = usePlayerStore.getState().currentTrack;
        broadcastPlayback('PLAY', {
          isPlaying: true,
          time: 0,
          track: fresh,
        });
      }, 100);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[68px] left-2 right-2 md:bottom-0 md:left-0 md:right-0 z-40 h-14 md:h-24 bg-zinc-900/95 md:bg-[#09090b]/95 backdrop-blur-xl border border-white/10 md:border-t md:border-b-0 md:border-x-0 md:border-zinc-850 rounded-xl md:rounded-none px-3 md:px-6 flex items-center justify-between text-white select-none shadow-2xl">
      {/* Mobile Top Hairline Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-zinc-800 md:hidden overflow-hidden rounded-t-xl">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 1. Track Info (Left on Desktop, Main on Mobile) */}
      <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0 flex-1 md:flex-initial md:w-1/4 md:max-w-xs pr-2">
        <div
          onClick={() => navigate(`/track/${currentTrack.youtube_id}`)}
          className="relative w-9 h-9 md:w-14 md:h-14 rounded-lg md:rounded-xl overflow-hidden shadow-md border border-white/10 flex-shrink-0 cursor-pointer group bg-zinc-900"
        >
          <img
            src={currentTrack.thumbnail_url}
            alt={currentTrack.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h4
            onClick={() => navigate(currentTrack.is_local ? '/local' : `/track/${currentTrack.youtube_id}`)}
            className="text-xs md:text-sm font-medium text-white truncate hover:underline cursor-pointer"
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h4>
          <div className="flex items-center gap-1.5 truncate">
            <p className="text-[11px] md:text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            {currentTrack.is_local && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Desktop Quick Tools in Left Column */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleLike}
            aria-label="Like song"
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isLiked ? 'text-rose-500 hover:text-rose-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          {!currentTrack.is_local && (
            <button
              onClick={toggleVideoMode}
              title="Switch to Video Mode"
              className="p-2 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {currentTrack.is_local ? (
            <div
              title="Playing directly from local device storage"
              className="p-2 text-emerald-400"
            >
              <HardDrive className="w-4 h-4" />
            </div>
          ) : (
            <a
              href={`https://www.youtube.com/watch?v=${currentTrack.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Watch on official YouTube"
              className="p-2 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Mobile-Only Action Buttons (Right) */}
      <div className="flex md:hidden items-center gap-1 flex-shrink-0">
        <button
          onClick={handleLike}
          aria-label="Like song"
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {!currentTrack.is_local && (
          <button
            onClick={toggleVideoMode}
            title="Switch to Video Mode"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Video className="w-4 h-4" />
          </button>
        )}

        {currentTrack.is_local ? (
          <div
            title="Local Offline File"
            className="p-1.5 text-emerald-400"
          >
            <HardDrive className="w-4 h-4" />
          </div>
        ) : (
          <a
            href={`https://www.youtube.com/watch?v=${currentTrack.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Watch on official YouTube"
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          onClick={handleTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          className="p-2 rounded-full bg-white text-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer ml-0.5"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={handleClosePlayer}
          title="Close Player"
          aria-label="Close Player"
          className="p-1.5 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Controls & Scrubber (Desktop Center) */}
      <div className="hidden md:flex flex-col items-center justify-center w-full max-w-xl px-2">
        {/* Playback Buttons */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={toggleShuffle}
            title="Shuffle"
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isShuffle ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevTrack}
            title="Previous"
            className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="p-3 rounded-full bg-white text-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            title="Next"
            className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            title={`Repeat: ${repeatMode}`}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              repeatMode !== 'off' ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full flex items-center gap-2.5 text-xs text-zinc-400 font-mono">
          <span className="w-9 text-right text-[11px]">{formatSeconds(currentTime)}</span>
          <div className="relative flex-1 flex items-center group cursor-pointer py-1.5">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime || 0}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              aria-label="Seek track position"
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none outline-none cursor-pointer accent-white group-hover:h-1.5 transition-all"
            />
          </div>
          <span className="w-9 text-[11px]">{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* 3. Extra Tools & Volume (Desktop Right) */}
      <div className="hidden md:flex items-center justify-end gap-3 w-1/4 max-w-xs">
        {/* Active Room Badge */}
        {currentRoom && (
          <button
            onClick={() => navigate(`/room/${currentRoom.code}`)}
            title={`Live Room Session: ${currentRoom.name} (${currentRoom.code})`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span className="hidden xl:inline">{currentRoom.code}</span>
          </button>
        )}

        {/* Active Wi-Fi Hotspot Party Badge */}
        {isPartyActive && (
          <button
            onClick={() => navigate('/local')}
            title={`Wi-Fi Hotspot Party Active (${partyCode})`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span className="hidden xl:inline">{partyCode}</span>
          </button>
        )}

        {/* Minimalist Soundwave Equalizer */}
        {isPlaying && (
          <div className="hidden lg:flex items-end gap-1 h-4 px-2" title="Playing">
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>
        )}

        <button
          onClick={toggleLyrics}
          title="Lyrics"
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isLyricsOpen ? 'text-white bg-white/15' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Mic2 className="w-4 h-4" />
        </button>

        <button
          onClick={toggleQueue}
          title="Playback Queue"
          className={`relative p-2 rounded-full transition-colors cursor-pointer ${
            isQueueOpen ? 'text-white bg-white/15' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
          )}
        </button>

        {/* Volume Slider */}
        <div className="hidden sm:flex items-center gap-2 group">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseInt(e.target.value, 10))}
            aria-label="Volume slider"
            className="w-20 h-1 bg-zinc-800 rounded-full appearance-none outline-none accent-white cursor-pointer group-hover:bg-zinc-700 transition-colors"
          />
        </div>

        {/* Close Player */}
        <button
          onClick={handleClosePlayer}
          title="Close Player"
          aria-label="Close Player"
          className="p-2 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
