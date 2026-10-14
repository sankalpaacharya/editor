import { randomUUID } from 'node:crypto'
import { createProject, type AssetId, type Project } from '../shared/project'
import { grantPath, importVideo, resolveAsset } from './assets'
import { fromStoredEdits, rememberVideo, saveEdits, toStoredEdits, videoPath } from './library'

const videoIds = new Map<AssetId, number>()

export function videoIdOf(sourceAssetId: AssetId): number {
  const id = videoIds.get(sourceAssetId)
  if (id === undefined) throw new Error(`Unknown video ${sourceAssetId}`)
  return id
}

/** Opens a video file, restoring the edits saved the last time it was open. */
export async function openProject(path: string): Promise<Project> {
  const source = await importVideo(path)
  const { id, edits } = rememberVideo(path, source.name, source.duration)
  videoIds.set(source.assetId, id)
  if (!edits) return createProject(source, randomUUID())
  const restored = fromStoredEdits(edits, (imagePath, image) => ({
    ...image,
    assetId: grantPath(imagePath)
  }))
  return { source, ...restored }
}

export function openRecentProject(videoId: number): Promise<Project> {
  const path = videoPath(videoId)
  if (!path) throw new Error('That video is no longer in the library')
  return openProject(path)
}

export function saveProject(project: Project): void {
  saveEdits(videoIdOf(project.source.assetId), toStoredEdits(project, resolveAsset))
}
