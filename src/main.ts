import { app, BeforeSendResponse, OnBeforeSendHeadersListenerDetails, OnResponseStartedListenerDetails, session } from 'electron'
import { TabsController } from './services/TabsController'
import MainWindowContainer from './Components/MainWindow/MainWindow'
import { autoUpdater } from 'electron-updater'
import ConfigService from './services/ConfigService'
require('@electron/remote/main').initialize()
require('v8-compile-cache')
import electronReload from 'electron-reload'
import { Channel } from './Models/Channel'
import { eldivInfoFix, ergamFix, userInfoAchieventFix } from './Scripts/ContentFixes'
electronReload(__dirname, {})

autoUpdater.allowDowngrade = ConfigService.getSettings().updateChannel == 'stable'
autoUpdater.allowPrerelease = ConfigService.getSettings().updateChannel != 'stable'

autoUpdater.checkForUpdatesAndNotify()
setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify()
}, 1000 * 60 * 60)

autoUpdater.signals.updateDownloaded(() => {
    mainWindowContainer?.mainWindow.webContents.send(Channel.UPDATE_APPLICATION_AVAILABLE)
})

let mainWindowContainer: MainWindowContainer | null

function createWindow() {
    mainWindowContainer = new MainWindowContainer()
    mainWindowContainer.mainWindow.on('closed', () => {
        mainWindowContainer = null
        TabsController.mainWindow = null
        TabsController.mainWindowContainer = null
    })
    mainWindowContainer.setup()
    if(!mainWindowContainer.browserView) {
        alert('Browser view creation error')
        return
    }
    TabsController.setupMain(mainWindowContainer.browserView)
    mainWindowContainer.setViewContentBounds(TabsController.currentTab())
    mainWindowContainer.start()
    require('@electron/remote/main').enable(mainWindowContainer.browserView.webContents)

    session.defaultSession.webRequest.onBeforeSendHeaders((details: OnBeforeSendHeadersListenerDetails, callback: (beforeSendResponse: BeforeSendResponse) => void) => {
        details.requestHeaders['User-Agent'] = ConfigService.getSettings().selectedUserAgentValue
        callback({
            cancel: false,
            requestHeaders: details.requestHeaders
        })
    })

    const filter = {
        urls: ['*://*.dwar.ru/*', '*://*.dwar.mail.ru/*']
    }

    session.defaultSession.webRequest.onResponseStarted(filter, (details: OnResponseStartedListenerDetails) => {
        if(details.url.includes('/user_info.php')) {
            const script = userInfoAchieventFix()
            details.webContents?.executeJavaScript(script)
            const script2 = ergamFix()
            details.webContents?.executeJavaScript(script2)
        }
        if(details.url.includes('/user.php?mode=skills')) {
            const script = eldivInfoFix()
            details.webContents?.executeJavaScript(script)
        }
    })

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        if(details.resourceType == 'script') {
            if(details.url.includes('cht.js')) {
                callback({
                    redirectURL: `file://${app.getAppPath()}/out/Scripts/cht.js`
                })
                return
            }
        }
        callback({})
    })

    TabsController.mainWindow = mainWindowContainer.mainWindow
    TabsController.mainWindowContainer = mainWindowContainer
    require('./ipcMainHandler')
}

app.on('ready', createWindow)

app.on('window-all-closed', function() {
    if(process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function() {
    if(mainWindowContainer === null) {
        createWindow()
    }
})
