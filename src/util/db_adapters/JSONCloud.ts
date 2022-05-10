import fetch, { RequestInfo, RequestInit } from 'node-fetch'

const stringify = obj => JSON.stringify(obj, null, 2)
const parse = str => JSON.parse(str, (_, v) => {
    if (
        v !== null &&
        typeof v === 'object' &&
        'type' in v &&
        v.type === 'Buffer' &&
        'data' in v &&
        Array.isArray(v.data)) {
        return Buffer.from(v.data)
    }
    return v
})

export default class CloudDBAdapter {
    url: RequestInfo
    serialize: (obj: Object) => string
    deserialize: (str: string) => {
        [x: string]: any
    }
    fetchOptions: RequestInit

    constructor(url, {
        serialize = stringify,
        deserialize = parse,
        fetchOptions = {}
    } = {}) {
        this.url = url
        this.serialize = serialize
        this.deserialize = deserialize
        this.fetchOptions = fetchOptions
    }

    async read() {
        try {
            let res = await fetch(this.url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json;q=0.9,text/plain'
                },
                ...this.fetchOptions
            })
            if (res.status !== 200) throw res.statusText
            return this.deserialize(await res.text())
        } catch (e) {
            return null
        }
    }

    async write(obj) {
        let res = await fetch(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            ...this.fetchOptions,
            body: this.serialize(obj)
        })
        if (res.status !== 200) throw res.statusText
        return await res.text()
    }
}