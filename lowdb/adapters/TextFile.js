const fs = require('fs');
class TextFile {
    constructor(filename) {
        this.filename = filename;
    }
    async read() {
        let data;
        try {
            data = await fs.promises.readFile(this.filename, 'utf-8');
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return null;
            }
            throw e;
        }
        return data;
    }
    async write(str) {
        try {
            return await fs.promises.writeFile(this.filename, str);
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                return null;
            }
            throw e;
        }
    }
}
module.exports = { TextFile };