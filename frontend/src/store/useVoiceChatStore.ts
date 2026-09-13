import { create } from 'zustand';
import { voiceChatService } from '../services/voiceChatService';
import { IRoomVoicePeer } from '../types';

interface VoiceChatState {
  isVoiceActive: boolean;
  isBroadcastingMusic: boolean;
  isMuted: boolean;
  isPushToTalk: boolean;
  isSpeaking: boolean;
  isDucked: boolean;
  activeSpeakers: string[];
  connectedPeers: IRoomVoicePeer[];
  voiceStatus: 'idle' | 'connecting' | 'connected' | 'error';
  micError: string | null;

  // Actions
  startVoiceChat: (roomId?: string, user?: { id?: string; name: string; avatar?: string | null }) => Promise<void>;
  startMusicBroadcast: (roomId?: string, user?: { id?: string; name: string; avatar?: string | null }) => Promise<void>;
  stopVoiceChat: () => void;
  stopMusicBroadcast: () => void;
  toggleMute: () => void;
  setPushToTalk: (enabled: boolean) => void;
  pressPushToTalk: () => void;
  releasePushToTalk: () => void;
  handleRemoteSpeaker: (speakerName: string, isSpeaking: boolean) => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set, get) => {
  // Listen to speech events (local & remote) from voiceChatService
  voiceChatService.onSpeechChange((isSpeaking, speakerName) => {
    const { activeSpeakers } = get();
    let updated = [...activeSpeakers];

    if (isSpeaking && !updated.includes(speakerName)) {
      updated.push(speakerName);
    } else if (!isSpeaking) {
      updated = updated.filter((s) => s !== speakerName);
    }

    set({
      isSpeaking: voiceChatService.isSpeakingActive(),
      isDucked: voiceChatService.isAudioDucked(),
      activeSpeakers: updated,
    });
  });

  // Listen to connected peers changes
  voiceChatService.onPeersChange((peers) => {
    set({ connectedPeers: peers });
  });

  // Listen to connection status changes
  voiceChatService.onStatusChange((status, err) => {
    set({ voiceStatus: status, micError: err || null });
  });

  return {
    isVoiceActive: false,
    isBroadcastingMusic: false,
    isMuted: false,
    isPushToTalk: false,
    isSpeaking: false,
    isDucked: false,
    activeSpeakers: [],
    connectedPeers: [],
    voiceStatus: 'idle',
    micError: null,

    startVoiceChat: async (roomId?: string, user?: { id?: string; name: string; avatar?: string | null }) => {
      set({ micError: null, voiceStatus: 'connecting' });
      try {
        if (roomId) {
          await voiceChatService.joinRoomVoice(roomId, user, 'voice');
        } else {
          await voiceChatService.startMicrophone('voice');
        }
        set({ isVoiceActive: true, isBroadcastingMusic: false, isMuted: false, voiceStatus: 'connected' });
      } catch (err: any) {
        set({ micError: err?.message || 'Failed to start voice chat', voiceStatus: 'error' });
      }
    },

    startMusicBroadcast: async (roomId?: string, user?: { id?: string; name: string; avatar?: string | null }) => {
      set({ micError: null, voiceStatus: 'connecting' });
      try {
        if (roomId) {
          await voiceChatService.joinRoomVoice(roomId, user, 'music_broadcast');
        } else {
          await voiceChatService.startDeviceMusicBroadcast();
        }
        set({ isVoiceActive: true, isBroadcastingMusic: true, isMuted: false, voiceStatus: 'connected' });
      } catch (err: any) {
        set({ micError: err?.message || 'Failed to start device music broadcast', voiceStatus: 'error' });
      }
    },

    stopVoiceChat: () => {
      voiceChatService.leaveRoomVoice().catch(() => {});
      set({
        isVoiceActive: false,
        isBroadcastingMusic: false,
        isMuted: false,
        isSpeaking: false,
        isDucked: false,
        activeSpeakers: [],
        connectedPeers: [],
        voiceStatus: 'idle',
        micError: null,
      });
    },

    stopMusicBroadcast: () => {
      voiceChatService.leaveRoomVoice().catch(() => {});
      set({
        isVoiceActive: false,
        isBroadcastingMusic: false,
        isMuted: false,
        isSpeaking: false,
        isDucked: false,
        connectedPeers: [],
        voiceStatus: 'idle',
      });
    },

    toggleMute: () => {
      const { isMuted } = get();
      const nextMuted = !isMuted;
      voiceChatService.setMuted(nextMuted);
      set({ isMuted: nextMuted });
    },

    setPushToTalk: (enabled: boolean) => {
      set({ isPushToTalk: enabled });
      // In push to talk mode, start muted until key held
      if (enabled) {
        voiceChatService.setMuted(true);
        set({ isMuted: true });
      } else {
        voiceChatService.setMuted(false);
        set({ isMuted: false });
      }
    },

    pressPushToTalk: () => {
      const { isVoiceActive, isPushToTalk } = get();
      if (!isVoiceActive || !isPushToTalk) return;
      voiceChatService.setMuted(false);
      set({ isMuted: false });
    },

    releasePushToTalk: () => {
      const { isVoiceActive, isPushToTalk } = get();
      if (!isVoiceActive || !isPushToTalk) return;
      voiceChatService.setMuted(true);
      set({ isMuted: true });
    },

    handleRemoteSpeaker: (speakerName: string, isSpeaking: boolean) => {
      const { activeSpeakers } = get();
      let updated = [...activeSpeakers];

      if (isSpeaking) {
        if (!updated.includes(speakerName)) updated.push(speakerName);
        voiceChatService.duckMusicVolume();
      } else {
        updated = updated.filter((s) => s !== speakerName);
        if (updated.length === 0) {
          voiceChatService.restoreMusicVolume();
        }
      }

      set({
        activeSpeakers: updated,
        isDucked: voiceChatService.isAudioDucked(),
      });
    },
  };
});
