import { basename, extname } from 'node:path'
import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { assetIdSchema, projectSchema, timelineDuration } from '../shared/project'
import { importImage } from './assets'
import { cancelExport, runExport } from './export-job'
import { exportPath, forgetVideo, listExports, listRecent, recordExport } from './library'
import { openProject, openRecentProject, saveProject, videoIdOf } from './projects'

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'm4v', 'avi']
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg']

const rowId = z.number().int().positive()

function windowOf(event: IpcMainInvokeEvent): BrowserWindow {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window) throw new Error('No window for this request')
  return window
}

async function pickFile(event: IpcMainInvokeEvent, name: string, extensions: string[]) {
  const { canceled, filePaths } = await dialog.showOpenDialog(windowOf(event), {
    properties: ['openFile'],
    filters: [{ name, extensions }]
  })
  return canceled ? null : filePaths[0]
}

export function registerIpc(): void {
  ipcMain.handle('media:open-video', async (event) => {
    const path = await pickFile(event, 'Videos', VIDEO_EXTENSIONS)
    return path ? openProject(path) : null
  })

  ipcMain.handle('media:import-video', (_event, input: unknown) => {
    const path = z.string().min(1).parse(input)
    const extension = extname(path).slice(1).toLowerCase()
    if (!VIDEO_EXTENSIONS.includes(extension)) throw new Error(`${basename(path)} is not a video`)
    return openProject(path)
  })

  ipcMain.handle('library:open', (_event, input: unknown) => openRecentProject(rowId.parse(input)))
  ipcMain.handle('library:list', () => listRecent())
  ipcMain.handle('library:forget', (_event, input: unknown) => forgetVideo(rowId.parse(input)))
  ipcMain.handle('library:save', (_event, input: unknown) =>
    saveProject(projectSchema.parse(input))
  )
  ipcMain.handle('library:exports', (_event, input: unknown) =>
    listExports(videoIdOf(assetIdSchema.parse(input)))
  )
  ipcMain.handle('library:reveal-export', (_event, input: unknown) => {
    const path = exportPath(rowId.parse(input))
    if (path) shell.showItemInFolder(path)
  })

  ipcMain.handle('media:open-image', async (event) => {
    const path = await pickFile(event, 'Images', IMAGE_EXTENSIONS)
    return path ? importImage(path) : null
  })

  ipcMain.handle('export:start', async (event, input: unknown) => {
    const project = projectSchema.parse(input)
    const { canceled, filePath } = await dialog.showSaveDialog(windowOf(event), {
      defaultPath: `${basename(project.source.name, extname(project.source.name))}-edit.mp4`,
      filters: [{ name: 'MP4 video', extensions: ['mp4'] }]
    })
    if (canceled || !filePath) return { status: 'canceled' }
    const result = await runExport(project, filePath, (fraction) => {
      if (!event.sender.isDestroyed()) event.sender.send('export:progress', fraction)
    })
    if (result.status === 'done') {
      recordExport(videoIdOf(project.source.assetId), filePath, timelineDuration(project.clips))
    }
    return result
  })

  ipcMain.handle('export:cancel', () => cancelExport())
}
