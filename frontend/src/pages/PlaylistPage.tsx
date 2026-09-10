import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { playlistService } from '../services/playlistService';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAuthStore } from '../store/useAuthStore';
import { TrackRow } from '../components/music/TrackRow';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Play, Music, Trash2, Edit3, Globe, Lock, Clock } from 'lucide-react';

export const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { playTrack } = usePlayerStore();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => playlistService.getById(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-3xl bg-slate-900/60" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-900/40" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 space-y-3">
        <h3 className="text-xl font-bold text-white">Playlist not found</h3>
        <p className="text-xs text-slate-400">This playlist may be private or deleted.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/library')}>
          Return to Library
        </Button>
      </div>
    );
  }

  const { playlist, tracks } = data;
  const isOwner = user?.id === playlist.user_id;

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const totalMins = Math.round(totalDuration / 60);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    setIsDeleting(true);
    try {
      await playlistService.delete(playlist.id);
      queryClient.invalidateQueries({ queryKey: ['my-playlists'] });
      navigate('/library');
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await playlistService.update(playlist.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['playlist', playlist.id] });
      setEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update playlist:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Playlist Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 shadow-sm">
        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden shadow-md bg-zinc-950 border border-white/10 flex-shrink-0 flex items-center justify-center">
          {playlist.cover_image ? (
            <img src={playlist.cover_image} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-16 h-16 text-zinc-600" />
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-medium text-zinc-400">
            {playlist.is_public ? (
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-zinc-400" /> Public</span>
            ) : (
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-zinc-400" /> Private</span>
            )}
          </div>

          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight font-heading">
            {playlist.title}
          </h2>

          {playlist.description && (
            <p className="text-xs md:text-sm text-zinc-400 max-w-xl">{playlist.description}</p>
          )}

          <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-zinc-400 pt-1">
            <span className="font-medium text-white">{playlist.user_name || 'AuraStream User'}</span>
            <span>•</span>
            <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{totalMins} min</span>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handlePlayAll}
            disabled={tracks.length === 0}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play All</span>
          </Button>

          {isOwner && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditTitle(playlist.title);
                  setEditDesc(playlist.description || '');
                  setEditModalOpen(true);
                }}
                className="flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 3. Track Listing */}
      <div className="space-y-1">
        {tracks.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 space-y-3">
            <Music className="w-10 h-10 mx-auto text-slate-600" />
            <h4 className="text-base font-bold text-white">This playlist is empty</h4>
            <p className="text-xs text-slate-400">Search for tracks and add them to this playlist</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/search')}>
              Discover Music
            </Button>
          </div>
        ) : (
          tracks.map((track, idx) => (
            <TrackRow key={`${track.youtube_id}_${idx}`} track={track} index={idx} queueContext={tracks} />
          ))
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Playlist Details">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Title"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-sm p-3 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
