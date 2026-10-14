import type { CSSProperties } from 'react'
import {
  timelineLength,
  type Clip,
  type MediaItem,
  type Overlay
} from '../../../../../shared/sequence'

export const GUTTER = 40
export const TAIL = 160
export const RULER_HEIGHT = 26
export const OVERLAY_LANE_HEIGHT = 22
export const VIDEO_ROW_HEIGHT = 52
export const AUDIO_ROW_HEIGHT = 34
export const ROW_GAP = 6

export interface ClipDrag {
  clipId: string
  dx: number
}

export function sourceSpan(clip: Clip, media: MediaItem | undefined, pps: number): CSSProperties {
  const mediaDuration = media?.kind === 'video' ? media.duration : clip.out
  return { left: (-clip.in * pps) / clip.speed, width: (mediaDuration * pps) / clip.speed }
}

export function clipStarts(clips: readonly Clip[]): number[] {
  const starts: number[] = []
  let time = 0
  for (const clip of clips) {
    starts.push(time)
    time += timelineLength(clip)
  }
  return starts
}

export function insertionIndex(clips: readonly Clip[], time: number, skip = -1): number {
  const starts = clipStarts(clips)
  return clips.filter(
    (clip, index) => index !== skip && starts[index] + timelineLength(clip) / 2 < time
  ).length
}

export function overlayRowHeight(overlays: readonly Overlay[]): number {
  const lanes = Math.max(...overlayLanes(overlays).values(), 0) + 1
  return lanes * OVERLAY_LANE_HEIGHT + 6
}

export function overlayLanes(overlays: readonly Overlay[]): Map<string, number> {
  const laneEnds: number[] = []
  const lanes = new Map<string, number>()
  for (const overlay of [...overlays].sort((a, b) => a.start - b.start)) {
    let lane = laneEnds.findIndex((end) => end <= overlay.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = overlay.end
    lanes.set(overlay.id, lane)
  }
  return lanes
}

const TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
const MIN_TICK_SPACING = 72

export function tickStep(pixelsPerSecond: number): number {
  return TICK_STEPS.find((step) => step * pixelsPerSecond >= MIN_TICK_SPACING) ?? 600
}

export function tickLabel(seconds: number, step: number): string {
  if (step < 1) return `${seconds.toFixed(1)}s`
  if (seconds < 60) return `${Math.round(seconds)}s`
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
