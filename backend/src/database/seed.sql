-- AuraStream Seed Data for Cloudflare D1
-- Users (passwords hashed with bcrypt cost factor 12: AdminPassword123! and Password123!)
INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, role, interests) VALUES 
('user_admin_001', 'Aura Admin', 'admin@aurastream.io', '$2b$12$e6mZ82oR.H0qjZJ6f9f3G.0k0vR7d4L2WJ6mQv1iM8n6w3y9x5pTu', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'admin', '["Electronic","Synthwave","Lo-Fi"]'),
('user_demo_002', 'Alex Vance', 'demo@aurastream.io', '$2b$12$K1d8iU3gB7M4Z2vY9L0xN.s5t8F6w2R1q9P4o7N3m5K8l1J4h7G0e', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'user', '["Pop","Hip-Hop","Lo-Fi","Electronic"]');

-- Curated Tracks with real YouTube video IDs
INSERT OR IGNORE INTO tracks (id, youtube_id, title, artist, duration, thumbnail_url, genre, views) VALUES
('track_01', 'jfKfPfyJRdk', 'lofi hip hop radio - beats to relax/study to', 'Lofi Girl', 180, 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg', 'Lo-Fi', 75000000),
('track_02', '4xDzrJKXOOY', 'SYNTHWAVE RADIO - chill synth / retro / electro', 'Lofi Girl - Synthwave', 210, 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg', 'Synthwave', 32000000),
('track_03', 'fHI8X480mxo', 'Midnight City', 'M83', 244, 'https://i.ytimg.com/vi/fHI8X480mxo/hqdefault.jpg', 'Electronic', 450000000),
('track_04', 'NF-kLy44Hls', 'Starboy (feat. Daft Punk)', 'The Weeknd', 231, 'https://i.ytimg.com/vi/NF-kLy44Hls/hqdefault.jpg', 'R&B', 2400000000),
('track_05', '4NRXx6U8ABQ', 'Blinding Lights', 'The Weeknd', 200, 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', 'Pop', 1200000000),
('track_06', 'kXYiU_JCYtU', 'Numb', 'Linkin Park', 187, 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg', 'Rock', 2100000000),
('track_07', 'hT_nvWreIhg', 'Counting Stars', 'OneRepublic', 257, 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg', 'Pop', 3900000000),
('track_08', 'SlPhMPnQ58k', 'Memories (feat. Kid Cudi)', 'David Guetta', 212, 'https://i.ytimg.com/vi/SlPhMPnQ58k/hqdefault.jpg', 'Electronic', 520000000),
('track_09', 'L_LUpnjgPso', 'Resonance', 'HOME', 212, 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg', 'Synthwave', 120000000),
('track_10', 'gOsM-Z314pU', 'Sunflower (Spider-Man: Into the Spider-Verse)', 'Post Malone, Swae Lee', 158, 'https://i.ytimg.com/vi/gOsM-Z314pU/hqdefault.jpg', 'Hip-Hop', 2200000000),
('track_11', 'RgKAFK5djSk', 'See You Again (feat. Charlie Puth)', 'Wiz Khalifa', 237, 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg', 'Hip-Hop', 6000000000),
('track_12', 'JGwWNGJdvx8', 'Shape of You', 'Ed Sheeran', 234, 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', 'Pop', 6200000000);

-- Featured Playlists
INSERT OR IGNORE INTO playlists (id, user_id, title, description, cover_image, is_public) VALUES
('playlist_01', 'user_admin_001', 'Cyberpunk Neon Drive', 'Futuristic synthwave, retro electro and high-octane night cruising vibes.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600', 1),
('playlist_02', 'user_demo_002', 'Deep Focus & Chill', 'Lofi hip hop and peaceful beats for deep coding and concentration.', 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600', 1),
('playlist_03', 'user_admin_001', 'Global Top Hits 2025', 'The most popular songs streamed worldwide right now.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600', 1);

-- Playlist Tracks
INSERT OR IGNORE INTO playlist_tracks (id, playlist_id, track_id, position) VALUES
('pt_01_0', 'playlist_01', 'track_02', 0),
('pt_01_1', 'playlist_01', 'track_03', 1),
('pt_01_2', 'playlist_01', 'track_09', 2),
('pt_02_0', 'playlist_02', 'track_01', 0),
('pt_02_1', 'playlist_02', 'track_04', 1),
('pt_02_2', 'playlist_02', 'track_10', 2),
('pt_03_0', 'playlist_03', 'track_05', 0),
('pt_03_1', 'playlist_03', 'track_07', 1),
('pt_03_2', 'playlist_03', 'track_08', 2),
('pt_03_3', 'playlist_03', 'track_11', 3),
('pt_03_4', 'playlist_03', 'track_12', 4);

-- Demo User Favorites
INSERT OR IGNORE INTO favorites (id, user_id, track_id) VALUES
('fav_01', 'user_demo_002', 'track_01'),
('fav_02', 'user_demo_002', 'track_02');

-- Demo User History
INSERT OR IGNORE INTO history (id, user_id, track_id, duration_listened) VALUES
('hist_01', 'user_demo_002', 'track_05', 200);

-- Demo Friendships
INSERT OR IGNORE INTO friendships (id, user_id, friend_id, status) VALUES
('fr_01', 'user_admin_001', 'user_demo_002', 'accepted'),
('fr_02', 'user_demo_002', 'user_admin_001', 'accepted');


