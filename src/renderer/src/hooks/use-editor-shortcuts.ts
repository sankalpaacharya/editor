import { useEffect, useEffectEvent } from 'react'

interface Commands {
  togglePlay: () => void
  split: () => void
  deleteSelection: () => void
  undo: () => void
  redo: () => void
  step: (frames: number) => void
  seek: (time: number) => void
}

const isTyping = (target: EventTarget | null) =>
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
      else return
    } else if (key === ' ') commands.togglePlay()
    else if (key === 'x' || key === 's') commands.split()
    else if (key === 'delete' || key === 'backspace') commands.deleteSelection()
    else if (key === 'arrowleft') commands.step(-1)
    else if (key === 'arrowright') commands.step(1)
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

export const SHORTCUTS = {
  play: 'Space',
  split: 'X',
  delete: 'Del',
  undo: navigator.platform.startsWith('Mac') ? '⌘Z' : 'Ctrl+Z',
  redo: navigator.platform.startsWith('Mac') ? '⇧⌘Z' : 'Ctrl+Y',
  start: 'Home',
  end: 'End'
}
