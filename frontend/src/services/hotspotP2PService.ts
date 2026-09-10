import { ITrack, IHotspotMessage, IHotspotPeer } from '../types';
import { localMusicService } from './localMusicService';

type MessageHandler = (msg: IHotspotMessage) => void;
type PeerUpdateHandler = (peers: IHotspotPeer[]) => void;

class HotspotP2PService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private messageHandlers: Set<MessageHandler> = new Set();
  private peerUpdateHandlers: Set<PeerUpdateHandler> = new Set();
  private activePeers: Map<string, IHotspotPeer> = new Map();

  // Audio chunk reception buffers: trackId -> { chunks: ArrayBuffer[], received: number, total: number, meta: ITrack }
  private chunkBuffers: Map<string, { chunks: Uint8Array[]; received: number; total: number; meta: ITrack }> = new Map();

  // Local BroadcastChannel for zero-latency same-machine multi-window hotspot testing
  private localBroadcast: BroadcastChannel | null = null;
  private myId = 'peer_' + Math.random().toString(36).substring(2, 9);
  private myName = 'Device ' + this.myId.substring(5);

  constructor() {
    try {
      this.localBroadcast = new BroadcastChannel('aurastream_hotspot_p2p');
      this.localBroadcast.onmessage = (event: MessageEvent<IHotspotMessage>) => {
        if (event.data && event.data.senderId !== this.myId) {
          this.handleIncomingMessage(event.data);
        }
      };
    } catch {}
  }

  getMyId(): string {
    return this.myId;
  }

  getMyName(): string {
    return this.myName;
  }

  setMyName(name: string): void {
    this.myName = name;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onPeersUpdated(handler: PeerUpdateHandler): () => void {
    this.peerUpdateHandlers.add(handler);
    return () => this.peerUpdateHandlers.delete(handler);
  }

  /**
   * Broadcast a message to all connected Hotspot peers (over WebRTC and LAN BroadcastChannel)
   */
  broadcast(msg: Omit<IHotspotMessage, 'senderId' | 'senderName' | 'timestamp'>): void {
    const fullMsg: IHotspotMessage = {
      ...msg,
      senderId: this.myId,
      senderName: this.myName,
      timestamp: Date.now(),
    };

    // 1. Send via local BroadcastChannel
    if (this.localBroadcast) {
      try {
        this.localBroadcast.postMessage(fullMsg);
      } catch {}
    }

    // 2. Send via WebRTC DataChannels to remote mobile/laptop peers
    const payload = JSON.stringify(fullMsg);
    this.dataChannels.forEach((dc) => {
      if (dc.readyState === 'open') {
        try {
          dc.send(payload);
        } catch {}
      }
    });
  }

  /**
   * Stream a local audio file to connected Hotspot peers in binary chunks
   */
  async streamTrackToPeers(track: ITrack): Promise<void> {
    const blob = await localMusicService.getTrackBlob(track.id);
    if (!blob) return;

    // Send metadata first
    this.broadcast({
      type: 'TRACK_META',
      track,
    });

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const CHUNK_SIZE = 48 * 1024; // 48KB per slice (optimal for WebRTC DataChannel)
    const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const slice = bytes.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const base64Chunk = this.arrayBufferToBase64(slice);

      this.broadcast({
        type: 'AUDIO_CHUNK',
        track,
        chunkIndex: i,
        totalChunks,
        chunkData: base64Chunk,
      });

      // Micro-pause every 5 chunks to keep data channel from saturating
      if (i % 5 === 0) {
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    this.broadcast({
      type: 'AUDIO_COMPLETE',
      track,
      playbackTime: 0,
      isPlaying: true,
    });
  }

  /**
   * Handle incoming P2P message from Host or Peer
   */
  private async handleIncomingMessage(msg: IHotspotMessage) {
    // Notify registered UI listeners
    this.messageHandlers.forEach((handler) => handler(msg));

    // Register active peer
    if (msg.senderId && !this.activePeers.has(msg.senderId)) {
      const newPeer: IHotspotPeer = {
        id: msg.senderId,
        name: msg.senderName || 'Hotspot Device',
        device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        connected_at: Date.now(),
      };
      this.activePeers.set(msg.senderId, newPeer);
      this.notifyPeers();
    }

    // Reassemble audio chunks if receiving a track stream
    if (msg.type === 'AUDIO_CHUNK' && msg.track && msg.chunkData && typeof msg.chunkIndex === 'number' && msg.totalChunks) {
      const trackId = msg.track.id;
      let buffer = this.chunkBuffers.get(trackId);
      if (!buffer) {
        buffer = {
          chunks: new Array(msg.totalChunks),
          received: 0,
          total: msg.totalChunks,
          meta: msg.track,
        };
        this.chunkBuffers.set(trackId, buffer);
      }

      const chunkBytes = this.base64ToArrayBuffer(msg.chunkData);
      buffer.chunks[msg.chunkIndex] = new Uint8Array(chunkBytes);
      buffer.received++;

      if (buffer.received === buffer.total) {
        // Reassemble full Blob
        const fullBlob = new Blob(buffer.chunks as BlobPart[], { type: 'audio/mpeg' });
        await localMusicService.saveReceivedP2PTrack(buffer.meta, fullBlob);
        this.chunkBuffers.delete(trackId);
      }
    }
  }

  private notifyPeers() {
    const list = Array.from(this.activePeers.values());
    this.peerUpdateHandlers.forEach((h) => h(list));
  }

  private arrayBufferToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Create WebRTC Offer for connecting two devices on the same Wi-Fi
   */
  async createOffer(): Promise<string> {
    const pc = new RTCPeerConnection({
      iceServers: [], // No STUN/TURN needed on local Wi-Fi LAN
    });

    const dc = pc.createDataChannel('aurastream_p2p_channel');
    this.setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return JSON.stringify(pc.localDescription);
  }

  /**
   * Accept WebRTC Offer and create Answer
   */
  async createAnswer(offerSdp: string): Promise<string> {
    const pc = new RTCPeerConnection({ iceServers: [] });

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerSdp)));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return JSON.stringify(pc.localDescription);
  }

  private setupDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      this.broadcast({ type: 'HANDSHAKE' });
    };

    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleIncomingMessage(msg);
      } catch {}
    };

    this.dataChannels.set('peer_' + Date.now(), dc);
  }
}

export const hotspotP2PService = new HotspotP2PService();
