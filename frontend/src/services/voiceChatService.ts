import { usePlayerStore } from '../store/usePlayerStore';
import { roomService } from './roomService';
import { IRoomVoicePeer, IRoomVoiceSignal } from '../types';
import { systemAudioBridge } from './systemAudioBridge';

type SpeechCallback = (isSpeaking: boolean, speakerName: string) => void;
type PeersCallback = (peers: IRoomVoicePeer[]) => void;
type StatusCallback = (status: 'idle' | 'connecting' | 'connected' | 'error', errorMsg?: string) => void;

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

class VoiceChatService {
  // Local Media & Web Audio API
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private localMicSource: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;

  // Speech Detection & Audio Ducking
  private isSpeaking = false;
  private isMuted = false;
  private speechHoldTimeout: any = null;
  private originalMusicVolume: number | null = null;
  private isDucked = false;

  // Active Speakers Tracking (local & remote)
  private activeSpeakers: Set<string> = new Set();
  private speechCallbacks: Set<SpeechCallback> = new Set();
  private peersCallbacks: Set<PeersCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();

  // Peer & Room Identity
  private myPeerId = 'vpeer_' + Math.random().toString(36).substring(2, 9);
  private userName = 'You';
  private userAvatar: string | null = null;
  private userId: string | null = null;
  private currentRoomId: string | null = null;
  private audioMode: 'voice' | 'music_broadcast' = 'voice';

  // WebRTC Mesh Connections & Remote Audio
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private remoteAnalysers: Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode; name: string; isSpeaking: boolean; holdTimer: any }> = new Map();
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private knownPeers: Map<string, IRoomVoicePeer> = new Map();

  // Dual Signaling
  private broadcastChannel: BroadcastChannel | null = null;
  private pollInterval: any = null;
  private isSignalingBusy = false;
  private processedSignalIds: Set<string> = new Set();

  // Status
  private status: 'idle' | 'connecting' | 'connected' | 'error' = 'idle';

  constructor() {
    // Hidden audio pool container
    if (typeof document !== 'undefined') {
      let container = document.getElementById('aura-voice-audio-pool');
      if (!container) {
        container = document.createElement('div');
        container.id = 'aura-voice-audio-pool';
        container.style.display = 'none';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
      }
    }
  }

  onSpeechChange(callback: SpeechCallback): () => void {
    this.speechCallbacks.add(callback);
    return () => this.speechCallbacks.delete(callback);
  }

  onPeersChange(callback: PeersCallback): () => void {
    this.peersCallbacks.add(callback);
    return () => this.peersCallbacks.delete(callback);
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  setUserName(name: string): void {
    this.userName = name;
  }

  setUserAvatar(avatar?: string | null): void {
    this.userAvatar = avatar || null;
  }

  setUserId(id?: string | null): void {
    this.userId = id || null;
  }

  getMyPeerId(): string {
    return this.myPeerId;
  }

  getAudioMode(): 'voice' | 'music_broadcast' {
    return this.audioMode;
  }

  getConnectedPeers(): IRoomVoicePeer[] {
    return Array.from(this.knownPeers.values());
  }

  private setStatus(status: 'idle' | 'connecting' | 'connected' | 'error', err?: string) {
    this.status = status;
    this.statusCallbacks.forEach((cb) => cb(status, err));
  }

  /**
   * Request microphone or high-fidelity line access
   */
  async startMicrophone(mode: 'voice' | 'music_broadcast' = 'voice'): Promise<MediaStream> {
    if (this.localStream && this.audioMode === mode) {
      return this.localStream;
    }

    // If changing mode, release previous tracks first
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.audioMode = mode;

    try {
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

      // Update senders across all active RTCPeerConnections
      const newAudioTrack = stream.getAudioTracks()[0];
      if (newAudioTrack) {
        newAudioTrack.enabled = !this.isMuted;
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newAudioTrack).catch(() => {});
          } else {
            pc.addTrack(newAudioTrack, stream);
          }
        });
      }

      return stream;
    } catch (err: any) {
      console.warn('Audio capture denied or error:', err);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
          : err?.message || 'Could not access audio device';
      this.setStatus('error', msg);
      throw new Error(msg);
    }
  }

  /**
   * Broadcast device audio (Spotify, YouTube Music, local media) to the hotspot room
   */
  async startDeviceMusicBroadcast(): Promise<MediaStream> {
    // 1. Try native Android system audio capture (Capacitor Android 10+ AudioPlaybackCapture)
    try {
      const isNativeAndroid = await systemAudioBridge.isSupported();
      if (isNativeAndroid) {
        const stream = await systemAudioBridge.startCapture();
        if (this.localStream) {
          this.localStream.getTracks().forEach((t) => t.stop());
        }
        this.localStream = stream;
        this.audioMode = 'music_broadcast';
        this.initVoiceActivityDetection(stream, false);

        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = !this.isMuted;
          this.peerConnections.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            } else {
              pc.addTrack(track, stream);
            }
          });
        }
        return stream;
      }
    } catch (e: any) {
      console.info('Native system audio capture not started or canceled:', e?.message || e);
    }

    // 2. Try system audio capture via getDisplayMedia if available (Chromium / Desktop browsers)
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

          if (this.localStream) {
            this.localStream.getTracks().forEach((t) => t.stop());
          }

          this.localStream = audioStream;
          this.audioMode = 'music_broadcast';
          this.initVoiceActivityDetection(audioStream, false);

          const track = audioStream.getAudioTracks()[0];
          if (track) {
            track.enabled = !this.isMuted;
            this.peerConnections.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
              if (sender) {
                sender.replaceTrack(track).catch(() => {});
              } else {
                pc.addTrack(track, audioStream);
              }
            });
          }

          return audioStream;
        }
      } catch (e) {
        console.info('Internal display audio capture not granted, falling back to studio microphone broadcast', e);
      }
    }

    return this.startMicrophone('music_broadcast');
  }

  /**
   * Stop microphone and release media tracks
   */
  stopMicrophone(): void {
    systemAudioBridge.stopCapture().catch(() => {});

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
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    if (muted) {
      this.setSpeakingState(false);
      this.restoreMusicVolume();
    }

    // Broadcast mute status immediately via BroadcastChannel
    if (this.broadcastChannel && this.currentRoomId) {
      try {
        this.broadcastChannel.postMessage({
          type: 'PEER_STATUS',
          roomId: this.currentRoomId,
          peerId: this.myPeerId,
          isMuted: muted,
          isSpeaking: false,
        });
      } catch {}
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ==========================================
  // WEBRTC ROOM VOICE ENGINE & DUAL SIGNALING
  // ==========================================

  /**
   * Join Voice Chat in a specific room
   */
  async joinRoomVoice(
    roomId: string,
    user?: { id?: string; name: string; avatar?: string | null },
    mode: 'voice' | 'music_broadcast' = 'voice'
  ): Promise<void> {
    if (this.currentRoomId === roomId && this.localStream) {
      return;
    }

    this.currentRoomId = roomId;
    if (user?.name) this.userName = user.name;
    if (user?.avatar) this.userAvatar = user.avatar;
    if (user?.id) this.userId = user.id;

    this.setStatus('connecting');

    // 1. Acquire Local Audio Track
    try {
      if (mode === 'music_broadcast') {
        await this.startDeviceMusicBroadcast();
      } else {
        await this.startMicrophone(mode);
      }
    } catch (err: any) {
      this.setStatus('error', err?.message || 'Could not access microphone');
      throw err;
    }

    // 2. Setup Local HTML5 BroadcastChannel (zero latency for same-origin tabs)
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      this.broadcastChannel = new BroadcastChannel(`aurastream_voice_${roomId}`);
      this.broadcastChannel.onmessage = (event: MessageEvent) => {
        this.handleBroadcastChannelMessage(event.data);
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this browser, relying solely on edge signaling', e);
    }

    // 3. Register presence with Cloudflare Worker backend
    try {
      const resp = await roomService.joinVoice(roomId, {
        peerId: this.myPeerId,
        userName: this.userName,
        userAvatar: this.userAvatar,
        audioMode: this.audioMode,
      });

      const existingPeers: IRoomVoicePeer[] = resp?.peers || [];

      // Update known peers list
      this.knownPeers.clear();
      existingPeers.forEach((p) => {
        this.knownPeers.set(p.peer_id, p);
      });
      this.notifyPeers();

      // Announce arrival on BroadcastChannel for multi-tab
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'PEER_JOIN',
            roomId,
            peer: {
              peer_id: this.myPeerId,
              user_id: this.userId,
              user_name: this.userName,
              user_avatar: this.userAvatar,
              is_muted: this.isMuted,
              is_speaking: this.isSpeaking,
              audio_mode: this.audioMode,
            },
          });
        } catch {}
      }

      // Initiate WebRTC connection to each existing peer in the room (we are initiator)
      for (const peer of existingPeers) {
        await this.initiatePeerConnection(peer.peer_id, peer.user_name);
      }

      this.setStatus('connected');
    } catch (err: any) {
      console.warn('Backend voice join failed, falling back to local BroadcastChannel:', err);
      this.setStatus('connected');
    }

    // 4. Start background signaling polling loop (every 1.5 seconds)
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.pollSignaling();
    }, 1500);
  }

  /**
   * Leave Voice Chat in current room
   */
  async leaveRoomVoice(): Promise<void> {
    const roomId = this.currentRoomId;
    const peerId = this.myPeerId;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Notify BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'PEER_LEAVE',
          roomId,
          peerId,
        });
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }

    // Notify Cloudflare Worker backend
    if (roomId) {
      roomService.leaveVoice(roomId, peerId).catch(() => {});
    }

    // Teardown all Peer Connections
    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    this.peerConnections.clear();

    // Teardown all Remote Audio Elements
    this.remoteAudioElements.forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
        el.remove();
      } catch {}
    });
    this.remoteAudioElements.clear();
    this.remoteStreams.clear();

    // Clean up remote analysers
    this.remoteAnalysers.forEach((item) => {
      if (item.holdTimer) clearTimeout(item.holdTimer);
    });
    this.remoteAnalysers.clear();
    this.pendingIceCandidates.clear();
    this.knownPeers.clear();
    this.activeSpeakers.clear();

    // Stop local media
    this.stopMicrophone();
    this.currentRoomId = null;
    this.setStatus('idle');
    this.notifyPeers();
  }

  /**
   * Create RTCPeerConnection and initiate Offer to remote peer
   */
  private async initiatePeerConnection(targetPeerId: string, targetPeerName: string): Promise<void> {
    if (this.peerConnections.has(targetPeerId)) {
      return;
    }

    const pc = this.createPeerConnection(targetPeerId, targetPeerName);

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      this.sendSignal(targetPeerId, {
        type: 'offer',
        sdp: offer,
      });
    } catch (err) {
      console.warn(`Failed to create offer for ${targetPeerId}:`, err);
    }
  }

  /**
   * Create and configure RTCPeerConnection
   */
  private createPeerConnection(targetPeerId: string, targetPeerName: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Add local audio track to connection
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Trickle ICE Candidate Handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetPeerId, {
          type: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Remote Audio Track Handler
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.handleRemoteStream(targetPeerId, targetPeerName, stream);
      }
    };

    // Connection State Change
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupPeer(targetPeerId);
      }
    };

    this.peerConnections.set(targetPeerId, pc);
    return pc;
  }

  /**
   * Attach remote stream to DOM audio element and remote VAD analyser
   */
  private handleRemoteStream(peerId: string, peerName: string, stream: MediaStream): void {
    this.remoteStreams.set(peerId, stream);

    // 1. Audio Element Playback
    let audio = this.remoteAudioElements.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('data-peer-id', peerId);
      audio.style.display = 'none';

      const pool = document.getElementById('aura-voice-audio-pool') || document.body;
      pool.appendChild(audio);
      this.remoteAudioElements.set(peerId, audio);
    }

    audio.srcObject = stream;
    audio.play().catch((err) => {
      console.info(`Audio autoplay blocked for peer ${peerId}, will resume on user interaction:`, err);
      const resumeOnGesture = () => {
        audio?.play().catch(() => {});
        window.removeEventListener('click', resumeOnGesture);
        window.removeEventListener('keydown', resumeOnGesture);
      };
      window.addEventListener('click', resumeOnGesture, { once: true });
      window.addEventListener('keydown', resumeOnGesture, { once: true });
    });

    // 2. Remote Voice Activity Detection (VAD) & Audio Ducking
    this.attachRemoteVAD(peerId, peerName, stream);
  }

  /**
   * Monitor remote audio stream amplitude for voice ducking and UI speaker indicators
   */
  private attachRemoteVAD(peerId: string, peerName: string, stream: MediaStream): void {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      this.remoteAnalysers.set(peerId, {
        analyser,
        source,
        name: peerName,
        isSpeaking: false,
        holdTimer: null,
      });
    } catch (e) {
      console.warn(`Remote VAD hook skipped for ${peerName}:`, e);
    }
  }

  /**
   * Send WebRTC Signal via Dual Signaling (BroadcastChannel + Cloudflare Worker)
   */
  private sendSignal(toPeerId: string, signalData: any): void {
    if (!this.currentRoomId) return;

    const signalPayload: IRoomVoiceSignal = {
      fromPeerId: this.myPeerId,
      toPeerId,
      fromName: this.userName,
      signalData,
      createdAt: Date.now(),
    };

    // 1. Local BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'WEBRTC_SIGNAL',
          roomId: this.currentRoomId,
          signal: signalPayload,
        });
      } catch {}
    }

    // 2. Cloudflare Worker Edge Queue
    roomService
      .sendVoiceSignal(this.currentRoomId, {
        fromPeerId: this.myPeerId,
        toPeerId,
        fromName: this.userName,
        signalData,
      })
      .catch(() => {});
  }

  /**
   * Poll Cloudflare Worker for pending WebRTC signals and active peers heartbeat
   */
  private async pollSignaling(): Promise<void> {
    if (!this.currentRoomId || this.isSignalingBusy) return;
    this.isSignalingBusy = true;

    try {
      const data = await roomService.pollVoice(
        this.currentRoomId,
        this.myPeerId,
        this.isMuted,
        this.isSpeaking
      );

      // 1. Process active peers
      if (data?.peers) {
        const currentPeerIds = new Set<string>();
        data.peers.forEach((p) => {
          if (p.peer_id !== this.myPeerId) {
            currentPeerIds.add(p.peer_id);
            const prev = this.knownPeers.get(p.peer_id);
            this.knownPeers.set(p.peer_id, {
              ...prev,
              ...p,
            });

            // If we see a peer we haven't connected to yet, initiate connection
            if (!this.peerConnections.has(p.peer_id) && this.myPeerId > p.peer_id) {
              this.initiatePeerConnection(p.peer_id, p.user_name);
            }
          }
        });

        // Clean up peers that left
        this.knownPeers.forEach((_, peerId) => {
          if (!currentPeerIds.has(peerId)) {
            this.cleanupPeer(peerId);
          }
        });

        this.notifyPeers();
      }

      // 2. Process incoming signals
      if (data?.signals && data.signals.length > 0) {
        for (const sig of data.signals) {
          if (sig.id && this.processedSignalIds.has(sig.id)) continue;
          if (sig.id) {
            this.processedSignalIds.add(sig.id);
            if (this.processedSignalIds.size > 200) {
              const first = this.processedSignalIds.values().next().value;
              if (first) this.processedSignalIds.delete(first);
            }
          }
          await this.handleIncomingSignal(sig);
        }
      }
    } catch (e) {
      // Polling network blip, continue
    } finally {
      this.isSignalingBusy = false;
    }
  }

  /**
   * Handle incoming message from local BroadcastChannel
   */
  private async handleBroadcastChannelMessage(data: any): Promise<void> {
    if (!data || data.roomId !== this.currentRoomId) return;

    if (data.type === 'PEER_JOIN' && data.peer && data.peer.peer_id !== this.myPeerId) {
      const peer = data.peer as IRoomVoicePeer;
      this.knownPeers.set(peer.peer_id, peer);
      this.notifyPeers();

      // Initiate connection if our peerId is lexicographically higher (avoids glare)
      if (this.myPeerId > peer.peer_id && !this.peerConnections.has(peer.peer_id)) {
        this.initiatePeerConnection(peer.peer_id, peer.user_name);
      }
    } else if (data.type === 'PEER_LEAVE' && data.peerId) {
      this.cleanupPeer(data.peerId);
    } else if (data.type === 'PEER_STATUS' && data.peerId && data.peerId !== this.myPeerId) {
      const peer = this.knownPeers.get(data.peerId);
      if (peer) {
        peer.is_muted = data.isMuted;
        peer.is_speaking = data.isSpeaking;
        this.notifyPeers();
      }
    } else if (data.type === 'WEBRTC_SIGNAL' && data.signal) {
      const sig = data.signal as IRoomVoiceSignal;
      if (sig.toPeerId === this.myPeerId) {
        await this.handleIncomingSignal(sig);
      }
    }
  }

  /**
   * Handle incoming WebRTC signal (offer, answer, or candidate)
   */
  private async handleIncomingSignal(signal: IRoomVoiceSignal): Promise<void> {
    const { fromPeerId, fromName = 'Room Peer', signalData } = signal;
    if (!signalData || fromPeerId === this.myPeerId) return;

    let pc = this.peerConnections.get(fromPeerId);

    if (signalData.type === 'offer') {
      if (!signalData.sdp) return;
      if (!pc) {
        pc = this.createPeerConnection(fromPeerId, fromName);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

        // Drain any pending ICE candidates
        const pending = this.pendingIceCandidates.get(fromPeerId) || [];
        for (const cand of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }
        this.pendingIceCandidates.delete(fromPeerId);

        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.sendSignal(fromPeerId, {
          type: 'answer',
          sdp: answer,
        });
      } catch (err) {
        console.warn(`Failed to handle offer from ${fromPeerId}:`, err);
      }
    } else if (signalData.type === 'answer') {
      if (pc && signalData.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

          // Drain any pending ICE candidates
          const pending = this.pendingIceCandidates.get(fromPeerId) || [];
          for (const cand of pending) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
          this.pendingIceCandidates.delete(fromPeerId);
        } catch (err) {
          console.warn(`Failed to set answer from ${fromPeerId}:`, err);
        }
      }
    } else if (signalData.type === 'ice-candidate') {
      if (signalData.candidate) {
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (e) {
            console.warn(`Failed to add ICE candidate from ${fromPeerId}:`, e);
          }
        } else {
          // Queue candidate until remote description is set
          const pending = this.pendingIceCandidates.get(fromPeerId) || [];
          pending.push(signalData.candidate);
          this.pendingIceCandidates.set(fromPeerId, pending);
        }
      }
    }
  }

  /**
   * Clean up a disconnected peer
   */
  private cleanupPeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {}
      this.peerConnections.delete(peerId);
    }

    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {}
      this.remoteAudioElements.delete(peerId);
    }

    this.remoteStreams.delete(peerId);

    const analyserItem = this.remoteAnalysers.get(peerId);
    if (analyserItem) {
      if (analyserItem.holdTimer) clearTimeout(analyserItem.holdTimer);
      this.activeSpeakers.delete(analyserItem.name);
      this.remoteAnalysers.delete(peerId);
    }

    this.pendingIceCandidates.delete(peerId);
    this.knownPeers.delete(peerId);

    if (this.activeSpeakers.size === 0) {
      this.restoreMusicVolume();
    }

    this.notifyPeers();
  }

  private notifyPeers(): void {
    const list = Array.from(this.knownPeers.values());
    this.peersCallbacks.forEach((cb) => cb(list));
  }

  // ==========================================
  // VOICE ACTIVITY DETECTION & SMART DUCKING
  // ==========================================

  private initVoiceActivityDetection(stream: MediaStream, shouldDuck: boolean = true): void {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 512;
      this.localAnalyser.smoothingTimeConstant = 0.4;

      this.localMicSource = this.audioContext.createMediaStreamSource(stream);
      this.localMicSource.connect(this.localAnalyser);

      const bufferLength = this.localAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const remoteDataArray = new Uint8Array(128);

      const SPEECH_THRESHOLD = 30;

      const checkAudioLevel = () => {
        // 1. Check Local Microphone Level
        if (this.localAnalyser && !this.isMuted) {
          this.localAnalyser.getByteFrequencyData(dataArray);

          let sum = 0;
          const voiceBinsCount = Math.min(bufferLength, 80);
          for (let i = 4; i < voiceBinsCount; i++) {
            sum += dataArray[i];
          }
          const average = sum / (voiceBinsCount - 4);

          if (average > SPEECH_THRESHOLD) {
            if (!this.isSpeaking) {
              this.setSpeakingState(true);
              if (shouldDuck) this.duckMusicVolume();
            }

            if (this.speechHoldTimeout) {
              clearTimeout(this.speechHoldTimeout);
              this.speechHoldTimeout = null;
            }
          } else if (this.isSpeaking && !this.speechHoldTimeout) {
            this.speechHoldTimeout = setTimeout(() => {
              this.setSpeakingState(false);
              if (this.activeSpeakers.size === 0) {
                this.restoreMusicVolume();
              }
              this.speechHoldTimeout = null;
            }, 600);
          }
        }

        // 2. Check Remote Peer Levels (VAD for remote participants)
        this.remoteAnalysers.forEach((remote) => {
          remote.analyser.getByteFrequencyData(remoteDataArray);
          let rSum = 0;
          for (let j = 2; j < 40; j++) {
            rSum += remoteDataArray[j];
          }
          const rAvg = rSum / 38;

          if (rAvg > SPEECH_THRESHOLD) {
            if (!remote.isSpeaking) {
              remote.isSpeaking = true;
              this.activeSpeakers.add(remote.name);
              this.duckMusicVolume();
              this.speechCallbacks.forEach((cb) => cb(true, remote.name));
            }

            if (remote.holdTimer) {
              clearTimeout(remote.holdTimer);
              remote.holdTimer = null;
            }
          } else if (remote.isSpeaking && !remote.holdTimer) {
            remote.holdTimer = setTimeout(() => {
              remote.isSpeaking = false;
              this.activeSpeakers.delete(remote.name);
              this.speechCallbacks.forEach((cb) => cb(false, remote.name));

              if (!this.isSpeaking && this.activeSpeakers.size === 0) {
                this.restoreMusicVolume();
              }
              remote.holdTimer = null;
            }, 600);
          }
        });

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
    if (speaking) {
      this.activeSpeakers.add(this.userName);
    } else {
      this.activeSpeakers.delete(this.userName);
    }
    this.speechCallbacks.forEach((cb) => cb(speaking, this.userName));

    // Broadcast speaking status via BroadcastChannel for multi-tab UI
    if (this.broadcastChannel && this.currentRoomId) {
      try {
        this.broadcastChannel.postMessage({
          type: 'PEER_STATUS',
          roomId: this.currentRoomId,
          peerId: this.myPeerId,
          isMuted: this.isMuted,
          isSpeaking: speaking,
        });
      } catch {}
    }
  }

  isSpeakingActive(): boolean {
    return this.isSpeaking;
  }

  isAudioDucked(): boolean {
    return this.isDucked;
  }
}

export const voiceChatService = new VoiceChatService();

