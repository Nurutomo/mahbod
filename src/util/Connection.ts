import makeWASocket, { DisconnectReason, makeInMemoryStore, useSingleFileAuthState } from '@adiwajshing/baileys'
import { Message } from '../listeners'
import { join } from 'path'
import pino from 'pino'
import { AnyWASocket } from '../types'
import { existsSync, mkdirSync, PathLike, readFileSync, unlinkSync } from 'fs'
import Helper from './Helper'
import db from './Database'
import { JSONFile } from './lowdb'

const Logger = pino({ transport: { target: 'pino-pretty' }, prettyPrint: { levelFirst: true, ignore: 'hostname', translateTime: true } })
export default class Connection {
    static isModule: boolean = true
    
    sock: AnyWASocket
    store: ReturnType<typeof makeInMemoryStore>
    storePath: PathLike
    name: string
    storeFolder: PathLike
    hosts: string[] = []
    owners: string[] = []

    constructor(name: string = 'session') {
        this.name = name
        
        this.storeFolder = Connection.isModule ? './database' : join(__dirname, '../../database')
        if (!existsSync(this.storeFolder)) mkdirSync(this.storeFolder, { recursive: true })
        db.setAdapter(new JSONFile(join(this.storeFolder, `${this.name}.db.json`)))
        this.storePath = join(this.storeFolder, `${this.name}.db.store.json`)
        this.store = makeInMemoryStore({})
        this.store.readFromFile(this.storePath)

        setInterval(() => {
            this.store.writeToFile(this.storePath.toString())
        }, 10_000)

        setInterval(() => {
            db.low.write().catch(console.error)
        }, 60000)
    }



    start() {
        const sessionFolder = Connection.isModule ? './sessions' : join(__dirname, '../../sessions')
        if (!existsSync(sessionFolder)) mkdirSync(sessionFolder, { recursive: true })
        const sessionPath = join(sessionFolder, `${this.name}.json`)
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

        Helper(sock)

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