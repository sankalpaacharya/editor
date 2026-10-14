import { z } from 'zod'

const seconds = z.number().finite().nonnegative()
const unit = z.number().finite().min(0).max(1)

export const assetIdSchema = z.string().uuid()
export type AssetId = z.infer<typeof assetIdSchema>

export const mediaInfoSchema = z.object({
  assetId: assetIdSchema,
  name: z.string(),
  duration: seconds.positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().finite().positive(),
  hasAudio: z.boolean()
})
export type MediaInfo = z.infer<typeof mediaInfoSchema>

export const imageAssetSchema = z.object({
  assetId: assetIdSchema,
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})
export type ImageAsset = z.infer<typeof imageAssetSchema>

export const MIN_SPEED = 0.25
export const MAX_SPEED = 4

export const clipSchema = z.object({
  id: z.string(),
  in: seconds,
  out: seconds,
  speed: z.number().finite().min(MIN_SPEED).max(MAX_SPEED).default(1)
})
export type Clip = z.infer<typeof clipSchema>

const overlayBase = {
  id: z.string(),
  start: seconds,
  end: seconds,
  x: unit,
  y: unit
}

export const textOverlaySchema = z.object({
  ...overlayBase,
  kind: z.literal('text'),
  text: z.string().min(1).max(500),
  fontSize: z.number().finite().min(4).max(1000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i)
})
export type TextOverlay = z.infer<typeof textOverlaySchema>

export const imageOverlaySchema = z.object({
  ...overlayBase,
  kind: z.literal('image'),
  image: imageAssetSchema,
  widthRatio: z.number().finite().min(0.01).max(4)
})
export type ImageOverlay = z.infer<typeof imageOverlaySchema>

export const overlaySchema = z.discriminatedUnion('kind', [textOverlaySchema, imageOverlaySchema])
export type Overlay = z.infer<typeof overlaySchema>

export const projectSchema = z.object({
  source: mediaInfoSchema,
  clips: z.array(clipSchema).min(1),
  overlays: z.array(overlaySchema)
})
export type Project = z.infer<typeof projectSchema>

export const MIN_CLIP_LENGTH = 0.1

export function createProject(source: MediaInfo, clipId: string): Project {
  return { source, clips: [{ id: clipId, in: 0, out: source.duration, speed: 1 }], overlays: [] }
}

export function timelineLength(clip: Clip): number {
  return (clip.out - clip.in) / clip.speed
}

export function timelineDuration(clips: readonly Clip[]): number {
  return clips.reduce((sum, clip) => sum + timelineLength(clip), 0)
}

export interface TimelinePosition {
  index: number
  clip: Clip
  clipStart: number
  sourceTime: number
}

export function locate(clips: readonly Clip[], time: number): TimelinePosition {
  let clipStart = 0
  for (let index = 0; index < clips.length; index++) {
    const clip = clips[index]
    const length = timelineLength(clip)
    if (time < clipStart + length || index === clips.length - 1) {
      const offset = Math.min(Math.max(time - clipStart, 0), length)
      return { index, clip, clipStart, sourceTime: clip.in + offset * clip.speed }
    }
    clipStart += length
  }
  throw new Error('A project always has at least one clip')
}

export type ProjectAction =
  | { type: 'split'; time: number; newClipId: string }
  | { type: 'trim'; clipId: string; in: number; out: number }
  | { type: 'setSpeed'; clipId: string; speed: number }
  | { type: 'removeClip'; clipId: string }
  | { type: 'moveClip'; clipId: string; toIndex: number }
  | { type: 'addOverlay'; overlay: Overlay }
  | { type: 'updateOverlay'; overlay: Overlay }
  | { type: 'removeOverlay'; overlayId: string }

export function editProject(project: Project, action: ProjectAction): Project {
  switch (action.type) {
    case 'split': {
      const { index, clip, sourceTime } = locate(project.clips, action.time)
      if (sourceTime - clip.in < MIN_CLIP_LENGTH || clip.out - sourceTime < MIN_CLIP_LENGTH) {
        return project
      }
      const clips = project.clips.toSpliced(
        index,
        1,
        { ...clip, out: sourceTime },
        { ...clip, id: action.newClipId, in: sourceTime }
      )
      return { ...project, clips }
    }
    case 'trim': {
      const clips = project.clips.map((clip) => {
        if (clip.id !== action.clipId) return clip
        const out = Math.min(Math.max(action.out, MIN_CLIP_LENGTH), project.source.duration)
        const clipIn = Math.min(Math.max(action.in, 0), out - MIN_CLIP_LENGTH)
        return { ...clip, in: clipIn, out }
      })
      return { ...project, clips }
    }
    case 'setSpeed': {
      const speed = Math.min(Math.max(action.speed, MIN_SPEED), MAX_SPEED)
      const clips = project.clips.map((clip) =>
        clip.id === action.clipId ? { ...clip, speed } : clip
      )
      return { ...project, clips }
    }
    case 'removeClip': {
      if (project.clips.length === 1) return project
      return { ...project, clips: project.clips.filter((clip) => clip.id !== action.clipId) }
    }
    case 'moveClip': {
      const from = project.clips.findIndex((clip) => clip.id === action.clipId)
      if (from === -1) return project
      const to = Math.min(Math.max(action.toIndex, 0), project.clips.length - 1)
      const clips = project.clips.toSpliced(from, 1).toSpliced(to, 0, project.clips[from])
      return { ...project, clips }
    }
    case 'addOverlay':
      return { ...project, overlays: [...project.overlays, action.overlay] }
    case 'updateOverlay':
      return {
        ...project,
        overlays: project.overlays.map((overlay) =>
          overlay.id === action.overlay.id ? action.overlay : overlay
        )
      }
    case 'removeOverlay':
      return {
        ...project,
        overlays: project.overlays.filter((overlay) => overlay.id !== action.overlayId)
      }
  }
}
