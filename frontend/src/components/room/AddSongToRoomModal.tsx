import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { musicService } from '../../services/musicService';
import { localMusicService } from '../../services/localMusicService';
import { useRoomStore } from '../../store/useRoomStore';
import { ITrack } from '../../types';
import { Search, Plus, Check, Folder, HardDrive, Globe } from 'lucide-react';

interface AddSongToRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec <= 0) return '3:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AddSongToRoomModal: React.FC<AddSongToRoomModalProps> = ({ isOpen, onClose }) => {
  const { addTrackToQueue, queue, currentRoom } = useRoomStore();
  const [activeTab, setActiveTab] = useState<'online' | 'local'>(currentRoom?.is_offline ? 'local' : 'online');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITrack[]>([]);
  const [localTracks, setLocalTracks] = useState<ITrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [isScanningFolder, setIsScanningFolder] = useState(false);

  // Load saved local tracks
  useEffect(() => {
    if (isOpen) {
      localMusicService.getSavedLocalTracks().then(setLocalTracks).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab !== 'online') return;

    if (!query.trim()) {
      musicService.getTrending(8).then(setResults).catch(() => {});
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await musicService.search(query.trim(), 15);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  if (!isOpen) return null;

  const handleAdd = async (track: ITrack) => {
    try {
      await addTrackToQueue(track);
      setAddedIds((prev) => [...prev, track.youtube_id || track.id]);
      setTimeout(() => {
        setAddedIds((prev) => prev.filter((id) => id !== (track.youtube_id || track.id)));
      }, 2000);
    } catch (err) {
      console.error('Failed to add track to room queue:', err);
    }
  };

  const handleScanLocalFolder = async () => {
    setIsScanningFolder(true);
    try {
      const res = await localMusicService.pickAndScanFolder();
      setLocalTracks(res.tracks);
    } catch (err: any) {
      console.warn('Folder scan aborted or failed:', err);
    } finally {
      setIsScanningFolder(false);
    }
  };

  const filteredLocalTracks = query.trim()
    ? localTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase())
      )
    : localTracks;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" title="Add Songs to Room Queue">
      <div className="space-y-4">
        {/* Source Switcher Tabs */}
        <div className="flex rounded-xl bg-zinc-900/90 border border-zinc-800 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'online'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Online Catalog / YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local Device Storage ({localTracks.length})</span>
            {currentRoom?.is_offline && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                HOTSPOT
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Online Mode */}
        {activeTab === 'online' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, or YouTube tracks..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:border-zinc-500 transition-colors"
              />
              {isLoading && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {results.length === 0 ? (
                <p className="text-center py-8 text-xs text-zinc-500">No tracks found. Try another search query.</p>
              ) : (
                results.map((track) => {
                  const trackKey = track.youtube_id || track.id;
                  const isAdded = addedIds.includes(trackKey);
                  const isAlreadyQueued = queue.some((q) => q.youtube_id === trackKey || q.id === trackKey);

                  return (
                    <div
                      key={trackKey}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-850/60 border border-zinc-850/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <img
                          src={track.thumbnail_url}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-950 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate" title={track.title}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formatSeconds(track.duration)}
                        </span>

                        <button
                          onClick={() => handleAdd(track)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isAlreadyQueued
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              : 'bg-white text-black hover:bg-zinc-200'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Queued</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isAlreadyQueued ? 'Queue Again' : 'Add'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Local Device Storage Mode */}
        {activeTab === 'local' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter local offline files..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleScanLocalFolder}
                disabled={isScanningFolder}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 text-xs font-semibold transition-colors cursor-pointer flex-shrink-0"
              >
                <Folder className="w-4 h-4 text-amber-400" />
                <span>{isScanningFolder ? 'Scanning...' : 'Select Folder'}</span>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {filteredLocalTracks.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-zinc-850 bg-zinc-900/30 space-y-2">
                  <Folder className="w-8 h-8 text-zinc-600 mx-auto stroke-1" />
                  <p className="text-xs font-semibold text-zinc-300">No local tracks scanned yet</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Click "Select Folder" to load offline MP3/FLAC music files from your device to stream with room members.
                  </p>
                  <button
                    type="button"
                    onClick={handleScanLocalFolder}
                    className="mt-2 px-4 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    Select Music Directory
                  </button>
                </div>
              ) : (
                filteredLocalTracks.map((track) => {
                  const trackKey = track.youtube_id || track.id;
                  const isAdded = addedIds.includes(trackKey);
                  const isAlreadyQueued = queue.some((q) => q.youtube_id === trackKey || q.id === trackKey);

                  return (
                    <div
                      key={trackKey}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-850/60 border border-zinc-850/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <img
                          src={track.thumbnail_url}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-950 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-white truncate" title={track.title}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {track.artist} {track.folder_name ? `• ${track.folder_name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formatSeconds(track.duration)}
                        </span>

                        <button
                          onClick={() => handleAdd(track)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isAlreadyQueued
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              : 'bg-white text-black hover:bg-zinc-200'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Queued</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isAlreadyQueued ? 'Queue Again' : 'Add'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

