import axios from 'axios';
import ytSearch from 'yt-search';
import { ITrack } from '../../types/index.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheItem<any>>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getFromCache<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

function setToCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttl });
}

export class YouTubeService {
  /**
   * Search YouTube for tracks
   */
  static async search(query: string, limit: number = 20): Promise<ITrack[]> {
    const cacheKey = `search:${query}:${limit}`;
    const cached = getFromCache<ITrack[]>(cacheKey);
    if (cached) return cached;

    // 1. If YouTube API Key is configured, attempt official API
    if (env.YOUTUBE_API_KEY) {
      try {
        const results = await this.searchViaApi(query, limit);
        if (results.length > 0) {
          setToCache(cacheKey, results);
          return results;
        }
      } catch (err) {
        logger.warn('YouTube Data API search failed, falling back:', err);
      }
    }

    // 2. High-speed Invidious Instances
    const mirrors = [
      'https://invidious.flokinet.to/api/v1/search',
      'https://inv.nadeko.net/api/v1/search',
      'https://invidious.nerdvpn.de/api/v1/search',
    ];

    for (const mirror of mirrors) {
      try {
        const response = await axios.get(mirror, {
          params: { q: query, type: 'video' },
          timeout: 4000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        const items = response.data;
        if (Array.isArray(items) && items.length > 0) {
          const tracks: ITrack[] = items
            .filter((v: any) => v && (v.videoId || v.id))
            .slice(0, limit)
            .map((v: any) => {
              const videoId = v.videoId || v.id;
              return {
                id: `yt_${videoId}`,
                youtube_id: videoId,
                title: (v.title || 'YouTube Song').replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|hd|4k)?)(\)|\])/gi, '').trim(),
                artist: v.author || 'YouTube Artist',
                duration: v.lengthSeconds || 210,
                thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                genre: 'Music',
                views: v.viewCount || 0,
                created_at: new Date().toISOString(),
              };
            });

          if (tracks.length > 0) {
            setToCache(cacheKey, tracks);
            return tracks;
          }
        }
      } catch {}
    }

    // 3. YouTube InnerTube API
    try {
      const response = await axios.post(
        'https://www.youtube.com/youtubei/v1/search',
        {
          context: { client: { clientName: 'WEB', clientVersion: '2.20240101.01.00', hl: 'en', gl: 'US' } },
          query,
        },
        { timeout: 4000 }
      );

      const contents = response.data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const tracks: ITrack[] = [];
      for (const section of contents) {
        const itemContents = section.itemSectionRenderer?.contents || [];
        for (const item of itemContents) {
          const v = item.videoRenderer;
          if (!v || !v.videoId) continue;
          const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || 'Unknown Song';
          const artist = v.ownerText?.runs?.map((r: any) => r.text).join('') || v.shortBylineText?.runs?.map((r: any) => r.text).join('') || 'YouTube Artist';
          tracks.push({
            id: `yt_${v.videoId}`,
            youtube_id: v.videoId,
            title: title.replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video|hd|4k)?)(\)|\])/gi, '').trim(),
            artist,
            duration: 210,
            thumbnail_url: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            genre: 'Music',
            views: 0,
            created_at: new Date().toISOString(),
          });
          if (tracks.length >= limit) break;
        }
        if (tracks.length >= limit) break;
      }

      if (tracks.length > 0) {
        setToCache(cacheKey, tracks);
        return tracks;
      }
    } catch {}

    // 4. Resilient fallback via yt-search
    try {
      const searchResult = await ytSearch(`${query} music`);
      const videos = (searchResult.videos || []).slice(0, limit);

      const tracks: ITrack[] = videos.map((v: any) => ({
        id: `yt_${v.videoId}`,
        youtube_id: v.videoId,
        title: v.title.replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video)?)(\)|\])/gi, '').trim(),
        artist: v.author?.name || 'Unknown Artist',
        duration: v.seconds || 180,
        thumbnail_url: v.thumbnail || v.image || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        genre: 'Music',
        views: v.views || 0,
        created_at: new Date().toISOString(),
      }));

      setToCache(cacheKey, tracks);
      return tracks;
    } catch (err) {
      logger.error('yt-search failed:', err);
      return [];
    }
  }

  /**
   * Search via Official YouTube Data API v3
   */
  private static async searchViaApi(query: string, limit: number): Promise<ITrack[]> {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: `${query} music`,
        type: 'video',
        videoCategoryId: '10', // Music category ID
        maxResults: limit,
        key: env.YOUTUBE_API_KEY,
      },
      timeout: 5000,
    });

    const items = response.data.items || [];
    return items.map((item: any) => ({
      id: `yt_${item.id.videoId}`,
      youtube_id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      duration: 210, // Default duration if not querying contentDetails
      thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      genre: 'Music',
      views: 0,
      created_at: new Date().toISOString(),
    }));
  }

  /**
   * Get track details by YouTube ID
   */
  static async getTrackDetails(youtubeId: string): Promise<ITrack | null> {
    const cacheKey = `track:${youtubeId}`;
    const cached = getFromCache<ITrack>(cacheKey);
    if (cached) return cached;

    try {
      const searchResult = await ytSearch({ videoId: youtubeId });
      if (!searchResult) return null;

      const track: ITrack = {
        id: `yt_${searchResult.videoId}`,
        youtube_id: searchResult.videoId,
        title: searchResult.title.replace(/(\(|\[)(official\s*(video|audio|music\s*video|lyric\s*video)?)(\)|\])/gi, '').trim(),
        artist: searchResult.author?.name || 'Unknown Artist',
        duration: searchResult.seconds || 200,
        thumbnail_url: searchResult.thumbnail || searchResult.image || `https://i.ytimg.com/vi/${searchResult.videoId}/hqdefault.jpg`,
        genre: 'Music',
        views: searchResult.views || 0,
        created_at: new Date().toISOString(),
      };

      setToCache(cacheKey, track);
      return track;
    } catch (err) {
      logger.error(`Failed to get details for youtubeId ${youtubeId}:`, err);
      return null;
    }
  }

  /**
   * Get related tracks for recommendations
   */
  static async getRelatedTracks(artist: string, genre: string, limit: number = 10): Promise<ITrack[]> {
    const query = `${artist} ${genre} related music`;
    return this.search(query, limit);
  }
}
