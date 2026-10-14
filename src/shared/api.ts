import type { MediaId, MediaItem, Sequence } from './sequence'

export type ProjectId = number

export interface ProjectSummary {
  id: ProjectId
  name: string
  updatedAt: string
  /** Timeline length of the saved sequence, in seconds. */
  duration: number
  mediaCount: number
  exportCount: number
  /** The media whose thumbnail represents the project: its first clip, else its first media item. */
  coverMediaId: MediaId | null
}

export interface OpenProject {
  id: ProjectId
  name: string
  media: MediaItem[]
  /** Media whose file was moved or deleted since it was imported. */
  missingMedia: MediaId[]
  sequence: Sequence
}

export type ExportResult =
  { status: 'done'; path: string; exportId: number } | { status: 'canceled' }

export interface ExportRecord {
  id: number
  path: string
  duration: number
  createdAt: string
  missing: boolean
}

/** The API the preload script exposes to the renderer as `window.editor`. */
export interface EditorApi {
  listProjects(): Promise<ProjectSummary[]>
  createProject(name: string): Promise<OpenProject>
  openProject(id: ProjectId): Promise<OpenProject>
  renameProject(id: ProjectId, name: string): Promise<void>
  deleteProject(id: ProjectId): Promise<void>
  saveSequence(id: ProjectId, sequence: Sequence): Promise<void>

  /** Opens a file dialog for videos and images. Returns the imported items, empty if canceled. */
  importMedia(id: ProjectId): Promise<MediaItem[]>
  importMediaFiles(id: ProjectId, files: File[]): Promise<MediaItem[]>
  removeMedia(id: ProjectId, mediaId: MediaId): Promise<void>

  exportProject(id: ProjectId, sequence: Sequence): Promise<ExportResult>
  cancelExport(): Promise<void>
  onExportProgress(listener: (fraction: number) => void): () => void
  listExports(id: ProjectId): Promise<ExportRecord[]>
  revealExport(exportId: number): Promise<void>

  checkForUpdates(): Promise<void>
}

export const MEDIA_SCHEME = 'media'

/**
 * URLs served by the `media://` protocol. Main generates thumbnails, filmstrips, and
 * waveforms on first request and caches them. A filmstrip or waveform image spans the
 * whole source duration, so a clip shows its part by scaling the image to the source
 * length and offsetting it by `clip.in`.
 */
export const mediaUrl = {
  source: (id: MediaId) => `${MEDIA_SCHEME}://${id}/source`,
  thumbnail: (id: MediaId) => `${MEDIA_SCHEME}://${id}/thumbnail.jpg`,
  filmstrip: (id: MediaId) => `${MEDIA_SCHEME}://${id}/filmstrip.jpg`,
  waveform: (id: MediaId) => `${MEDIA_SCHEME}://${id}/waveform.png`
}
