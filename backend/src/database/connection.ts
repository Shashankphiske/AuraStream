import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { IDatabaseClient } from '../types/index.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

class SQLiteDatabaseClient implements IDatabaseClient {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');

    // Run schema migrations if tables don't exist
    this.initializeSchema();
    logger.info(`Connected to SQLite Database at ${dbPath}`);
  }

  private initializeSchema(): void {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'src/database/schema.sql'),
        path.resolve(process.cwd(), 'dist/database/schema.sql'),
        path.resolve(__dirname, 'schema.sql'),
        path.resolve(__dirname, '../database/schema.sql'),
      ];

      const schemaPath = candidates.find(p => fs.existsSync(p));
      if (schemaPath) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        this.db.exec(schemaSql);
        logger.info(`Database schema initialized from ${schemaPath}`);
      } else {
        logger.warn('schema.sql not found in candidate paths, relying on existing tables');
      }
    } catch (err: any) {
      logger.error('Error initializing database schema:', { error: err.message });
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params);
    return (result as T) || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  async execScript(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }
}

// Adapter for Cloudflare D1 (env.DB binding)
export class CloudflareD1Client implements IDatabaseClient {
  constructor(private d1: any) {}

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const result = await stmt.all();
    return result.results || [];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const result = await stmt.first();
    return result || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const result = await stmt.run();
    return {
      changes: result.meta?.changes || 0,
      lastInsertRowid: result.meta?.last_row_id || 0,
    };
  }

  async execScript(sql: string): Promise<void> {
    await this.d1.exec(sql);
  }
}

let dbInstance: IDatabaseClient | null = null;

export function getDatabase(): IDatabaseClient {
  if (!dbInstance) {
    dbInstance = new SQLiteDatabaseClient(env.DB_PATH);
  }
  return dbInstance;
}

export function setDatabase(db: IDatabaseClient): void {
  dbInstance = db;
}
