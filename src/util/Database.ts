import { Low, Adapter, Memory } from './lowdb'
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
        this.low = new Low(new Memory)
        this.data = this.low.data
    }

    setAdapter<T>(adapter: Adapter<T>) {
        this.low.adapter = adapter
    }
}

const db = new Database
export default db