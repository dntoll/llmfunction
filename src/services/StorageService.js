const fs = require('fs').promises;
const path = require('path');

class StorageService {
    constructor(storagePath = 'data') {
        this.storagePath = storagePath;
        this.functionsPath = path.join(storagePath, 'functions');
        this.indexPath = path.join(storagePath, 'index.json');
    }

    async initialize() {
        try {
            await fs.mkdir(this.functionsPath, { recursive: true });
            await this.ensureIndex();
        } catch (error) {
            console.error('Fel vid initialisering av lagring:', error);
            throw error;
        }
    }

    async ensureIndex() {
        try {
            await fs.access(this.indexPath);
        } catch {
            // Skapa index-fil om den inte finns
            await this.saveIndex({});
        }
    }

    async loadIndex() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.saveIndex({});
                return {};
            }
            throw error;
        }
    }

    async saveIndex(index) {
        await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
    }

    getFunctionPath(identifier) {
        return path.join(this.functionsPath, `${identifier}.json`);
    }

    async saveFunction(identifier, data) {
        const functionPath = this.getFunctionPath(identifier);
        await fs.writeFile(functionPath, JSON.stringify(data, null, 2));

        // Uppdatera index
        const index = await this.loadIndex();
        index[identifier] = {
            prompt: data.prompt,
            lastModified: new Date().toISOString()
        };
        await this.saveIndex(index);
    }

    async loadFunction(identifier) {
        try {
            const functionPath = this.getFunctionPath(identifier);
            const data = await fs.readFile(functionPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async removeFunction(identifier) {
        const functionPath = this.getFunctionPath(identifier);
        try {
            await fs.unlink(functionPath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        // Uppdatera index
        const index = await this.loadIndex();
        delete index[identifier];
        await this.saveIndex(index);
    }

    async listFunctions() {
        const index = await this.loadIndex();
        return Object.entries(index).map(([identifier, data]) => ({
            identifier,
            prompt: data.prompt,
            lastModified: data.lastModified
        }));
    }
}

module.exports = StorageService; 