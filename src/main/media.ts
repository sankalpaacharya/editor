import { randomUUID } from 'node:crypto'
import { basename, extname, resolve } from 'node:path'
import { z } from 'zod'
import { mediaItemSchema, type MediaId, type MediaItem } from '../shared/sequence'
import type { ProjectId } from '../shared/api'
import { database, now, transaction } from './db'
import { FFPROBE_PATH, run } from './ffmpeg'

export const EXTENSIONS: Record<MediaItem['kind'], string[]> = {
  video: ['mp4', 'mov', 'mkv', 'webm', 'm4v', 'avi'],
  image: ['png', 'jpg', 'jpeg', 'webp']
}
export const MEDIA_EXTENSIONS = [...EXTENSIONS.video, ...EXTENSIONS.image]

export interface StoredMedia {
  item: MediaItem
  path: string
}

const probeSchema = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      avg_frame_rate: z.string().optional()
    })
  ),
  format: z.object({ duration: z.coerce.number().optional() })
})

function frameRate(rate = '30/1'): number {
  const [num, den] = rate.split('/').map(Number)
  return num > 0 && den > 0 ? num / den : 30
}

function kindOf(path: string): MediaItem['kind'] | undefined {
  const extension = extname(path).slice(1).toLowerCase()
  if (EXTENSIONS.video.includes(extension)) return 'video'
  if (EXTENSIONS.image.includes(extension)) return 'image'
}

async function probe(path: string): Promise<MediaItem> {
  const kind = kindOf(path)
  if (!kind) throw new Error(`${basename(path)} is not a supported video or image`)
  const { stdout } = await run(FFPROBE_PATH, [
    '-v',
    'error',
    '-show_streams',
    '-show_format',
    '-of',
    'json',
    path
  ])
  const { streams, format } = probeSchema.parse(JSON.parse(stdout))
  const video = streams.find((stream) => stream.codec_type === 'video')
  if (!video?.width || !video.height) throw new Error(`${basename(path)} has no picture`)
  const base = { id: randomUUID(), name: basename(path), width: video.width, height: video.height }
  if (kind === 'image') return { ...base, kind }
  const duration = format.duration ?? 0
  if (!(duration > 0)) throw new Error(`${basename(path)} has no duration`)
  return {
    ...base,
    kind,
    duration,
    fps: frameRate(video.avg_frame_rate),
    hasAudio: streams.some((stream) => stream.codec_type === 'audio')
  }
}

export async function importMedia(
  projectId: ProjectId,
  paths: string[]
): Promise<{ imported: MediaItem[]; skipped: string[] }> {
  const existing = new Map(projectMedia(projectId).map((stored) => [stored.path, stored.item]))
  const reused = paths.flatMap((path) => existing.get(resolve(path)) ?? [])
  const fresh = paths.filter((path) => !existing.has(resolve(path)))
  const probes = await Promise.allSettled(fresh.map((path) => probe(path)))
  const skipped = fresh.flatMap((path, i) => {
    const result = probes[i]
    if (result.status === 'fulfilled') return []
    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
    return [`${basename(path)}: ${reason.split('\n')[0]}`]
  })
  const found = probes.flatMap((result, i) =>
    result.status === 'fulfilled' ? [{ item: result.value, path: resolve(fresh[i]) }] : []
  )
  transaction((db) => {
    const insert = db.prepare(
      `INSERT INTO media (id, project_id, kind, name, path, width, height, duration, fps, has_audio, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const { item, path } of found) {
      const video = item.kind === 'video' ? item : undefined
      insert.run(
        item.id,
        projectId,
        item.kind,
        item.name,
        path,
        item.width,
        item.height,
        video?.duration ?? null,
        video?.fps ?? null,
        video ? Number(video.hasAudio) : null,
        now()
      )
    }
    if (found.length > 0) {
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), projectId)
    }
  })
  return { imported: [...reused, ...found.map(({ item }) => item)], skipped }
}

interface MediaRow {
  id: string
  kind: string
  name: string
  path: string
  width: number
  height: number
  duration: number | null
  fps: number | null
  has_audio: number | null
}

const fromRow = (row: MediaRow): StoredMedia => ({
  path: row.path,
  item: mediaItemSchema.parse({
    id: row.id,
    kind: row.kind,
    name: row.name,
    width: row.width,
    height: row.height,
    duration: row.duration ?? undefined,
    fps: row.fps ?? undefined,
    hasAudio: row.has_audio === null ? undefined : row.has_audio === 1
  })
})

export function projectMedia(projectId: ProjectId): StoredMedia[] {
  const rows = database()
    .prepare('SELECT * FROM media WHERE project_id = ? ORDER BY rowid')
    .all(projectId) as unknown as MediaRow[]
  return rows.map(fromRow)
}

export function findMedia(mediaId: MediaId): StoredMedia | undefined {
  const row = database().prepare('SELECT * FROM media WHERE id = ?').get(mediaId) as
    MediaRow | undefined
  return row && fromRow(row)
}
