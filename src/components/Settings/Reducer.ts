import { app } from '@electron/remote'
import ConfigService from '../../services/ConfigService'
import { SettingsWindowActions } from './Actions'
import { Elements } from './Elements'
import { SettingsWindowState, UserAgentType } from './SettingsWindowState'

export default function reduce(state: SettingsWindowState, action: SettingsWindowActions, data: unknown): SettingsWindowState {
    switch (action) {
        case SettingsWindowActions.LOAD_SETTINGS: {
            const loadedSettings = ConfigService.getSettings()
            if(Object.keys(loadedSettings).length == 0) {
                return state
            } else {
                return {
                    ...state,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    selectedUserAgentType: UserAgentType[Object.keys(UserAgentType)[Object.values(UserAgentType).indexOf(loadedSettings.selectedUserAgentType)]],
                    selectedUserAgentValue: loadedSettings.selectedUserAgentValue,
                    userAgentTextFieldActive: loadedSettings.selectedUserAgentType == UserAgentType.OWN,
                    windowOpenNewTab: loadedSettings.windowOpenNewTab,
                    windowsAboveApp: loadedSettings.windowsAboveApp,
                    hideTopPanelInFullScreen: loadedSettings.hideTopPanelInFullScreen,
                    animationSpeedType: loadedSettings.animationSpeedType,
                    mailServer: loadedSettings.mailServer,
                    maximizeOnStart: loadedSettings.maximizeOnStart,
                    screenshotsFolderPath: app.getPath('userData') + '/screens',
                    ownServer: loadedSettings.ownServer ?? '',
                    fightNotificationsSystem: loadedSettings.fightNotificationsSystem,
                    fightNotificationsIngame: loadedSettings.fightNotificationsIngame,
                    battlegroundNotificationsSystem: loadedSettings.battlegroundNotificationsSystem,
                    battlegroundNotificationsIngame: loadedSettings.battlegroundNotificationsIngame,
                    messageNotificationsSystem: loadedSettings.messageNotificationsSystem,
                    messageNotificationsIngame: loadedSettings.messageNotificationsIngame,
                    mailNotificationsSystem: loadedSettings.mailNotificationsSystem,
                    mailNotificationsIngame: loadedSettings.mailNotificationsIngame,
                    updateChannel: loadedSettings.updateChannel
                }
            }
        }
        case SettingsWindowActions.SAVE_SETTINGS: {
            const savedSettings = Object.assign({}, state)
            delete savedSettings.userAgents
            delete savedSettings.userAgentTextFieldActive
            savedSettings.selectedUserAgentValue = Elements.userAgentTextInput().value
            savedSettings.ownServer = Elements.ownServerInput().value
            if(savedSettings.selectedUserAgentValue.length == 0) {
                alert('User-Agent не может быть пустым')
                return state
            }
            ConfigService.writeData('settings', JSON.stringify(savedSettings))
            if(confirm('Для того что бы настройки вступили в силу, необходимо перезапустить клиент!')) {
                app.relaunch()
                app.quit()
            }
            return {
                ...state,
                selectedUserAgentValue: savedSettings.selectedUserAgentValue
            }
        }
        case SettingsWindowActions.CHANGE_USER_AGENT: {
            const newValue = Elements.userAgentsSelect().value
            let userAgentType = UserAgentType[newValue as keyof typeof UserAgentType]
            let userAgentValue = userAgentType.toString()
            if(UserAgentType[newValue as keyof typeof UserAgentType].toString() == UserAgentType.OWN.toString()) {
                userAgentType = UserAgentType.OWN
                userAgentValue = ''
            }
            return {
                ...state,
                selectedUserAgentType: userAgentType,
                selectedUserAgentValue: userAgentValue,
                userAgentTextFieldActive: userAgentType == UserAgentType.OWN
            }
        }
        case SettingsWindowActions.CHANGE_WINDOW_OPEN_NEW_TAB:
            return {
                ...state,
                windowOpenNewTab: Elements.windowOpenNewTabInput().checked
            }
        case SettingsWindowActions.CHANGE_WINDOWS_ABOVE_APP:
            return {
                ...state,
                windowsAboveApp: Elements.windowsAboveAppInput().checked
            }
        case SettingsWindowActions.CHANGE_MAXIMIZE_ON_START:
            return {
                ...state,
                maximizeOnStart: Elements.maximizeOnStartInput().checked
            }
        case SettingsWindowActions.CHANGE_HIDE_TOP_PANEL_IN_FULL_SCREEN:
            return {
                ...state,
                hideTopPanelInFullScreen: Elements.hideTopPanelInFullScreenInput().checked
            }
        case SettingsWindowActions.CHANGE_ANIMATION_SPEED_TYPE:
            return {
                ...state,
                animationSpeedType: data as string
            }
        case SettingsWindowActions.CHANGE_MAIL_SERVER:
            return {
                ...state,
                mailServer: Elements.mailServerInput().checked
            }
        case SettingsWindowActions.CHANGE_UPDATE_CHANNEL:
            return {
                ...state,
                updateChannel: data as string
            }
    }
}
