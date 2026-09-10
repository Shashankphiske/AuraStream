import { create } from 'zustand';
import { IRoom, IRoomMember, IRoomQueueItem, IRoomMessage, ITrack, IRoomSyncEvent } from '../types';
import { roomService } from '../services/roomService';
import { usePlayerStore } from './usePlayerStore';
import { useAuthStore } from './useAuthStore';

interface RoomState {
  currentRoom: IRoom | null;
  members: IRoomMember[];
  queue: IRoomQueueItem[];
  messages: IRoomMessage[];
  isHost: boolean;
  activeReaction: { emoji: string; id: number } | null;
  isChatOpen: boolean;

  // Actions
  setRoom: (room: IRoom, members: IRoomMember[], queue: IRoomQueueItem[], messages: IRoomMessage[], forceIsHost?: boolean) => void;
  leaveRoom: () => void;
  toggleChat: () => void;
  broadcastSync: (type: IRoomSyncEvent['type'], data?: { track?: ITrack | null; isPlaying?: boolean; time?: number }) => void;
  addTrackToQueue: (track: ITrack) => Promise<void>;
  sendMessage: (content: string, type?: 'chat' | 'reaction' | 'system') => Promise<void>;
  sendReaction: (emoji: string) => void;
  pollRoomState: () => Promise<void>;
}

// Global Cross-Tab Sync Channel
let syncChannel: BroadcastChannel | null = null;
let pollTimer: any = null;

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  members: [],
  queue: [],
  messages: [],
  isHost: false,
  activeReaction: null,
  isChatOpen: false,

  setRoom: (room, members, queue, messages, forceIsHost) => {
    const authUser = useAuthStore.getState().user;
    const isHost = forceIsHost ?? (authUser ? room.host_id === authUser.id : false);

    // Clean up any existing channel/timer
    if (syncChannel) syncChannel.close();
    if (pollTimer) clearInterval(pollTimer);

    // Initialize HTML5 BroadcastChannel for 0-latency multi-tab sync
    try {
      syncChannel = new BroadcastChannel(`aurastream_room_${room.id}`);
      syncChannel.onmessage = (event: MessageEvent<IRoomSyncEvent>) => {
        const payload = event.data;
        if (!payload || payload.roomId !== room.id) return;

        const currentUserId = useAuthStore.getState().user?.id;
        if (payload.senderId && payload.senderId === currentUserId) return; // Ignore own echoes

        const player = usePlayerStore.getState();

        if (payload.type === 'REACTION' && payload.reaction) {
          set({ activeReaction: { emoji: payload.reaction, id: Date.now() } });
          setTimeout(() => set({ activeReaction: null }), 2500);
        }

        // Listener sync execution
        const { isHost: amHost } = get();
        if (!amHost) {
          if (payload.type === 'PLAY') {
            if (payload.track && player.currentTrack?.youtube_id !== payload.track.youtube_id) {
              player.playTrack(payload.track);
            } else {
              player.setPlaying(true);
            }
            if (typeof payload.playbackTime === 'number') {
              const latencyAdjustment = (Date.now() - payload.timestamp) / 1000;
              const targetTime = payload.playbackTime + latencyAdjustment;
              if (Math.abs(player.currentTime - targetTime) > 1.5) {
                player.seekTo(targetTime);
              }
            }
          } else if (payload.type === 'PAUSE') {
            player.setPlaying(false);
            if (typeof payload.playbackTime === 'number') {
              player.seekTo(payload.playbackTime);
            }
          } else if (payload.type === 'SEEK' && typeof payload.playbackTime === 'number') {
            player.seekTo(payload.playbackTime);
          } else if (payload.type === 'NEXT_TRACK' && payload.track) {
            player.playTrack(payload.track);
          }
        }

        // Poll room to refresh queue and chat
        get().pollRoomState();
      };
    } catch {}

    set({
      currentRoom: room,
      members,
      queue,
      messages,
      isHost,
    });

    // Start background sync polling every 2.5 seconds
    pollTimer = setInterval(() => {
      get().pollRoomState();
    }, 2500);

    // If room has an initial track and user is joining, sync player cleanly
    const incomingYt = room.youtube_id || (room.current_track_id && room.current_track_id.length === 11 ? room.current_track_id : null);
    if (incomingYt) {
      const player = usePlayerStore.getState();
      const currentTrack = player.currentTrack;

      if (!currentTrack || currentTrack.youtube_id !== incomingYt) {
        const roomTrack: ITrack = {
          id: room.track_id || room.current_track_id || incomingYt,
          youtube_id: incomingYt,
          title: room.track_title || 'Live Stream',
          artist: room.track_artist || 'AuraStream Artist',
          thumbnail_url: room.track_thumbnail || '',
          duration: Number(room.track_duration) || 180,
        };
        player.playTrack(roomTrack);
        const syncAge = (Date.now() - (room.last_sync_time || Date.now())) / 1000;
        const effectiveLatency = (room.is_playing && syncAge >= 0 && syncAge <= 10) ? syncAge : 0;
        const seekPos = (Number(room.playback_time) || 0) + effectiveLatency;
        if (seekPos > 0 && seekPos < (roomTrack.duration || 180) - 5) {
          player.seekTo(seekPos);
        }
        player.setPlaying(Boolean(room.is_playing));
      }
    }
  },

  leaveRoom: () => {
    const { currentRoom } = get();
    if (currentRoom) {
      roomService.leaveRoom(currentRoom.id).catch(() => {});
    }
    if (syncChannel) {
      syncChannel.close();
      syncChannel = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set({
      currentRoom: null,
      members: [],
      queue: [],
      messages: [],
      isHost: false,
    });
  },

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  broadcastSync: (type, data) => {
    const { currentRoom, isHost } = get();
    if (!currentRoom) return;

    // In host_only mode, only host broadcasts
    if (currentRoom.dj_mode === 'host_only' && !isHost) return;

    const authUser = useAuthStore.getState().user;
    const player = usePlayerStore.getState();

    const track = data?.track !== undefined ? data.track : player.currentTrack;
    const isPlaying = data?.isPlaying !== undefined ? data.isPlaying : player.isPlaying;
    const playbackTime = data?.time !== undefined ? data.time : player.currentTime;
    const timestamp = Date.now();

    // 1. Cross-tab BroadcastChannel
    if (syncChannel) {
      try {
        syncChannel.postMessage({
          type,
          roomId: currentRoom.id,
          track,
          isPlaying,
          playbackTime,
          timestamp,
          senderId: authUser?.id,
        });
      } catch {}
    }

    // 2. Remote Cloudflare D1 Backend Sync
    roomService.syncPlayback(currentRoom.id, {
      trackId: track?.id || track?.youtube_id,
      isPlaying,
      playbackTime,
    }).catch(() => {});
  },

  addTrackToQueue: async (track: ITrack) => {
    const { currentRoom, queue } = get();
    if (!currentRoom) return;

    const authUser = useAuthStore.getState().user;
    const optimisticItem: IRoomQueueItem = {
      queue_id: 'queue_' + Date.now(),
      id: track.id,
      youtube_id: track.youtube_id || track.id,
      title: track.title,
      artist: track.artist,
      thumbnail_url: track.thumbnail_url,
      duration: track.duration,
      position: queue.length + 1,
      votes: 0,
      added_by_name: authUser?.name || 'You',
    };

    set({ queue: [...queue, optimisticItem] });

    try {
      await roomService.addToQueue(currentRoom.id, track);
      get().pollRoomState();
    } catch {}

    // Broadcast queue addition to peers
    if (syncChannel) {
      try {
        syncChannel.postMessage({
          type: 'QUEUE_UPDATE',
          roomId: currentRoom.id,
          timestamp: Date.now(),
        });
      } catch {}
    }
  },

  sendMessage: async (content: string, type = 'chat') => {
    const { currentRoom, messages } = get();
    if (!currentRoom) return;

    const authUser = useAuthStore.getState().user;
    const localMsg: IRoomMessage = {
      id: 'msg_local_' + Date.now(),
      user_id: authUser?.id || 'guest',
      user_name: authUser?.name || 'Guest Listener',
      user_avatar: authUser?.avatar,
      content,
      message_type: type,
      created_at: new Date().toISOString(),
    };

    set({ messages: [...messages, localMsg] });
    await roomService.sendMessage(currentRoom.id, content, type);
    get().pollRoomState();
  },

  sendReaction: (emoji: string) => {
    const { currentRoom } = get();
    if (!currentRoom) return;

    set({ activeReaction: { emoji, id: Date.now() } });
    setTimeout(() => set({ activeReaction: null }), 2500);

    if (syncChannel) {
      try {
        syncChannel.postMessage({
          type: 'REACTION',
          roomId: currentRoom.id,
          reaction: emoji,
          timestamp: Date.now(),
          senderId: useAuthStore.getState().user?.id,
        });
      } catch {}
    }

    get().sendMessage(emoji, 'reaction').catch(() => {});
  },

  pollRoomState: async () => {
    const { currentRoom, isHost } = get();
    if (!currentRoom) return;

    try {
      const data = await roomService.pollRoom(currentRoom.id);
      if (!data || !data.room) return;

      const player = usePlayerStore.getState();

      // Listeners synchronize to host's playhead without reload thrashing
      if (!isHost) {
        const roomIsPlaying = Boolean(data.room.is_playing);
        const roomPlaybackTime = Number(data.room.playback_time) || 0;
        const now = Date.now();
        const lastSync = Number(data.room.last_sync_time) || now;
        const syncAge = (now - lastSync) / 1000;

        // Only extrapolate latency if sync happened recently (within 10s); otherwise room is idle
        const effectiveLatency = (roomIsPlaying && syncAge >= 0 && syncAge <= 10) ? syncAge : 0;
        const expectedTime = roomPlaybackTime + effectiveLatency;

        const incomingTrackId = data.room.track_id || data.room.current_track_id;
        const incomingYtId = data.room.youtube_id || (incomingTrackId && incomingTrackId.length === 11 ? incomingTrackId : null);

        // 1. Synchronize track ONLY IF a different track is received
        if (incomingYtId && (!player.currentTrack || player.currentTrack.youtube_id !== incomingYtId)) {
          const newTrack: ITrack = {
            id: incomingTrackId || incomingYtId,
            youtube_id: incomingYtId,
            title: data.room.track_title || 'Room Song',
            artist: data.room.track_artist || 'AuraStream Artist',
            thumbnail_url: data.room.track_thumbnail || '',
            duration: Number(data.room.track_duration) || 180,
          };
          player.playTrack(newTrack);
          if (expectedTime > 0 && expectedTime < (newTrack.duration || 180) - 5) {
            player.seekTo(expectedTime);
          }
        } else {
          // 2. Synchronize play/pause
          if (player.isPlaying !== roomIsPlaying) {
            player.setPlaying(roomIsPlaying);
          }

          // 3. Drift correction ONLY IF within valid song duration and significant drift
          const trackDuration = player.duration || Number(data.room.track_duration) || 180;
          if (expectedTime < trackDuration - 5 && syncAge <= 10) {
            const drift = Math.abs(player.currentTime - expectedTime);
            // 4-second drift tolerance to prevent continuous seeking / buffering loops
            if (drift > 4) {
              player.seekTo(expectedTime);
            }
          }
        }
      }

      set({
        queue: data.queue || [],
        members: data.members || [],
        messages: data.messages || [],
      });
    } catch {}
  },
}));
