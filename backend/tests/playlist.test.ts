import request from 'supertest';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/modules/auth/auth.service.js';

const app = createApp();

describe('Playlist API Integration Tests', () => {
  let userToken: string;
  let otherUserToken: string;
  let playlistId: string;

  beforeAll(async () => {
    const u1 = await AuthService.register({
      name: 'Playlist Maker',
      email: `maker_${Date.now()}@aurastream.io`,
      password: 'StrongPassword123!',
    });
    userToken = u1.accessToken;

    const u2 = await AuthService.register({
      name: 'Other User',
      email: `other_${Date.now()}@aurastream.io`,
      password: 'StrongPassword123!',
    });
    otherUserToken = u2.accessToken;
  });

  it('should allow user to create a playlist', async () => {
    const res = await request(app)
      .post('/api/v1/playlists')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Late Night Synth',
        description: 'Vibes for night coding',
        is_public: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Late Night Synth');
    playlistId = res.body.data.id;
  });

  it('should add a track to the playlist', async () => {
    const res = await request(app)
      .post(`/api/v1/playlists/${playlistId}/tracks`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        track: {
          youtube_id: '4xDzrJKXOOY',
          title: 'SYNTHWAVE RADIO',
          artist: 'Lofi Girl',
          duration: 210,
          thumbnail_url: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
          genre: 'Synthwave',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should fetch playlist with its tracks', async () => {
    const res = await request(app)
      .get(`/api/v1/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.playlist.title).toBe('Late Night Synth');
    expect(res.body.data.tracks.length).toBe(1);
    expect(res.body.data.tracks[0].youtube_id).toBe('4xDzrJKXOOY');
  });

  it('should prevent unauthorized users from deleting someone elses playlist', async () => {
    const res = await request(app)
      .delete(`/api/v1/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow owner to delete playlist', async () => {
    const res = await request(app)
      .delete(`/api/v1/playlists/${playlistId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
