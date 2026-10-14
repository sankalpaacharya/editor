import { existsSync } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { app } from 'electron'
import type { MediaId, MediaItem } from '../shared/sequence'
import { FFMPEG_PATH, run } from './ffmpeg'
import type { StoredMedia } from './media'

const THUMBNAIL_WIDTH = 480
const FILMSTRIP_HEIGHT = 54
const SECONDS_PER_FILMSTRIP_FRAME = 2
const MAX_FILMSTRIP_FRAMES = 120

function filmstripFrames(duration: number): number {
  const frames = Math.round(duration / SECONDS_PER_FILMSTRIP_FRAME)
  return Math.min(Math.max(frames, 1), MAX_FILMSTRIP_FRAMES)
}

const derivations: Record<string, (path: string, media: MediaItem) => string[] | null> = {
  'thumbnail.jpg': (path, media) =>
    media.kind === 'video'
      ? [
          '-ss',
          (media.duration * 0.1).toFixed(3),
          '-i',
          path,
          '-vf',
          `thumbnail=50,scale=${THUMBNAIL_WIDTH}:-2`,
          '-q:v',
          '3'
        ]
      : ['-i', path, '-vf', `scale=${THUMBNAIL_WIDTH}:-2`, '-q:v', '3'],
  'filmstrip.jpg': (path, media) => {
    if (media.kind !== 'video') return null
    const frames = filmstripFrames(media.duration)
    return [
      '-i',
      path,
      '-an',
      '-vf',
      `fps=${frames}/${media.duration},scale=-2:${FILMSTRIP_HEIGHT},tile=${frames}x1`,
      '-q:v',
      '5'
    ]
  },
  'waveform.png': (path, media) =>
    media.kind === 'video' && media.hasAudio
      ? ['-i', path, '-filter_complex', '[0:a:0]showwavespic=s=2000x80:colors=0xd6d3d1']
      : null
}

const cacheDir = (): string => join(app.getPath('userData'), 'media-cache')
const cachePath = (mediaId: MediaId, name: string): string => join(cacheDir(), `${mediaId}-${name}`)

const pending = new Map<string, Promise<string>>()

async function generate(args: string[], target: string): Promise<string> {
  if (existsSync(target)) return target
  await mkdir(cacheDir(), { recursive: true })
  const partial = `${target}.partial${extname(target)}`
  try {
    await run(FFMPEG_PATH, [
      '-hide_banner',
      '-v',
      'error',
      '-y',
      ...args,
      '-frames:v',
      '1',
      '-update',
      '1',
      partial
    ])
    await rename(partial, target)
  } finally {
    await rm(partial, { force: true })
  }
  return target
}

export function derivedImage(media: StoredMedia, name: string): Promise<string> | null {
  const args = Object.hasOwn(derivations, name) ? derivations[name](media.path, media.item) : null
  if (!args) return null
  const target = cachePath(media.item.id, name)
  let job = pending.get(target)
  if (!job) {
    job = generate(args, target).finally(() => pending.delete(target))
    pending.set(target, job)
  }
  return job
}

export async function forgetDerivedImages(mediaIds: MediaId[]): Promise<void> {
  await Promise.all(
    mediaIds.flatMap((id) =>
      Object.keys(derivations).map((name) => rm(cachePath(id, name), { force: true }))
    )
  )
}
