import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from './connection.js';
import { logger } from '../config/logger.js';

export async function seedDatabase(): Promise<void> {
  const db = getDatabase();

  logger.info('Beginning database seeding...');

  // 1. Seed Admin & Demo Users
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 12);
  const demoPasswordHash = await bcrypt.hash('Password123!', 12);

  const adminUser = {
    id: 'user_admin_001',
    name: 'Aura Admin',
    email: 'admin@aurastream.io',
    password_hash: adminPasswordHash,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'admin',
    interests: JSON.stringify(['Electronic', 'Synthwave', 'Lo-Fi']),
  };

  const demoUser = {
    id: 'user_demo_002',
    name: 'Alex Vance',
    email: 'demo@aurastream.io',
    password_hash: demoPasswordHash,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: 'user',
    interests: JSON.stringify(['Pop', 'Hip-Hop', 'Lo-Fi', 'Electronic']),
  };

  for (const u of [adminUser, demoUser]) {
    await db.execute(
      `INSERT INTO users (id, name, email, password_hash, avatar, role, interests) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET 
         name = excluded.name,
         role = excluded.role,
         interests = excluded.interests`,
      [u.id, u.name, u.email, u.password_hash, u.avatar, u.role, u.interests]
    );
  }

  // 2. Seed Curated Tracks with real YouTube video IDs
  const sampleTracks = [
    {
      id: 'track_01',
      youtube_id: 'jfKfPfyJRdk',
      title: 'lofi hip hop radio - beats to relax/study to',
      artist: 'Lofi Girl',
      duration: 180,
      thumbnail_url: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
      genre: 'Lo-Fi',
      views: 75000000,
    },
    {
      id: 'track_02',
      youtube_id: '4xDzrJKXOOY',
      title: 'SYNTHWAVE RADIO - chill synth / retro / electro',
      artist: 'Lofi Girl - Synthwave',
      duration: 210,
      thumbnail_url: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
      genre: 'Synthwave',
      views: 32000000,
    },
    {
      id: 'track_03',
      youtube_id: 'fHI8X480mxo',
      title: 'Midnight City',
      artist: 'M83',
      duration: 244,
      thumbnail_url: 'https://i.ytimg.com/vi/fHI8X480mxo/hqdefault.jpg',
      genre: 'Electronic',
      views: 450000000,
    },
    {
      id: 'track_04',
      youtube_id: 'NF-kLy44Hls',
      title: 'Starboy (feat. Daft Punk)',
      artist: 'The Weeknd',
      duration: 231,
      thumbnail_url: 'https://i.ytimg.com/vi/NF-kLy44Hls/hqdefault.jpg',
      genre: 'R&B',
      views: 2400000000,
    },
    {
      id: 'track_05',
      youtube_id: '4NRXx6U8ABQ',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      duration: 200,
      thumbnail_url: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
      genre: 'Pop',
      views: 1200000000,
    },
    {
      id: 'track_06',
      youtube_id: 'kXYiU_JCYtU',
      title: 'Numb',
      artist: 'Linkin Park',
      duration: 187,
      thumbnail_url: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
      genre: 'Rock',
      views: 2100000000,
    },
    {
      id: 'track_07',
      youtube_id: 'hT_nvWreIhg',
      title: 'Counting Stars',
      artist: 'OneRepublic',
      duration: 257,
      thumbnail_url: 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg',
      genre: 'Pop',
      views: 3900000000,
    },
    {
      id: 'track_08',
      youtube_id: 'SlPhMPnQ58k',
      title: 'Memories (feat. Kid Cudi)',
      artist: 'David Guetta',
      duration: 212,
      thumbnail_url: 'https://i.ytimg.com/vi/SlPhMPnQ58k/hqdefault.jpg',
      genre: 'Electronic',
      views: 520000000,
    },
    {
      id: 'track_09',
      youtube_id: 'L_LUpnjgPso',
      title: 'Resonance',
      artist: 'HOME',
      duration: 212,
      thumbnail_url: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
      genre: 'Synthwave',
      views: 120000000,
    },
    {
      id: 'track_10',
      youtube_id: 'gOsM-Z314pU',
      title: 'Sunflower (Spider-Man: Into the Spider-Verse)',
      artist: 'Post Malone, Swae Lee',
      duration: 158,
      thumbnail_url: 'https://i.ytimg.com/vi/gOsM-Z314pU/hqdefault.jpg',
      genre: 'Hip-Hop',
      views: 2200000000,
    },
    {
      id: 'track_11',
      youtube_id: 'RgKAFK5djSk',
      title: 'See You Again (feat. Charlie Puth)',
      artist: 'Wiz Khalifa',
      duration: 237,
      thumbnail_url: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg',
      genre: 'Hip-Hop',
      views: 6000000000,
    },
    {
      id: 'track_12',
      youtube_id: 'JGwWNGJdvx8',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      duration: 234,
      thumbnail_url: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
      genre: 'Pop',
      views: 6200000000,
    },
  ];

  for (const track of sampleTracks) {
    await db.execute(
      `INSERT INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(youtube_id) DO UPDATE SET
         title = excluded.title,
         artist = excluded.artist,
         duration = excluded.duration,
         thumbnail_url = excluded.thumbnail_url,
         genre = excluded.genre`,
      [track.id, track.youtube_id, track.title, track.artist, track.duration, track.thumbnail_url, track.genre, track.views]
    );
  }
  logger.info(`Seeded ${sampleTracks.length} curated tracks.`);

  // Resolve actual user IDs
  const adminDbUser = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [adminUser.email]);
  const demoDbUser = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [demoUser.email]);

  if (!adminDbUser || !demoDbUser) return;

  // 3. Seed Featured Playlists
  const samplePlaylists = [
    {
      id: 'playlist_01',
      user_id: adminDbUser.id,
      title: 'Cyberpunk Neon Drive',
      description: 'Futuristic synthwave, retro electro and high-octane night cruising vibes.',
      cover_image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600',
      is_public: 1,
      youtube_ids: ['4xDzrJKXOOY', 'fHI8X480mxo', 'L_LUpnjgPso'],
    },
    {
      id: 'playlist_02',
      user_id: demoDbUser.id,
      title: 'Deep Focus & Chill',
      description: 'Lofi hip hop and peaceful beats for deep coding and concentration.',
      cover_image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600',
      is_public: 1,
      youtube_ids: ['jfKfPfyJRdk', 'NF-kLy44Hls', 'gOsM-Z314pU'],
    },
    {
      id: 'playlist_03',
      user_id: adminDbUser.id,
      title: 'Global Top Hits 2025',
      description: 'The most popular songs streamed worldwide right now.',
      cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
      is_public: 1,
      youtube_ids: ['4NRXx6U8ABQ', 'hT_nvWreIhg', 'SlPhMPnQ58k', 'RgKAFK5djSk', 'JGwWNGJdvx8'],
    },
  ];

  for (const pl of samplePlaylists) {
    await db.execute(
      `INSERT INTO playlists (id, user_id, title, description, cover_image, is_public) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
      [pl.id, pl.user_id, pl.title, pl.description, pl.cover_image, pl.is_public]
    );

    for (let i = 0; i < pl.youtube_ids.length; i++) {
      const yid = pl.youtube_ids[i];
      const trackRow = await db.queryOne<{ id: string }>('SELECT id FROM tracks WHERE youtube_id = ?', [yid]);
      if (trackRow) {
        await db.execute(
          `INSERT OR IGNORE INTO playlist_tracks (id, playlist_id, track_id, position) VALUES (?, ?, ?, ?)`,
          [`pt_${pl.id}_${i}`, pl.id, trackRow.id, i]
        );
      }
    }
  }
  logger.info(`Seeded ${samplePlaylists.length} playlists.`);

  // 4. Seed Favorites & History
  const track1 = await db.queryOne<{ id: string }>('SELECT id FROM tracks WHERE youtube_id = ?', ['jfKfPfyJRdk']);
  const track2 = await db.queryOne<{ id: string }>('SELECT id FROM tracks WHERE youtube_id = ?', ['4xDzrJKXOOY']);
  const track3 = await db.queryOne<{ id: string }>('SELECT id FROM tracks WHERE youtube_id = ?', ['4NRXx6U8ABQ']);

  if (track1 && track2 && demoDbUser) {
    await db.execute('INSERT OR IGNORE INTO favorites (id, user_id, track_id) VALUES (?, ?, ?)', [
      'fav_01', demoDbUser.id, track1.id
    ]);
    await db.execute('INSERT OR IGNORE INTO favorites (id, user_id, track_id) VALUES (?, ?, ?)', [
      'fav_02', demoDbUser.id, track2.id
    ]);
  }

  if (track3 && demoDbUser) {
    await db.execute('INSERT OR IGNORE INTO history (id, user_id, track_id, duration_listened) VALUES (?, ?, ?, ?)', [
      'hist_01', demoDbUser.id, track3.id, 200
    ]);
  }

  logger.info('Database seeding completed successfully.');
}

if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(() => {
      logger.info('Seed process finished.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Seed process failed:', err);
      process.exit(1);
    });
}
