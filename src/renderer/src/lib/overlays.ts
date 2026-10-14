import type { Format, ImageMedia, ImageOverlay, TextOverlay } from '../../../shared/sequence'
import { clamp } from '@/lib/format'

const NEW_OVERLAY_SECONDS = 3

function timing(time: number, duration: number) {
  const start = clamp(time, 0, Math.max(duration - NEW_OVERLAY_SECONDS, 0))
  return { id: crypto.randomUUID(), start, end: Math.min(start + NEW_OVERLAY_SECONDS, duration) }
}

export interface TextPreset {
  name: string
  sample: string
  size: number
  y: number
}

export const TEXT_PRESETS: TextPreset[] = [
  { name: 'Title', sample: 'Title', size: 1 / 9, y: 0.22 },
  { name: 'Subtitle', sample: 'Subtitle', size: 1 / 16, y: 0.34 },
  { name: 'Caption', sample: 'Caption text', size: 1 / 22, y: 0.86 }
]

export function newTextOverlay(
  preset: TextPreset,
  format: Format,
  time: number,
  duration: number
): TextOverlay {
  return {
    ...timing(time, duration),
    kind: 'text',
    text: preset.sample,
    fontSize: Math.round(format.height * preset.size),
    color: '#ffffff',
    x: 0.5,
    y: preset.y
  }
}

export function newImageOverlay(
  image: ImageMedia,
  time: number,
  duration: number,
  position = { x: 0.82, y: 0.18 }
): ImageOverlay {
  return {
    ...timing(time, duration),
    kind: 'image',
    mediaId: image.id,
    widthRatio: 0.25,
    ...position
  }
}
