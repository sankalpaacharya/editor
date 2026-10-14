import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import type { ExportResult, ProjectId } from '../shared/api'
import { mediaIdSchema, sequenceSchema, timelineDuration, type MediaItem } from '../shared/sequence'
import type { ResolvedMedia } from './export-args'
import { exportPath, listExports, recordExport } from './export-history'
import { cancelExport, runExport } from './export-job'
import { EXTENSIONS, importMedia, MEDIA_EXTENSIONS, projectMedia } from './media'
import {
  checkReferences,
  createProject,
  deleteProject,
  listProjects,
  openProject,
  projectName,
  removeMedia,
  requireProject,
  renameProject,
  saveSequence
} from './projects'
import { checkForUpdates } from './updater'

const projectIdSchema = z.number().int().positive()
const projectNameSchema = z.string().trim().min(1).max(120)
const exportIdSchema = z.number().int().positive()
const pathsSchema = z.array(z.string().min(1))
const mediaKindSchema = z.enum(['video', 'image'])

function windowOf(event: IpcMainInvokeEvent): BrowserWindow {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('No window for this request')
  return window
}

async function importInto(
  event: IpcMainInvokeEvent,
  id: ProjectId,
  paths: string[]
): Promise<MediaItem[]> {
  requireProject(id)
  const { imported, skipped } = await importMedia(id, paths)
  if (skipped.length > 0) {
    void dialog.showMessageBox(windowOf(event), {
      type: 'warning',
      message: `${skipped.length} file${skipped.length === 1 ? '' : 's'} could not be imported.`,
      detail: `Only videos and images that ffprobe can read are supported.\n\n${skipped.join('\n')}`
    })
  }
  return imported
}

async function exportProject(event: IpcMainInvokeEvent, id: ProjectId, input: unknown) {
  const sequence = sequenceSchema.parse(input)
  const media = new Map(projectMedia(id).map((stored) => [stored.item.id, stored]))
  checkReferences(
    sequence,
    [...media.values()].map(({ item }) => item)
  )
  const { canceled, filePath } = await dialog.showSaveDialog(windowOf(event), {
    defaultPath: `${projectName(id).replace(/[/\\:*?"<>|]/g, '-')}.mp4`,
    filters: [{ name: 'MP4 video', extensions: ['mp4'] }]
  })
  if (canceled || !filePath) return { status: 'canceled' } satisfies ExportResult
  const resolveMedia = (mediaId: string): ResolvedMedia => {
    const stored = media.get(mediaId)
    if (!stored) throw new Error(`Media ${mediaId} is not in this project`)
    return { path: stored.path, media: stored.item }
  }
  const result = await runExport(sequence, filePath, resolveMedia, (fraction) => {
    if (!event.sender.isDestroyed()) event.sender.send('export:progress', fraction)
  })
  if (result.status === 'canceled') return result
  const exportId = recordExport(id, filePath, timelineDuration(sequence.clips))
  return { status: 'done', path: filePath, exportId } satisfies ExportResult
}

export function registerIpc(): void {
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('projects:create', (_event, name: unknown) =>
    createProject(projectNameSchema.parse(name))
  )
  ipcMain.handle('projects:open', (_event, id: unknown) => openProject(projectIdSchema.parse(id)))
  ipcMain.handle('projects:rename', (_event, id: unknown, name: unknown) =>
    renameProject(projectIdSchema.parse(id), projectNameSchema.parse(name))
  )
  ipcMain.handle('projects:delete', (_event, id: unknown) =>
    deleteProject(projectIdSchema.parse(id))
  )
  ipcMain.handle('projects:save-sequence', (_event, id: unknown, sequence: unknown) =>
    saveSequence(projectIdSchema.parse(id), sequenceSchema.parse(sequence))
  )

  ipcMain.handle('media:import', async (event, id: unknown, kind: unknown) => {
    const project = projectIdSchema.parse(id)
    const only = mediaKindSchema.optional().parse(kind)
    requireProject(project)
    const { canceled, filePaths } = await dialog.showOpenDialog(windowOf(event), {
      properties: ['openFile', 'multiSelections'],
      filters: [
        only
          ? { name: only === 'video' ? 'Videos' : 'Images', extensions: EXTENSIONS[only] }
          : { name: 'Videos and images', extensions: MEDIA_EXTENSIONS }
      ]
    })
    return canceled ? [] : importInto(event, project, filePaths)
  })
  ipcMain.handle('media:import-files', (event, id: unknown, paths: unknown) =>
    importInto(event, projectIdSchema.parse(id), pathsSchema.parse(paths))
  )
  ipcMain.handle('media:remove', (_event, id: unknown, mediaId: unknown) =>
    removeMedia(projectIdSchema.parse(id), mediaIdSchema.parse(mediaId))
  )

  ipcMain.handle('export:start', (event, id: unknown, sequence: unknown) =>
    exportProject(event, projectIdSchema.parse(id), sequence)
  )
  ipcMain.handle('export:cancel', () => cancelExport())
  ipcMain.handle('exports:list', (_event, id: unknown) => listExports(projectIdSchema.parse(id)))
  ipcMain.handle('exports:reveal', (_event, exportId: unknown) => {
    const path = exportPath(exportIdSchema.parse(exportId))
    if (path) shell.showItemInFolder(path)
  })

  ipcMain.handle('app:check-for-updates', (event) => checkForUpdates(windowOf(event)))
}
