import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater, type ProgressInfo } from 'electron-updater'

autoUpdater.autoDownload = false

let checking = false

const message = (window: BrowserWindow | undefined, options: Electron.MessageBoxOptions) =>
  window ? dialog.showMessageBox(window, options) : dialog.showMessageBox(options)

/** Checks GitHub Releases for a newer version and walks the user through installing it. */
export async function checkForUpdates(window?: BrowserWindow): Promise<void> {
  if (!app.isPackaged) {
    await message(window, { message: 'Updates are only available in installed builds.' })
    return
  }
  if (checking) return
  checking = true
  const showProgress = ({ percent }: ProgressInfo) => window?.setProgressBar(percent / 100)
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result?.isUpdateAvailable) {
      await message(window, { message: `Editor ${app.getVersion()} is the latest version.` })
      return
    }
    const download = await message(window, {
      message: `Editor ${result.updateInfo.version} is available.`,
      detail: `You have ${app.getVersion()}.`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    })
    if (download.response !== 0) return

    autoUpdater.on('download-progress', showProgress)
    await autoUpdater.downloadUpdate()
    const restart = await message(window, {
      message: 'The update is ready.',
      detail: 'Restart now to install it, or it installs the next time you quit.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1
    })
    if (restart.response === 0) autoUpdater.quitAndInstall()
  } catch (error) {
    dialog.showErrorBox(
      'Could not update Editor',
      error instanceof Error ? error.message : String(error)
    )
  } finally {
    autoUpdater.off('download-progress', showProgress)
    window?.setProgressBar(-1)
    checking = false
  }
}
