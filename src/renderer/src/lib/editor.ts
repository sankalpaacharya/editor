import {
  editProject,
  type ImageAsset,
  type ImageOverlay,
  type Project,
  type ProjectAction,
  type TextOverlay
} from '../../../shared/project'

/** `edited` stays false until the user changes the project, so a fresh load is never saved. */
export interface OpenProject {
  project: Project
  edited: boolean
}

export type EditorAction = { type: 'load'; project: Project } | { type: 'close' } | ProjectAction

export function editorReducer(state: OpenProject | null, action: EditorAction): OpenProject | null {
  if (action.type === 'load') return { project: action.project, edited: false }
  if (action.type === 'close' || !state) return null
  const project = editProject(state.project, action)
  return project === state.project ? state : { project, edited: true }
}

export type Selection = { kind: 'clip' | 'overlay'; id: string } | null

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function formatTime(seconds: number): string {
  const tenths = Math.floor(seconds * 10 + 1e-6)
  const minutes = Math.floor(tenths / 600)
  const secs = Math.floor(tenths / 10) % 60
  return `${minutes}:${String(secs).padStart(2, '0')}.${tenths % 10}`
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  })
}

export const fileName = (path: string): string => path.split(/[\\/]/).pop() ?? path

const NEW_OVERLAY_LENGTH = 3

function overlayTiming(playhead: number, duration: number) {
  const start = Math.max(0, Math.min(playhead, duration - NEW_OVERLAY_LENGTH))
  return { id: crypto.randomUUID(), start, end: Math.min(start + NEW_OVERLAY_LENGTH, duration) }
}

export function newTextOverlay(project: Project, playhead: number, duration: number): TextOverlay {
  return {
    ...overlayTiming(playhead, duration),
    kind: 'text',
    text: 'Title',
    fontSize: Math.round(project.source.height / 10),
    color: '#ffffff',
    x: 0.5,
    y: 0.2
  }
}

export function newImageOverlay(
  image: ImageAsset,
  playhead: number,
  duration: number
): ImageOverlay {
  return {
    ...overlayTiming(playhead, duration),
    kind: 'image',
    image,
    scale: 0.25,
    x: 0.85,
    y: 0.15
  }
}

// Errors thrown in the main process arrive as "Error invoking remote method '…': Error: <message>".
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '').split('\n')[0]
}
