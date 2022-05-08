import { join, resolve } from 'path'
import { existsSync, FSWatcher, readdirSync, watch } from 'fs'
import type { Logger } from 'pino'

type Callback = (error?: Error | Boolean, message?: any) => any

export class PluginManager {
    plugins: {
        [x: string]: any
    } = new Object
    pluginFolders: string[] = []
    watcher: {
        [x: string]: FSWatcher
    } = {}
    logger: Console | Logger = console
    private fn_id = 0

    constructor() {
        this.addPluginFolder(join(__dirname, './plugins'))
        this.addPluginFolder(join(__dirname, '../plugins'))
    }

    addPluginFolder(folder) {
        if (!existsSync(folder)) return

        let resolved = resolve(folder)
        console.log(resolved)
        if (resolved in this.watcher) return
        this.pluginFolders.push(resolved)

        let plugins = readdirSync(resolved)
        let loaded = []
        for (const plugin of plugins) {
            loaded.push(this.addPlugin(join(resolved, plugin)).catch(e => e))
        }

        let watcher = watch(resolved, async (_event, filename) => {
            try {
                let dir = join(resolved, filename)
                if (dir in require.cache) {
                    delete require.cache[dir]
                    if (existsSync(dir)) {
                        this.logger.info(`re - require plugin '${filename}' in ${folder}`)
                        await this.addPlugin(dir)
                    } else {
                        this.logger.info(`deleted plugin '${filename}' in ${folder}`)
                        return await this.delPlugin(dir)
                    }
                } else this.logger.info(`requiring new plugin '${filename}' in ${folder}`)
                let err = false// syntaxerror(readFileSync(dir), filename)
                if (err) this.logger.error(`syntax error while loading '${filename}'\n${err} in ${folder}`)
                else await this.addPlugin(dir)
            } catch (e) {
                this.logger.error(`failed to add '${filename}' in ${folder}`, e)
            }
        })

        watcher.on('close', () => this.delPluginFolder(resolved, true))

        this.watcher[resolved] = watcher
        return {
            watcher,
            loaded: Promise.all(loaded),
        }
    }

    delPluginFolder(folder, alreadyClosed: Boolean = false) {
        let resolved = resolve(folder)
        if (!alreadyClosed) this.watcher[resolved].close()
        delete this.watcher[resolved]
        return this.pluginFolders.splice(this.pluginFolders.indexOf(resolved), 1)
    }

    addPlugin(source: string | any, cb?: Callback) {
        if (typeof source === 'function' && 'prototype' in source) {
            let fn = 'prototype' in source ? new source : source
            this.plugins[this.fn_id++] = fn
        } else {
            if (!source.endsWith('.js')) return typeof cb === 'function' ? cb(true) : Promise.reject()
            let pathToFile = resolve(source)
            return Promise.resolve(import(source.replace('.js', '')))
                .then(plugin => {
                    let module = 'default' in plugin ? plugin.default : plugin
                    return 'prototype' in module ? new module : module
                })
                .then(plugin => {
                    this.plugins[pathToFile] = plugin
                    if (typeof cb === 'function') cb(false, plugin)
                    return plugin
                })
        }
    }

    delPlugin(file: string) {
        let pathToFile = resolve(file)
        delete this.plugins[file]
        delete this.plugins[pathToFile]
    }
}

export class PluginClass {
    command: string | RegExp | (string | RegExp)[]
    permissions?: Permissions | Permissions[] = []
}

const Plugins = new PluginManager
export default Plugins
