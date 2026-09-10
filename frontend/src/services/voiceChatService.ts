import { usePlayerStore } from '../store/usePlayerStore';

type SpeechCallback = (isSpeaking: boolean, speakerName: string) => void;

class VoiceChatService {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  private isSpeaking = false;
  private speechHoldTimeout: any = null;
  private originalMusicVolume: number | null = null;
  private isDucked = false;

  private speechCallbacks: Set<SpeechCallback> = new Set();
  private userName = 'You';
  private audioMode: 'voice' | 'music_broadcast' = 'voice';

  onSpeechChange(callback: SpeechCallback): () => void {
    this.speechCallbacks.add(callback);
    return () => this.speechCallbacks.delete(callback);
  }

  setUserName(name: string): void {
    this.userName = name;
  }

  getAudioMode(): 'voice' | 'music_broadcast' {
    return this.audioMode;
  }

  /**
   * Request microphone or high-fidelity line access
   */
  async startMicrophone(mode: 'voice' | 'music_broadcast' = 'voice'): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    this.audioMode = mode;

    try {
      // In music broadcast mode, disable aggressive noise suppression and echo cancellation so music fidelity is 100% preserved
      const audioConstraints: MediaTrackConstraints =
        mode === 'music_broadcast'
          ? {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              channelCount: 2,
              sampleRate: 48000,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.localStream = stream;
      this.initVoiceActivityDetection(stream, mode === 'voice');
      return stream;
    } catch (err: any) {
      console.warn('Audio capture denied or error:', err);
      throw new Error(err?.message || 'Could not access audio device');
    }
  }

  /**
   * Broadcast device audio (Spotify, YouTube Music, local media) to the hotspot room
   */
  async startDeviceMusicBroadcast(): Promise<MediaStream> {
    if (this.localStream) {
      this.stopMicrophone();
    }

    // Try system audio capture via getDisplayMedia if available (supported on Chromium / Android Chrome)
    if (navigator.mediaDevices && typeof (navigator.mediaDevices as any).getDisplayMedia === 'function') {
      try {
        const displayStream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length > 0) {
          // Stop unwanted video tracks immediately
          displayStream.getVideoTracks().forEach((vt) => vt.stop());
          const audioStream = new MediaStream(audioTracks);
          this.localStream = audioStream;
          this.audioMode = 'music_broadcast';
          this.initVoiceActivityDetection(audioStream, false);
          return audioStream;
        }
      } catch (e) {
        console.info('Internal display audio capture not granted, falling back to high-fidelity acoustic broadcast', e);
      }
    }

    // High-fidelity fallback (captures whatever is playing from speakers/AUX in studio quality)
    return this.startMicrophone('music_broadcast');
  }

  /**
   * Stop microphone and release media tracks
   */
  stopMicrophone(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.restoreMusicVolume();
    this.setSpeakingState(false);
  }

  /**
   * Mute or Unmute local mic track
   */
  setMuted(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    if (muted) {
      this.setSpeakingState(false);
      this.restoreMusicVolume();
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Web Audio API Voice Activity Detection (VAD)
   * Continuously measures mic input decibel amplitude
   */
  private initVoiceActivityDetection(stream: MediaStream, shouldDuck: boolean = true): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;

      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude in human speech frequency range (300Hz - 3400Hz)
        let sum = 0;
        const voiceBinsCount = Math.min(bufferLength, 80);
        for (let i = 4; i < voiceBinsCount; i++) {
          sum += dataArray[i];
        }
        const average = sum / (voiceBinsCount - 4);

        // Speech detection threshold (out of 255)
        const SPEECH_THRESHOLD = 32;

        if (average > SPEECH_THRESHOLD) {
          if (!this.isSpeaking) {
            this.setSpeakingState(true);
            if (shouldDuck) {
              this.duckMusicVolume();
            }
          }

          // Clear hold timer as speech is actively continuing
          if (this.speechHoldTimeout) {
            clearTimeout(this.speechHoldTimeout);
            this.speechHoldTimeout = null;
          }
        } else if (this.isSpeaking && !this.speechHoldTimeout) {
          // Add a natural 600ms hold debounce before restoring volume
          this.speechHoldTimeout = setTimeout(() => {
            this.setSpeakingState(false);
            this.restoreMusicVolume();
            this.speechHoldTimeout = null;
          }, 600);
        }

        this.animFrameId = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (e) {
      console.warn('Voice Activity Detection initialization notice:', e);
    }
  }

  /**
   * Smart Audio Ducking: Smoothly ramps down music volume to 25% when speaking starts
   */
  duckMusicVolume(): void {
    if (this.isDucked) return;

    const player = usePlayerStore.getState();
    if (!player.isPlaying) return;

    this.originalMusicVolume = player.volume;
    this.isDucked = true;

    // Smooth ramp down to 25% of current volume (minimum 10)
    const targetVolume = Math.max(10, Math.round(player.volume * 0.25));
    this.smoothVolumeTransition(player.volume, targetVolume, 150);
  }

  /**
   * Restore music volume back to original level when speaking stops
   */
  restoreMusicVolume(): void {
    if (!this.isDucked || this.originalMusicVolume === null) return;

    const player = usePlayerStore.getState();
    const targetVolume = this.originalMusicVolume;
    this.isDucked = false;
    this.originalMusicVolume = null;

    this.smoothVolumeTransition(player.volume, targetVolume, 250);
  }

  /**
   * Smooth volume interpolation over duration ms
   */
  private smoothVolumeTransition(from: number, to: number, durationMs: number): void {
    const steps = 8;
    const stepDuration = durationMs / steps;
    const delta = (to - from) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const nextVol = Math.round(from + delta * currentStep);
      usePlayerStore.getState().setVolume(Math.max(0, Math.min(100, nextVol)));

      if (currentStep >= steps) {
        clearInterval(interval);
        usePlayerStore.getState().setVolume(to);
      }
    }, stepDuration);
  }

  private setSpeakingState(speaking: boolean): void {
    this.isSpeaking = speaking;
    this.speechCallbacks.forEach((cb) => cb(speaking, this.userName));
  }

  isSpeakingActive(): boolean {
    return this.isSpeaking;
  }

  isAudioDucked(): boolean {
    return this.isDucked;
  }
}

export const voiceChatService = new VoiceChatService();
