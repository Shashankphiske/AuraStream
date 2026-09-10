import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useUIStore } from '../../store/useUIStore';
import { playlistService } from '../../services/playlistService';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const CreatePlaylistModal: React.FC = () => {
  const { activeModal, closeModal } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isOpen = activeModal === 'createPlaylist';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const created = await playlistService.create({
        title: title.trim(),
        description: description.trim(),
        is_public: isPublic,
      });

      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      closeModal();
      navigate(`/playlist/${created.id}`);
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Create New Playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Playlist Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Night Coding Session"
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add a short description of the mood or vibe..."
            className="w-full rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-sm p-3 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="is-public-checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-900 border-white/20 text-violet-600 focus:ring-violet-500 cursor-pointer"
          />
          <label htmlFor="is-public-checkbox" className="text-xs text-slate-300 select-none cursor-pointer">
            Make this playlist public on AuraStream
          </label>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
          <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Create Playlist
          </Button>
        </div>
      </form>
    </Modal>
  );
};
