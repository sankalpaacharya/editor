import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { EditorApi } from '../shared/api'

const api: EditorApi = {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (name) => ipcRenderer.invoke('projects:create', name),
  openProject: (id) => ipcRenderer.invoke('projects:open', id),
  renameProject: (id, name) => ipcRenderer.invoke('projects:rename', id, name),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  saveSequence: (id, sequence) => ipcRenderer.invoke('projects:save-sequence', id, sequence),

  importMedia: (id, kind) => ipcRenderer.invoke('media:import', id, kind),
  importMediaFiles: (id, files) =>
    ipcRenderer.invoke(
      'media:import-files',
      id,
      files.map((file) => webUtils.getPathForFile(file))
    ),
  removeMedia: (id, mediaId) => ipcRenderer.invoke('media:remove', id, mediaId),

  exportProject: (id, sequence) => ipcRenderer.invoke('export:start', id, sequence),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  onExportProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, fraction: number) => listener(fraction)
    ipcRenderer.on('export:progress', handler)
    return () => ipcRenderer.removeListener('export:progress', handler)
  },
  listExports: (id) => ipcRenderer.invoke('exports:list', id),
  revealExport: (exportId) => ipcRenderer.invoke('exports:reveal', exportId),

  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates')
}

contextBridge.exposeInMainWorld('editor', api)
