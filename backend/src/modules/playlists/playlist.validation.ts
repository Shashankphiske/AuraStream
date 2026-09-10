import { z } from 'zod';

export const createPlaylistSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  is_public: z.boolean().optional(),
});

export const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  is_public: z.boolean().optional(),
});

export const addTrackToPlaylistSchema = z.object({
  track: z.object({
    id: z.string().optional(),
    youtube_id: z.string(),
    title: z.string(),
    artist: z.string(),
    duration: z.number().optional(),
    thumbnail_url: z.string().optional(),
    genre: z.string().optional(),
  }),
});
