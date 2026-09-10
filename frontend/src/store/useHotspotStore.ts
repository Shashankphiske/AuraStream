import { create } from 'zustand';
import { IHotspotPeer, ITrack, IHotspotMessage } from '../types';
import { hotspotP2PService } from '../services/hotspotP2PService';
import { usePlayerStore } from './usePlayerStore';

interface HotspotState {
  isPartyActive: boolean;
  isHost: boolean;
  partyCode: string;
  peers: IHotspotPeer[];
  connectedToHost: boolean;
  hostName: string;
  isSharingAudio: boolean;
  transferProgress: number; // 0 to 100

  // Actions
  startParty: (code?: string) => void;
  joinParty: (code: string) => void;
  leaveParty: () => void;
  broadcastPlayback: (type: 'PLAY' | 'PAUSE' | 'SEEK', data?: { track?: ITrack | null; time?: number; isPlaying?: boolean }) => void;
  shareTrack: (track: ITrack) => Promise<void>;
}

export const useHotspotStore = create<HotspotState>((set, get) => {
  // Listen to incoming Hotspot messages from peers/host
  hotspotP2PService.onMessage((msg: IHotspotMessage) => {
    const { isHost, isPartyActive } = get();
    if (!isPartyActive) return;

    const player = usePlayerStore.getState();

    // 1. Guest device receiving playback sync from Host
    if (!isHost) {
      if (msg.type === 'PLAY') {
        if (msg.track && (!player.currentTrack || player.currentTrack.id !== msg.track.id)) {
          player.playTrack(msg.track);
        } else {
          player.setPlaying(true);
        }
        if (typeof msg.playbackTime === 'number') {
          const latency = (Date.now() - msg.timestamp) / 1000;
          const targetTime = msg.playbackTime + latency;
          if (Math.abs(player.currentTime - targetTime) > 1.0) {
            player.seekTo(targetTime);
          }
        }
      } else if (msg.type === 'PAUSE') {
        player.setPlaying(false);
        if (typeof msg.playbackTime === 'number') {
          player.seekTo(msg.playbackTime);
        }
      } else if (msg.type === 'SEEK' && typeof msg.playbackTime === 'number') {
        player.seekTo(msg.playbackTime);
      } else if (msg.type === 'TRACK_META' && msg.track) {
        set({ isSharingAudio: true, transferProgress: 10 });
      } else if (msg.type === 'AUDIO_CHUNK' && msg.chunkIndex !== undefined && msg.totalChunks) {
        const progress = Math.round(((msg.chunkIndex + 1) / msg.totalChunks) * 100);
        set({ transferProgress: progress });
      } else if (msg.type === 'AUDIO_COMPLETE' && msg.track) {
        set({ isSharingAudio: false, transferProgress: 100 });
        player.playTrack(msg.track);
      }
    }
  });

  // Listen to peer list changes
  hotspotP2PService.onPeersUpdated((peers) => {
    set({ peers });
  });

  return {
    isPartyActive: false,
    isHost: false,
    partyCode: '',
    peers: [],
    connectedToHost: false,
    hostName: '',
    isSharingAudio: false,
    transferProgress: 0,

    startParty: (code) => {
      const generatedCode = code || 'WIFI-' + Math.floor(100 + Math.random() * 900);
      set({
        isPartyActive: true,
        isHost: true,
        partyCode: generatedCode,
        connectedToHost: true,
        hostName: 'This Device (Host)',
      });

      // Announce host session
      hotspotP2PService.broadcast({
        type: 'HANDSHAKE',
      });
    },

    joinParty: (code) => {
      set({
        isPartyActive: true,
        isHost: false,
        partyCode: code.toUpperCase(),
        connectedToHost: true,
        hostName: 'Hotspot Host',
      });

      // Send handshake to host
      hotspotP2PService.broadcast({
        type: 'HANDSHAKE',
      });
    },

    leaveParty: () => {
      set({
        isPartyActive: false,
        isHost: false,
        partyCode: '',
        peers: [],
        connectedToHost: false,
        hostName: '',
        isSharingAudio: false,
        transferProgress: 0,
      });
    },

    broadcastPlayback: (type, data) => {
      const { isPartyActive, isHost } = get();
      if (!isPartyActive || !isHost) return;

      const player = usePlayerStore.getState();
      const track = data?.track !== undefined ? data.track : player.currentTrack;
      const isPlaying = data?.isPlaying !== undefined ? data.isPlaying : player.isPlaying;
      const playbackTime = data?.time !== undefined ? data.time : player.currentTime;

      hotspotP2PService.broadcast({
        type,
        track: track || undefined,
        playbackTime,
        isPlaying,
      });
    },

    shareTrack: async (track: ITrack) => {
      const { isPartyActive, isHost } = get();
      if (!isPartyActive || !isHost) return;

      set({ isSharingAudio: true, transferProgress: 0 });
      try {
        await hotspotP2PService.streamTrackToPeers(track);
      } finally {
        set({ isSharingAudio: false, transferProgress: 100 });
      }
    },
  };
});
