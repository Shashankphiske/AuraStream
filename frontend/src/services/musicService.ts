import api from './api';
import { ITrack } from '../types';
import { CURATED_TRACKS, GENRE_ITEMS, MOOD_CATEGORIES } from '../constants';

function parseDurationString(str?: string): number {
  if (!str) return 180;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return 180;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 180;
}

// Extract YouTube ID from URLs or direct ID
function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  const urlPatterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Direct YouTube Search
async function directYouTubeSearch(query: string, limit = 25): Promise<ITrack[]> {
  const directId = extractYouTubeId(query);
  if (directId) {
    return [
      {
        id: `yt_${directId}`,
        youtube_id: directId,
        title: `YouTube Video (${directId})`,
        artist: 'YouTube',
        duration: 210,
        thumbnail_url: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
        genre: 'Music',
        views: 0,
        created_at: new Date().toISOString(),
      },
    ];
  }

  // 1. Try YouTube InnerTube Endpoint
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        query: query,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const contents =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const tracks: ITrack[] = [];

      for (const section of contents) {
        const itemContents = section.itemSectionRenderer?.contents || [];
        for (const item of itemContents) {
          const v = item.videoRenderer;
          if (!v || !v.videoId) continue;

          const title =
            v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || 'Unknown Song';
          const artist =
            v.ownerText?.runs?.map((r: any) => r.text).join('') ||
            v.shortBylineText?.runs?.map((r: any) => r.text).join('') ||
            'YouTube Artist';
          const durationStr =
            v.lengthText?.simpleText || v.lengthText?.runs?.map((r: any) => r.text).join('');
          const duration = parseDurationString(durationStr);
          const viewsStr = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '0';
          const thumbnail =
            v.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          tracks.push({
            id: `yt_${v.videoId}`,
            youtube_id: v.videoId,
            title: title
              .replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|hd|4k)?)(\)|\])/gi, '')
              .trim(),
            artist,
            duration,
            thumbnail_url: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
            genre: 'Music',
            views: parseInt(viewsStr.replace(/[^0-9]/g, '')) || 0,
            created_at: new Date().toISOString(),
          });

          if (tracks.length >= limit) break;
        }
        if (tracks.length >= limit) break;
      }

      if (tracks.length > 0) return tracks;
    }
  } catch {}

  // 2. Invidious Public Instances Fallback
  const mirrors = [
    'https://invidious.flokinet.to/api/v1/search',
    'https://inv.nadeko.net/api/v1/search',
    'https://invidious.nerdvpn.de/api/v1/search',
  ];
  for (const mirror of mirrors) {
    try {
      const res = await fetch(`${mirror}?q=${encodeURIComponent(query)}&type=video`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = (await res.json()) as any[];
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, limit).map((v: any) => ({
            id: `yt_${v.videoId}`,
            youtube_id: v.videoId,
            title: v.title,
            artist: v.author || 'YouTube Artist',
            duration: v.lengthSeconds || 180,
            thumbnail_url: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            genre: 'Music',
            views: v.viewCount || 0,
            created_at: new Date().toISOString(),
          }));
        }
      }
    } catch {}
  }

  return [];
}

export const musicService = {
  async getTrending(limit: number = 20): Promise<ITrack[]> {
    try {
      const res = await api.get('/music/trending', { params: { limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
    } catch {}

    const live = await directYouTubeSearch('top trending songs hits music 2025', limit);
    if (live.length > 0) return live;
    return CURATED_TRACKS.slice(0, limit);
  },

  async getByGenre(genre: string, limit: number = 20): Promise<ITrack[]> {
    try {
      const res = await api.get(`/music/genre/${encodeURIComponent(genre)}`, { params: { limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
    } catch {}

    const live = await directYouTubeSearch(`${genre} top music hits songs playlist`, limit);
    if (live.length > 0) return live;
    return CURATED_TRACKS.filter((t) => t.genre.toLowerCase() === genre.toLowerCase()).slice(0, limit);
  },

  async getByMood(moodId: string, limit: number = 20): Promise<ITrack[]> {
    try {
      const res = await api.get(`/music/mood/${encodeURIComponent(moodId)}`, { params: { limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
    } catch {}

    const moodQueries: Record<string, string> = {
      focus: 'focus ambient study music',
      chill: 'chill lofi beats night vibes',
      workout: 'high energy workout motivation music',
      party: 'party hits club dance music',
      sleep: 'sleep ambient soundscapes peaceful relaxation',
      gaming: 'synthwave cyberpunk gaming soundtrack music',
    };
    const query = moodQueries[moodId] || `${moodId} music playlist`;
    const live = await directYouTubeSearch(query, limit);
    if (live.length > 0) return live;
    return CURATED_TRACKS.slice(0, limit);
  },

  async search(query: string, limit: number = 25): Promise<ITrack[]> {
    if (!query.trim()) return this.getTrending(limit);

    try {
      const res = await api.get('/music/search', { params: { q: query, limit } });
      if (res.data?.data && res.data.data.length > 0) return res.data.data;
    } catch {}

    // Fallback directly to live YouTube query
    const live = await directYouTubeSearch(query.trim(), limit);
    if (live.length > 0) return live;

    const lower = query.toLowerCase();
    const matches = CURATED_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        t.genre.toLowerCase().includes(lower)
    );
    return matches.length > 0 ? matches : CURATED_TRACKS.slice(0, limit);
  },

  async getTrackDetails(id: string): Promise<ITrack> {
    try {
      const res = await api.get(`/music/track/${encodeURIComponent(id)}`);
      if (res.data?.data) return res.data.data;
    } catch {}

    const cleanYtId = id.replace(/^yt_/, '');
    const found = CURATED_TRACKS.find((t) => t.id === id || t.youtube_id === cleanYtId);
    if (found) return found;

    return {
      id: `yt_${cleanYtId}`,
      youtube_id: cleanYtId,
      title: 'YouTube Track',
      artist: 'YouTube Artist',
      duration: 210,
      thumbnail_url: `https://i.ytimg.com/vi/${cleanYtId}/hqdefault.jpg`,
      genre: 'Music',
      views: 1000000,
    };
  },

  async getCategories(): Promise<{ genres: string[]; moods: any[] }> {
    try {
      const res = await api.get('/music/categories');
      if (res.data?.data) return res.data.data;
    } catch {}
    return { genres: GENRE_ITEMS, moods: MOOD_CATEGORIES };
  },
};


