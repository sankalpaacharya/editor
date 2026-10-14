import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import ffmpegPath from 'ffmpeg-static'
import ffprobe from 'ffprobe-static'
import { z } from 'zod'
import type { AssetId, ImageAsset, MediaInfo } from '../shared/project'

const run = promisify(execFile)

// Packaged builds unpack the binaries next to app.asar; the module paths still point inside it.
const unpacked = (path: string): string => path.replace(`app.asar`, 'app.asar.unpacked')
export const FFMPEG_PATH = unpacked(ffmpegPath)
const FFPROBE_PATH = unpacked(ffprobe.path)

export const FONT_PATH = app.isPackaged
  ? `${process.resourcesPath}/fonts/NotoSans-SemiBold.ttf`
  : `${app.getAppPath()}/resources/fonts/NotoSans-SemiBold.ttf`

const granted = new Map<AssetId, string>()

export function resolveAsset(assetId: AssetId): string {
  const path = granted.get(assetId)
  if (!path) throw new Error(`Unknown asset ${assetId}`)
  return path
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

async function probe(path: string) {
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
  if (!video?.width || !video.height) throw new Error(`${basename(path)} has no video stream`)
  return {
    width: video.width,
    height: video.height,
    fps: frameRate(video.avg_frame_rate),
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
    duration: format.duration ?? 0
  }
}

export function grantPath(path: string): AssetId {
  const assetId = randomUUID()
  granted.set(assetId, path)
  return assetId
}

async function grant(path: string): Promise<AssetId> {
  if (!(await stat(path)).isFile()) throw new Error(`${path} is not a file`)
  return grantPath(path)
}

export async function importVideo(path: string): Promise<MediaInfo> {
  const media = await probe(path)
  if (!(media.duration > 0)) throw new Error(`${basename(path)} has no duration`)
  return { ...media, assetId: await grant(path), name: basename(path) }
}

export async function importImage(path: string): Promise<ImageAsset> {
  const { width, height } = await probe(path)
  return { assetId: await grant(path), name: basename(path), width, height }
}
