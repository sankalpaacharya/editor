import type { MediaId, MediaItem, Sequence } from './sequence'

export type ProjectId = number

export interface ProjectSummary {
  id: ProjectId
  name: string
  updatedAt: string
  duration: number
  mediaCount: number
  exportCount: number
  coverMediaId: MediaId | null
}

export interface OpenProject {
  id: ProjectId
  name: string
  media: MediaItem[]
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

export interface EditorApi {
  listProjects(): Promise<ProjectSummary[]>
  createProject(name: string): Promise<OpenProject>
  openProject(id: ProjectId): Promise<OpenProject>
  renameProject(id: ProjectId, name: string): Promise<void>
  deleteProject(id: ProjectId): Promise<void>
  saveSequence(id: ProjectId, sequence: Sequence): Promise<void>

  importMedia(id: ProjectId, kind?: MediaItem['kind']): Promise<MediaItem[]>
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

export const mediaUrl = {
  source: (id: MediaId) => `${MEDIA_SCHEME}://${id}/source`,
  thumbnail: (id: MediaId) => `${MEDIA_SCHEME}://${id}/thumbnail.jpg`,
  filmstrip: (id: MediaId) => `${MEDIA_SCHEME}://${id}/filmstrip.jpg`,
  waveform: (id: MediaId) => `${MEDIA_SCHEME}://${id}/waveform.png`
}
