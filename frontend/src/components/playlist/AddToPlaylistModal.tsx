import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { playlistService } from '../../services/playlistService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Music } from 'lucide-react';

export const AddToPlaylistModal: React.FC = () => {
  const { activeModal, closeModal, selectedTrackForPlaylist, openModal } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const isOpen = activeModal === 'addToPlaylist';

  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => playlistService.getMyPlaylists(),
    enabled: isOpen && isAuthenticated,
  });

  if (!isOpen || !selectedTrackForPlaylist) return null;

  const handleAddToPlaylist = async (playlistId: string) => {
    setAddingId(playlistId);
    try {
      await playlistService.addTrack(playlistId, selectedTrackForPlaylist);
      setAddedIds((prev) => [...prev, playlistId]);
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
    } catch (err) {
      console.error('Failed to add track to playlist:', err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Add to Playlist">
      <div className="space-y-4">
        {/* Selected Track Preview */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
          <img
            src={selectedTrackForPlaylist.thumbnail_url}
            alt={selectedTrackForPlaylist.title}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-white truncate">{selectedTrackForPlaylist.title}</h4>
            <p className="text-[11px] text-slate-400 truncate">{selectedTrackForPlaylist.artist}</p>
          </div>
        </div>

        {/* User Playlists List */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {isLoading ? (
            <p className="text-xs text-slate-400 text-center py-4">Loading playlists...</p>
          ) : playlists.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-400 mb-3">You don't have any playlists yet.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openModal('createPlaylist')}
              >
                Create a Playlist
              </Button>
            </div>
          ) : (
            playlists.map((pl) => {
              const isAdded = addedIds.includes(pl.id);
              const isThisAdding = addingId === pl.id;

              return (
                <div
                  key={pl.id}
                  onClick={() => !isAdded && handleAddToPlaylist(pl.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isAdded
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 pointer-events-none'
                      : 'bg-slate-900/40 border-white/5 hover:border-violet-500/40 hover:bg-white/5 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{pl.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {pl.track_count || 0} track{(pl.track_count || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {isAdded ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <Button variant="ghost" size="sm" isLoading={isThisAdding}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('createPlaylist')}
            className="flex items-center gap-1.5 text-xs text-violet-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Playlist</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={closeModal}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
