import { create } from 'zustand';
import { voiceChatService } from '../services/voiceChatService';

interface VoiceChatState {
  isVoiceActive: boolean;
  isBroadcastingMusic: boolean;
  isMuted: boolean;
  isPushToTalk: boolean;
  isSpeaking: boolean;
  isDucked: boolean;
  activeSpeakers: string[];
  micError: string | null;

  // Actions
  startVoiceChat: () => Promise<void>;
  startMusicBroadcast: () => Promise<void>;
  stopVoiceChat: () => void;
  stopMusicBroadcast: () => void;
  toggleMute: () => void;
  setPushToTalk: (enabled: boolean) => void;
  pressPushToTalk: () => void;
  releasePushToTalk: () => void;
  handleRemoteSpeaker: (speakerName: string, isSpeaking: boolean) => void;
}

export const useVoiceChatStore = create<VoiceChatState>((set, get) => {
  // Listen to local speech events from voiceChatService
  voiceChatService.onSpeechChange((isSpeaking, speakerName) => {
    const { activeSpeakers } = get();
    let updated = [...activeSpeakers];

    if (isSpeaking && !updated.includes(speakerName)) {
      updated.push(speakerName);
    } else if (!isSpeaking) {
      updated = updated.filter((s) => s !== speakerName);
    }

    set({
      isSpeaking,
      isDucked: voiceChatService.isAudioDucked(),
      activeSpeakers: updated,
    });
  });

  return {
    isVoiceActive: false,
    isBroadcastingMusic: false,
    isMuted: false,
    isPushToTalk: false,
    isSpeaking: false,
    isDucked: false,
    activeSpeakers: [],
    micError: null,

    startVoiceChat: async () => {
      set({ micError: null });
      try {
        await voiceChatService.startMicrophone('voice');
        set({ isVoiceActive: true, isBroadcastingMusic: false, isMuted: false });
      } catch (err: any) {
        set({ micError: err?.message || 'Failed to start microphone' });
      }
    },

    startMusicBroadcast: async () => {
      set({ micError: null });
      try {
        await voiceChatService.startDeviceMusicBroadcast();
        set({ isVoiceActive: true, isBroadcastingMusic: true, isMuted: false });
      } catch (err: any) {
        set({ micError: err?.message || 'Failed to start device music broadcast' });
      }
    },

    stopVoiceChat: () => {
      voiceChatService.stopMicrophone();
      set({
        isVoiceActive: false,
        isBroadcastingMusic: false,
        isMuted: false,
        isSpeaking: false,
        isDucked: false,
        activeSpeakers: [],
        micError: null,
      });
    },

    stopMusicBroadcast: () => {
      voiceChatService.stopMicrophone();
      set({
        isVoiceActive: false,
        isBroadcastingMusic: false,
        isMuted: false,
        isSpeaking: false,
        isDucked: false,
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
