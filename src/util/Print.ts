import Connection from './Connection'
import urlRegex from 'url-regex'
import chalk from 'chalk'
import { parsePhoneNumber } from 'awesome-phonenumber'
import { ParsedMessage } from '../types'

let url_regex = urlRegex({ strict: false })
export default async function Print(m: ParsedMessage, { sock, store }: Connection) {
  let _name = sock.getName(m.sender)
  let sender = formatJidNumber(m.sender)
  if (_name && _name !== sender) sender += ' ~' + _name
  let chat = sock.getName(m.chat)
  // let ansi = '\x1b['
  let filesize = m.msg && typeof m.msg === 'object' ?
    'vcard' in m.msg ?
      m.msg.vcard.length :
      'fileLength' in m.msg ?
        typeof m.msg.fileLength == 'object' && 'low' in m.msg.fileLength ? m.msg.fileLength.low : m.msg.fileLength :
        m.text ?
          m.text.length :
          0
    : m.text ? m.text.length : 0
  let me = formatJidNumber(sock.authState.creds.me!.id)
  console.log(`
${chalk.redBright('%s')} ${chalk.black(chalk.bgYellow('%s'))} ${chalk.black(chalk.bgGreen('%s'))} ${chalk.magenta('%s [%s %sB]')}
${chalk.green('%s')} ${chalk.yellow('%s%s')} ${chalk.blueBright('to')} ${chalk.green('%s')} ${chalk.black(chalk.bgYellow('%s'))}
`.trim(),
    me + ' ~' + sock.authState.creds.me!.name,
    m.timestamp.toTimeString(),
    m.m.messageStubType ? m.m.messageStubType : '',
    filesize,
    filesize === 0 ? 0 : (filesize / 1009 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1),
    ['', ...'KMGTP'][Math.floor(Math.log(filesize) / Math.log(1000))] || '',
    sender,
    '?',
    '',
    m.chat + (chat ? ' ~' + chat : ''),
    m.type ? m.type.replace(/message$/i, '').replace('audio', typeof m.msg == 'object' && m.type == 'audioMessage' && 'ptt' in m.msg ? 'PTT' : 'audio').replace(/^./, v => v.toUpperCase()) : ''
  )
  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '')
    let mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|```((?:.||[\n\r])+?)```)(?=\S?(?:[\s\n]|$))/g
    let mdFormat = (depth = 4) => (_, type, text, monospace) => {
      let types = {
        _: 'italic',
        '*': 'bold',
        '~': 'strikethrough'
      }
      text = text || monospace
      let formatted = !types[type] || depth < 1 ? text : chalk[types[type]](text.replace(mdRegex, mdFormat(depth - 1)))
      // console.log({ depth, type, formatted, text, monospace }, formatted)
      return formatted
    }
    if (log.length < 4096)
      log = log.replace(url_regex, (url, i, text) => {
        let end = url.length + i
        return i === 0 || end === text.length || (/^\s$/.test(text[end]) && /^\s$/.test(text[i - 1])) ? chalk.blueBright(url) : url
      })
    log = log.replace(mdRegex, mdFormat(4))
    if (m.mentionedJid) for (let user of m.mentionedJid) log = log.replace('@' + getNumber(user), chalk.blueBright('@' + sock.getName(user)))
    console.log(m.isCommand instanceof Error ? chalk.red(log) : m.isCommand ? chalk.yellow(log) : log)
  }
  if (m.m.messageStubParameters) console.log(m.m.messageStubParameters.map(jid => {
    let name = sock.getName(jid)
    return chalk.gray(formatJidNumber(jid) + (name ? ' ~' + name : ''))
  }).join(', '))
  if (typeof m.msg === 'object' && m.msg) {
    if ('displayName' in m.msg) {
      if (m.type == 'documentMessage')
        console.log(`📄 ${m.msg.displayName || 'Document'}`)
      if (m.type == 'contactMessage')
        console.log(`👨 ${m.msg.displayName || ''}`)
    }
    if (m.type == 'contactsArrayMessage')
      console.log(`👨‍👩‍👧‍👦 ${' ' || ''}`)
    if ('seconds' in m.msg) {
      if (m.type == 'audioMessage' && 'ptt' in m.msg) {
        let s = m.msg.seconds
        console.log(`${m.msg.ptt ? '🎤 (PTT ' : '🎵 ('}AUDIO) ${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`)
      }
    }
  }
  console.log()
  // if (m.quoted) console.log(m.msg.contextInfo)
}

function formatJidNumber(jid: string) {
  return parsePhoneNumber('+' + getNumber(jid)).number.international
}

function getNumber(jid: string) {
  try {
    return new URL('http://' + jid).username
  } catch (e) {
    console.error(jid)
    return jid.split('@')[0].split(':')[0]
  }
}