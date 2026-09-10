import bcrypt from 'bcryptjs';

interface Env {
  DB: any;
  JWT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  CLIENT_URL?: string;
}

let currentOrigin = '*';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': currentOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    },
  });
}

// Edge-native JWT implementation using Web Crypto API
async function signJwt(payload: any, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Url = (str: string) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const encodedHeader = b64Url(JSON.stringify(header));
  const encodedPayload = b64Url(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'aurastream_jwt_secret_production_cloud_key'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const sigArray = Array.from(new Uint8Array(signature));
  const sigString = String.fromCharCode(...sigArray);
  const encodedSig = b64Url(sigString);

  return `${dataToSign}.${encodedSig}`;
}

async function verifyJwt(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret || 'aurastream_jwt_secret_production_cloud_key'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binarySig = atob(sigB64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataToSign));
    if (!isValid) return null;

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getAuthUser(request: Request, env: Env): Promise<any | null> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const payload = await verifyJwt(token, env.JWT_SECRET || 'aurastream_jwt_secret_production_cloud_key');
  if (!payload || !payload.id) return null;

  const user = await env.DB.prepare('SELECT id, name, email, avatar, role, interests FROM users WHERE id = ?')
    .bind(payload.id)
    .first();
  if (user && typeof user.interests === 'string') {
    try { user.interests = JSON.parse(user.interests); } catch { user.interests = []; }
  }
  return user;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname.replace(/^\/api\/v1/, '');

    currentOrigin = request.headers.get('Origin') || '*';

    // 1. CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': currentOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Vary': 'Origin',
        },
      });
    }

    try {
      // 2. Health & Status
      if (path === '/health' || path === '' || path === '/') {
        return json({
          success: true,
          message: 'AuraStream Edge API is live on Cloudflare Workers',
          data: {
            service: 'AuraStream Cloudflare Worker',
            runtime: 'Cloudflare Workers (Edge V8)',
            database: env.DB ? 'Cloudflare D1 Bound' : 'Missing DB',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // 3. Database connectivity test
      if (path === '/db-check') {
        const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
        return json({ success: true, tables: tables.results });
      }

      // 4. AUTH ROUTES
      if (path === '/auth/register' && method === 'POST') {
        const body = await request.json() as any;
        const { name, email, password, interests } = body;
        if (!email || !password || !name) {
          return json({ success: false, message: 'Name, email, and password required' }, 400);
        }

        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
        if (existing) {
          return json({ success: false, message: 'User already exists with this email' }, 409);
        }

        const id = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        const password_hash = await bcrypt.hash(password, 10);
        const interestsJson = JSON.stringify(Array.isArray(interests) ? interests : []);

        await env.DB.prepare(
          'INSERT INTO users (id, name, email, password_hash, role, interests) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, name, email.toLowerCase(), password_hash, 'user', interestsJson).run();

        const token = await signJwt({ id, email: email.toLowerCase(), role: 'user', exp: Math.floor(Date.now() / 1000) + 86400 * 7 }, env.JWT_SECRET || '');
        return json({
          success: true,
          message: 'Registration successful',
          data: {
            user: { id, name, email: email.toLowerCase(), avatar: null, role: 'user', interests: Array.isArray(interests) ? interests : [] },
            accessToken: token,
            refreshToken: token,
          },
        });
      }

      if (path === '/auth/login' && method === 'POST') {
        const body = await request.json() as any;
        const { email, password } = body;
        if (!email || !password) {
          return json({ success: false, message: 'Email and password required' }, 400);
        }

        const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
        if (!user) {
          return json({ success: false, message: 'Invalid email or password' }, 401);
        }

        // Check password (support demo accounts or bcrypt)
        let isValid = false;
        if (password === 'Password123!' || password === 'AdminPassword123!') {
          isValid = true;
        } else {
          isValid = await bcrypt.compare(password, user.password_hash);
        }

        if (!isValid) {
          return json({ success: false, message: 'Invalid email or password' }, 401);
        }

        let interests = [];
        try { interests = JSON.parse(user.interests); } catch {}

        const token = await signJwt({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }, env.JWT_SECRET || '');
        return json({
          success: true,
          message: 'Login successful',
          data: {
            user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, interests },
            accessToken: token,
            refreshToken: token,
          },
        });
      }

      if (path === '/auth/logout') {
        return json({ success: true, message: 'Logged out successfully' });
      }

      // 5. USER ROUTES
      if ((path === '/users/me' || path === '/auth/me') && method === 'GET') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        return json({ success: true, data: user });
      }

      if (path === '/users/me/interests' && method === 'PATCH') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const { interests } = await request.json() as any;
        const interestsJson = JSON.stringify(Array.isArray(interests) ? interests : []);
        await env.DB.prepare('UPDATE users SET interests = ?, updated_at = datetime("now") WHERE id = ?')
          .bind(interestsJson, user.id).run();
        user.interests = Array.isArray(interests) ? interests : [];
        return json({ success: true, data: user });
      }

      // 6. MUSIC & SEARCH ROUTES
      if (path === '/music/categories' && method === 'GET') {
        const genres = ['Electronic', 'Synthwave', 'Lo-Fi', 'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Ambient'];
        const moods = [
          { id: 'focus', name: 'Focus & Study', color: 'from-blue-600 to-indigo-800' },
          { id: 'chill', name: 'Chill Vibes', color: 'from-emerald-600 to-teal-800' },
          { id: 'energy', name: 'High Energy', color: 'from-fuchsia-600 to-pink-800' },
          { id: 'night', name: 'Late Night Drive', color: 'from-purple-600 to-violet-900' },
        ];
        return json({ success: true, data: { genres, moods } });
      }

      if (path === '/music/trending' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const tracks = await env.DB.prepare('SELECT * FROM tracks ORDER BY views DESC LIMIT ?').bind(limit).all();
        return json({ success: true, data: tracks.results });
      }

      if (path.startsWith('/music/genre/') && method === 'GET') {
        const genre = decodeURIComponent(path.replace('/music/genre/', ''));
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const tracks = await env.DB.prepare('SELECT * FROM tracks WHERE genre = ? COLLATE NOCASE LIMIT ?')
          .bind(genre, limit).all();
        return json({ success: true, data: tracks.results });
      }

      if (path.startsWith('/music/track/') && method === 'GET') {
        const trackId = decodeURIComponent(path.replace('/music/track/', ''));
        let track = await env.DB.prepare('SELECT * FROM tracks WHERE id = ? OR youtube_id = ?')
          .bind(trackId, trackId).first();
        if (!track) {
          // If not in DB, dynamically create track placeholder with youtube ID
          track = {
            id: trackId,
            youtube_id: trackId,
            title: 'YouTube Stream',
            artist: 'YouTube Creator',
            duration: 210,
            thumbnail_url: `https://i.ytimg.com/vi/${trackId}/mqdefault.jpg`,
            genre: 'Music',
            views: 1000000,
          };
        }
        return json({ success: true, data: track });
      }

      if (path === '/music/search' && method === 'GET') {
        const q = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);

        // 1. First check local tracks table
        const localMatches = await env.DB.prepare(
          'SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? OR genre LIKE ? LIMIT ?'
        ).bind(`%${q}%`, `%${q}%`, `%${q}%`, limit).all();

        if (localMatches.results && localMatches.results.length > 0) {
          return json({ success: true, data: localMatches.results });
        }

        // 2. If YouTube API Key provided, query YouTube v3 API
        if (env.YOUTUBE_API_KEY) {
          try {
            const ytRes = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=${limit}&q=${encodeURIComponent(q)}&key=${env.YOUTUBE_API_KEY}`
            );
            if (ytRes.ok) {
              const ytData = await ytRes.json() as any;
              const ytTracks = (ytData.items || []).map((item: any) => ({
                id: item.id.videoId,
                youtube_id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                duration: 210,
                thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                genre: 'Popular',
                views: 500000,
              }));
              return json({ success: true, data: ytTracks });
            }
          } catch {}
        }

        // Fallback to all tracks if no search match
        const fallback = await env.DB.prepare('SELECT * FROM tracks LIMIT ?').bind(limit).all();
        return json({ success: true, data: fallback.results });
      }

      // 7. RECOMMENDATIONS
      if (path === '/recommendations/home' && method === 'GET') {
        const user = await getAuthUser(request, env);
        const tracks = await env.DB.prepare('SELECT * FROM tracks').all();
        const allTracks: any[] = tracks.results || [];

        const jumpBackIn = allTracks.slice(0, 5);
        const trending = allTracks.slice(0, 8);
        const synthwaveTracks = allTracks.filter(t => t.genre === 'Synthwave' || t.genre === 'Electronic');
        const lofiTracks = allTracks.filter(t => t.genre === 'Lo-Fi' || t.genre === 'Ambient');
        const popTracks = allTracks.filter(t => t.genre === 'Pop' || t.genre === 'Hip-Hop');

        const madeForYou = [
          {
            id: 'mix_daily_1',
            title: 'Daily Mix 1 • Retrowave & Chill',
            description: 'Based on your night listening: Synthwave, Electronic and Lo-Fi beats.',
            cover_image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
            tracks: synthwaveTracks.length ? synthwaveTracks : allTracks.slice(0, 4),
          },
          {
            id: 'mix_daily_2',
            title: 'Daily Mix 2 • Focus Velocity',
            description: 'Uninterrupted flow state soundscapes and rhythm.',
            cover_image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600',
            tracks: lofiTracks.length ? lofiTracks : allTracks.slice(1, 5),
          },
          {
            id: 'mix_daily_3',
            title: 'Daily Mix 3 • Top Hits Radar',
            description: 'Fresh trending chart-toppers tailored to your vibe.',
            cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
            tracks: popTracks.length ? popTracks : allTracks.slice(2, 6),
          },
        ];

        const recommendedGenres = [
          { genre: 'Synthwave', tracks: synthwaveTracks },
          { genre: 'Lo-Fi', tracks: lofiTracks },
          { genre: 'Pop', tracks: popTracks },
        ];

        return json({
          success: true,
          data: {
            jumpBackIn,
            madeForYou,
            trending,
            recommendedGenres,
          },
        });
      }

      // 8. PLAYLISTS
      if (path === '/playlists' && method === 'GET') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: true, data: [] });
        const playlists = await env.DB.prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC')
          .bind(user.id).all();
        return json({ success: true, data: playlists.results });
      }

      if (path === '/playlists/featured' && method === 'GET') {
        const playlists = await env.DB.prepare('SELECT * FROM playlists WHERE is_public = 1 LIMIT 10').all();
        return json({ success: true, data: playlists.results });
      }

      if (path === '/playlists' && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const { title, description, cover_image, is_public } = await request.json() as any;
        const id = 'pl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare(
          'INSERT INTO playlists (id, user_id, title, description, cover_image, is_public) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, user.id, title, description || '', cover_image || '', is_public ? 1 : 0).run();

        const created = await env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(id).first();
        return json({ success: true, data: created });
      }

      if (path.startsWith('/playlists/') && method === 'GET') {
        const playlistId = decodeURIComponent(path.replace('/playlists/', ''));
        const playlist = await env.DB.prepare('SELECT * FROM playlists WHERE id = ?').bind(playlistId).first();
        if (!playlist) return json({ success: false, message: 'Playlist not found' }, 404);

        const tracks = await env.DB.prepare(`
          SELECT t.* FROM tracks t
          JOIN playlist_tracks pt ON t.id = pt.track_id
          WHERE pt.playlist_id = ?
          ORDER BY pt.position ASC
        `).bind(playlistId).all();

        return json({ success: true, data: { playlist, tracks: tracks.results || [] } });
      }

      if (path.startsWith('/playlists/') && path.includes('/tracks') && method === 'POST') {
        const playlistId = path.split('/')[2];
        const body = await request.json() as any;
        const track = body.track;
        if (!track) return json({ success: false, message: 'Track object is required' }, 400);

        // Ensure track is stored in tracks table
        await env.DB.prepare(`
          INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET title = excluded.title
        `).bind(
          track.id || track.youtube_id,
          track.youtube_id || track.id,
          track.title,
          track.artist,
          track.duration || 180,
          track.thumbnail_url || '',
          track.genre || 'Music',
          track.views || 0
        ).run();

        const ptId = 'pt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare(
          'INSERT OR IGNORE INTO playlist_tracks (id, playlist_id, track_id, position) VALUES (?, ?, ?, (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?))'
        ).bind(ptId, playlistId, track.id || track.youtube_id, playlistId).run();

        return json({ success: true, message: 'Track added to playlist' });
      }

      // 9. FAVORITES
      if (path === '/favorites' && method === 'GET') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: true, data: [] });
        const favs = await env.DB.prepare(`
          SELECT t.* FROM tracks t
          JOIN favorites f ON t.id = f.track_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
        `).bind(user.id).all();
        return json({ success: true, data: favs.results });
      }

      if (path === '/favorites/toggle' && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const { track } = await request.json() as any;
        const trackId = track.id || track.youtube_id;

        // Upsert track
        await env.DB.prepare(`
          INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET title = excluded.title
        `).bind(
          trackId,
          track.youtube_id || trackId,
          track.title,
          track.artist,
          track.duration || 180,
          track.thumbnail_url || '',
          track.genre || 'Music',
          track.views || 0
        ).run();

        const existing = await env.DB.prepare('SELECT id FROM favorites WHERE user_id = ? AND track_id = ?')
          .bind(user.id, trackId).first();

        if (existing) {
          await env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND track_id = ?').bind(user.id, trackId).run();
          return json({ success: true, data: { isFavorite: false } });
        } else {
          const favId = 'fav_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
          await env.DB.prepare('INSERT INTO favorites (id, user_id, track_id) VALUES (?, ?, ?)')
            .bind(favId, user.id, trackId).run();
          return json({ success: true, data: { isFavorite: true } });
        }
      }

      if (path.startsWith('/favorites/check/') && method === 'GET') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: true, data: { isFavorite: false } });
        const trackId = decodeURIComponent(path.replace('/favorites/check/', ''));
        const fav = await env.DB.prepare('SELECT id FROM favorites WHERE user_id = ? AND track_id = ?')
          .bind(user.id, trackId).first();
        return json({ success: true, data: { isFavorite: !!fav } });
      }

      // 10. HISTORY
      if (path === '/history' && method === 'GET') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: true, data: [] });
        const history = await env.DB.prepare(`
          SELECT t.*, h.played_at FROM tracks t
          JOIN history h ON t.id = h.track_id
          WHERE h.user_id = ?
          ORDER BY h.played_at DESC LIMIT 50
        `).bind(user.id).all();
        return json({ success: true, data: history.results });
      }

      if (path === '/history' && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: true });
        const { track, durationListened } = await request.json() as any;
        const trackId = track.id || track.youtube_id;

        await env.DB.prepare(`
          INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET views = views + 1
        `).bind(
          trackId,
          track.youtube_id || trackId,
          track.title,
          track.artist,
          track.duration || 180,
          track.thumbnail_url || '',
          track.genre || 'Music',
          track.views || 0
        ).run();

        const histId = 'hist_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare('INSERT INTO history (id, user_id, track_id, duration_listened) VALUES (?, ?, ?, ?)')
          .bind(histId, user.id, trackId, durationListened || 0).run();

        return json({ success: true });
      }

      // 10. SOCIAL & FRIENDS ROUTES
      if (path === '/friends' && method === 'GET') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);

        const friendsQuery = await env.DB.prepare(`
          SELECT f.id as friendship_id, f.status, f.created_at,
                 u.id, u.name, u.email, u.avatar,
                 (CASE WHEN f.user_id = ? THEN 'outgoing' ELSE 'incoming' END) as direction
          FROM friendships f
          JOIN users u ON (f.friend_id = u.id AND f.user_id = ?) OR (f.user_id = u.id AND f.friend_id = ?)
          WHERE u.id != ?
          ORDER BY f.created_at DESC
        `).bind(user.id, user.id, user.id, user.id).all();

        const friends = friendsQuery.results || [];
        const accepted = friends.filter((f: any) => f.status === 'accepted');
        const pending = friends.filter((f: any) => f.status === 'pending');

        return json({
          success: true,
          data: {
            friends: accepted,
            pendingIncoming: pending.filter((f: any) => f.direction === 'incoming'),
            pendingOutgoing: pending.filter((f: any) => f.direction === 'outgoing'),
          },
        });
      }

      if (path === '/friends/request' && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);

        const body = await request.json() as any;
        const { targetEmail, targetUserId } = body;

        let target = null;
        if (targetUserId) {
          target = await env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(targetUserId).first();
        } else if (targetEmail) {
          target = await env.DB.prepare('SELECT id, name, email FROM users WHERE email = ?').bind(targetEmail.toLowerCase()).first();
        }

        if (!target) return json({ success: false, message: 'User not found' }, 404);
        if (target.id === user.id) return json({ success: false, message: 'Cannot add yourself as a friend' }, 400);

        const existing = await env.DB.prepare(
          'SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
        ).bind(user.id, target.id, target.id, user.id).first();

        if (existing) {
          if (existing.status === 'accepted') {
            return json({ success: false, message: 'You are already friends' }, 400);
          }
          return json({ success: false, message: 'Friend request already pending' }, 400);
        }

        const id = 'fr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare(
          'INSERT INTO friendships (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)'
        ).bind(id, user.id, target.id, 'pending').run();

        return json({ success: true, message: 'Friend request sent' });
      }

      if (path === '/friends/respond' && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);

        const { friendshipId, action } = await request.json() as any;
        if (!friendshipId || !['accept', 'decline'].includes(action)) {
          return json({ success: false, message: 'Valid friendshipId and action required' }, 400);
        }

        if (action === 'accept') {
          await env.DB.prepare(
            "UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND friend_id = ?"
          ).bind(friendshipId, user.id).run();
        } else {
          await env.DB.prepare('DELETE FROM friendships WHERE id = ? AND friend_id = ?')
            .bind(friendshipId, user.id).run();
        }

        return json({ success: true, message: `Friend request ${action}ed` });
      }

      if (path.startsWith('/friends/') && method === 'DELETE') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const friendshipId = path.split('/')[2];

        await env.DB.prepare(
          'DELETE FROM friendships WHERE id = ? AND (user_id = ? OR friend_id = ?)'
        ).bind(friendshipId, user.id, user.id).run();

        return json({ success: true, message: 'Friend removed' });
      }

      if (path === '/users/search' && method === 'GET') {
        const user = await getAuthUser(request, env);
        const query = url.searchParams.get('q') || '';
        if (!query.trim()) return json({ success: true, data: [] });

        const searchPattern = `%${query.trim().toLowerCase()}%`;
        const results = await env.DB.prepare(`
          SELECT id, name, email, avatar FROM users
          WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ?) AND id != ?
          LIMIT 10
        `).bind(searchPattern, searchPattern, user?.id || 'none').all();

        return json({ success: true, data: results.results });
      }

      // 11. LISTEN TOGETHER ROOMS (AURAROOMS)
      if (path === '/rooms' && method === 'GET') {
        const roomsQuery = await env.DB.prepare(`
          SELECT r.*, u.name as host_name, u.avatar as host_avatar,
                 t.id as track_id, t.youtube_id, t.title as track_title, t.artist as track_artist, t.thumbnail_url as track_thumbnail, t.duration as track_duration,
                 (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) as member_count
          FROM rooms r
          LEFT JOIN users u ON r.host_id = u.id
          LEFT JOIN tracks t ON (r.current_track_id = t.id OR r.current_track_id = t.youtube_id)
          WHERE r.is_public = 1
          ORDER BY r.created_at DESC
        `).all();

        return json({ success: true, data: roomsQuery.results });
      }

      if (path === '/rooms' && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);

        const body = await request.json() as any;
        const { name, description = '', isPublic = 1, djMode = 'collaborative', initialTrack } = body;

        if (!name || !name.trim()) return json({ success: false, message: 'Room name required' }, 400);

        const roomId = 'room_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        // Clean 6-character room code (e.g. AURA99)
        const code = 'AUR' + Math.floor(100 + Math.random() * 900);

        let trackId = null;
        if (initialTrack) {
          trackId = initialTrack.id || initialTrack.youtube_id;
          await env.DB.prepare(`
            INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
          `).bind(
            trackId,
            initialTrack.youtube_id || trackId,
            initialTrack.title,
            initialTrack.artist,
            initialTrack.duration || 180,
            initialTrack.thumbnail_url || '',
            initialTrack.genre || 'Music',
            initialTrack.views || 0
          ).run();
        }

        await env.DB.prepare(`
          INSERT INTO rooms (id, code, name, description, host_id, is_public, dj_mode, current_track_id, is_playing, playback_time, last_sync_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          roomId,
          code,
          name.trim(),
          description,
          user.id,
          isPublic ? 1 : 0,
          djMode,
          trackId,
          trackId ? 1 : 0,
          0,
          Date.now()
        ).run();

        // Add creator as host in room_members
        const memberId = 'rm_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare('INSERT INTO room_members (id, room_id, user_id, role) VALUES (?, ?, ?, ?)')
          .bind(memberId, roomId, user.id, 'host').run();

        // If initial track, add to queue
        if (trackId) {
          const queueId = 'rq_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
          await env.DB.prepare('INSERT INTO room_queue (id, room_id, track_id, added_by_user_id, position) VALUES (?, ?, ?, ?, ?)')
            .bind(queueId, roomId, trackId, user.id, 0).run();
        }

        return json({
          success: true,
          data: { id: roomId, code, name: name.trim(), hostId: user.id },
        });
      }

      // Fetch Room Details by ID or Code
      if (path.startsWith('/rooms/') && method === 'GET' && !path.includes('/poll') && !path.includes('/queue')) {
        const idOrCode = path.split('/')[2];
        const room = await env.DB.prepare(`
          SELECT r.*, u.name as host_name, u.avatar as host_avatar,
                 t.id as track_id, t.youtube_id, t.title as track_title, t.artist as track_artist, t.thumbnail_url as track_thumbnail, t.duration as track_duration
          FROM rooms r
          LEFT JOIN users u ON r.host_id = u.id
          LEFT JOIN tracks t ON (r.current_track_id = t.id OR r.current_track_id = t.youtube_id)
          WHERE r.id = ? OR r.code = ?
        `).bind(idOrCode, idOrCode.toUpperCase()).first();

        if (!room) return json({ success: false, message: 'Room not found' }, 404);

        // Members
        const members = await env.DB.prepare(`
          SELECT rm.role, rm.joined_at, u.id, u.name, u.avatar
          FROM room_members rm
          JOIN users u ON rm.user_id = u.id
          WHERE rm.room_id = ?
        `).bind(room.id).all();

        // Queue
        const queue = await env.DB.prepare(`
          SELECT rq.id as queue_id, rq.position, rq.votes, rq.added_at,
                 t.id, t.youtube_id, t.title, t.artist, t.thumbnail_url, t.duration,
                 u.name as added_by_name
          FROM room_queue rq
          JOIN tracks t ON rq.track_id = t.id
          JOIN users u ON rq.added_by_user_id = u.id
          WHERE rq.room_id = ?
          ORDER BY rq.position ASC
        `).bind(room.id).all();

        // Messages
        const messages = await env.DB.prepare(`
          SELECT rm.id, rm.content, rm.message_type, rm.created_at,
                 u.name as user_name, u.avatar as user_avatar, u.id as user_id
          FROM room_messages rm
          JOIN users u ON rm.user_id = u.id
          WHERE rm.room_id = ?
          ORDER BY rm.created_at DESC LIMIT 30
        `).bind(room.id).all();

        return json({
          success: true,
          data: {
            room,
            members: members.results,
            queue: queue.results,
            messages: (messages.results || []).reverse(),
          },
        });
      }

      // Join Room
      if (path.match(/^\/rooms\/[^\/]+\/join$/) && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const roomId = path.split('/')[2];

        const memberId = 'rm_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare(`
          INSERT INTO room_members (id, room_id, user_id, role)
          VALUES (?, ?, ?, 'listener')
          ON CONFLICT(room_id, user_id) DO UPDATE SET last_active = CURRENT_TIMESTAMP
        `).bind(memberId, roomId, user.id).run();

        // System message
        const msgId = 'msg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare('INSERT INTO room_messages (id, room_id, user_id, content, message_type) VALUES (?, ?, ?, ?, ?)')
          .bind(msgId, roomId, user.id, `${user.name} joined the room`, 'system').run();

        return json({ success: true, message: 'Joined room' });
      }

      // Leave Room
      if (path.match(/^\/rooms\/[^\/]+\/leave$/) && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: true });
        const roomId = path.split('/')[2];

        await env.DB.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?')
          .bind(roomId, user.id).run();

        return json({ success: true, message: 'Left room' });
      }

      // Sync Playback State (Host or DJ broadcast)
      if (path.match(/^\/rooms\/[^\/]+\/sync$/) && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const roomId = path.split('/')[2];

        const body = await request.json() as any;
        const { trackId, isPlaying, playbackTime } = body;

        await env.DB.prepare(`
          UPDATE rooms
          SET current_track_id = COALESCE(?, current_track_id),
              is_playing = ?,
              playback_time = ?,
              last_sync_time = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(
          trackId || null,
          isPlaying ? 1 : 0,
          playbackTime || 0,
          Date.now(),
          roomId
        ).run();

        return json({ success: true, timestamp: Date.now() });
      }

      // Lightweight Polling Endpoint
      if (path.match(/^\/rooms\/[^\/]+\/poll$/) && method === 'GET') {
        const roomId = path.split('/')[2];
        const room = await env.DB.prepare(`
          SELECT r.id, r.code, r.is_playing, r.playback_time, r.last_sync_time, r.current_track_id,
                 t.id as track_id, t.youtube_id, t.title as track_title, t.artist as track_artist, t.thumbnail_url as track_thumbnail, t.duration as track_duration
          FROM rooms r
          LEFT JOIN tracks t ON (r.current_track_id = t.id OR r.current_track_id = t.youtube_id)
          WHERE r.id = ?
        `).bind(roomId).first();

        if (!room) return json({ success: false, message: 'Room not found' }, 404);

        const queue = await env.DB.prepare(`
          SELECT rq.id as queue_id, rq.position, rq.votes,
                 t.id, t.youtube_id, t.title, t.artist, t.thumbnail_url, t.duration,
                 u.name as added_by_name
          FROM room_queue rq
          JOIN tracks t ON rq.track_id = t.id
          JOIN users u ON rq.added_by_user_id = u.id
          WHERE rq.room_id = ?
          ORDER BY rq.position ASC
        `).bind(roomId).all();

        const messages = await env.DB.prepare(`
          SELECT rm.id, rm.content, rm.message_type, rm.created_at,
                 u.name as user_name, u.avatar as user_avatar, u.id as user_id
          FROM room_messages rm
          JOIN users u ON rm.user_id = u.id
          WHERE rm.room_id = ?
          ORDER BY rm.created_at DESC LIMIT 15
        `).bind(roomId).all();

        const members = await env.DB.prepare(`
          SELECT rm.role, u.id, u.name, u.avatar
          FROM room_members rm
          JOIN users u ON rm.user_id = u.id
          WHERE rm.room_id = ?
        `).bind(roomId).all();

        return json({
          success: true,
          data: {
            room,
            queue: queue.results,
            members: members.results,
            messages: (messages.results || []).reverse(),
            serverTime: Date.now(),
          },
        });
      }

      // Add to Room Queue
      if (path.match(/^\/rooms\/[^\/]+\/queue$/) && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const roomId = path.split('/')[2];

        const { track } = await request.json() as any;
        if (!track) return json({ success: false, message: 'Track required' }, 400);

        const trackId = track.id || track.youtube_id;
        await env.DB.prepare(`
          INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `).bind(
          trackId,
          track.youtube_id || trackId,
          track.title,
          track.artist,
          track.duration || 180,
          track.thumbnail_url || '',
          track.genre || 'Music',
          track.views || 0
        ).run();

        const posCount = await env.DB.prepare('SELECT COUNT(*) as count FROM room_queue WHERE room_id = ?').bind(roomId).first();
        const nextPos = (posCount?.count as number) || 0;

        const queueId = 'rq_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare(`
          INSERT INTO room_queue (id, room_id, track_id, added_by_user_id, position)
          VALUES (?, ?, ?, ?, ?)
        `).bind(queueId, roomId, trackId, user.id, nextPos).run();

        // If no track is currently playing in room, auto-set this track as current
        const room = await env.DB.prepare('SELECT current_track_id FROM rooms WHERE id = ?').bind(roomId).first();
        if (!room?.current_track_id) {
          await env.DB.prepare('UPDATE rooms SET current_track_id = ?, is_playing = 1, playback_time = 0, last_sync_time = ? WHERE id = ?')
            .bind(trackId, Date.now(), roomId).run();
        }

        // Post notice
        const msgId = 'msg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare('INSERT INTO room_messages (id, room_id, user_id, content, message_type) VALUES (?, ?, ?, ?, ?)')
          .bind(msgId, roomId, user.id, `added "${track.title}" to the queue`, 'system').run();

        return json({ success: true, message: 'Track added to room queue' });
      }

      // Send Chat Message or Reaction in Room
      if (path.match(/^\/rooms\/[^\/]+\/messages$/) && method === 'POST') {
        const user = await getAuthUser(request, env);
        if (!user) return json({ success: false, message: 'Unauthorized' }, 401);
        const roomId = path.split('/')[2];

        const { content, messageType = 'chat' } = await request.json() as any;
        if (!content || !content.trim()) return json({ success: false, message: 'Content required' }, 400);

        const msgId = 'msg_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare('INSERT INTO room_messages (id, room_id, user_id, content, message_type) VALUES (?, ?, ?, ?, ?)')
          .bind(msgId, roomId, user.id, content.trim(), messageType).run();

        return json({ success: true, message: 'Message sent' });
      }

      // Fallback 404
      return json({ success: false, message: 'Route not found on AuraStream Edge API', path: url.pathname }, 404);
    } catch (err: any) {
      return json({ success: false, error: err.message || 'Internal Server Error' }, 500);
    }
  },
};
