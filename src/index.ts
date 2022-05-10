import { onCommand, ParsedMessage } from "./types";
import Connection from "./util/Connection";
import db from "./util/Database";
import Plugins, { PluginClass } from "./util/PluginManager";

if (require.main === module) {
  Connection.isModule = false
  var bot = new Connection
  bot.start()
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
