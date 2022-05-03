import makeWASocket, { DisconnectReason, makeInMemoryStore, useSingleFileAuthState } from '@adiwajshing/baileys'
import { Message } from '../listeners'
import { join } from 'path'
import pino from 'pino'
import { AnyWASocket } from '../types'
import { existsSync, readFileSync, unlinkSync } from 'fs'

const Logger = pino({ transport: { target: 'pino-pretty' }, prettyPrint: { levelFirst: true, ignore: 'hostname', translateTime: true } })
export default class Connection {
    sock: AnyWASocket
    store: ReturnType<typeof makeInMemoryStore>
    storePath: string
    name: string

    constructor(name: string = 'session') {
        this.name = name

        this.storePath = join(__dirname, `../../database/${this.name}.db.store.json`)
        this.store = makeInMemoryStore({})
        this.store.readFromFile(this.storePath)

        setInterval(() => {
            this.store.writeToFile(this.storePath)
        }, 10_000)
    }



    start() {
        const sessionPath = join(__dirname, `../../sessions/${this.name}.json`)
        try {
            if (existsSync(sessionPath)) JSON.parse(readFileSync(sessionPath, 'utf8'))
        } catch (e) {
            console.error('Session data isn\'t valid')
            console.error(e)
            unlinkSync(sessionPath)
        }
        const { state, saveState } = useSingleFileAuthState(sessionPath)

        let store = this.store
        let sock = this.sock = makeWASocket({
            // can provide additional config here
            auth: state,
            logger: Logger.child({ class: this.name }),
            printQRInTerminal: true,

            getMessage(key) {
                return store.loadMessage(key.remoteJid, key.id, sock).then(m => m.message)
            }
        })

        this.store.bind(this.sock.ev)

        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                // @ts-ignore
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
                console.log('- connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
                // reconnect if not logged out
                if (shouldReconnect) {
                    this.start()
                }
            } else if (connection === 'open') {
                console.log('- opened connection -')
            }
        })

        this.sock.ev.on('messages.upsert', m => {
            Message.onMessage(this, m)
        })

        this.sock.ev.on('creds.update', saveState)
    }
}