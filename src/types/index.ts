import { makeInMemoryStore, WAMessage, WAProto, getDevice, downloadMediaMessage, AnyMessageContent, MiscMessageGenerationOptions, GroupMetadata, GroupParticipant, MessageUpsertType, WASocket } from '@adiwajshing/baileys'

import Connection from '../util/Connection'

export * from './TypedEventEmitter'

export type CreateFunction<T extends any[], R> = (...arg: T) => R
export type ExcludeFromTuple<T extends readonly any[], E> =
    T extends [infer F, ...infer R] ? [F] extends [E] ? ExcludeFromTuple<R, E> :
    [F, ...ExcludeFromTuple<R, E>] : []

export type First<T extends any[]> = T extends [infer I, ...infer _L] ? I : never
export type Last<T extends any[]> = T extends [...infer _I, infer L] ? L : never
// always never
// export type Head<T extends any[]> = T extends [...infer I, infer _L] ? I : never
export type Tail<T extends any[]> = T extends [infer _I, ...infer L] ? L : never
type BAC<T extends any[]> = [First<Tail<T>>, First<T>, ...Tail<Tail<T>>]

export type MessageTypes = keyof WAProto.IMessage
export type Permissions = 'developer' | 'owner' | 'group' | 'private' | 'admin' | 'bot_admin'

export declare interface onCommand {
    m?: ParsedMessage
    _m?: {
        messages: WAMessage[],
        type: MessageUpsertType
    }
    sock?: WASocket
    text?: string
    args?: string[]
    _args?: string[]
    store?: ReturnType<typeof makeInMemoryStore>
    command?: string
    conn?: Connection,
    groupMetadata: GroupMetadata,
    participants: GroupParticipant[]
    isAdmin: boolean
    isBotAdmin: boolean
    isOwner: boolean
    isDeveloper: boolean
}

export interface ParsedMessage {
    m: WAMessage
    id?: WAMessage['key']['id']
    sentSource?: ReturnType<typeof getDevice> | 'baileys' | 'old_baileys'
    chat?: WAMessage['key']['remoteJid']
    fromMe?: WAMessage['key']['fromMe']
    isGroup?: Boolean
    sender?: string
    type?: MessageTypes
    msg?: WAMessage['message'][MessageTypes]
    quoted?: ParsedQuotedMessage
    mentionedJid?: string[]
    text?: string
    timestamp: Date
    getQuotedObj?: () => ReturnType<ParserOptions['loadMessage']>
    getQuotedMessage?: () => ReturnType<ParserOptions['loadMessage']>
    reply?: (content: string | AnyMessageContent, jid?: string, options?: MiscMessageGenerationOptions) => ReturnType<ParserOptions['sendMessage']>
    download?: CreateFunction<Partial<Tail<Parameters<typeof downloadMediaMessage>>>, ReturnType<typeof downloadMediaMessage>>
    isCommand?: Boolean | Error
}

export interface ParsedQuotedMessage extends Omit<ParsedMessage, 'm' | 'quoted' | 'getQuotedObj' | 'getQuotedMessage' | 'timestamp'> {
    m?: WAProto.IMessage
    fakeObj?: WAMessage
}

export declare interface ParserOptions {
    loadMessage?: (jid: string, id: string) => Promise<WAProto.IWebMessageInfo> | null
    sendMessage?: WASocket['sendMessage']
}