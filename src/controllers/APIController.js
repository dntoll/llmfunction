const LLMFunction = require('../models/LLMFunction');
const StorageService = require('../services/StorageService');

class APIController {
    constructor() {
        this.storageService = new StorageService();
        this.initialize();
    }

    async initialize() {
        try {
            await this.storageService.initialize();
        } catch (error) {
            console.error('Fel vid initialisering av APIController:', error);
            throw error;
        }
    }

    async createFunction(data) {
        if (!LLMFunction.validate(data)) {
            throw new Error('Saknade obligatoriska fält. Kontrollera att prompt, exampleInput och examples finns med.');
        }

        const llmFunction = LLMFunction.fromJSON(data);
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());

        return {
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }

    async getFunction(identifier) {
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new Error('Funktion hittades inte med den angivna identifiern.');
        }
        return data;
    }

    async removeFunction(identifier) {
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new Error('Funktion hittades inte med den angivna identifiern.');
        }
        await this.storageService.removeFunction(identifier);
    }

    async listFunctions() {
        return await this.storageService.listFunctions();
    }
}

module.exports = APIController; 