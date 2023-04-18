import { onCommand, ParsedMessage } from './types'
import Connection from './util/Connection'
import db from './util/Database'
import { readFile } from 'fs/promises'
import Plugins, { PluginClass } from './util/PluginManager'

if (require.main === module) {
  Connection.isModule = false
  var bot = new Connection
  bot.start()
  readFile('./config.yml', 'utf-8').then(data => {
    bot.developers = data.split('\n')
  }).catch(console.error)
}

export default Connection
export {
  Connection,
  Plugins,
  PluginClass,
  onCommand,
  ParsedMessage,
  db
}
