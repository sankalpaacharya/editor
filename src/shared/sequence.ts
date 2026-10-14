import { z } from 'zod'

const seconds = z.number().finite().nonnegative()
const unit = z.number().finite().min(0).max(1)
const pixels = z.number().int().positive()

export const mediaIdSchema = z.string().uuid()
export type MediaId = z.infer<typeof mediaIdSchema>

export const videoMediaSchema = z.object({
  id: mediaIdSchema,
  kind: z.literal('video'),
  name: z.string(),
  width: pixels,
  height: pixels,
  duration: seconds.positive(),
  fps: z.number().finite().positive(),
  hasAudio: z.boolean()
})
export type VideoMedia = z.infer<typeof videoMediaSchema>

export const imageMediaSchema = z.object({
  id: mediaIdSchema,
  kind: z.literal('image'),
  name: z.string(),
  width: pixels,
  height: pixels
})
export type ImageMedia = z.infer<typeof imageMediaSchema>

export const mediaItemSchema = z.discriminatedUnion('kind', [videoMediaSchema, imageMediaSchema])
export type MediaItem = z.infer<typeof mediaItemSchema>

export const MIN_SPEED = 0.25
export const MAX_SPEED = 4
export const MIN_CLIP_LENGTH = 0.1

export const clipSchema = z.object({
  id: z.string(),
  mediaId: mediaIdSchema,
  in: seconds,
  out: seconds,
  speed: z.number().finite().min(MIN_SPEED).max(MAX_SPEED),
  /** Linear gain from 0 (muted) to 1 (as recorded). */
  volume: unit.default(1)
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
  mediaId: mediaIdSchema,
  widthRatio: z.number().finite().min(0.01).max(4)
})
export type ImageOverlay = z.infer<typeof imageOverlaySchema>

export const overlaySchema = z.discriminatedUnion('kind', [textOverlaySchema, imageOverlaySchema])
export type Overlay = z.infer<typeof overlaySchema>

export const formatSchema = z.object({
  width: pixels,
  height: pixels,
  fps: z.number().finite().positive()
})
export type Format = z.infer<typeof formatSchema>

export const sequenceSchema = z.object({
  format: formatSchema,
  clips: z.array(clipSchema),
  overlays: z.array(overlaySchema)
})
/**
 * The edit of one project. Clips are ranges of video media in source seconds, played in
 * order. Overlays sit on the timeline in timeline seconds, centered at `x`/`y` as a fraction
 * of the output frame. Every source is fitted into `format` on export and in the preview.
 */
export type Sequence = z.infer<typeof sequenceSchema>

export const DEFAULT_FORMAT: Format = { width: 1920, height: 1080, fps: 30 }

export function emptySequence(): Sequence {
  return { format: DEFAULT_FORMAT, clips: [], overlays: [] }
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

/** Maps a timeline time to the clip under it. Returns null for an empty sequence. */
export function locate(clips: readonly Clip[], time: number): TimelinePosition | null {
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
  return null
}

export type SequenceAction =
  | { type: 'addClip'; clipId: string; media: VideoMedia; index?: number }
  | { type: 'split'; time: number; newClipId: string }
  | { type: 'trim'; clipId: string; in: number; out: number; mediaDuration: number }
  | { type: 'setSpeed'; clipId: string; speed: number }
  | { type: 'setVolume'; clipId: string; volume: number }
  | { type: 'removeClip'; clipId: string }
  | { type: 'moveClip'; clipId: string; toIndex: number }
  | { type: 'addOverlay'; overlay: Overlay }
  | { type: 'updateOverlay'; overlay: Overlay }
  | { type: 'removeOverlay'; overlayId: string }
  | { type: 'removeMedia'; mediaId: MediaId }

// H.264 with yuv420p needs even frame dimensions.
const even = (pixels: number): number => Math.max(2, Math.round(pixels / 2) * 2)

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function editSequence(sequence: Sequence, action: SequenceAction): Sequence {
  switch (action.type) {
    case 'addClip': {
      const { media } = action
      const clip: Clip = {
        id: action.clipId,
        mediaId: media.id,
        in: 0,
        out: media.duration,
        speed: 1,
        volume: 1
      }
      const index = clamp(action.index ?? sequence.clips.length, 0, sequence.clips.length)
      const format =
        sequence.clips.length === 0
          ? { width: even(media.width), height: even(media.height), fps: media.fps }
          : sequence.format
      return { ...sequence, format, clips: sequence.clips.toSpliced(index, 0, clip) }
    }
    case 'split': {
      const position = locate(sequence.clips, action.time)
      if (!position) return sequence
      const { index, clip, sourceTime } = position
      if (sourceTime - clip.in < MIN_CLIP_LENGTH || clip.out - sourceTime < MIN_CLIP_LENGTH) {
        return sequence
      }
      const clips = sequence.clips.toSpliced(
        index,
        1,
        { ...clip, out: sourceTime },
        { ...clip, id: action.newClipId, in: sourceTime }
      )
      return { ...sequence, clips }
    }
    case 'trim': {
      const clips = sequence.clips.map((clip) => {
        if (clip.id !== action.clipId) return clip
        const out = clamp(action.out, MIN_CLIP_LENGTH, action.mediaDuration)
        return { ...clip, in: clamp(action.in, 0, out - MIN_CLIP_LENGTH), out }
      })
      return { ...sequence, clips }
    }
    case 'setSpeed': {
      const speed = clamp(action.speed, MIN_SPEED, MAX_SPEED)
      const clips = sequence.clips.map((clip) =>
        clip.id === action.clipId ? { ...clip, speed } : clip
      )
      return { ...sequence, clips }
    }
    case 'setVolume': {
      const volume = clamp(action.volume, 0, 1)
      const clips = sequence.clips.map((clip) =>
        clip.id === action.clipId ? { ...clip, volume } : clip
      )
      return { ...sequence, clips }
    }
    case 'removeClip':
      return { ...sequence, clips: sequence.clips.filter((clip) => clip.id !== action.clipId) }
    case 'moveClip': {
      const from = sequence.clips.findIndex((clip) => clip.id === action.clipId)
      if (from === -1) return sequence
      const to = clamp(action.toIndex, 0, sequence.clips.length - 1)
      const clips = sequence.clips.toSpliced(from, 1).toSpliced(to, 0, sequence.clips[from])
      return { ...sequence, clips }
    }
    case 'addOverlay':
      return { ...sequence, overlays: [...sequence.overlays, action.overlay] }
    case 'updateOverlay':
      return {
        ...sequence,
        overlays: sequence.overlays.map((overlay) =>
          overlay.id === action.overlay.id ? action.overlay : overlay
        )
      }
    case 'removeOverlay':
      return {
        ...sequence,
        overlays: sequence.overlays.filter((overlay) => overlay.id !== action.overlayId)
      }
    case 'removeMedia':
      return {
        ...sequence,
        clips: sequence.clips.filter((clip) => clip.mediaId !== action.mediaId),
        overlays: sequence.overlays.filter(
          (overlay) => overlay.kind !== 'image' || overlay.mediaId !== action.mediaId
        )
      }
  }
}
