import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDatabase } from '../src/database/seed.js';

const app = createApp();

describe('Music and Discovery API Tests', () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it('should return health check ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('should return categories, genres, and curated moods', async () => {
    const res = await request(app).get('/api/v1/music/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.genres)).toBe(true);
    expect(Array.isArray(res.body.data.moods)).toBe(true);
  });

  it('should return trending tracks from catalog', async () => {
    const res = await request(app).get('/api/v1/music/trending?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should return tracks by genre', async () => {
    const res = await request(app).get('/api/v1/music/genre/Pop?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
