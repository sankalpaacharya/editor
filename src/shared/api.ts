import type { ImageAsset, MediaInfo, Project } from './project'

export type ExportResult = { status: 'done'; path: string } | { status: 'canceled' }

/** The API the preload script exposes to the renderer as `window.editor`. */
export interface EditorApi {
  openVideo(): Promise<MediaInfo | null>
  importVideo(file: File): Promise<MediaInfo>
  openImage(): Promise<ImageAsset | null>
  exportVideo(project: Project): Promise<ExportResult>
  cancelExport(): Promise<void>
  onExportProgress(listener: (fraction: number) => void): () => void
}

export const MEDIA_SCHEME = 'media'

export const assetUrl = (assetId: string): string => `${MEDIA_SCHEME}://${assetId}/`
