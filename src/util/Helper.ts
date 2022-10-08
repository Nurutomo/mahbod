import { AnyMessageContent, Chat, Contact, generateWAMessageFromContent, MessageType, MiscMessageGenerationOptions, normalizeMessageContent, WAProto } from '@adiwajshing/baileys'
import { parsePhoneNumber } from 'awesome-phonenumber'
import { AnyWASocket } from '../types'
import Connection from './Connection'

interface Helper extends AnyWASocket {
  reply: (jid: string, msg: AnyMessageContent, quoted: WAProto.WebMessageInfo, options?: MiscMessageGenerationOptions) => ReturnType<AnyWASocket['sendMessage']>
  forwardCopy: (jid: string, message: WAProto.IWebMessageInfo, forceForward: Boolean, options: MiscMessageGenerationOptions) => Promise<WAProto.WebMessageInfo>
  getName: (jid: string) => string
}

export default function Helper(sock: AnyWASocket, store: Connection['store'], _withoutContact = true): Helper {
  return {
    ...sock,
    reply(jid: string, msg: AnyMessageContent, quoted: WAProto.WebMessageInfo, options?: MiscMessageGenerationOptions) {
      return sock.sendMessage(jid, msg, {
        ...options,
        quoted
      })
    },
    async forwardCopy(jid: string, message: WAProto.IWebMessageInfo, forceForward = false, options: MiscMessageGenerationOptions = {}) {
      const userJid = sock.authState.creds.me!.id

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

      await sock.relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id! })

      return fullMsg
    },
    getName(id: string, withoutContact = true) {
      withoutContact &&= _withoutContact
      let chat: Chat
      let v: Contact | Chat | {
        vname?: string
      } = id.endsWith('@g.us') ? (chat = store.chats.get(id)) || { id } : id === '0@s.whatsapp.net' ? {
        id,
        vname: 'WhatsApp',
        notify: 'WhatsApp'
      } : id === sock.authState.creds.me!.id ?
        sock.authState.creds.me :
        store.contacts[id] || {}
      return (withoutContact && !id.endsWith('@g.us') ? '' : 'name' in v && v.name) || ('vname' in v && v.vname) || ('notify' in v && v.notify) || parsePhoneNumber('+' + id.replace(/(:.+)?@s\.whatsapp\.net/, '')).getNumber('international')
    }
  }
}
