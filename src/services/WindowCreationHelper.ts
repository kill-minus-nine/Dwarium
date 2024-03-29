import ConfigService from './ConfigService'
import path from 'path'
import { TabsController } from './TabsController'
import { BrowserWindow } from 'electron'
import { Channel } from '../Models/Channel'
import setupContextMenu from './ContextMenu'
import { WindowType, HTMLPath } from '../Models/WindowModels'
import { getClientWindowPosition, saveClientWindowPosition } from './WindowSizeManager'

export function createWindowAndLoad(windowType: WindowType, htmlPath?: HTMLPath, preloadPath?: string, enableRemote = false, contextIsolation = true): BrowserWindow {
    const windowPosition = getClientWindowPosition(windowType)
    const window: BrowserWindow | null = new BrowserWindow({
        x: windowPosition?.x ?? 0,
        y: windowPosition?.y ?? 0,
        width: windowPosition?.width ?? 1100,
        height: windowPosition?.height ?? 700,
        minWidth: 1100,
        minHeight: 700,
        parent: ConfigService.getSettings().windowsAboveApp ? TabsController.mainWindow ?? undefined : undefined,
        webPreferences: {
            preload: preloadPath ? path.join(__dirname, preloadPath) : undefined,
            contextIsolation: contextIsolation
        },
        fullscreen: false
    })
    setupContextMenu(window)
    if(htmlPath) {
        window.loadFile(path.join(__dirname, htmlPath))
    }
    if(enableRemote) {
        require('@electron/remote/main').enable(window.webContents)
    }
    TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, windowType, true)
    return window
}

export function setupCloseLogic(window: BrowserWindow, windowType: WindowType, onClose: () => void) {
    window.on('close', () => {
        saveClientWindowPosition(windowType, window.getBounds())
    })
    window.on('closed', () => {
        onClose()
        if(!TabsController.mainWindow?.webContents.isDestroyed()) {
            TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, windowType, false)
        }
    })
}
