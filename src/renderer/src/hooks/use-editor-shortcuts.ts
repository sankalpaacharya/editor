import { useEffect, useEffectEvent } from 'react'

interface Commands {
  togglePlay: () => void
  play: () => void
  pause: () => void
  split: () => void
  trimLeft: () => void
  trimRight: () => void
  duplicate: () => void
  selectAll: () => void
  addText: () => void
  clearSelection: () => void
  deleteSelection: () => void
  undo: () => void
  redo: () => void
  step: (amount: number, unit?: 'frame' | 'second') => void
  seek: (time: number) => void
}

export const isTyping = (target: EventTarget | null) =>
  target instanceof Element && target.closest('input, textarea, [contenteditable="true"]') !== null

export function useEditorShortcuts(commands: Commands) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isTyping(event.target) || event.altKey) return
    const key = event.key.toLowerCase()
    const command = event.metaKey || event.ctrlKey
    if (command) {
      if (key === 'z' && event.shiftKey) commands.redo()
      else if (key === 'z') commands.undo()
      else if (key === 'y') commands.redo()
      else if (key === 'd') commands.duplicate()
      else if (key === 'a') commands.selectAll()
      else if (key === 'b') commands.split()
      else return
    } else if (key === ' ') commands.togglePlay()
    else if (key === 'escape') commands.clearSelection()
    else if (key === 't') commands.addText()
    else if (key === 'q') commands.trimLeft()
    else if (key === 'w') commands.trimRight()
    else if (key === 'k') commands.pause()
    else if (key === 'l') commands.play()
    else if (key === 'j') commands.step(-1, 'second')
    else if (key === 'x' || key === 's') commands.split()
    else if (key === 'delete' || key === 'backspace') commands.deleteSelection()
    else if (key === 'arrowleft') commands.step(event.shiftKey ? -10 : -1)
    else if (key === 'arrowright') commands.step(event.shiftKey ? 10 : 1)
    else if (key === 'home') commands.seek(0)
    else if (key === 'end') commands.seek(Number.POSITIVE_INFINITY)
    else return
    event.preventDefault()
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

const mac = navigator.platform.startsWith('Mac')

export const SHORTCUTS = {
  play: 'Space',
  split: 'S',
  delete: 'Del',
  undo: mac ? '⌘Z' : 'Ctrl+Z',
  redo: mac ? '⇧⌘Z' : 'Ctrl+Y',
  duplicate: mac ? '⌘D' : 'Ctrl+D',
  zoomIn: '=',
  zoomOut: '-',
  zoomFit: '⇧Z',
  snap: 'N',
  trimLeft: 'Q',
  trimRight: 'W',
  start: 'Home',
  end: 'End'
}
