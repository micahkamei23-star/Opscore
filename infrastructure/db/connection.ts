import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { logger } from "@/lib/logger";

const DB_DIR = path.join(process.cwd(), "db");
const DB_PATH = path.join(DB_DIR, "opscore.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("synchronous = NORMAL");

  logger.info("Database opened", { path: DB_PATH });
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    logger.info("Database closed");
  }
}

export function withTransaction<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}
