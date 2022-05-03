import { makeInMemoryStore, WAMessage, WAProto } from "@adiwajshing/baileys";
import makeLegacySocket from "@adiwajshing/baileys/lib/LegacySocket";
import makeMDSocket from "@adiwajshing/baileys/lib/Socket";

export type CreateFunction<P extends any[], R> = (...P: P) => R

export type MessageTypes = keyof WAProto.IMessage
export type AnyWASocket = ReturnType<typeof makeMDSocket>
export type LegacyWASocket = ReturnType<typeof makeLegacySocket>

export interface onCommand {
    m?: ParsedMessage
    sock?: AnyWASocket
    text?: string
    args?: string[]
    _args?: string[]
    store: ReturnType<typeof makeInMemoryStore>
    command?: string
}

export interface ParsedMessage {
    m: WAMessage
    id?: WAMessage['key']['id']
    isBaileys?: Boolean
    chat?: WAMessage['key']['remoteJid']
    fromMe?: WAMessage['key']['fromMe']
    isGroup?: Boolean
    sender?: string
    type?: MessageTypes
    msg?: WAMessage['message'][MessageTypes]
    quoted?: ParsedQuotedMessage
    mentionedJid?: string[]
    text?: string
    getQuotedObj?: () => ReturnType<ParserOptions['loadMessage']>
    getQuotedMessage?: () => ReturnType<ParserOptions['loadMessage']>
    reply?: CreateFunction<Parameters<ParserOptions['sendMessage']>, ReturnType<ParserOptions['sendMessage']>>
}

export interface ParsedQuotedMessage extends Omit<ParsedMessage, 'quoted' | 'getQuotedObj' | 'getQuotedMessage'> {
    fakeObj?: WAMessage
}

export interface ParserOptions {
    loadMessage?: (jid: string, id: string) => Promise<WAProto.IWebMessageInfo> | null
    sendMessage?: AnyWASocket['sendMessage']
}