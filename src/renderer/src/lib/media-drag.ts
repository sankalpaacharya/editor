import type { DragEvent } from 'react'
import type { MediaId, MediaItem } from '../../../shared/sequence'

const MEDIA_TYPE = 'application/x-editor-media'
// Drop targets can read a drag's types but not its data until the drop, so the kind
// travels as a type of its own.
const IMAGE_TYPE = 'application/x-editor-image'

export function startMediaDrag(event: DragEvent, media: MediaItem): void {
  event.dataTransfer.setData(MEDIA_TYPE, media.id)
  if (media.kind === 'image') event.dataTransfer.setData(IMAGE_TYPE, '')
  event.dataTransfer.effectAllowed = 'copy'
}

export const isImageDrag = (event: DragEvent): boolean =>
  event.dataTransfer.types.includes(IMAGE_TYPE)

export const isMediaDrag = (event: DragEvent): boolean =>
  event.dataTransfer.types.includes(MEDIA_TYPE)

export const draggedMediaId = (event: DragEvent): MediaId | null =>
  event.dataTransfer.getData(MEDIA_TYPE) || null

export const isFileDrag = (event: DragEvent): boolean => event.dataTransfer.types.includes('Files')
