import { Low, Adapter } from '../../lowdb'
import CloudDBAdapter from './db_adapters/JSONCloud'
import mongoDB from './db_adapters/MongoDB'

export class Database {
    low: Low
    adapters: {
        [x: string]: any
    }
    data: {
        [x: string]: any
    }

    constructor() {
        this.adapters = {
            CloudDBAdapter, mongoDB
        }
        this.low = new Low({
            async read() {},
            async write() {}
        })
        this.data = this.low.data
    }

    setAdapter<T>(adapter: Adapter<T>) {
        this.low.adapter = adapter
    }
}

const db = new Database
export default db