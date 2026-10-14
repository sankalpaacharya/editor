import { useState, type DragEvent } from 'react'
import { isFileDrag } from '@/lib/media-drag'

export function useFileDrop(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false)
  const props = {
    onDragOver(event: DragEvent<HTMLElement>) {
      if (!isFileDrag(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setOver(true)
    },
    onDragLeave(event: DragEvent<HTMLElement>) {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
    },
    onDrop(event: DragEvent<HTMLElement>) {
      if (!isFileDrag(event)) return
      event.preventDefault()
      setOver(false)
      const files = [...event.dataTransfer.files]
      if (files.length > 0) onFiles(files)
    }
  }
  return [over, props] as const
}
