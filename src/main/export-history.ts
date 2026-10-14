import { existsSync } from 'node:fs'
import type { ExportRecord, ProjectId } from '../shared/api'
import { database, now } from './db'

export function recordExport(projectId: ProjectId, path: string, duration: number): number {
  const { lastInsertRowid } = database()
    .prepare('INSERT INTO exports (project_id, path, duration, created_at) VALUES (?, ?, ?, ?)')
    .run(projectId, path, duration, now())
  return Number(lastInsertRowid)
}

export function listExports(projectId: ProjectId): ExportRecord[] {
  const rows = database()
    .prepare(
      'SELECT id, path, duration, created_at FROM exports WHERE project_id = ? ORDER BY id DESC'
    )
    .all(projectId) as { id: number; path: string; duration: number; created_at: string }[]
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
