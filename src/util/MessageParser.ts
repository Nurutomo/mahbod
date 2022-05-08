import { WAMessage } from "@adiwajshing/baileys"
import { MessageTypes, ParsedMessage, ParserOptions, AnyWASocket } from '../types'

function MessageParser(conn: AnyWASocket, m: WAMessage, options: ParserOptions = {}): ParsedMessage {
    let {
        loadMessage,
        sendMessage
    } = options

    // Basic Parse
    let parsed: ParsedMessage = {
        m,
        id: m.key?.id || '',
        chat: m.key?.remoteJid || '',
        fromMe: m.key?.fromMe || false
    }
    parsed.isBaileys = parsed.id.startsWith('3EB0') && parsed.id.length === 12
    parsed.isGroup = parsed.chat.endsWith('@g.us')
    parsed.sender = parsed.fromMe ? 'user' in conn ? conn.user.id : '' : m.participant ? m.participant : m.key?.participant ? m.key?.participant : parsed.chat

    // Content
    if (m.message) {
        parsed.type = Object.keys(m.message)[0] as MessageTypes
        parsed.msg = m.message[parsed.type]
        if (parsed.type === 'ephemeralMessage') {
            parsed = Object.assign(
                parsed,
                MessageParser(conn, parsed.msg as WAMessage, options),
                { parent: m }
            )
        }

        // Context Info
        if (typeof parsed.msg !== 'string' && 'contextInfo' in parsed.msg) {
            let quoted, q
            q = quoted = parsed.msg.contextInfo ? parsed.msg.contextInfo.quotedMessage as WAMessage : {}
            parsed.mentionedJid = parsed.msg.contextInfo ? parsed.msg.contextInfo.mentionedJid : []

            // Quote
            if (quoted) {
                parsed.quoted = { m: q }
                let type = Object.keys(quoted)[0]
                quoted = quoted[type]
                if (['productMessage'].includes(type)) {
                    type = Object.keys(quoted)[0]
                    quoted = quoted[type]
                }
                parsed.quoted.type = type as MessageTypes;
                parsed.quoted.id = parsed.msg.contextInfo?.stanzaId || ''
                parsed.quoted.chat = parsed.msg.contextInfo?.remoteJid || parsed.chat || ''
                parsed.quoted.isBaileys = parsed.quoted.id ? parsed.quoted.id.startsWith('3EB0') && parsed.quoted.id.length === 12 : false
                parsed.quoted.sender = parsed.msg.contextInfo?.participant || ''
                parsed.quoted.fromMe = parsed.quoted.sender === ('user' in conn && conn.user.id)
                parsed.quoted.msg = quoted
                if (typeof quoted !== 'string')
                    parsed.quoted.text = q.text || q.caption || ''
                else parsed.quoted.text = q
                if (typeof parsed.quoted.msg === 'object' && 'contextInfo' in parsed.quoted.msg)
                    parsed.quoted.mentionedJid = parsed.quoted.msg.contextInfo?.mentionedJid || []
                if (loadMessage) parsed.getQuotedObj = parsed.getQuotedMessage = () => {
                    if (parsed.quoted.id) return loadMessage(parsed.chat, parsed.quoted.id)
                }
                parsed.quoted.fakeObj = {
                    key: {
                      fromMe: parsed.quoted.fromMe,
                      remoteJid: parsed.quoted.chat,
                      id: parsed.quoted.id
                    },
                    message: q,
                    ...(parsed.isGroup ? { participant: parsed.quoted.sender } : {})
                } as WAMessage
                parsed.quoted.reply = (jid, content, options) => {
                    return sendMessage(jid, content, {
                        ...options,
                        quoted: parsed.quoted.fakeObj
                    })
                }
            }
        }
        parsed.text = (typeof parsed.msg === 'object' ? (parsed.type === 'listResponseMessage' && 'singleSelectReply' in parsed.msg ? parsed.msg.singleSelectReply.selectedRowId : ('text' in parsed.msg && parsed.msg.text) || ('caption' in parsed.msg && parsed.msg.caption)) : parsed.msg) || ''
    }

    parsed.reply = (jid, content, options) => {
        return sendMessage(jid, content, {
            ...options,
            quoted: m
        })
    }

    return parsed
}

export default MessageParser