import makeWASocket, { makeInMemoryStore, WAMessage, WAProto } from "@adiwajshing/baileys";

export interface onCommand {
    m?: ParsedMessage
    sock?: ReturnType<typeof makeWASocket>
    text?: string
    args?: string[]
    _args?: string[]
    store: ReturnType<typeof makeInMemoryStore> 
    command?: string
}

export type MessageTypes = keyof WAProto.IMessage
export type conn = ReturnType<typeof makeWASocket>
export interface Test {
    a: {
        contextInfo: { c: 2 }
    }
    b: {
        contextInfo: {
            b: 2
        }
    }
    c: ''
}

export interface ParsedMessage {
    m: WAMessage
    id?: WAMessage['key']['id']
    isBaileys?: Boolean
    chat?: WAMessage['key']['remoteJid']
    fromMe?: WAMessage['key']['fromMe']
    isGroup?: Boolean
    sender?: conn['user']['id']
    type?: MessageTypes
    msg?: WAMessage['message'][MessageTypes]
    quoted?: Omit<ParsedMessage, 'quoted'>
    mentionedJid?: string[]
    text?: string
    getQuotedObj?: () => ReturnType<ParserOptions['loadMessage']>
    getQuotedMessage?: () => ReturnType<ParserOptions['loadMessage']>
}

export interface ParserOptions {
    loadMessage?: (jid: string, id: string) => Promise<WAProto.WebMessageInfo> | null
    sendMessage?: conn['sendMessage']
}