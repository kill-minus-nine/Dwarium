/* eslint-disable @typescript-eslint/ban-ts-comment */
import { app, powerMonitor, globalShortcut } from '@electron/remote'
import fs from 'fs'
import path from 'path'
import ConfigService from './ConfigService'
import ChatSettingsService from './ChatSettingsService'
import { ipcRenderer } from 'electron'
import { Channel } from '../Models/Channel'
import { ChatSettingsConfig } from '../Models/ChatSettingsConfig'
import { ChatMessage } from './Notifications'

const logsFolderPath = path.join(app.getPath('userData'), 'logs')
const filePath = path.join(logsFolderPath, 'chat.log')

if(!fs.existsSync(logsFolderPath)) {
    fs.mkdirSync(logsFolderPath)
    fs.openSync(filePath, 'w')
} else if(!fs.existsSync(filePath)) {
    fs.openSync(filePath, 'w')
}

enum ChatChannel {
    PRIVATE = 2,
    COMMON = 4096,
    TRADE = 8,
    GROUP = 16,
    CLAN = 4,
    ALLIANCE = 64
}

type QueueChatMessage = {
    channel: ChatChannel
    text: string
}

const logStream = fs.createWriteStream(filePath, {
    flags: 'a'
})
let isIdle = false
const messagesQueue: QueueChatMessage[] = []

let config: ChatSettingsConfig
async function loadConfig() {
    const userId = (await ipcRenderer.invoke(Channel.GET_ID)) as number
    if(userId) {
        config = ChatSettingsService.get(userId)
    }
}

function convertToMs(minutes: number): number {
    return minutes * 60 * 1000
}

let commonChatFloodingInterval: NodeJS.Timer | undefined
let tradeChatFloodingInterval: NodeJS.Timer | undefined
let groupChatFloodingInterval: NodeJS.Timer | undefined
let clanChatFloodingInterval: NodeJS.Timer | undefined
let allianceChatFloodingInterval: NodeJS.Timer | undefined

async function setupFlooding() {
    await loadConfig()
    if(config) {
        if(!config.floodingEnabled) {
            return
        }
        const commonChatFloodingMessage = config.commonChatFloodingMessage
        const tradeChatFloodingMessage = config.tradeChatFloodingMessage
        const groupChatFloodingMessage = config.groupChatFloodingMessage
        const clanChatFloodingMessage = config.clanChatFloodingMessage
        const allianceChatFloodingMessage = config.clanChatFloodingMessage
        if(commonChatFloodingMessage.length != 0) {
            commonChatFloodingInterval = setInterval(() => {
                const newQueueMessage: QueueChatMessage = {
                    text: commonChatFloodingMessage,
                    channel: ChatChannel.COMMON
                }
                messagesQueue.push(newQueueMessage)
            }, convertToMs(config.commonChatFloodingTimer))
        }
        if(tradeChatFloodingMessage.length != 0) {
            tradeChatFloodingInterval = setInterval(() => {
                const newQueueMessage: QueueChatMessage = {
                    text: tradeChatFloodingMessage,
                    channel: ChatChannel.TRADE
                }
                messagesQueue.push(newQueueMessage)
            }, convertToMs(config.tradeChatFloodingTimer))
        }
        if(groupChatFloodingMessage.length != 0) {
            groupChatFloodingInterval = setInterval(() => {
                const newQueueMessage: QueueChatMessage = {
                    text: groupChatFloodingMessage,
                    channel: ChatChannel.GROUP
                }
                messagesQueue.push(newQueueMessage)
            }, convertToMs(config.groupChatFloodingTimer))
        }
        if(clanChatFloodingMessage.length != 0) {
            clanChatFloodingInterval = setInterval(() => {
                const newQueueMessage: QueueChatMessage = {
                    text: clanChatFloodingMessage,
                    channel: ChatChannel.CLAN
                }
                messagesQueue.push(newQueueMessage)
            }, convertToMs(config.clanChatFloodingTimer))
        }
        if(allianceChatFloodingMessage.length != 0) {
            allianceChatFloodingInterval = setInterval(() => {
                const newQueueMessage: QueueChatMessage = {
                    text: allianceChatFloodingMessage,
                    channel: ChatChannel.ALLIANCE
                }
                messagesQueue.push(newQueueMessage)
            }, convertToMs(config.allianceChatFloodingTimer))
        }
    }
}

function restartFlooding() {
    if(commonChatFloodingInterval) {
        clearInterval(commonChatFloodingInterval)
        commonChatFloodingInterval = undefined
    }
    if(tradeChatFloodingInterval) {
        clearInterval(tradeChatFloodingInterval)
        tradeChatFloodingInterval = undefined
    }
    if(groupChatFloodingInterval) {
        clearInterval(groupChatFloodingInterval)
        groupChatFloodingInterval = undefined
    }
    if(clanChatFloodingInterval) {
        clearInterval(clanChatFloodingInterval)
        clanChatFloodingInterval = undefined
    }
    if(allianceChatFloodingInterval) {
        clearInterval(allianceChatFloodingInterval)
        allianceChatFloodingInterval = undefined
    }
    setupFlooding()
}

function setupAutoResponder() {
    setInterval(async() => {
        if(!config) {
            await loadConfig()
        } else {
            const idleTime = powerMonitor.getSystemIdleTime()
            isIdle = idleTime >= config.inactiveTimer * 60
        }
    }, 1000)
    setInterval(async function() {
        const message = messagesQueue[0]
        if(message) {
            // @ts-ignore
            const crc = top[1].CHAT.session_crc
            const req = await fetch(`${ConfigService.baseUrl()}/entry_point.php?object=chat&action=send&json_mode_on=1`, {
                headers: {
                    accept: 'application/json, text/javascript, */*; q=0.01',
                    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'x-requested-with': 'XMLHttpRequest'
                },
                referrer: `${ConfigService.baseUrl()}/cht.php`,
                referrerPolicy: 'no-referrer-when-downgrade',
                body: encodeURI(`json_mode_on=1&object=chat&action=send&msg_text=${message.text}&channel_talk=${message.channel}&crc=${crc}`),
                method: 'POST',
                mode: 'cors',
                credentials: 'include'
            })
            const json = await req.json()
            const error = json['chat|send'].error
            if(!error) {
                messagesQueue.shift()
            } else {
                if(error == 'Вы не можете говорить, т.к. на Вас наложено проклятие молчания!') {
                    messagesQueue.shift()
                }
            }
        }
    }, 1000)
}

function getAutoResponceForChannel(channel: ChatChannel) {
    switch (channel) {
        case ChatChannel.PRIVATE:
            return config.privateChatResponse
        case ChatChannel.COMMON:
            return config.commonChatResponse
        case ChatChannel.TRADE:
            return config.tradeChatResponse
        case ChatChannel.GROUP:
            return config.groupChatResponse
        case ChatChannel.CLAN:
            return config.clanChatResponse
        case ChatChannel.ALLIANCE:
            return config.allianceChatResponse
    }
}

const prevReceivers: Set<string>[] = []

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleMessage(message: any) {
    const chatMessage = message as ChatMessage
    if(chatMessage) {
        // @ts-ignore
        const nickname = top[0]?.canvas?.app?.avatar?.model?.login ?? ''
        if(chatMessage.to_user_nicks != undefined) {
            let toUserNicks = Object.values(chatMessage.to_user_nicks)
            const index = toUserNicks.indexOf(nickname)
            if(index != -1) {
                delete toUserNicks[index]
            } else {
                return
            }
            toUserNicks = toUserNicks.filter((a) => a)
            toUserNicks.push(chatMessage.user_nick ?? '')
            if(config.autoResponderEnabled && isIdle && toUserNicks.length > 0) {
                if(chatMessage.user_nick == nickname && toUserNicks.length == 1) {
                    return
                }
                const channel = chatMessage.channel
                const autoResponse = getAutoResponceForChannel(channel)
                if(autoResponse.length != 0) {
                    const newReceiversSet = new Set(toUserNicks)
                    let exists = false
                    const filteredPrevReceivers = prevReceivers.filter((res) => res.size == newReceiversSet.size)
                    for(const newReceiver of newReceiversSet) {
                        for(const receivers of filteredPrevReceivers) {
                            if(receivers.has(newReceiver)) {
                                exists = true
                                continue
                            } else {
                                exists = false
                                break
                            }
                        }
                    }
                    if(exists) {
                        return
                    }
                    prevReceivers.push(newReceiversSet)
                    setTimeout(() => {
                        const index = prevReceivers.indexOf(newReceiversSet)
                        if(index != -1) {
                            delete prevReceivers[index]
                        }
                    }, 10000)
                    const usersNeedToAnswer = toUserNicks.map((nick) => `${channel == 2 ? 'prv[' : 'to['}${nick}]`).join(' ')
                    const answerText = `${usersNeedToAnswer} ${autoResponse}`
                    const newQueueMessage: QueueChatMessage = {
                        text: answerText,
                        channel: channel
                    }
                    messagesQueue.push(newQueueMessage)
                }
            }
        }
    }
}

let chatHidden = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logMessage(message: any) {
    const node = $(message).get()[0].cloneNode(true) as HTMLElement
    node.removeAttribute('original-msg-object')
    node.querySelectorAll('*').forEach((elem) => {
        elem.removeAttribute('oncontextmenu')
        elem.removeAttribute('onmousedown')
        elem.removeAttribute('onclick')
        elem.removeAttribute('href')
    })
    let html = node.outerHTML
    html = html.replaceAll('src="images/', `src="${ConfigService.baseUrl()}/images/`).replaceAll('src="/images/', `src="${ConfigService.baseUrl()}/images/`)
    html = html.replaceAll('href="/artifact_info.php', `href="${ConfigService.baseUrl()}/artifact_info.php`)
    logStream.write(html + '\n', (error) => {
        if(error) {
            console.log(error)
            alert('Произошла ошибка, при записи в лог! Напишите в группу!' + error.message)
        }
    })
}

function setupShortcut() {
    globalShortcut.unregister('F7')
    globalShortcut.register('F7', () => {
        if(chatHidden) {
            // @ts-ignore
            _top().gebi('chat_TD').height = '30%'
            // @ts-ignore
            _top().gebi('main_frame_TD').height = '70%'
            // @ts-ignore
            _top().gebi('chat_TD').style.display = 'block'
            // @ts-ignore
            _top().gebi('chat_TD').style.display = ''
            // @ts-ignore
        } else {
            // @ts-ignore
            _top().gebi('chat_TD').height = '0%'
            // @ts-ignore
            _top().gebi('main_frame_TD').height = '100%'
            // @ts-ignore
            _top().gebi('chat_TD').style.display = 'none'
        }
        chatHidden = !chatHidden
    })
}

ipcRenderer.on(Channel.CHAT_SETTINGS_CHANGED, async() => {
    await loadConfig()
    restartFlooding()
})

export default {
    handleMessage,
    logMessage,
    setupShortcut,
    setupAutoResponder,
    setupFlooding
}
