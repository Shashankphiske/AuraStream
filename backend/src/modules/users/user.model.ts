import crypto from 'crypto';
import { getDatabase } from '../../database/connection.js';
import { IUser, IUserProfile } from '../../types/index.js';

export class UserModel {
  static async create(data: {
    name: string;
    email: string;
    password_hash: string;
    avatar?: string;
    role?: 'user' | 'admin';
    interests?: string[];
  }): Promise<IUserProfile> {
    const db = getDatabase();
    const id = `usr_${crypto.randomUUID()}`;
    const interestsJson = JSON.stringify(data.interests || []);
    const role = data.role || 'user';
    const avatar = data.avatar || null;

    await db.execute(
      `INSERT INTO users (id, name, email, password_hash, avatar, role, interests) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.email.toLowerCase().trim(), data.password_hash, avatar, role, interestsJson]
    );

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create user record');
    return this.toProfile(created);
  }

  static async findById(id: string): Promise<IUser | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return this.parseRow(row);
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!row) return null;
    return this.parseRow(row);
  }

  static async updateInterests(userId: string, interests: string[]): Promise<IUserProfile | null> {
    const db = getDatabase();
    const interestsJson = JSON.stringify(interests);
    await db.execute(
      'UPDATE users SET interests = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [interestsJson, userId]
    );
    const updated = await this.findById(userId);
    return updated ? this.toProfile(updated) : null;
  }

  static async updateProfile(userId: string, data: { name?: string; avatar?: string }): Promise<IUserProfile | null> {
    const db = getDatabase();
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(data.avatar);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(userId);
      await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = await this.findById(userId);
    return updated ? this.toProfile(updated) : null;
  }

  static async countAll(): Promise<number> {
    const db = getDatabase();
    const res = await db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    return res?.count || 0;
  }

  static async findAll(limit: number = 50, offset: number = 0): Promise<IUserProfile[]> {
    const db = getDatabase();
    const rows = await db.query<any>('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
    return rows.map(r => this.toProfile(this.parseRow(r)));
  }

  private static parseRow(row: any): IUser {
    let parsedInterests: string[] = [];
    try {
      parsedInterests = typeof row.interests === 'string' ? JSON.parse(row.interests) : (row.interests || []);
    } catch {
      parsedInterests = [];
    }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password_hash: row.password_hash,
      avatar: row.avatar,
      role: row.role,
      interests: parsedInterests,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  static toProfile(user: IUser): IUserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      interests: user.interests,
      created_at: user.created_at,
    };
  }
}
