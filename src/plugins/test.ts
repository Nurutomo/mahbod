import { onCommand } from '../types'

export default class test {
    command = 'test'

    onCommand({
        m,
        sock
    }: onCommand) {
        sock.sendMessage(m.chat, {
            text: 'Pong!'
        }, {
            quoted: m.m
        })
    }
}