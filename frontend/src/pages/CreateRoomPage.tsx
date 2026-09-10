import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomService } from '../services/roomService';
import { useRoomStore } from '../store/useRoomStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useHotspotStore } from '../store/useHotspotStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { Button } from '../components/common/Button';
import {
  Radio,
  Users,
  ShieldCheck,
  Lock,
  Globe,
  Wifi,
  Mic,
  ArrowLeft,
} from 'lucide-react';

export const CreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentTrack } = usePlayerStore();
  const { setRoom } = useRoomStore();
  const { startParty } = useHotspotStore();
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [networkMode, setNetworkMode] = useState<'online' | 'hotspot'>('online');
  const [djMode, setDjMode] = useState<'collaborative' | 'host_only'>('collaborative');
  const [isPublic, setIsPublic] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [includeCurrentTrack, setIncludeCurrentTrack] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const quickPresets = [
    'Midnight Cyberpunk Jam',
    'Lo-Fi Study Flow',
    'Weekend Party Vibes',
    'Late Night Chill',
    'Gym Workout Hype',
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a room name');
      return;
    }

    if (!isAuthenticated) {
      openModal('login');
      return;
    }

    setIsLoading(true);
    setError('');

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

      navigate(`/room/${res.code}`);
    } catch (err: any) {
      console.error('Failed to create room:', err);
      setError(err.response?.data?.message || 'Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 pt-2">
      {/* Top Header & Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/rooms')}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Back to rooms"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Host a Listening Room
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Create a synchronized music session with live queueing and voice chat
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main Creation Form */}
      <form onSubmit={handleCreate} className="space-y-6">
        {/* 1. Network Mode Selector */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            1. Network Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNetworkMode('online')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                networkMode === 'online'
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-md ring-1 ring-white/10'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Radio className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-bold">Online Edge Session</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stream over the internet with friends anywhere globally using YouTube integration.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setNetworkMode('hotspot')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                networkMode === 'hotspot'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/20'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">Wi-Fi Hotspot (Offline)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Host directly from your phone Wi-Fi hotspot with zero internet data needed!
              </p>
            </button>
          </div>
        </div>

        {/* 2. Room Identity (Name & Presets) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            2. Room Identity
          </label>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
              Room Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midnight Cyberpunk Session, Lo-Fi Chill Jam"
              required
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:border-zinc-500 transition-colors shadow-inner"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] text-zinc-500 font-medium block mb-2">Or choose a quick theme:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    name === preset
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
              Vibe / Atmosphere Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should listeners expect? (e.g. Chill synthwave beats, study motivation, weekend party)"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:border-zinc-500 transition-colors resize-none shadow-inner"
            />
          </div>
        </div>

        {/* 3. DJ Playback Mode */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            3. Playback Control (DJ Mode)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDjMode('collaborative')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                djMode === 'collaborative'
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-md ring-1 ring-white/10'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold">Collaborative Jukebox</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All participants can add tracks to the queue, vote up songs, and request audio.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDjMode('host_only')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                djMode === 'host_only'
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-md ring-1 ring-white/10'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">Host DJ Only</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Only you control what plays and the queue order; all guests listen in perfect sync.
              </p>
            </button>
          </div>
        </div>

        {/* 4. Live Voice Chat & Ducking */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white">Live Voice Audio Chat & Smart Ducking</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Allows listeners to talk in real time with auto-ducking music volume when speaking.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={(e) => setVoiceEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* 5. Room Visibility */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            5. Room Visibility & Access
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                isPublic
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-md ring-1 ring-white/10'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold">Public Room</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Featured in the public Rooms lobby for anyone in the community to discover and join.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                !isPublic
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-md ring-1 ring-white/10'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">Private (Code Only)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hidden from public listings; only listeners with your direct room code or link can join.
              </p>
            </button>
          </div>
        </div>

        {/* 6. Initial Track Selector */}
        {currentTrack && (
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Start with currently playing</span>
                <p className="text-xs sm:text-sm font-bold text-white truncate">{currentTrack.title}</p>
                <p className="text-[11px] text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={includeCurrentTrack}
                onChange={(e) => setIncludeCurrentTrack(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
        )}

        {/* Form Bottom Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="lg"
            type="button"
            onClick={() => navigate('/rooms')}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            isLoading={isLoading}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-rose-500/25 hover:shadow-rose-500/40 rounded-xl cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            <span>Launch Live Room</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
