import Connection from './Connection'
import { ParsedMessage, Permissions } from '../types'
import { PluginClass } from './PluginManager'

const PermissionHandler = (getUserPermission: (userJid: string) => Permissions) => async ({ sock, store, hosts, owners }: Connection, m: ParsedMessage, permissions: PluginClass['permissions'], failCallback: (name: string[]) => any) => {
    let Perm = Array.isArray(permissions) ? permissions : [permissions]
    let me = sock.authState.creds.me!.id

    let isGroup = m.isGroup
    let isPrivate = !m.isGroup

    let gmetadata = isGroup && await store.fetchGroupMetadata(m.chat, sock)
    let isAdmin = isGroup ? gmetadata?.participants.find(({ id }) => id.split('@')[0].split(':')[0] == m.sender.split('@')[0].split(':')[0]).admin?.includes('admin') : false
    let isBotAdmin = isGroup ? gmetadata?.participants.find(({ id }) => id.split('@')[0].split(':')[0] == me.split('@')[0].split(':')[0]).admin?.includes('admin') : false

    let isOwner = [me, ...owners].map(id => id.split('@')[0].split(':')[0]).findIndex(id => id === m.sender.split('@')[0].split(':')[0]) > -1
    let isHost = hosts.map(id => id.split('@')[0].split(':')[0]).findIndex(id => id === m.sender.split('@')[0].split(':')[0]) > -1

    let cperm = getUserPermission(m.sender)
    let isOther = Perm.includes(cperm)

    console.log({ isAdmin, isBotAdmin, isGroup, isPrivate, isOwner, isHost, Perm, me })
    let permFail = []
    if (!isGroup && Perm.includes('group')) permFail.push('group')
    if (!isPrivate && Perm.includes('private')) permFail.push('private')

    if (!isBotAdmin && Perm.includes('bot_admin')) permFail.push('bot_admin')
    if (!isAdmin && Perm.includes('admin')) permFail.push('admin')

    if (!isOwner && Perm.includes('owner')) permFail.push('owner')
    if (!isHost && Perm.includes('host')) permFail.push('host')

    if (!isOther && cperm && !['group', 'private', 'bot_admin', 'admin', 'owner', 'host'].reduce((p: boolean, c: Permissions) => p || Perm.includes(c), false)) permFail.push(cperm)
    if (permFail && Perm.length == permFail.length) return (failCallback(permFail), false)
    return true
}
export default PermissionHandler