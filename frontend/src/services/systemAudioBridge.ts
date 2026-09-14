import { registerPlugin, PluginListenerHandle, Capacitor } from '@capacitor/core';

interface SystemAudioCapturePluginType {
  isSupported(): Promise<{ supported: boolean; sdkVersion: number }>;
  startCapture(): Promise<{ success: boolean; sampleRate: number; channels: number }>;
  stopCapture(): Promise<{ success: boolean }>;
  addListener(
    eventName: 'audioData',
    listenerFunc: (data: { data: string; sampleRate: number; channels: number }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'audioError',
    listenerFunc: (data: { message: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'audioStopped',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const SystemAudioCapture = registerPlugin<SystemAudioCapturePluginType>('SystemAudioCapture');

class SystemAudioBridge {
  private audioContext: AudioContext | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private nextScheduledTime: number = 0;
  private isCapturing: boolean = false;
  private dataListener: PluginListenerHandle | null = null;
  private errorListener: PluginListenerHandle | null = null;
  private stopListener: PluginListenerHandle | null = null;

  /**
   * Check if native Android system audio capture is supported on current device
   */
  async isSupported(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return false;
    }

    try {
      const result = await SystemAudioCapture.isSupported();
      return !!result?.supported;
    } catch {
      return false;
    }
  }

  /**
   * Start native system audio capture and return a WebRTC-ready MediaStream
   */
  async startCapture(): Promise<MediaStream> {
    if (this.isCapturing && this.destinationNode) {
      return this.destinationNode.stream;
    }

    this.stopCapture();

    // 1. Initialize Web Audio pipeline
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx({ sampleRate: 48000 });
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const destination = ctx.createMediaStreamDestination();
    this.audioContext = ctx;
    this.destinationNode = destination;
    this.nextScheduledTime = 0;

    // 2. Setup listeners for incoming native PCM chunks
    this.dataListener = await SystemAudioCapture.addListener('audioData', (packet) => {
      this.handleIncomingPcmPacket(packet);
    });

    this.errorListener = await SystemAudioCapture.addListener('audioError', (err) => {
      console.warn('[SystemAudioCapture] Native error:', err.message);
    });

    this.stopListener = await SystemAudioCapture.addListener('audioStopped', () => {
      console.info('[SystemAudioCapture] Native capture stopped');
      this.stopCapture();
    });

    // 3. Request native screen capture / audio playback capture intent
    try {
      const res = await SystemAudioCapture.startCapture();
      if (!res?.success) {
        throw new Error('System audio capture initialization failed');
      }
      this.isCapturing = true;
      return destination.stream;
    } catch (err: any) {
      this.stopCapture();
      throw err;
    }
  }

  /**
   * Decode base64 PCM 16-bit stereo chunks and schedule onto the Web Audio destination
   */
  private handleIncomingPcmPacket(packet: { data: string; sampleRate: number; channels: number }): void {
    if (!this.audioContext || !this.destinationNode || this.audioContext.state === 'closed') {
      return;
    }

    try {
      const { data, sampleRate = 48000, channels = 2 } = packet;
      if (!data) return;

      // Base64 decode to binary string
      const binaryString = atob(data);
      const byteLength = binaryString.length;
      if (byteLength === 0) return;

      const bytes = new Uint8Array(byteLength);
      for (let i = 0; i < byteLength; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM bytes to Int16Array
      const int16Samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
      const totalSamples = int16Samples.length;
      const numFrames = Math.floor(totalSamples / channels);
      if (numFrames <= 0) return;

      // Create Web Audio Buffer
      const audioBuffer = this.audioContext.createBuffer(channels, numFrames, sampleRate);
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

      // Convert 16-bit signed integer (-32768 to 32767) to Float32 (-1.0 to 1.0)
      for (let i = 0; i < numFrames; i++) {
        leftChannel[i] = int16Samples[i * channels] / 32768.0;
        if (channels > 1) {
          rightChannel[i] = int16Samples[i * channels + 1] / 32768.0;
        }
      }

      // Schedule buffer playback into the stream destination
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.destinationNode);

      const currentTime = this.audioContext.currentTime;

      // Jitter buffer management: keep ~50ms buffer ahead, reset if lagging or drifted > 300ms
      if (this.nextScheduledTime < currentTime || this.nextScheduledTime > currentTime + 0.35) {
        this.nextScheduledTime = currentTime + 0.05;
      }

      source.start(this.nextScheduledTime);
      this.nextScheduledTime += audioBuffer.duration;

      source.onended = () => {
        try {
          source.disconnect();
        } catch {}
      };
    } catch (e) {
      console.warn('[SystemAudioCapture] Error processing PCM chunk:', e);
    }
  }

  /**
   * Stop capture and clean up audio resources
   */
  async stopCapture(): Promise<void> {
    this.isCapturing = false;

    if (this.dataListener) {
      this.dataListener.remove().catch(() => {});
      this.dataListener = null;
    }
    if (this.errorListener) {
      this.errorListener.remove().catch(() => {});
      this.errorListener = null;
    }
    if (this.stopListener) {
      this.stopListener.remove().catch(() => {});
      this.stopListener = null;
    }

    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        await SystemAudioCapture.stopCapture();
      } catch {}
    }

    if (this.destinationNode) {
      try {
        this.destinationNode.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.destinationNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close().catch(() => {});
      } catch {}
      this.audioContext = null;
    }

    this.nextScheduledTime = 0;
  }

  isActive(): boolean {
    return this.isCapturing;
  }
}

export const systemAudioBridge = new SystemAudioBridge();
