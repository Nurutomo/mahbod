import Connection from './Connection'
import { ParsedMessage, Permissions } from '../types'
import { PluginClass } from './PluginManager'
import { GroupMetadata } from '@adiwajshing/baileys'

const PermissionHandler = (getUserPermission: (userJid: string) => Permissions) => async (
    { sock, store, hosts, owners }: Connection,
    {
        m, groupMetadata, isAdmin, isBotAdmin, isOwner, isHost
    }: {
        m: ParsedMessage,
        groupMetadata: GroupMetadata,
        isAdmin: boolean,
        isBotAdmin: boolean,
        isOwner: boolean,
        isHost: boolean
    },
    permissions: PluginClass['permissions'],
    failCallback: (name: string[]) => any
) => {
    let Perm = Array.isArray(permissions) ? permissions : [permissions]
    let me = sock.authState.creds.me!.id

    let isGroup = m.isGroup
    let isPrivate = !m.isGroup

    let cperm = getUserPermission(m.sender)
    let isOther = Perm.includes(cperm)

    // console.log({ isAdmin, isBotAdmin, isGroup, isPrivate, isOwner, isHost, Perm, me })
    let permFail = []
    if (!isGroup && Perm.includes('group')) permFail.push('group')
    if (!isPrivate && Perm.includes('private')) permFail.push('private')

    if (!isBotAdmin && Perm.includes('bot_admin')) permFail.push('bot_admin')
    if (!isAdmin && Perm.includes('admin')) permFail.push('admin')

    if (!isOwner && Perm.includes('owner')) permFail.push('owner')
    if (!isHost && Perm.includes('host')) permFail.push('host')

    if (!isOther && cperm && !permFail) permFail.push(cperm)
    if (permFail && Perm.length == permFail.length) return (failCallback(permFail), false)
    return true
}
export default PermissionHandler