import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/useRoomStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { useVoiceChatStore } from '../store/useVoiceChatStore';
import { voiceChatService } from '../services/voiceChatService';
import { roomService, RoomDetailsResponse } from '../services/roomService';
import { AddSongToRoomModal } from '../components/room/AddSongToRoomModal';
import { Button } from '../components/common/Button';
import { IRoomMember, IRoomQueueItem, IRoomMessage } from '../types';
import {
  Radio,
  Users,
  Copy,
  Check,
  Play,
  Pause,
  SkipForward,
  Plus,
  Send,
  ExternalLink,
  MessageSquare,
  LogOut,
  Sparkles,
  Volume2,
  Volume1,
  VolumeX,
  ShieldCheck,
  Mic,
  MicOff,
  Wifi,
  HardDrive,
  Headphones,
} from 'lucide-react';

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const REACTION_EMOJIS = ['🔥', '❤️', '🎵', '✨', '⚡'];

export const RoomSessionPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seekTo,
    nextTrack,
  } = usePlayerStore();

  const {
    currentRoom,
    members,
    queue,
    messages,
    isHost,
    activeReaction,
    isLocallyPaused,
    setLocallyPaused,
    resumeAndSyncWithRoom,
    setRoom,
    leaveRoom,
    broadcastSync,
    sendMessage,
    sendReaction,
    addTrackToQueue,
  } = useRoomStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Chat and Smart Ducking Store
  const {
    isVoiceActive,
    isBroadcastingMusic,
    isMuted,
    isPushToTalk,
    isSpeaking,
    isDucked,
    activeSpeakers,
    micError,
    startVoiceChat,
    startMusicBroadcast,
    stopVoiceChat,
    stopMusicBroadcast,
    toggleMute,
    setPushToTalk,
    pressPushToTalk,
    releasePushToTalk,
  } = useVoiceChatStore();

  // Set user display name in voice chat
  useEffect(() => {
    if (user?.name) {
      voiceChatService.setUserName(user.name);
    }
  }, [user?.name]);

  // Clean up voice on room leave
  useEffect(() => {
    return () => {
      stopVoiceChat();
    };
  }, []);

  // Keyboard Push-to-Talk listeners (Space / V)
  useEffect(() => {
    if (!isVoiceActive || !isPushToTalk) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space' || e.key === 'v' || e.key === 'V') {
        if (!e.repeat) {
          pressPushToTalk();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space' || e.key === 'v' || e.key === 'V') {
        releasePushToTalk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVoiceActive, isPushToTalk, pressPushToTalk, releasePushToTalk]);

  // Initialize Room from URL param code
  useEffect(() => {
    if (!code) return;

    let isMounted = true;
    roomService
      .getRoom(code)
      .then((data: RoomDetailsResponse) => {
        if (isMounted && data?.room) {
          setRoom(data.room, data.members, data.queue, data.messages);
          roomService.joinRoom(data.room.id).catch(() => {});
        }
      })
      .catch((err: any) => {
        console.error('Failed to load room:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [code]);

  // Clean up room state on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  // Host periodic playback heartbeat (keeps server sync time fresh every 4s while playing)
  useEffect(() => {
    if (!isHost || !currentRoom || !isPlaying) return;

    const syncTimer = setInterval(() => {
      const player = usePlayerStore.getState();
      if (!player.currentTrack || !player.isPlaying) return;

      roomService.syncPlayback(currentRoom.id, {
        trackId: player.currentTrack.id || player.currentTrack.youtube_id,
        isPlaying: true,
        playbackTime: Math.floor(player.currentTime),
      }).catch(() => {});
    }, 4000);

    return () => clearInterval(syncTimer);
  }, [isHost, currentRoom?.id, isPlaying]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/rooms');
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput('');
    await sendMessage(text, 'chat');
  };

  // Host/Collaborator Play/Pause
  const handleTogglePlayback = () => {
    togglePlay();
    broadcastSync(isPlaying ? 'PAUSE' : 'PLAY', { isPlaying: !isPlaying, time: currentTime });
  };

  const handleSkipNext = () => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      usePlayerStore.getState().playTrack(nextSong);
      broadcastSync('NEXT_TRACK', { track: nextSong, isPlaying: true, time: 0 });
    } else {
      nextTrack();
      broadcastSync('NEXT_TRACK', { isPlaying: true, time: 0 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-400">Connecting to synchronized room session...</p>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="text-center py-20 space-y-3">
        <Radio className="w-10 h-10 text-zinc-600 mx-auto stroke-1" />
        <h3 className="text-lg font-bold text-white">Room Not Found</h3>
        <p className="text-xs text-zinc-400">This session has ended or the code is invalid.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/rooms')}>
          Back to Sessions
        </Button>
      </div>
    );
  }

  const activeSong = currentTrack || {
    id: currentRoom.track_id || 'room_track',
    youtube_id: currentRoom.youtube_id || '5qap5aO4i9A',
    title: currentRoom.track_title || 'Room Stream',
    artist: currentRoom.track_artist || 'AuraStream Artist',
    thumbnail_url: currentRoom.track_thumbnail || 'https://i.ytimg.com/vi/5qap5aO4i9A/mqdefault.jpg',
    duration: currentRoom.track_duration || 180,
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canControl = isHost || currentRoom.dj_mode === 'collaborative';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Room Header Bar */}
      <div className="p-4 md:p-6 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE SESSION</span>
            </span>

            {currentRoom.is_offline && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-semibold">
                <Wifi className="w-3 h-3 text-cyan-400" />
                <span>WI-FI HOTSPOT</span>
              </span>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700/60 text-[11px] font-mono transition-colors cursor-pointer"
              title="Click to copy invite link"
            >
              <span>{currentRoom.code}</span>
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-850 text-zinc-400 border border-zinc-800">
              {currentRoom.dj_mode === 'collaborative' ? 'Open DJ' : 'Host DJ Only'}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{currentRoom.name}</h2>
          {currentRoom.description && (
            <p className="text-xs text-zinc-400 mt-0.5">{currentRoom.description}</p>
          )}
        </div>

        {/* Members & Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Member Avatars */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
            <div className="flex -space-x-2 overflow-hidden">
              {members.slice(0, 4).map((m: IRoomMember) => (
                <div
                  key={m.id}
                  title={`${m.name} (${m.role})`}
                  className="inline-block w-7 h-7 rounded-full ring-2 ring-zinc-950 bg-white text-black text-[10px] font-bold overflow-hidden"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-zinc-400 font-medium px-2">
              {members.length} listening
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Session</span>
          </Button>
        </div>
      </div>

      {/* 2. Live Voice Chat & Device Audio Broadcast Control Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-850 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
              isBroadcastingMusic
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 scale-105 animate-pulse'
                : isSpeaking
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 scale-105'
                : isVoiceActive
                ? isMuted
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'bg-zinc-850 text-zinc-500 border border-zinc-800'
            }`}
          >
            {isBroadcastingMusic ? (
              <Radio className="w-5 h-5 text-black animate-pulse" />
            ) : isVoiceActive ? (
              isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className={`w-5 h-5 ${isSpeaking ? 'animate-pulse text-black' : 'text-emerald-400'}`} />
              )
            ) : (
              <Headphones className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {isBroadcastingMusic
                  ? 'Live Device Music Broadcast'
                  : isVoiceActive
                  ? 'Room Voice Audio Chat'
                  : 'In-Room Audio & Voice'}
              </span>

              {isBroadcastingMusic ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  DJ BROADCASTING
                </span>
              ) : isVoiceActive ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  VOICE ACTIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-medium">
                  HOTSPOT READY
                </span>
              )}

              {isDucked && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                  <Volume1 className="w-3 h-3" />
                  <span>SMART DUCKING (25%)</span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {isBroadcastingMusic
                ? '📻 Broadcasting live audio (Spotify / YouTube Music / Device) in high-fidelity stereo to all hotspot listeners'
                : isSpeaking
                ? '🎤 You are speaking — music volume auto-ducked to 25%'
                : activeSpeakers.length > 0
                ? `🎤 ${activeSpeakers.join(', ')} speaking — music ducked`
                : isVoiceActive
                ? isPushToTalk
                  ? 'Push-to-Talk active: Hold Spacebar or click & hold [Speak] button'
                  : 'Open mic active with Smart Ducking: music automatically lowers when you speak'
                : 'Share music from Spotify or talk live with friends over Wi-Fi hotspot with zero internet.'}
            </p>

            {micError && (
              <p className="text-[10px] text-rose-400 font-medium mt-1">⚠️ {micError}</p>
            )}
          </div>
        </div>

        {/* Voice & Broadcast Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {isBroadcastingMusic ? (
            <>
              {/* Mic / Audio Mute */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700'
                }`}
                title={isMuted ? 'Resume audio broadcast' : 'Mute audio broadcast'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isMuted ? 'Muted' : 'Live'}</span>
              </button>

              {/* Stop Broadcast */}
              <button
                type="button"
                onClick={stopMusicBroadcast}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Stop Broadcast</span>
              </button>
            </>
          ) : isVoiceActive ? (
            <>
              {/* Mic Toggle Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isMuted
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                    : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Muted' : 'Mic On'}</span>
              </button>

              {/* Push-to-Talk Toggle */}
              <button
                type="button"
                onClick={() => setPushToTalk(!isPushToTalk)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  isPushToTalk
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-850 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Toggle Push-to-Talk mode"
              >
                PTT: {isPushToTalk ? 'ON' : 'OFF'}
              </button>

              {/* Push-to-Talk Action Button */}
              {isPushToTalk && (
                <button
                  type="button"
                  onMouseDown={pressPushToTalk}
                  onMouseUp={releasePushToTalk}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    pressPushToTalk();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    releasePushToTalk();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
                    isSpeaking
                      ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 scale-95'
                      : 'bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 active:scale-95'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isSpeaking ? 'Speaking...' : 'Hold Space / Talk'}</span>
                </button>
              )}

              {/* Leave Voice Channel Button */}
              <button
                type="button"
                onClick={stopVoiceChat}
                className="p-2 rounded-xl bg-zinc-850 hover:bg-rose-950/30 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors cursor-pointer"
                title="Disconnect voice chat"
              >
                <MicOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Broadcast Device Music (Spotify, YT Music, etc.) */}
              <button
                type="button"
                onClick={startMusicBroadcast}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                title="Broadcast music playing from Spotify or device to the room"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Broadcast Device Music</span>
              </button>

              {/* Join Voice Chat */}
              <button
                type="button"
                onClick={startVoiceChat}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Join Voice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Main Synchronized Stage */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-900/40 border border-zinc-850 p-6 md:p-8 shadow-sm">
        {/* Floating Reaction Overlay */}
        {activeReaction && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 animate-in zoom-in-50 fade-in duration-300">
            <span className="text-7xl md:text-8xl drop-shadow-2xl animate-bounce">
              {activeReaction.emoji}
            </span>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Track Thumbnail */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-zinc-950 flex-shrink-0">
            <img
              src={activeSong.thumbnail_url}
              alt={activeSong.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm flex items-end gap-1 h-4">
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
              </div>
            )}
          </div>

          {/* Track Metadata & Synced Player Controls */}
          <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                isLocallyPaused || !isPlaying
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-zinc-800/80 border border-zinc-700/60 text-zinc-300'
              }`}>
                <Volume2 className={`w-3.5 h-3.5 ${isLocallyPaused || !isPlaying ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span>{isLocallyPaused ? 'Local Playback Stopped / Paused' : isPlaying ? 'Playing Live in Room' : 'Room Stream Paused'}</span>
              </div>

              {isLocallyPaused && (
                <span className="text-[11px] text-amber-400/90 font-medium">
                  • Click Resume to catch up with latest room timeline
                </span>
              )}
            </div>

            <h3 className="text-xl md:text-3xl font-bold text-white tracking-tight line-clamp-2">
              {activeSong.title}
            </h3>

            <p className="text-sm text-zinc-400 font-medium">{activeSong.artist}</p>

            {/* Synced Timeline Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formatSeconds(duration || activeSong.duration)}</span>
              </div>
            </div>

            {/* Playback & Reaction Controls */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {canControl ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleTogglePlayback}
                    className="flex items-center gap-2"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    <span>{isPlaying ? 'Pause Sync (All)' : 'Play Sync (All)'}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSkipNext}
                    className="flex items-center gap-1.5"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip Track</span>
                  </Button>
                </>
              ) : (
                /* Listener Individual Controls */
                <>
                  {isLocallyPaused || !isPlaying ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={resumeAndSyncWithRoom}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold shadow-lg shadow-emerald-500/25"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>Resume & Catch Up Live Stream</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setLocallyPaused(true);
                        togglePlay();
                      }}
                      className="flex items-center gap-2 text-zinc-300 hover:text-white"
                      title="Stop music streaming on your device only without affecting other listeners"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause for Me</span>
                    </Button>
                  )}
                </>
              )}

              {/* YouTube Direct Attribution */}
              <a
                href={`https://www.youtube.com/watch?v=${activeSong.youtube_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                title="Watch on official YouTube"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                <span>Watch on YouTube</span>
              </a>

              {/* Live Emoji Reactions */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-zinc-900/80 border border-zinc-800">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="p-1.5 hover:scale-125 transition-transform text-sm cursor-pointer"
                    title={`Send ${emoji} reaction`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lower Grid: Collaborative Queue & In-Room Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collaborative Queue (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Shared Queue</h3>
              <p className="text-xs text-zinc-400">Songs queued by room participants</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Songs</span>
            </Button>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-zinc-850 bg-zinc-900/20 space-y-2">
              <Radio className="w-6 h-6 text-zinc-600 mx-auto" />
              <p className="text-xs font-semibold text-zinc-300">The room queue is empty</p>
              <p className="text-[11px] text-zinc-500">Search any track from YouTube or the catalog to queue it next.</p>
              <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(true)}>
                Add First Song
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {queue.map((item: IRoomQueueItem, idx: number) => (
                <div
                  key={item.queue_id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-850/60 border border-zinc-850/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-4 text-center text-xs font-mono text-zinc-500">
                      {idx + 1}
                    </span>
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-950 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {item.artist} {item.added_by_name ? `• Queued by ${item.added_by_name}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-zinc-500 flex-shrink-0">
                    {formatSeconds(item.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In-Room Live Chat (Right 5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-900/40 border border-zinc-850 flex flex-col h-[480px]">
          <div className="p-3.5 border-b border-zinc-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Live Chat & Activity</h4>
            </div>
            <span className="text-[11px] text-zinc-500">{messages.length} messages</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: IRoomMessage) => (
              <div key={msg.id} className="text-xs space-y-0.5">
                {msg.message_type === 'system' ? (
                  <p className="text-[11px] text-zinc-500 italic">
                    • {msg.content}
                  </p>
                ) : (
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-300">{msg.user_name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-zinc-200 mt-0.5 break-words">{msg.content}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-zinc-850 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat with the room..."
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs outline-none focus:border-zinc-500 transition-colors"
            />
            <Button variant="primary" size="sm" type="submit" className="p-2">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* Add Song Modal */}
      <AddSongToRoomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};
