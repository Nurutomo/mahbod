import makeWASocket, { DisconnectReason, makeInMemoryStore, useMultiFileAuthState } from '@adiwajshing/baileys'
import { Message } from '../listeners'
import { join } from 'path'
import pino from 'pino'
import { existsSync, mkdirSync, PathLike, readFileSync, rmSync, unlinkSync } from 'fs'
import Helper from './Helper'
import db from './Database'
import { JSONFile } from '@commonify/lowdb'
import Print from './Print'
import PermissionHandler from './PermissionHandler'

const Logger = pino({ transport: { target: 'pino-pretty' }, prettyPrint: { levelFirst: true, ignore: 'hostname', translateTime: true } })
export default class Connection {
    static isModule: boolean = true
    static Logger = Logger
    
    sock: ReturnType<typeof Helper>
    store: ReturnType<typeof makeInMemoryStore>
    storePath: PathLike
    name: string
    storeFolder: PathLike
    hosts: string[] = []
    owners: string[] = []
    print: typeof Print
    permissionHandler = PermissionHandler(_jid => '')

    constructor(name: string = 'creds', print = Print) {
        this.name = name
        this.print = print
        
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



    async start() {
        const sessionFolder = Connection.isModule ? './sessions' : join(__dirname, '../../sessions')
        if (!existsSync(sessionFolder)) mkdirSync(sessionFolder, { recursive: true })
        const sessionFolderPath = join(sessionFolder, this.name)
        const sessionPath = join(sessionFolderPath, 'creds.json')
        try {
            if (existsSync(sessionPath)) JSON.parse(readFileSync(sessionPath, 'utf8'))
        } catch (e) {
            console.error('Session data isn\'t valid')
            console.error(e)
            rmSync(sessionFolderPath, { recursive: true, force: true })
        }
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolderPath)

        let store = this.store
        let sock = this.sock = makeWASocket({
            // can provide additional config here
            auth: state,
            logger: Logger.child({ class: this.name }),
            printQRInTerminal: true,

            getMessage(key) {
                return store.loadMessage(key.remoteJid, key.id).then(m => m.message)
            }
        }) as ReturnType<typeof Helper>

        sock = this.sock = Helper(this.sock, this.store, false)

        this.store.bind(this.sock.ev)

        this.sock.ev.on('connection.update', update => {
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

        this.sock.ev.on('creds.update', saveCreds)
    }
}