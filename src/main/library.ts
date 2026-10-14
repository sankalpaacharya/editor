import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { z } from 'zod'
import type { ExportRecord, RecentVideo } from '../shared/api'
import {
  clipSchema,
  imageAssetSchema,
  imageOverlaySchema,
  textOverlaySchema,
  type Clip,
  type ImageAsset,
  type Overlay,
  type Project
} from '../shared/project'

const storedOverlaySchema = z.discriminatedUnion('kind', [
  textOverlaySchema,
  imageOverlaySchema.extend({
    image: imageAssetSchema.omit({ assetId: true }).extend({ path: z.string() })
  })
])
const storedEditsSchema = z.object({
  clips: z.array(clipSchema).min(1),
  overlays: z.array(storedOverlaySchema)
})
export type StoredEdits = z.infer<typeof storedEditsSchema>

let db: DatabaseSync | undefined

function database(): DatabaseSync {
  if (db) return db
  db = new DatabaseSync(join(app.getPath('userData'), 'editor.db'))
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      duration REAL NOT NULL,
      edits TEXT,
      opened_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exports (
      id INTEGER PRIMARY KEY,
      video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      duration REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `)
  return db
}

const now = () => new Date().toISOString()

export function rememberVideo(
  path: string,
  name: string,
  duration: number
): { id: number; edits: StoredEdits | null } {
  const row = database()
    .prepare(
      `INSERT INTO videos (path, name, duration, opened_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET name = excluded.name, opened_at = excluded.opened_at
       RETURNING id, duration, edits`
    )
    .get(path, name, duration, now()) as { id: number; duration: number; edits: string | null }
  const parsed = row.edits ? storedEditsSchema.safeParse(JSON.parse(row.edits)) : null
  const fits = parsed?.success && parsed.data.clips.every((clip) => clip.out <= duration + 0.01)
  return { id: row.id, edits: fits ? parsed.data : null }
}

export function videoPath(id: number): string | undefined {
  const row = database().prepare('SELECT path FROM videos WHERE id = ?').get(id) as
    { path: string } | undefined
  return row?.path
}

export function saveEdits(videoId: number, edits: StoredEdits): void {
  database().prepare('UPDATE videos SET edits = ? WHERE id = ?').run(JSON.stringify(edits), videoId)
}

export function forgetVideo(videoId: number): void {
  database().prepare('DELETE FROM videos WHERE id = ?').run(videoId)
}

export function recordExport(videoId: number, path: string, duration: number): void {
  database()
    .prepare('INSERT INTO exports (video_id, path, duration, created_at) VALUES (?, ?, ?, ?)')
    .run(videoId, path, duration, now())
}

export function listExports(videoId: number): ExportRecord[] {
  const rows = database()
    .prepare(
      'SELECT id, path, duration, created_at FROM exports WHERE video_id = ? ORDER BY id DESC'
    )
    .all(videoId) as { id: number; path: string; duration: number; created_at: string }[]
  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    duration: row.duration,
    createdAt: row.created_at,
    missing: !existsSync(row.path)
  }))
}

export function exportPath(exportId: number): string | undefined {
  const row = database().prepare('SELECT path FROM exports WHERE id = ?').get(exportId) as
    { path: string } | undefined
  return row?.path
}

export function listRecent(limit = 20): RecentVideo[] {
  const rows = database()
    .prepare(
      `SELECT v.id, v.path, v.name, v.duration, v.opened_at,
              (SELECT COUNT(*) FROM exports e WHERE e.video_id = v.id) AS export_count
       FROM videos v ORDER BY v.opened_at DESC LIMIT ?`
    )
    .all(limit) as {
    id: number
    path: string
    name: string
    duration: number
    opened_at: string
    export_count: number
  }[]
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    duration: row.duration,
    openedAt: row.opened_at,
    exportCount: row.export_count,
    missing: !existsSync(row.path)
  }))
}

export function toStoredEdits(
  project: Project,
  resolvePath: (assetId: string) => string
): StoredEdits {
  return {
    clips: project.clips,
    overlays: project.overlays.map((overlay) => {
      if (overlay.kind === 'text') return overlay
      const { assetId, ...image } = overlay.image
      return { ...overlay, image: { ...image, path: resolvePath(assetId) } }
    })
  }
}

export function fromStoredEdits(
  edits: StoredEdits,
  grantImage: (path: string, image: Omit<ImageAsset, 'assetId'>) => ImageAsset | null
): { clips: Clip[]; overlays: Overlay[] } {
  const overlays = edits.overlays.flatMap((overlay): Overlay[] => {
    if (overlay.kind === 'text') return [overlay]
    const { path, ...image } = overlay.image
    const granted = existsSync(path) ? grantImage(path, image) : null
    return granted ? [{ ...overlay, image: granted }] : []
  })
  return { clips: edits.clips, overlays }
}
