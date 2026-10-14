import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'

const SCHEMA_VERSION = 2

const SCHEMA = `
  DROP TABLE IF EXISTS exports;
  DROP TABLE IF EXISTS videos;
  CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    sequence TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE media (
    id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    duration REAL,
    fps REAL,
    has_audio INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE exports (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    duration REAL NOT NULL,
    created_at TEXT NOT NULL
  );
`

let db: DatabaseSync | undefined

function open(): DatabaseSync {
  const connection = new DatabaseSync(join(app.getPath('userData'), 'editor.db'))
  connection.exec('PRAGMA foreign_keys = ON')
  const { user_version } = connection.prepare('PRAGMA user_version').get() as {
    user_version: number
  }
  if (user_version < SCHEMA_VERSION) {
    connection.exec(`BEGIN; ${SCHEMA} PRAGMA user_version = ${SCHEMA_VERSION}; COMMIT;`)
  }
  return connection
}

export function database(): DatabaseSync {
  db ??= open()
  return db
}

export function transaction<T>(body: (db: DatabaseSync) => T): T {
  const connection = database()
  connection.exec('BEGIN')
  try {
    const result = body(connection)
    connection.exec('COMMIT')
    return result
  } catch (error) {
    connection.exec('ROLLBACK')
    throw error
  }
}

export const now = (): string => new Date().toISOString()
