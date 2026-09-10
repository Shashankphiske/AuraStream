import { z } from 'zod';
import { GENRES } from '../../constants/index.js';

export const updateInterestsSchema = z.object({
  interests: z.array(z.string().min(1).max(50)).min(1, 'Please select at least 1 interest'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60).optional(),
  avatar: z.string().url('Avatar must be a valid URL').optional(),
});
