import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import { checkForUpdates } from './updater'

export function setApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
    { role: 'editMenu' },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        {
          label: 'Check for Updates…',
          click: (_item, window) =>
            checkForUpdates(window instanceof BrowserWindow ? window : undefined)
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
