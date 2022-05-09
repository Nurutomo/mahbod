import { AnyMessageContent, generateForwardMessageContent, generateWAMessageFromContent, getContentType, MessageGenerationOptionsFromContent, MessageType, MiscMessageGenerationOptions, normalizeMessageContent, WAProto } from '@adiwajshing/baileys'
import { AnyWASocket } from '../types'

export default function Helper(sock: AnyWASocket) {
    return Object.defineProperties(sock, {
        reply: {
            value(this: AnyWASocket, jid: string, msg: AnyMessageContent, quoted: WAProto.WebMessageInfo, options?: MiscMessageGenerationOptions) {
                return this.sendMessage(jid, msg, {
                    ...options,
                    quoted
                })
            }
        },
        forwardCopy: {
            async value(this: AnyWASocket, jid: string, message: WAProto.IWebMessageInfo, forceForward = false, options: MiscMessageGenerationOptions = {}) {
                const userJid = this.authState.creds.me!.id

                let content = normalizeMessageContent(message.message)
                content = WAProto.Message.decode(WAProto.Message.encode(content).finish())

                let key = Object.keys(content)[0] as MessageType

                let score = content[key].contextInfo?.forwardingScore || 0
                score += message.key.fromMe && !forceForward ? 0 : 1

                let oldContext = {}
                if (key === 'conversation') {
                    content.extendedTextMessage = { text: content[key] }
                    delete content.conversation

                    key = 'extendedTextMessage'
                } else oldContext = content[key].contextInfo

                if (score > 0) {
                    content[key].contextInfo = { ...oldContext, forwardingScore: score, isForwarded: true }
                } else {
                    content[key].contextInfo = oldContext
                }

                const fullMsg = generateWAMessageFromContent(
                    jid,
                    content,
                    {
                        userJid,
                        ...options
                    }
                )

                await this.relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id! })

                return fullMsg
            }
        }
    })
}

function prepareMessageFromContent(jid: string, content: WAProto.IMessage, arg2: any) {
    throw new Error('Function not implemented.')
}
