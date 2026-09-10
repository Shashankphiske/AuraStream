import React, { useState } from 'react';
import { useHotspotStore } from '../../store/useHotspotStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Button } from '../common/Button';
import {
  Wifi,
  Users,
  Copy,
  Check,
  X,
  Smartphone,
  Laptop,
  Radio,
  Share2,
  Info,
  QrCode,
  ArrowRight,
} from 'lucide-react';

interface HotspotPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotspotPartyModal: React.FC<HotspotPartyModalProps> = ({ isOpen, onClose }) => {
  const {
    isPartyActive,
    isHost,
    partyCode,
    peers,
    connectedToHost,
    hostName,
    isSharingAudio,
    transferProgress,
    startParty,
    joinParty,
    leaveParty,
    shareTrack,
  } = useHotspotStore();

  const { currentTrack } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentHostUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5173/local`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${currentHostUrl}?party=${partyCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartHost = () => {
    startParty();
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    joinParty(joinCodeInput.trim());
  };

  const handleShareCurrentTrack = () => {
    if (currentTrack) {
      shareTrack(currentTrack);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Wi-Fi Hotspot Party</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Zero Data
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Listen together over the same Wi-Fi / Hotspot with no internet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 px-5 pt-2">
          <button
            onClick={() => setActiveTab('host')}
            className={`pb-2.5 px-4 text-xs font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'host'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Host Party</span>
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`pb-2.5 px-4 text-xs font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'join'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Join Party</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'host' ? (
            <div className="space-y-4">
              {!isPartyActive ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                    <Wifi className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Broadcast to Nearby Devices</h4>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 leading-relaxed">
                      Anyone connected to your mobile hotspot or Wi-Fi can listen to your local folder music simultaneously without internet.
                    </p>
                  </div>
                  <Button variant="primary" size="md" onClick={handleStartHost} className="gap-2">
                    <Wifi className="w-4 h-4" />
                    <span>Start Hotspot Party</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Party Code Banner */}
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Local Pairing Code
                    </span>
                    <div className="text-3xl font-extrabold tracking-widest font-mono text-emerald-400">
                      {partyCode}
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Tell friends on your Wi-Fi to enter this code on their phone or laptop
                    </p>

                    <div className="flex items-center gap-2 pt-1 w-full max-w-xs">
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-xs font-medium text-white transition-colors cursor-pointer border border-zinc-700/60"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Link Copied' : 'Copy Local URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* QR Code Section for Camera Scan */}
                  <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-center gap-4">
                    <div className="w-20 h-20 bg-white p-1.5 rounded-lg flex-shrink-0 flex items-center justify-center shadow-md">
                      {/* Stylized high-contrast SVG pairing QR code */}
                      <svg viewBox="0 0 24 24" className="w-full h-full text-black" fill="currentColor">
                        <path d="M2 2h8v8H2zm2 2v4h4V4zm8-2h8v8h-8zm2 2v4h4V4zM2 14h8v8H2zm2 2v4h4v-4zm10-2h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-2-2h2v2h-2zm-2 4h6v2h-6zM4 6h2v2H4zm12 0h2v2h-2zM4 18h2v2H4z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Instant Phone Scan</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Open camera on any phone connected to this hotspot to join the listening party automatically.
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">{currentHostUrl}</p>
                    </div>
                  </div>

                  {/* Audio Stream Action */}
                  {currentTrack && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-white truncate">Now: {currentTrack.title}</p>
                        <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleShareCurrentTrack}
                        disabled={isSharingAudio}
                        className="flex-shrink-0 gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{isSharingAudio ? `Syncing (${transferProgress}%)` : 'Sync Audio'}</span>
                      </Button>
                    </div>
                  )}

                  {/* Connected Devices List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-400 uppercase tracking-wider">
                        Connected Devices ({peers.length + 1})
                      </span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Local Mesh Active
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Host device */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800 text-xs">
                        <div className="flex items-center gap-2 text-white">
                          <Laptop className="w-4 h-4 text-emerald-400" />
                          <span className="font-medium">This Computer (Host)</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
                          DJ Source
                        </span>
                      </div>

                      {/* Connected peers */}
                      {peers.map((peer) => (
                        <div
                          key={peer.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800 text-xs"
                        >
                          <div className="flex items-center gap-2 text-zinc-200">
                            {peer.device_type === 'mobile' ? (
                              <Smartphone className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <Laptop className="w-4 h-4 text-zinc-400" />
                            )}
                            <span>{peer.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">Connected</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={leaveParty}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                    >
                      End Hotspot Party
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!connectedToHost ? (
                <form onSubmit={handleJoin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Enter Host Pairing Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. WIFI-482"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="md" className="w-full gap-2">
                    <span>Connect to Hotspot Party</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Connected to {hostName}</h4>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1">
                      Party Code: <span className="font-mono text-emerald-400 font-semibold">{partyCode}</span>
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-2">
                      When the host plays or changes songs, your audio will automatically synchronize over the local Wi-Fi.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={leaveParty}>
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Wi-Fi Info Tip */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-start gap-2.5 text-[11px] text-zinc-400">
            <Info className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
            <p leading-relaxed>
              Ensure all phones and laptops are connected to the same Wi-Fi router or Mobile Hotspot. No external internet or cellular data is consumed during playback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
