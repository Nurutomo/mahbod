import { MessageUpdateType, WAMessage } from "@adiwajshing/baileys";
import MessageParser from "../util/MessageParser";
import type Connection from "../util/Connection";
import Plugins from "../util/PluginManager";
import { LegacyWASocket, onCommand } from "../types";
import Print from "../util/Print";

export default class Message {
    public static async onMessage(conn: Connection, _m: {
        messages: WAMessage[];
        type: MessageUpdateType;
    }) {
        let { sock, store } = conn
        let __m = _m.messages[0]

        let m = MessageParser(sock, __m, {
            loadMessage: (jid, id) => store.loadMessage(jid, id, sock as unknown as LegacyWASocket),
            sendMessage: sock.sendMessage
        })
        try {
            if (typeof m.text !== 'string') return

            let _err
            for (let pluginName in Plugins.plugins) {
                try {
                    let plugin = Plugins.plugins[pluginName]
                    if (plugin.disabled) continue

                    let [command, ...args] = m.text.trim().split(' ').filter(v => v)
                    args = args || []
                    let _args = m.text.trim().split(' ').slice(1)
                    let text = _args.join(' ')
                    command = (command || '').toLowerCase()

                    let isCommand = !plugin.command && plugin.command instanceof RegExp ? // RegExp Mode?
                        plugin.command.test(command) :
                        Array.isArray(plugin.command) ? // Array?
                            plugin.command.some(cmd => cmd instanceof RegExp ? // RegExp in Array?
                                cmd.test(command) :
                                cmd === command
                            ) :
                            typeof plugin.command === 'string' ? // String?
                                plugin.command === command :
                                false

                    if (!isCommand || m.sentSource.endsWith('baileys')) continue

                    await plugin.onCommand({
                        m,
                        _m,
                        sock,
                        text,
                        args,
                        _args,
                        store,
                        command,
                    } as onCommand)
                    m.isCommand = true
                } catch (e) {
                    m.isCommand = _err = e
                }
            }

            if (_err) console.error(_err)
        } catch (e) {

        } finally {
            if (m.sender) Print(m, conn)//console.log('<%s to %s> %s', m.sender, m.chat, m.text)
            else console.log(m)
        }
    }
}