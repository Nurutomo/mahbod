import makeWASocket, { DisconnectReason, makeInMemoryStore, useSingleFileAuthState } from '@adiwajshing/baileys'
import { Message } from '../listeners'
import { join } from 'path'
import pino from 'pino'

const Logger = pino({ transport: { target: 'pino-pretty' }, prettyPrint: { levelFirst: true, ignore: 'hostname', translateTime: true } })
export default class Connection {
    sock: ReturnType<typeof makeWASocket>
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
        const { state, saveState } = useSingleFileAuthState(join(__dirname, `../../sessions/${this.name}.json`))

        let store = this.store
        this.sock = makeWASocket({
            // can provide additional config here
            auth: state,
            logger: Logger.child({ class: this.name }),
            printQRInTerminal: true,

            getMessage(key) {
                let r
                for (let jid in store.messages) {
                    let a = store.messages[jid].get(key.id)
                    if (a) r = a
                }
                return r
                return Promise.resolve(store.messages[key.remoteJid].get(key.id).message)
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