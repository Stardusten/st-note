import Database from "better-sqlite3"
import {
  CreateParamsRaw,
  QueryOptionsRaw,
  StObjectRaw,
  StObjectId,
  UpdateParamsRaw
} from "../preload"

// path -> SQLite database conn
const databases = new Map<string, Database.Database>()

function getDb(path: string): Database.Database {
  const db = databases.get(path)
  if (!db) throw new Error(`Database at ${path} not initialized`)
  return db
}

export function initStorage(path: string): void {
  if (databases.has(path)) return
  const db = new Database(path)
  db.exec(`
    CREATE TABLE IF NOT EXISTS objects (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT,
      text TEXT,
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER NOT NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  databases.set(path, db)
}

export function closeStorage(path: string): void {
  const db = databases.get(path)
  if (db) {
    db.close()
    databases.delete(path)
  }
}

export function insertObject(path: string, params: CreateParamsRaw): StObjectRaw {
  const db = getDb(path)
  const now = Date.now()
  db.prepare(
    `INSERT INTO objects (id, type, data, text, tags, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(params.id, params.type, params.data, params.text, params.tags, now, now, 0)
  return { ...params, created_at: now, updated_at: now, deleted_at: 0 }
}

export function fetchObject(path: string, id: StObjectId): StObjectRaw | null {
  const db = getDb(path)
  const item: any =
    db.prepare("SELECT * FROM objects WHERE id = ? AND deleted_at = 0").get(id) ?? null
  return item ?? null
}

export function updateObject(path: string, params: UpdateParamsRaw) {
  const db = getDb(path)
  const current = fetchObject(path, params.id)
  if (!current) throw new Error(`Object with id ${params.id} not found`)
  if (current.deleted_at !== 0)
    throw new Error(`Object with id ${params.id} is deleted, update a deleted object is not allowed`)

  const now = Date.now()
  const stmt = db.prepare(`
    UPDATE objects
    SET type = ?, data = ?, text = ?, tags = ?, updated_at = ?
    WHERE id = ?
  `)
  stmt.run(params.type, params.data, params.text, params.tags, now, params.id)
}

export function deleteObject(path: string, id: StObjectId): void {
  const db = getDb(path)
  const now = Date.now()
  db.prepare("UPDATE objects SET deleted_at = ? WHERE id = ?").run(now, id)
}

export function queryObjects(path: string, options?: QueryOptionsRaw): StObjectRaw[] {
  const db = getDb(path)
  const { type, includeDeleted = false, limit, offset } = options || {}

  const cond: string[] = []
  const params: unknown[] = []

  if (!includeDeleted) {
    cond.push("deleted_at = 0")
  }

  if (type) {
    cond.push("type = ?")
    params.push(type)
  }

  let query = "SELECT * FROM objects"
  if (cond.length) {
    query += " WHERE " + cond.join(" AND ")
  }
  query += " ORDER BY updated_at DESC"

  if (Number.isFinite(limit)) {
    query += " LIMIT ?"
    params.push(limit)
  }

  if (Number.isFinite(offset)) {
    query += " OFFSET ?"
    params.push(offset)
  }

  return db.prepare(query).all(...params) as StObjectRaw[]
}

// ============ Settings ============

export function getSetting(path: string, key: string): string | null {
  const db = getDb(path)
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(path: string, key: string, value: string): void {
  const db = getDb(path)
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value)
}

export function getAllSettings(path: string): Record<string, string> {
  const db = getDb(path)
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[]
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return result
}

export function deleteSetting(path: string, key: string): void {
  const db = getDb(path)
  db.prepare("DELETE FROM settings WHERE key = ?").run(key)
}
