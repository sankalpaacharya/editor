import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { EditorApi } from '../shared/api'

const api: EditorApi = {
  openVideo: () => ipcRenderer.invoke('media:open-video'),
  importVideo: (file) => ipcRenderer.invoke('media:import-video', webUtils.getPathForFile(file)),
  openRecent: (videoId) => ipcRenderer.invoke('library:open', videoId),
  listRecent: () => ipcRenderer.invoke('library:list'),
  forgetRecent: (videoId) => ipcRenderer.invoke('library:forget', videoId),
  saveProject: (project) => ipcRenderer.invoke('library:save', project),
  listExports: (sourceAssetId) => ipcRenderer.invoke('library:exports', sourceAssetId),
  revealExport: (exportId) => ipcRenderer.invoke('library:reveal-export', exportId),
  openImage: () => ipcRenderer.invoke('media:open-image'),
  exportVideo: (project) => ipcRenderer.invoke('export:start', project),
  cancelExport: () => ipcRenderer.invoke('export:cancel'),
  onExportProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, fraction: number) => listener(fraction)
    ipcRenderer.on('export:progress', handler)
    return () => ipcRenderer.removeListener('export:progress', handler)
  }
}

contextBridge.exposeInMainWorld('editor', api)
