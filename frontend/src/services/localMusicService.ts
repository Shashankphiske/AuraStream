import { ITrack, ILocalFolder } from '../types';

const DB_NAME = 'aurastream_offline_db';
const DB_VERSION = 1;
const TRACKS_STORE = 'local_tracks';
const BLOBS_STORE = 'audio_blobs';
const FOLDERS_STORE = 'local_folders';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.webm']);

// In-memory cache of object URLs to prevent memory leaks and redundant createObjectURL calls
const objectUrlMap = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function parseFilenameMetadata(filename: string): { title: string; artist: string } {
  const dotIdx = filename.lastIndexOf('.');
  const baseName = dotIdx !== -1 ? filename.substring(0, dotIdx) : filename;

  if (baseName.includes(' - ')) {
    const parts = baseName.split(' - ').map((p) => p.trim());
    if (parts.length >= 2) {
      if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
        return { artist: parts[1], title: parts.slice(2).join(' - ') };
      }
      return { artist: parts[0], title: parts.slice(1).join(' - ') };
    }
  }

  return { title: baseName, artist: 'Local Audio' };
}

function getAudioDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(tempUrl);
    };

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanUp();
      resolve(!isNaN(duration) && duration > 0 ? Math.round(duration) : 180);
    };

    audio.onerror = () => {
      cleanUp();
      resolve(180);
    };

    audio.src = tempUrl;
  });
}

export const localMusicService = {
  hasDirectoryPicker(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  },

  async pickAndScanFolder(): Promise<{ tracks: ITrack[]; folder: ILocalFolder }> {
    if (this.hasDirectoryPicker()) {
      try {
        return await this.scanWithDirectoryPicker();
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          throw new Error('Folder selection was cancelled');
        }
        return await this.scanWithFileInput();
      }
    }
    return await this.scanWithFileInput();
  },

  async scanWithDirectoryPicker(): Promise<{ tracks: ITrack[]; folder: ILocalFolder }> {
    const dirHandle = await (window as any).showDirectoryPicker({
      id: 'aurastream_music_folder',
      mode: 'read',
    });

    const folderName = dirHandle.name || 'Selected Music Folder';
    const files: File[] = [];

    async function scanDirectory(handle: any, currentPath = '') {
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
          if (AUDIO_EXTENSIONS.has(ext)) {
            const file = await entry.getFile();
            files.push(file);
          }
        } else if (entry.kind === 'directory') {
          await scanDirectory(entry, `${currentPath}${entry.name}/`);
        }
      }
    }

    await scanDirectory(dirHandle);

    if (files.length === 0) {
      throw new Error(`No audio files found in "${folderName}". Supported formats: MP3, WAV, FLAC, M4A, AAC, OGG.`);
    }

    return await this.processScannedFiles(files, folderName);
  },

  scanWithFileInput(): Promise<{ tracks: ITrack[]; folder: ILocalFolder }> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      (input as any).directory = true;
      input.multiple = true;

      input.onchange = async () => {
        const fileList = input.files;
        if (!fileList || fileList.length === 0) {
          reject(new Error('No files selected'));
          return;
        }

        const files: File[] = [];
        let detectedFolder = 'Imported Music';

        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
          if (AUDIO_EXTENSIONS.has(ext)) {
            files.push(file);
            if (file.webkitRelativePath) {
              const rootDir = file.webkitRelativePath.split('/')[0];
              if (rootDir) detectedFolder = rootDir;
            }
          }
        }

        if (files.length === 0) {
          reject(new Error('No audio files found. Supported formats: MP3, WAV, FLAC, M4A, AAC, OGG.'));
          return;
        }

        try {
          const result = await this.processScannedFiles(files, detectedFolder);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      input.oncancel = () => {
        reject(new Error('Folder selection was cancelled'));
      };

      input.click();
    });
  },

  async processScannedFiles(files: File[], folderName: string): Promise<{ tracks: ITrack[]; folder: ILocalFolder }> {
    const tracks: ITrack[] = [];
    const db = await openDB();
    let totalDuration = 0;
    let totalSize = 0;

    for (const file of files) {
      const id = 'local_' + Math.abs(this.hashCode(file.name + file.size + file.lastModified));
      const meta = parseFilenameMetadata(file.name);
      const duration = await getAudioDuration(file);

      totalDuration += duration;
      totalSize += file.size;

      let localUrl = objectUrlMap.get(id);
      if (!localUrl) {
        localUrl = URL.createObjectURL(file);
        objectUrlMap.set(id, localUrl);
      }

      const track: ITrack = {
        id,
        youtube_id: 'local_' + id,
        title: meta.title,
        artist: meta.artist,
        duration,
        thumbnail_url: this.generateDefaultCover(meta.title),
        genre: 'Local Audio',
        is_local: true,
        local_url: localUrl,
        file_name: file.name,
        file_size: file.size,
        folder_name: folderName,
        last_modified: file.lastModified,
      };

      tracks.push(track);

      const tx = db.transaction([TRACKS_STORE, BLOBS_STORE], 'readwrite');
      tx.objectStore(TRACKS_STORE).put(track);
      tx.objectStore(BLOBS_STORE).put({ id, blob: file, name: file.name, type: file.type });
    }

    const folderRecord: ILocalFolder = {
      id: 'folder_' + this.hashCode(folderName),
      name: folderName,
      track_count: tracks.length,
      total_duration: totalDuration,
      total_size: totalSize,
      scanned_at: new Date().toISOString(),
    };

    const folderTx = db.transaction([FOLDERS_STORE], 'readwrite');
    folderTx.objectStore(FOLDERS_STORE).put(folderRecord);

    return { tracks, folder: folderRecord };
  },

  async getSavedLocalTracks(): Promise<ITrack[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction([TRACKS_STORE, BLOBS_STORE], 'readonly');
        const tracksReq = tx.objectStore(TRACKS_STORE).getAll();
        const blobsReq = tx.objectStore(BLOBS_STORE).getAll();

        tx.oncomplete = () => {
          const rawTracks: ITrack[] = tracksReq.result || [];
          const rawBlobs: { id: string; blob: Blob }[] = blobsReq.result || [];
          const blobMap = new Map<string, Blob>();
          rawBlobs.forEach((b) => blobMap.set(b.id, b.blob));

          const hydrated = rawTracks.map((track) => {
            let url = objectUrlMap.get(track.id);
            if (!url) {
              const blob = blobMap.get(track.id);
              if (blob) {
                url = URL.createObjectURL(blob);
                objectUrlMap.set(track.id, url);
              }
            }
            return {
              ...track,
              local_url: url || track.local_url,
              is_local: true,
            };
          });

          resolve(hydrated);
        };

        tx.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  async getTrackBlob(trackId: string): Promise<Blob | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction([BLOBS_STORE], 'readonly');
        const req = tx.objectStore(BLOBS_STORE).get(trackId);
        req.onsuccess = () => resolve(req.result?.blob || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async saveReceivedP2PTrack(track: ITrack, blob: Blob): Promise<ITrack> {
    const db = await openDB();
    const localUrl = URL.createObjectURL(blob);
    objectUrlMap.set(track.id, localUrl);

    const hydratedTrack: ITrack = {
      ...track,
      is_local: true,
      local_url: localUrl,
      folder_name: 'Hotspot Shared',
    };

    const tx = db.transaction([TRACKS_STORE, BLOBS_STORE], 'readwrite');
    tx.objectStore(TRACKS_STORE).put(hydratedTrack);
    tx.objectStore(BLOBS_STORE).put({ id: track.id, blob, name: track.title, type: blob.type });

    return hydratedTrack;
  },

  async clearLocalLibrary(): Promise<void> {
    objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
    objectUrlMap.clear();

    const db = await openDB();
    const tx = db.transaction([TRACKS_STORE, BLOBS_STORE, FOLDERS_STORE], 'readwrite');
    tx.objectStore(TRACKS_STORE).clear();
    tx.objectStore(BLOBS_STORE).clear();
    tx.objectStore(FOLDERS_STORE).clear();
  },

  hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  },

  generateDefaultCover(title: string): string {
    const colors = ['#18181b', '#27272a', '#09090b', '#1c1917'];
    const color = colors[Math.abs(this.hashCode(title)) % colors.length];
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="${encodeURIComponent(
      color
    )}"/><circle cx="150" cy="150" r="70" fill="none" stroke="%233f3f46" stroke-width="6"/><circle cx="150" cy="150" r="25" fill="%2371717a"/><path d="M140 100 L160 100 L160 150 L140 150 Z" fill="%23e4e4e7"/><circle cx="130" cy="160" r="16" fill="%23e4e4e7"/></svg>`;
  },
};
