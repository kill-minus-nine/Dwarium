import ConfigService from './ConfigService'
import path from 'path'
import { TabsController } from './TabsController'
import { BrowserWindow } from 'electron'
import { Channel } from '../Models/Channel'

export function createWindowAndLoad(windowType?: WindowType, htmlPath?: HTMLPath, preloadPath?: string, enableRemote: boolean = false, contextIsolation: boolean = true): BrowserWindow {
    let window: BrowserWindow | null = new BrowserWindow({
        width: 900,
        height: 700,
        minWidth: 900,
        minHeight: 700,
        parent: ConfigService.windowsAboveApp() ? TabsController.mainWindow! : undefined,
        webPreferences: {
            preload: preloadPath ? path.join(__dirname, preloadPath) : undefined,
            contextIsolation: contextIsolation
        }
    })
    if(htmlPath) {
        window.loadFile(path.join(__dirname, htmlPath))
    }
    if(enableRemote) {
        require("@electron/remote/main").enable(window.webContents)
    }
    TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, windowType, true)
    return window
}

export function setupCloseLogic(window: BrowserWindow, windowType: WindowType, onClose: () => void) {
    window.on('closed', () => {
        onClose()
        if(!TabsController.mainWindow?.webContents.isDestroyed()) {
            TabsController.mainWindow?.webContents.send(Channel.OPEN_WINDOW, windowType, false)
        }
    })
}

export enum Preload {
    DRESSING = '../components/Dressing/preload.js',
    BELT = '../components/Belt/preload.js',
    CHAT_LOG = '../components/ChatLog/preload.js',
    SETTINGS = '../components/Settings/preload.js',
    NOTES = '../components/Notes/preload.js',
    FOOD = '../components/Food/preload.js'
}

export enum HTMLPath {
    DRESSING = '../../gui/Dressing/index.html',
    BELT = '../../gui/Belt/index.html',
    CHAT_LOG = '../../gui/ChatLog/index.html',
    SETTINGS = '../../gui/Settings/index.html',
    NOTES = '../../gui/Notes/index.html',
    FOOD = '../../gui/Food/index.html',
    CHAT_SETTINGS = '../../gui/ChatSettings/index.html'
}

export enum WindowType {
    DRESSING_ROOM = 'dressingRoom',
    BELT_POTION_ROOM = 'beltPotionRoom',
    CHAT_LOG = 'chatLog',
    CHAT_SETTINGS = 'chatSettings',
    SETTINGS = 'settings',
    NOTES = 'notes',
    FOOD = 'food',
    SCREENSHOT = 'screenshot'
}