import type { AssetId, ImageAsset, Project } from './project'

export type ExportResult = { status: 'done'; path: string } | { status: 'canceled' }

export interface RecentVideo {
  id: number
  name: string
  duration: number
  openedAt: string
  exportCount: number
  missing: boolean
}

export interface ExportRecord {
  id: number
  path: string
  duration: number
  createdAt: string
  missing: boolean
}

export interface EditorApi {
  openVideo(): Promise<Project | null>
  importVideo(file: File): Promise<Project>
  openRecent(videoId: number): Promise<Project>
  listRecent(): Promise<RecentVideo[]>
  forgetRecent(videoId: number): Promise<void>
  saveProject(project: Project): Promise<void>
  listExports(sourceAssetId: AssetId): Promise<ExportRecord[]>
  revealExport(exportId: number): Promise<void>
  openImage(): Promise<ImageAsset | null>
  exportVideo(project: Project): Promise<ExportResult>
  cancelExport(): Promise<void>
  onExportProgress(listener: (fraction: number) => void): () => void
}

export const MEDIA_SCHEME = 'media'

export const assetUrl = (assetId: string): string => `${MEDIA_SCHEME}://${assetId}/`
