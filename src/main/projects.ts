import { existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'
import type { OpenProject, ProjectId, ProjectSummary } from '../shared/api'
import {
  editSequence,
  emptySequence,
  sequenceSchema,
  timelineDuration,
  type MediaId,
  type MediaItem,
  type Sequence
} from '../shared/sequence'
import { database, now, transaction } from './db'
import { forgetDerivedImages } from './derived'
import { projectMedia } from './media'

interface ProjectRow {
  id: number
  name: string
  sequence: string
  updated_at: string
}

function parseSequence(json: string): Sequence {
  try {
    const parsed = sequenceSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : emptySequence()
  } catch {
    return emptySequence()
  }
}

function projectRow(db: DatabaseSync, id: ProjectId): ProjectRow {
  const row = db.prepare('SELECT id, name, sequence, updated_at FROM projects WHERE id = ?').get(id)
  if (!row) throw new Error(`Project ${id} does not exist`)
  return row as unknown as ProjectRow
}

export const projectName = (id: ProjectId): string => projectRow(database(), id).name

export function requireProject(id: ProjectId): void {
  projectRow(database(), id)
}

export function checkReferences(sequence: Sequence, media: readonly MediaItem[]): void {
  const kinds = new Map(media.map((item) => [item.id, item.kind]))
  const uses = [
    ...sequence.clips.map((clip) => ({ id: clip.mediaId, kind: 'video' })),
    ...sequence.overlays.flatMap((overlay) =>
      overlay.kind === 'image' ? [{ id: overlay.mediaId, kind: 'image' }] : []
    )
  ]
  const unknown = new Set(uses.filter(({ id, kind }) => kinds.get(id) !== kind).map(({ id }) => id))
  if (unknown.size > 0) {
    throw new Error(`The sequence uses media that is not in this project: ${[...unknown]}`)
  }
}

export function listProjects(): ProjectSummary[] {
  const rows = database()
    .prepare(
      `SELECT p.id, p.name, p.sequence, p.updated_at,
         (SELECT COUNT(*) FROM media m WHERE m.project_id = p.id) AS media_count,
         (SELECT COUNT(*) FROM exports e WHERE e.project_id = p.id) AS export_count,
         (SELECT m.id FROM media m WHERE m.project_id = p.id ORDER BY m.rowid LIMIT 1) AS first_media
       FROM projects p ORDER BY p.updated_at DESC, p.id DESC`
    )
    .all() as unknown as (ProjectRow & {
    media_count: number
    export_count: number
    first_media: MediaId | null
  })[]
  return rows.map((row) => {
    const sequence = parseSequence(row.sequence)
    return {
      id: row.id,
      name: row.name,
      updatedAt: row.updated_at,
      duration: timelineDuration(sequence.clips),
      mediaCount: row.media_count,
      exportCount: row.export_count,
      coverMediaId: sequence.clips[0]?.mediaId ?? row.first_media
    }
  })
}

export function openProject(id: ProjectId): OpenProject {
  const row = projectRow(database(), id)
  const media = projectMedia(id)
  return {
    id: row.id,
    name: row.name,
    media: media.map(({ item }) => item),
    missingMedia: media.filter(({ path }) => !existsSync(path)).map(({ item }) => item.id),
    sequence: parseSequence(row.sequence)
  }
}

export function createProject(name: string): OpenProject {
  const { id } = database()
    .prepare(
      'INSERT INTO projects (name, sequence, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id'
    )
    .get(name, JSON.stringify(emptySequence()), now(), now()) as { id: number }
  return openProject(id)
}

export function renameProject(id: ProjectId, name: string): void {
  requireProject(id)
  database()
    .prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?')
    .run(name, now(), id)
}

export async function deleteProject(id: ProjectId): Promise<void> {
  const mediaIds = projectMedia(id).map(({ item }) => item.id)
  database().prepare('DELETE FROM projects WHERE id = ?').run(id)
  await forgetDerivedImages(mediaIds)
}

function writeSequence(db: DatabaseSync, id: ProjectId, sequence: Sequence): void {
  db.prepare('UPDATE projects SET sequence = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(sequence),
    now(),
    id
  )
}

export function saveSequence(id: ProjectId, sequence: Sequence): void {
  requireProject(id)
  checkReferences(
    sequence,
    projectMedia(id).map(({ item }) => item)
  )
  writeSequence(database(), id, sequence)
}

export async function removeMedia(id: ProjectId, mediaId: MediaId): Promise<void> {
  transaction((db) => {
    const { changes } = db
      .prepare('DELETE FROM media WHERE id = ? AND project_id = ?')
      .run(mediaId, id)
    if (changes === 0) throw new Error(`Media ${mediaId} is not in project ${id}`)
    const stored = parseSequence(projectRow(db, id).sequence)
    writeSequence(db, id, editSequence(stored, { type: 'removeMedia', mediaId }))
  })
  await forgetDerivedImages([mediaId])
}
