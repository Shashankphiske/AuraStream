import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  HardDrive,
  Music2,
} from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayerBridge: React.FC = () => {
  const playerRef = useRef<any>(null);
  const isReadyRef = useRef<boolean>(false);
  const pendingTrackIdRef = useRef<string | null>(null);
  const intervalRef = useRef<any>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    seekTarget,
    isVideoMode,
    isPipMinimized,
    playbackNotice,
    setPlaying,
    setCurrentTime,
    setDuration,
    clearSeekTarget,
    nextTrack,
    toggleVideoMode,
    togglePipMinimized,
    setPlaybackNotice,
    closePlayer,
  } = usePlayerStore();

  // 1. Initialize YouTube IFrame API
  useEffect(() => {
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      const playerEl = document.getElementById('aura-yt-player');
      if (!playerEl) return;

      try {
        const originUrl =
          typeof window !== 'undefined' &&
          window.location.origin.startsWith('http') &&
          !window.location.origin.includes('localhost')
            ? window.location.origin
            : undefined;

        const playerVars: Record<string, any> = {
          autoplay: 0,
          controls: 1, // Keep native YouTube controls visible & accessible
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
        };
        if (originUrl) {
          playerVars.origin = originUrl;
        }

        playerRef.current = new window.YT.Player('aura-yt-player', {
          height: '100%',
          width: '100%',
          videoId: currentTrack?.youtube_id || '5qap5aO4i9A',
          playerVars,
          events: {
            onReady: (event: any) => {
              isReadyRef.current = true;
              event.target.setVolume(isMuted ? 0 : volume);
              if (pendingTrackIdRef.current) {
                const targetId = pendingTrackIdRef.current;
                pendingTrackIdRef.current = null;
                event.target.loadVideoById(targetId);
                event.target.playVideo();
                setPlaying(true);
              }
            },
            onStateChange: (event: any) => {
              if (window.YT && window.YT.PlayerState) {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setPlaying(true);
                  setPlaybackNotice(null);
                  if (playerRef.current?.getDuration) {
                    const dur = playerRef.current.getDuration();
                    if (dur && dur > 0) setDuration(dur);
                  }
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setPlaying(false);
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  nextTrack();
                }
              }
            },
            onError: (err: any) => {
              const code = err?.data;
              console.warn('YouTube Player notice/error code:', code);
              if (code === 101 || code === 150) {
                setPlaybackNotice({
                  code,
                  message:
                    'External website playback has been restricted by the content rights owner. You can watch directly on YouTube or skip to the next song.',
                  videoId: currentTrack?.youtube_id || '',
                });
              } else if (code === 100 || code === 2) {
                setPlaybackNotice({
                  code,
                  message: 'This video is unavailable or has invalid parameters.',
                  videoId: currentTrack?.youtube_id || '',
                });
              }
            },
          },
        });
      } catch (e) {
        console.warn('Failed to initialize YouTube Player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Auto-skip after notice if user doesn't interact within 7s
  useEffect(() => {
    if (playbackNotice) {
      const timer = setTimeout(() => {
        nextTrack();
        setPlaybackNotice(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [playbackNotice]);

  // 2. Handle Track change (YouTube or Local HTML5 Audio)
  useEffect(() => {
    if (!currentTrack) {
      if (playerRef.current && isReadyRef.current && playerRef.current.pauseVideo) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
      if (localAudioRef.current) {
        localAudioRef.current.pause();
      }
      setPlaybackNotice(null);
      return;
    }

    if (currentTrack.is_local) {
      if (playerRef.current && isReadyRef.current && playerRef.current.pauseVideo) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }
      setPlaybackNotice(null);

      if (localAudioRef.current) {
        localAudioRef.current.src = currentTrack.local_url || '';
        localAudioRef.current.load();
        if (isPlaying) {
          localAudioRef.current.play().catch(() => {});
        }
      }
    } else {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
      }

      if (playerRef.current && isReadyRef.current && playerRef.current.loadVideoById) {
        try {
          playerRef.current.loadVideoById(currentTrack.youtube_id);
          playerRef.current.playVideo();
          setPlaying(true);
          setPlaybackNotice(null);
        } catch (e) {
          console.warn('Error loading video in YT Player:', e);
        }
      } else {
        pendingTrackIdRef.current = currentTrack.youtube_id;
      }
    }
  }, [currentTrack?.id, currentTrack?.youtube_id, currentTrack?.local_url]);

  // 3. Handle Play / Pause sync
  useEffect(() => {
    if (currentTrack?.is_local) {
      if (localAudioRef.current) {
        if (isPlaying) {
          localAudioRef.current.play().catch(() => {});
        } else {
          localAudioRef.current.pause();
        }
      }
    } else {
      if (!playerRef.current || !isReadyRef.current || !playerRef.current.playVideo) return;
      try {
        if (isPlaying) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch {}
    }
  }, [isPlaying, currentTrack?.is_local]);

  // 4. Handle Volume and Mute sync
  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.volume = isMuted ? 0 : volume / 100;
      localAudioRef.current.muted = isMuted;
    }

    if (!playerRef.current || !isReadyRef.current || !playerRef.current.setVolume) return;
    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      }
    } catch {}
  }, [volume, isMuted]);

  // 5. Handle Scrubber Seek Target
  useEffect(() => {
    if (seekTarget !== null) {
      if (currentTrack?.is_local) {
        if (localAudioRef.current) {
          localAudioRef.current.currentTime = seekTarget;
        }
        clearSeekTarget();
      } else if (playerRef.current && isReadyRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(seekTarget, true);
        clearSeekTarget();
      }
    }
  }, [seekTarget, currentTrack?.is_local]);

  // 6. Time Tracker Interval (Only for YouTube, HTML5 audio uses onTimeUpdate)
  useEffect(() => {
    if (isPlaying && !currentTrack?.is_local) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current && isReadyRef.current && playerRef.current.getCurrentTime) {
          try {
            const time = playerRef.current.getCurrentTime();
            setCurrentTime(time || 0);

            const dur = playerRef.current.getDuration();
            if (dur && dur > 0) {
              setDuration(dur);
            }
          } catch {}
        }
      }, 300);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentTrack?.is_local]);

  const youtubeWatchUrl = currentTrack ? `https://www.youtube.com/watch?v=${currentTrack.youtube_id}` : '';

  return (
    <>
      {/* YouTube Policy Error / Embed Restriction Notice Banner */}
      {playbackNotice && (
        <div className="fixed top-20 right-4 md:right-8 z-50 max-w-sm md:max-w-md p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white">Embed Restriction Notice</h4>
                <button
                  onClick={() => setPlaybackNotice(null)}
                  className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{playbackNotice.message}</p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Watch on YouTube</span>
                </a>
                <button
                  onClick={() => {
                    nextTrack();
                    setPlaybackNotice(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  Skip Track
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Native HTML5 Audio Element for 100% Offline Local Playback */}
      <audio
        ref={localAudioRef}
        className="hidden"
        onTimeUpdate={() => {
          if (currentTrack?.is_local && localAudioRef.current) {
            setCurrentTime(localAudioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (currentTrack?.is_local && localAudioRef.current) {
            setDuration(localAudioRef.current.duration);
          }
        }}
        onEnded={() => nextTrack()}
      />

      {/* Persistent, Policy-Compliant YouTube Player & Local Visualizer Container */}
      <div
        id="yt-player-container"
        className={
          !currentTrack
            ? 'fixed -bottom-[9999px] -right-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden select-none'
            : isVideoMode
            ? 'fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200'
            : isPipMinimized
            ? 'fixed bottom-[130px] right-2 md:bottom-28 md:right-6 z-40 w-48 md:w-52 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl transition-all duration-200 group'
            : 'fixed bottom-[130px] right-2 md:bottom-28 md:right-6 z-40 w-52 sm:w-72 md:w-80 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl transition-all duration-200'
        }
      >
        {/* Mode 1 Header: Fullscreen Theater Header */}
        {currentTrack && isVideoMode && (
          <div className="w-full max-w-5xl flex justify-between items-center mb-3.5">
            <div className="flex items-center gap-3 min-w-0 pr-4">
              <h3 className="text-white font-semibold text-base md:text-lg truncate">{currentTrack.title}</h3>
              <span className="text-zinc-400 text-xs md:text-sm truncate hidden sm:inline">{currentTrack.artist}</span>
              {currentTrack.is_local && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Local Device
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {!currentTrack.is_local && (
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Watch on official YouTube (Opens in new tab)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                  <span className="hidden sm:inline">Watch on YouTube</span>
                </a>
              )}

              <button
                onClick={toggleVideoMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md transition-colors cursor-pointer"
                title="Exit theater mode"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mini Dock</span>
              </button>

              <button
                onClick={() => closePlayer()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium backdrop-blur-md transition-colors cursor-pointer"
                title="Close Player"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 2 Header: Floating PiP Mini-Dock Header */}
        {currentTrack && !isVideoMode && !isPipMinimized && (
          <div className="px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-1.5 min-w-0 pr-2">
              <span className={`w-2 h-2 rounded-full ${currentTrack.is_local ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate flex items-center gap-1">
                {currentTrack.is_local ? (
                  <>
                    <HardDrive className="w-3 h-3 text-emerald-400" />
                    <span>Local Device</span>
                  </>
                ) : (
                  <span>YouTube Video</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {!currentTrack.is_local && (
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Watch on official YouTube"
                  className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                onClick={toggleVideoMode}
                title="Expand to Theater Mode"
                className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePipMinimized}
                title="Collapse mini video"
                className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => closePlayer()}
                title="Close Player"
                className="p-1 rounded-md text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Mode 3 Header: Collapsed Dock overlay on hover */}
        {currentTrack && !isVideoMode && isPipMinimized && (
          <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/80 rounded-lg p-1">
            {!currentTrack.is_local && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Watch on official YouTube"
                className="p-1 text-zinc-300 hover:text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={togglePipMinimized}
              title="Expand video window"
              className="p-1 text-zinc-300 hover:text-white cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => closePlayer()}
              title="Close Player"
              className="p-1 text-zinc-300 hover:text-rose-400 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Persistent Video Wrapper & Local Audio Studio Overlay */}
        <div
          className={
            !currentTrack
              ? 'w-1 h-1 overflow-hidden'
              : isVideoMode
              ? 'relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-950'
              : 'relative w-full aspect-video bg-zinc-950'
          }
        >
          {/* Local Audio Visualizer when playing local music */}
          {currentTrack?.is_local && (
            <div className="absolute inset-0 z-20 bg-gradient-to-b from-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-4 text-center select-none">
              <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 mb-2.5">
                <img
                  src={currentTrack.thumbnail_url}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Music2 className="w-7 h-7 md:w-9 md:h-9 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <p className="text-xs md:text-sm font-semibold text-white truncate max-w-[200px] md:max-w-md">{currentTrack.title}</p>
              <p className="text-[10px] md:text-xs text-zinc-400 truncate max-w-[200px] md:max-w-md">{currentTrack.artist}</p>
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Offline Local Playback</span>
              </div>
            </div>
          )}

          {/* YouTube iframe container: ALWAYS PERMANENTLY MOUNTED IN DOM */}
          <div id="aura-yt-player" className="w-full h-full" />
        </div>
      </div>
    </>
  );
};
