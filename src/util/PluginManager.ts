import { join, resolve } from 'path'
import { existsSync, FSWatcher, readdirSync, watch } from 'fs'
import type { Logger } from 'pino'
import { Permissions, TypedEventEmitter, WABOT_AQ_PERMISSIONS, onCommand } from '../types'

type singleOrArray<T> = T | T[]
type Callback = (error?: Error | Boolean, message?: any) => any
type PluginValue = singleOrArray<PluginClass & Function>
type PluginsValue = {
    default: PluginValue
} | PluginValue
export class PluginManager extends TypedEventEmitter<{
    'add': ({ name, plugins }: {
        name: string,
        plugins: PluginsValue[]
    }) => void
    'add.folder': ({ watcher, loaded, folder }: {
        watcher: FSWatcher
        loaded: Promise<ReturnType<PluginManager['addPlugin']>>
        folder: string
    }) => void
    'delete': ({ name, plugins }: {
        name: string,
        plugins: PluginsValue[]
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
                plugins: [fn]
            })
            this.plugins[this.fn_id++] = fn
            return typeof cb === 'function' ? cb(false, fn) : Promise.resolve(fn)
        } else {
            if (!this.filter.test(source)) return typeof cb === 'function' ? cb(true) : Promise.reject()
            let pathToFile = resolve(source)
            return Promise.resolve(import(source.replace('.js', '')))
                .then(this.processPlugins)
                .then(plugins => {
                    for (let i in plugins) {
                        let plugin = plugins[i]
                        this.plugins[`${pathToFile}_${plugins.length}_${i}`] = plugin
                    }
                    this.emit('add', {
                        name: pathToFile,
                        plugins
                    })
                    if (typeof cb === 'function') cb(false, plugins)
                    return plugins
                })
        }
    }

    delPlugin(file: string) {
        let pathToFile = resolve(file)
        let pluginNames = Object.keys(this.plugins).map(_name => {
            let splitted = _name.split('_')
            return {
                name: splitted.pop(),
                length: splitted.pop(),
                id: splitted.join('_')
            }
        }).filter(({ name }) => name === file || name === pathToFile)
        let plugins = pluginNames.map(({ name }) => this.plugins[name])
        this.emit('delete', {
            name: file,
            plugins
        })
        delete this.plugins[file]
        delete this.plugins[pathToFile]
    }
    
    processPlugins(plugins: PluginsValue) {
        let modules = 'default' in plugins ? plugins.default : plugins
        modules = Array.isArray(modules) ? modules : [modules]
        return modules.map(module => {
            // wabot-aq support
            try {
                // @ts-ignore
                module = new module
            } catch (e) {
                // @ts-ignore
                module.onCommand = async opts => {
                    return await module(opts.m, opts)
                }
            }

            let permissions = []
            for (let key in module)
                if (key in WABOT_AQ_PERMISSIONS && module[key])
                    permissions.push(WABOT_AQ_PERMISSIONS[key])
            module.permissions = permissions
            return module
        })
    }
}

export class PluginClass {
    command: string | RegExp | (string | RegExp)[]
    permissions?: Permissions | Permissions[] = []
    disabled?: Boolean
}

const Plugins = new PluginManager
export default Plugins
