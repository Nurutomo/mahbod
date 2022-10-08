import { join, resolve } from 'path'
import { existsSync, FSWatcher, readdirSync, watch } from 'fs'
import type { Logger } from 'pino'
import { Permissions, TypedEventEmitter } from '../types'

type Callback = (error?: Error | Boolean, message?: any) => any
type PluginValue = PluginClass
export class PluginManager extends TypedEventEmitter<{
    'add': ({ name, plugin }: {
        name: string,
        plugin: PluginValue
    }) => void
    'add.folder': ({ watcher, loaded, folder }: {
        watcher: FSWatcher
        loaded: Promise<ReturnType<PluginManager['addPlugin']>>
        folder: string
    }) => void
    'delete': ({ name, plugin }: {
        name: string,
        plugin: PluginValue
    }) => void
    'delete.folder': ({ watcher, folder }: {
        watcher: FSWatcher
        folder: string
    }) => void
}> {
    plugins: {
        [x: string]: any
    } = {}
    pluginFolders: {
        [x: string]: Set<string>
    } = {}
    watcher: {
        [x: string]: FSWatcher
    } = {}
    logger: Console | Logger = console
    filter = /.js$/i
    private fn_id = 0

    constructor() {
        super()
        this.addPluginFolder(join(__dirname, './plugins'))
        this.addPluginFolder(join(__dirname, '../plugins'))
    }

    addPluginFolder(folder: string) {
        if (!existsSync(folder)) return

        let resolved = resolve(folder)
        console.log(resolved)
        if (resolved in this.watcher) return
        this.pluginFolders[resolved] = new Set<string>()

        let plugins = readdirSync(resolved)
        let loaded = []
        for (const plugin of plugins) {
            loaded.push(this.addPlugin(join(resolved, plugin)).catch(e => e))
        }

        let watcher = watch(resolved, async (_event, filename) => {
            try {
                if (!this.filter.test(filename)) return
                let dir = join(resolved, filename)
                if (dir in require.cache) {
                    delete require.cache[dir]
                    if (existsSync(dir)) {
                        this.logger.info(`re - require plugin '${filename}' in ${folder}`)
                        await this.addPlugin(dir)
                        this.pluginFolders[resolved].add(filename)
                    } else {
                        this.logger.info(`deleted plugin '${filename}' in ${folder}`)
                        this.pluginFolders[resolved].delete(filename)
                        return await this.delPlugin(dir)
                    }
                } else this.logger.info(`requiring new plugin '${filename}' in ${folder}`)
                let err = false// syntaxerror(readFileSync(dir), filename)
                if (err) this.logger.error(`syntax error while loading '${filename}'\n${err} in ${folder}`)
                else {
                    await this.addPlugin(dir)
                    this.pluginFolders[resolved].add(filename)
                }
            } catch (e) {
                this.logger.error(`failed to add '${filename}' in ${folder}`, e)
            }
        })

        watcher.on('close', () => this.delPluginFolder(resolved, true))

        this.watcher[resolved] = watcher

        this.emit('add.folder', {
            watcher,
            loaded: Promise.all(loaded),
            folder: resolved
        })
        return {
            watcher,
            loaded: Promise.all(loaded),
        }
    }

    delPluginFolder(folder, alreadyClosed: Boolean = false) {
        let resolved = resolve(folder)
        this.emit('delete.folder', {
            watcher: this.watcher[resolved],
            folder: resolved
        })
        if (!alreadyClosed) this.watcher[resolved].close()
        delete this.watcher[resolved]
        delete this.pluginFolders[resolved]
    }

    addPlugin(source: string | any, cb?: Callback) {
        if (typeof source === 'function' && 'prototype' in source) {
            let fn = 'prototype' in source ? new source : source
            this.emit('add', {
                name: this.fn_id.toString(),
                plugin: fn
            })
            this.plugins[this.fn_id++] = fn
            return typeof cb === 'function' ? cb(false, fn) : Promise.resolve(fn)
        } else {
            if (!this.filter.test(source)) return typeof cb === 'function' ? cb(true) : Promise.reject()
            let pathToFile = resolve(source)
            return Promise.resolve(import(source.replace('.js', '')))
                .then(plugin => {
                    let module = 'default' in plugin ? plugin.default : plugin
                    return 'prototype' in module ? new module : module
                })
                .then(plugin => {
                    this.plugins[pathToFile] = plugin
                    this.emit('add', {
                        name: pathToFile,
                        plugin
                    })
                    if (typeof cb === 'function') cb(false, plugin)
                    return plugin
                })
        }
    }

    delPlugin(file: string) {
        let pathToFile = resolve(file)
        this.emit('delete', {
            name: file,
            plugin: this.plugins[file] || this.plugins[pathToFile]
        })
        delete this.plugins[file]
        delete this.plugins[pathToFile]
    }
}

export class PluginClass {
    command: string | RegExp | (string | RegExp)[]
    permissions?: Permissions | Permissions[] = []
    disabled?: Boolean
}

const Plugins = new PluginManager
export default Plugins
