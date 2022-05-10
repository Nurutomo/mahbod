import mongoose, { ConnectOptions, Model, Mongoose, Schema } from 'mongoose'

interface DummyObject {
    [x: string]: any
}

export default class mongoDB {
    url: string
    data: DummyObject
    _data: DummyObject
    _model = Model
    options: ConnectOptions
    db: Mongoose
    connection: mongoose.Connection

    constructor(url: string, options: ConnectOptions = {}) {
        this.url = url
        this.options = options
    }

    async read() {
        this.db = await mongoose.connect(this.url, this.options)
        this.connection = mongoose.connection
        let schema = new Schema<{
            data: DummyObject
        }>({
            data: {
                type: Object,
                required: true,
                default: {}
            }
        })
        this._model = mongoose.model('data', schema)
        this._data = await this._model.findOne({})
        if (!this._data) {
            this.data = {}
            await this.write(this.data)
            this._data = await this._model.findOne({})
        } else this.data = this._data.data
        return this.data
    }


    async write(data) {
        if (!data) return data
        if (!this._data) return (new this._model({ data })).save()
        this._model.findById(this._data._id, (err, docs) => {
            if (!err) {
                if (!docs.data) docs.data = {}
                docs.data = data
                return docs.save()
            }
        })
    }
}