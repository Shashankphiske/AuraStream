import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { roomService } from '../../services/roomService';
import { useRoomStore } from '../../store/useRoomStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, ShieldCheck, Lock, Globe, Wifi, Mic } from 'lucide-react';
import { useHotspotStore } from '../../store/useHotspotStore';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { currentTrack } = usePlayerStore();
  const { setRoom } = useRoomStore();
  const { startParty } = useHotspotStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [networkMode, setNetworkMode] = useState<'online' | 'hotspot'>('online');
  const [djMode, setDjMode] = useState<'collaborative' | 'host_only'>('collaborative');
  const [isPublic, setIsPublic] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [includeCurrentTrack, setIncludeCurrentTrack] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await roomService.createRoom({
        name: name.trim(),
        description: description.trim(),
        djMode,
        isPublic,
        initialTrack: includeCurrentTrack && currentTrack ? currentTrack : undefined,
      });

      if (networkMode === 'hotspot') {
        startParty(res.code);
      }

      // Fetch fresh room details and navigate
      const roomDetails = await roomService.getRoom(res.id || res.code);
      const enhancedRoom = {
        ...roomDetails.room,
        is_offline: networkMode === 'hotspot',
        voice_enabled: voiceEnabled,
      };
      setRoom(enhancedRoom, roomDetails.members, roomDetails.queue, roomDetails.messages, true);

      onClose();
      navigate(`/room/${res.code}`);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" title="Create Listen Together Room">
      <form onSubmit={handleCreate} className="space-y-4">
        {/* Network Mode (Online vs Offline Hotspot) */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Network Mode
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setNetworkMode('online')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                networkMode === 'online'
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold">Online Edge Session</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Stream with friends anywhere in the world over the internet.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setNetworkMode('hotspot')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                networkMode === 'hotspot'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Wi-Fi Hotspot (Offline)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Stream local device music with friends on your mobile hotspot with zero data!
              </p>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Room Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Midnight Cyberpunk Session, Lo-Fi Chill Jam"
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
            Vibe / Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the atmosphere of this session?"
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        {/* DJ Mode Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Playback Control (DJ Mode)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDjMode('collaborative')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                djMode === 'collaborative'
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold">Collaborative</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                All participants can add songs and vote on the queue.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDjMode('host_only')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                djMode === 'host_only'
                  ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold">Host DJ Only</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Only you control playback; guests listen in sync.
              </p>
            </button>
          </div>
        </div>

        {/* Voice Audio Chat & Smart Ducking Toggle */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white">Live Voice Audio Chat & Smart Ducking</p>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Allows members to talk in real time with auto-ducked music volume.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
            className="accent-emerald-500 w-4 h-4 cursor-pointer flex-shrink-0"
          />
        </div>

        {/* Privacy Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
            Visibility
          </label>
          <div className="flex items-center gap-4 text-xs text-zinc-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="accent-white"
              />
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>Public (Visible in Lobby)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="accent-white"
              />
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Invite & Code Only</span>
            </label>
          </div>
        </div>

        {/* Initial Track Option */}
        {currentTrack && (
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <p className="text-xs font-medium text-white truncate">Start with currently playing song</p>
              <p className="text-[11px] text-zinc-400 truncate">{currentTrack.title}</p>
            </div>
            <input
              type="checkbox"
              checked={includeCurrentTrack}
              onChange={(e) => setIncludeCurrentTrack(e.target.checked)}
              className="accent-white w-4 h-4 cursor-pointer"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" isLoading={isLoading} className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span>Launch Room</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
