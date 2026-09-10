import React, { useState, useEffect } from 'react';
import { localMusicService } from '../services/localMusicService';
import { usePlayerStore } from '../store/usePlayerStore';
import { useHotspotStore } from '../store/useHotspotStore';
import { HotspotPartyModal } from '../components/local/HotspotPartyModal';
import { Button } from '../components/common/Button';
import { ITrack, ILocalFolder } from '../types';
import {
  FolderDown,
  HardDrive,
  Play,
  Pause,
  Shuffle,
  Wifi,
  Search,
  Trash2,
  Clock,
  Music2,
  FolderOpen,
  Share2,
} from 'lucide-react';

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const LocalMusicPage: React.FC = () => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isPartyActive, partyCode, shareTrack } = useHotspotStore();

  const [tracks, setTracks] = useState<ITrack[]>([]);
  const [activeFolder, setActiveFolder] = useState<ILocalFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isHotspotModalOpen, setIsHotspotModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load existing indexed tracks on mount
  useEffect(() => {
    loadSavedLibrary();
  }, []);

  const loadSavedLibrary = async () => {
    setIsLoading(true);
    try {
      const saved = await localMusicService.getSavedLocalTracks();
      setTracks(saved);
      if (saved.length > 0) {
        const totalDuration = saved.reduce((acc, t) => acc + (t.duration || 0), 0);
        const totalSize = saved.reduce((acc, t) => acc + (t.file_size || 0), 0);
        setActiveFolder({
          id: 'local_active',
          name: saved[0].folder_name || 'My Local Music',
          track_count: saved.length,
          total_duration: totalDuration,
          total_size: totalSize,
          scanned_at: new Date().toISOString(),
        });
      }
    } catch {
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = async () => {
    setScanError('');
    setIsScanning(true);
    try {
      const result = await localMusicService.pickAndScanFolder();
      setTracks(result.tracks);
      setActiveFolder(result.folder);
      if (result.tracks.length > 0) {
        // Auto-queue first track into player
        playTrack(result.tracks[0], result.tracks);
      }
    } catch (err: any) {
      if (err?.message !== 'Folder selection was cancelled') {
        setScanError(err?.message || 'Failed to scan music folder');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setScanError('');

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as any;
      const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
      if (entry) {
        await traverseFileTree(entry, files);
      } else {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }

    if (files.length > 0) {
      setIsScanning(true);
      try {
        const result = await localMusicService.processScannedFiles(files, 'Dropped Folder');
        setTracks(result.tracks);
        setActiveFolder(result.folder);
        if (result.tracks.length > 0) {
          playTrack(result.tracks[0], result.tracks);
        }
      } catch (err: any) {
        setScanError(err?.message || 'Failed to read dropped files');
      } finally {
        setIsScanning(false);
      }
    }
  };

  const traverseFileTree = async (item: any, fileList: File[], path = ''): Promise<void> => {
    if (item.isFile) {
      const file: File = await new Promise((resolve) => item.file(resolve));
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const valid = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus'].includes(ext);
      if (valid) fileList.push(file);
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries: any[] = await new Promise((resolve) => dirReader.readEntries(resolve));
      for (const entry of entries) {
        await traverseFileTree(entry, fileList, `${path}${item.name}/`);
      }
    }
  };

  const handleClearLibrary = async () => {
    if (window.confirm('Clear all indexed local songs from this browser?')) {
      await localMusicService.clearLocalLibrary();
      setTracks([]);
      setActiveFolder(null);
    }
  };

  const handlePlayAll = (shuffle = false) => {
    if (tracks.length === 0) return;
    const queueList = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : [...tracks];
    playTrack(queueList[0], queueList);
  };

  const filteredTracks = tracks.filter((t) => {
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || (t.file_name && t.file_name.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-heading">
              Local & Offline Music
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Zero Internet
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400">
            Stream your local audio files directly from device storage and share in sync over local Wi-Fi hotspots.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsHotspotModalOpen(true)}
            className="gap-2 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400"
          >
            <Wifi className="w-4 h-4" />
            <span>{isPartyActive ? `Hotspot Active (${partyCode})` : 'Wi-Fi Hotspot Party'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSelectFolder}
            disabled={isScanning}
            className="gap-2 bg-emerald-600 hover:bg-emerald-500"
          >
            <FolderOpen className="w-4 h-4" />
            <span>{isScanning ? 'Scanning...' : 'Select Music Folder'}</span>
          </Button>
        </div>
      </div>

      {/* Error Notice */}
      {scanError && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
          <span>{scanError}</span>
          <button onClick={() => setScanError('')} className="underline text-amber-200 cursor-pointer ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {tracks.length === 0 ? (
        /* Empty State & Dropzone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`text-center py-16 md:py-24 px-6 rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center space-y-4 ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-950/20 scale-[0.99]'
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <FolderDown className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-bold text-white">Select a Music Folder from Your Device</h3>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
              Pick any folder containing your songs (e.g. <span className="font-mono text-zinc-300">C:\Music</span>). 
              AuraStream saves them in your browser IndexedDB so they remain ready to play whenever your internet is cut off.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSelectFolder}
              disabled={isScanning}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Browse Music Folder'}</span>
            </Button>
          </div>

          <div className="pt-4 text-[11px] text-zinc-500 flex items-center gap-2">
            <span>Supports MP3, WAV, FLAC, M4A, AAC, OGG</span>
            <span>•</span>
            <span>Drag & Drop Supported</span>
          </div>
        </div>
      ) : (
        /* Active Local Library View */
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          {activeFolder && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Folder</span>
                <p className="text-sm font-bold text-white truncate mt-0.5" title={activeFolder.name}>
                  {activeFolder.name}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Total Tracks</span>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{tracks.length} Songs</p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Total Duration</span>
                <p className="text-sm font-bold text-zinc-200 mt-0.5">
                  {Math.round(activeFolder.total_duration / 60)} Minutes
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Library Size</span>
                <p className="text-sm font-bold text-zinc-200 mt-0.5">{formatBytes(activeFolder.total_size)}</p>
              </div>
            </div>
          )}

          {/* Controls & Quick Play Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-850">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handlePlayAll(false)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play All</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePlayAll(true)}
                className="gap-2"
              >
                <Shuffle className="w-4 h-4" />
                <span>Shuffle</span>
              </Button>
            </div>

            {/* Client-Side Search Filter */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search local songs by title or artist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleClearLibrary}
              title="Clear cached local library"
              className="p-2 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer self-end sm:self-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Tracks Table */}
          <div className="rounded-2xl border border-zinc-850 bg-zinc-900/20 overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 border-b border-zinc-850/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider select-none">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6 md:col-span-5">Title</div>
              <div className="col-span-3 hidden md:block">Artist</div>
              <div className="col-span-3 md:col-span-2 text-right">Size</div>
              <div className="col-span-2 md:col-span-1 text-right">Time</div>
            </div>

            <div className="divide-y divide-zinc-850/40">
              {filteredTracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, filteredTracks)}
                    className={`grid grid-cols-12 items-center px-4 py-3 text-xs transition-colors cursor-pointer group select-none ${
                      isCurrent ? 'bg-emerald-950/30 text-white' : 'hover:bg-zinc-850/40 text-zinc-300'
                    }`}
                  >
                    {/* Index / Play Indicator */}
                    <div className="col-span-1 text-center font-mono">
                      {isCurrent ? (
                        <div className="flex items-center justify-center">
                          {isPlaying ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                              }}
                              className="text-emerald-400 p-1"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay();
                              }}
                              className="text-emerald-400 p-1"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500 group-hover:hidden">{idx + 1}</span>
                      )}
                      {!isCurrent && (
                        <Play className="w-3.5 h-3.5 fill-current text-white hidden group-hover:inline-block mx-auto" />
                      )}
                    </div>

                    {/* Title & Thumbnail */}
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3 min-w-0 pr-3">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-zinc-950 flex-shrink-0 border border-zinc-800">
                        <img
                          src={track.thumbnail_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Music2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate md:hidden">{track.artist}</p>
                      </div>
                    </div>

                    {/* Artist */}
                    <div className="col-span-3 hidden md:block text-zinc-400 truncate pr-3">
                      {track.artist}
                    </div>

                    {/* Size */}
                    <div className="col-span-3 md:col-span-2 text-right font-mono text-zinc-500 text-[11px]">
                      {formatBytes(track.file_size || 0)}
                    </div>

                    {/* Duration & Share */}
                    <div className="col-span-2 md:col-span-1 text-right font-mono text-zinc-400 text-xs flex items-center justify-end gap-2">
                      <span>{formatSeconds(track.duration)}</span>
                      {isPartyActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareTrack(track);
                          }}
                          title="Stream this track to Wi-Fi peers"
                          className="p-1 rounded text-zinc-500 hover:text-emerald-400 transition-colors"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Wi-Fi Hotspot Party Modal */}
      <HotspotPartyModal
        isOpen={isHotspotModalOpen}
        onClose={() => setIsHotspotModalOpen(false)}
      />
    </div>
  );
};
