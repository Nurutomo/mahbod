import Connection from "./util/Connection";
import Plugins from "./util/PluginManager";

if (require.main === module) {
  var bot = new Connection
  bot.start()
}

export {
  Connection,
  Plugins
}
