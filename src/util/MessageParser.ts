import { downloadMediaMessage, extractMessageContent, getContentType, getDevice, WAMessage, WAProto, areJidsSameUser, isJidGroup } from '@adiwajshing/baileys'
import { ParsedMessage, ParserOptions, AnyWASocket } from '../types'
import Connection from './Connection'

function MessageParser(conn: AnyWASocket, m: WAMessage, options: ParserOptions = {}): ParsedMessage {
    const {
        loadMessage,
        sendMessage
    } = options
    const userJid = conn.authState.creds.me!.id

    // Basic Parse
    let parsed: ParsedMessage = {
        m,
        id: m.key?.id || '',
        chat: m.key?.remoteJid || '',
        fromMe: m.key?.fromMe || false,
        timestamp: new Date((typeof m.messageTimestamp == 'object' && 'low' in m.messageTimestamp ? m.messageTimestamp.low : m.messageTimestamp)* 1000)
    }
    if (parsed.id.startsWith('3EB0') && parsed.id.length === 12) parsed.sentSource = 'old_baileys'
    else if (parsed.id.startsWith('BAE5') && parsed.id.length === 16) parsed.sentSource = 'baileys'
    else parsed.sentSource = getDevice(parsed.id)
    parsed.isGroup = isJidGroup(parsed.chat)
    parsed.sender = parsed.fromMe ? userJid : m.participant ? m.participant : m.key?.participant ? m.key?.participant : parsed.chat

    // Content
    if (m.message) {
        parsed.type = getContentType(m.message)
        parsed.msg = extractMessageContent(m.message)[parsed.type]
        // Context Info
        if (parsed.msg) {
            if (typeof parsed.msg === 'object') {
                if ('contextInfo' in parsed.msg) {
                    const q: WAProto.IMessage | {} = parsed.msg.contextInfo ? parsed.msg.contextInfo.quotedMessage as WAMessage : {}
                    parsed.mentionedJid = parsed.msg.contextInfo ? parsed.msg.contextInfo.mentionedJid : []

                    // Quote
                    if (q) {
                        const type: keyof WAProto.IMessage = getContentType(q)
                        const quoted = extractMessageContent(q)[type]
                        parsed.quoted = {
                            m: q,
                            type,
                            id: parsed.msg.contextInfo?.stanzaId || '',
                            chat: parsed.msg.contextInfo?.remoteJid || parsed.chat || '',
                            sender: parsed.msg.contextInfo?.participant
                        }
                        parsed.isGroup = isJidGroup(parsed.quoted.chat)
                        if (parsed.quoted.id.startsWith('3EB0') && parsed.quoted.id.length === 12) parsed.quoted.sentSource = 'old_baileys'
                        else if (parsed.quoted.id.startsWith('BAE5') && parsed.quoted.id.length === 16) parsed.quoted.sentSource = 'baileys'
                        else parsed.quoted.sentSource = getDevice(parsed.quoted.id)
                        parsed.quoted.fromMe = areJidsSameUser(parsed.quoted.sender, userJid)
                        parsed.quoted.msg = quoted
                        typeof parsed.msg === 'object' ? 'listResponseMessage' && 'singleSelectReply' in parsed.msg ?
                            parsed.msg.singleSelectReply.selectedRowId :
                            ('text' in parsed.msg && parsed.msg.text)
                            || ('caption' in parsed.msg && parsed.msg.caption)
                            : parsed.msg
                        if (parsed.quoted.msg && typeof parsed.quoted.msg === 'object' && 'contextInfo' in parsed.quoted.msg)
                            parsed.quoted.mentionedJid = parsed.quoted.msg.contextInfo?.mentionedJid || []
                        if (loadMessage && parsed.quoted.id) parsed.getQuotedObj = parsed.getQuotedMessage = () => loadMessage(parsed.chat, parsed.quoted.id)
                        parsed.quoted.fakeObj = {
                            key: {
                                fromMe: parsed.quoted.fromMe,
                                remoteJid: parsed.quoted.chat,
                                id: parsed.quoted.id
                            },
                            message: q,
                            ...(parsed.isGroup ? { participant: parsed.quoted.sender } : {})
                        } as WAMessage
                        parsed.quoted.reply = (content, jid = parsed.quoted.chat, options) => {
                            return sendMessage(jid, typeof content === 'string' ? { text: content } : content, {
                                ...options,
                                quoted: parsed.quoted.fakeObj
                            })
                        }
                        parsed.quoted.download = (type = 'buffer', options) => {
                            return downloadMediaMessage(parsed.quoted.fakeObj, type, options, {
                                logger: Connection.Logger.child({ class: 'Download' }),
                                reuploadRequest: conn.updateMediaMessage
                            })
                        }
                    }
                }
                parsed.text = 'singleSelectReply' in parsed.msg ?
                    parsed.msg.singleSelectReply.selectedRowId :
                    ('text' in parsed.msg && parsed.msg.text)
                    || ('caption' in parsed.msg && parsed.msg.caption)
            } else if (typeof parsed.msg === 'string') {
                parsed.text = parsed.msg
            }
        }
    }

    parsed.reply = (content, jid = parsed.chat, options?) => {
        return sendMessage(jid, typeof content === 'string' ? { text: content } : content, {
            ...options,
            quoted: m
        })
    }
    parsed.download = (type = 'buffer', options) => {
        return downloadMediaMessage(m, type, options, {
            logger: Connection.Logger.child({ class: 'Download' }),
            reuploadRequest: conn.updateMediaMessage
        })
    }
    return parsed
}

export default MessageParser