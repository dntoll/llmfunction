const fs = require('fs').promises;
const path = require('path');

class StorageService {
    constructor(storagePath = 'data') {
        this.storagePath = storagePath;
        this.functionsPath = path.join(storagePath, 'functions');
    }

    async initialize() {
        try {
            await fs.mkdir(this.functionsPath, { recursive: true });
        } catch (error) {
            console.error('Fel vid initialisering av lagring:', error);
            throw error;
        }
    }

    getFunctionPath(identifier) {
        return path.join(this.functionsPath, `${identifier}.json`);
    }

    async saveFunction(identifier, data) {
        const functionPath = this.getFunctionPath(identifier);
        await fs.writeFile(functionPath, JSON.stringify(data, null, 2));
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
    }

    async listFunctions() {
        try {
            const files = await fs.readdir(this.functionsPath);
            const functions = await Promise.all(
                files
                    .filter(file => file !== 'keep' && file.endsWith('.json'))
                    .map(async (file) => {
                        const identifier = file.replace('.json', '');
                        const data = await this.loadFunction(identifier);
                        return {
                            identifier,
                            prompt: data.prompt,
                            lastModified: new Date().toISOString()
                        };
                    })
            );
            return functions;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
}

module.exports = StorageService; 