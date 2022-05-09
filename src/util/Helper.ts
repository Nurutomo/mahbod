import { AnyMessageContent, generateForwardMessageContent, generateWAMessageFromContent, getContentType, MiscMessageGenerationOptions, normalizeMessageContent, WAProto } from '@adiwajshing/baileys'
import { AnyWASocket } from '../types'

export default function Helper(sock: AnyWASocket) {
    Object.defineProperties(sock, {
        reply: {
            value(this: AnyWASocket, jid: string, msg: AnyMessageContent, quoted: WAProto.WebMessageInfo, options?: MiscMessageGenerationOptions) {
                return this.sendMessage(jid, msg, {
                    ...options,
                    quoted
                })
            }
        },
        forwardCopy: {
            async value(this: AnyWASocket, jid: string, message: WAProto.IWebMessageInfo, forceForward = false, options: MiscMessageGenerationOptions & {
                readViewOnce?: boolean
                contextInfo?: WAProto.ContextInfo
            } = {}) {
                const userJid = this.authState.creds.me!.id

                const mtype = getContentType(message.message)
                const mmsg = normalizeMessageContent(message.message)[mtype]
                const content = generateForwardMessageContent(message, forceForward)
                const ctype = getContentType(content)
                const msg = content[ctype]
                
                let context = {}
                if (typeof mmsg === 'object' && 'contextInfo' in mmsg) context = mmsg.contextInfo
                if (typeof msg === 'object' && 'contextInfo' in msg) msg.contextInfo = {
                  ...context,
                  ...msg.contextInfo,
                  ...options.contextInfo
                }

                const fullMsg = await generateWAMessageFromContent(
					jid,
					content,
					{
						userJid,
						...options,
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
