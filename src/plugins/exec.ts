import { onCommand,  } from "../types"
import { format } from "util"
import { PluginClass } from "../util/PluginManager"
import * as baileys from "@adiwajshing/baileys"

export default class test extends PluginClass {

    constructor () {
        super()
        this.command = ['>', '=>'] as PluginClass['command']
        this.permissions = 'host' as unknown as PluginClass["permissions"]
    }

    async onCommand({
        m,
        sock,
        text,
        store,
        command
    }: onCommand) {
        let _return
        let i = 15
        let a
        try {
            // @ts-ignore
            let exec = a = new (async () => { }).constructor('print', 'm', 'sock', 'store', 'baileys', 'require', (command === '=>' ? 'return ' : '') + text)
            _return = await exec.call(sock, (...args) => {
                if (--i < 1) return
                console.log(...args)
                return m.reply({ text: format(...args) })
            }, m, sock, store, baileys, require)
        } catch (e) {
            _return = e
        } finally {
            m.reply({ text: format(_return) })
        }
    }
}
