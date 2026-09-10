export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const GENRES = [
  'Pop',
  'Hip-Hop',
  'Electronic',
  'Rock',
  'R&B',
  'Indie',
  'Lo-Fi',
  'Jazz',
  'Classical',
  'Ambient',
  'Synthwave',
  'Metal',
  'Acoustic',
] as const;

export const MOODS = [
  { id: 'focus', title: 'Deep Focus', color: 'from-blue-600 to-indigo-900', query: 'focus ambient instrumental study music' },
  { id: 'chill', title: 'Late Night Chill', color: 'from-purple-600 to-violet-950', query: 'chill lofi beats night vibes' },
  { id: 'workout', title: 'High Energy / Workout', color: 'from-red-600 to-orange-800', query: 'workout high energy workout music' },
  { id: 'party', title: 'Weekend Party', color: 'from-pink-600 to-rose-900', query: 'party hits club dance music' },
  { id: 'sleep', title: 'Sleep & Relaxation', color: 'from-indigo-800 to-slate-900', query: 'sleep ambient soundscapes peaceful' },
  { id: 'gaming', title: 'Synth & Gaming', color: 'from-cyan-600 to-blue-900', query: 'synthwave cyberpunk gaming soundtrack' },
] as const;
