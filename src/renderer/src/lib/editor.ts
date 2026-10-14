import {
  createProject,
  editProject,
  type ImageAsset,
  type ImageOverlay,
  type MediaInfo,
  type Project,
  type ProjectAction,
  type TextOverlay
} from '../../../shared/project'

export type EditorAction = { type: 'load'; source: MediaInfo; clipId: string } | ProjectAction

export function editorReducer(project: Project | null, action: EditorAction): Project | null {
  if (action.type === 'load') return createProject(action.source, action.clipId)
  return project && editProject(project, action)
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

function overlayTiming(playhead: number, duration: number) {
  return { id: crypto.randomUUID(), start: playhead, end: Math.min(playhead + 3, duration) }
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
