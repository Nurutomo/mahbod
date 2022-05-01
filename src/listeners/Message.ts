import { MessageUpdateType, WAMessage } from "@adiwajshing/baileys";
import MessageParser from "../util/MessageParser";
import type Connection from "../util/Connection";
import Plugins from "../util/PluginManager";
import { onCommand } from "../types";

export default class Message {
    public static async onMessage({ sock, store }: Connection, _m: {
        messages: WAMessage[];
        type: MessageUpdateType;
    }) {
        let __m = _m.messages[0]

        let m = MessageParser(sock, __m)

        console.log('<%s to %s> %s', m.sender, m.chat, m.text)
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

                if (!isCommand || m.isBaileys) continue

                await plugin.onCommand({
                    m,
                    sock,
                    text,
                    args,
                    _args,
                    store,
                    command,
                } as onCommand)
            } catch (e) {
                _err = e
            }
        }

        if (_err) console.error(_err)
    }
}