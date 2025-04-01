const LLMFunction = require('../models/LLMFunction');
const StorageService = require('../services/StorageService');
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

class APIController {
    constructor(mockache = null) {
        this.mockache = mockache;
        this.storageService = new StorageService();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.storageService.initialize();
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing APIController:', error);
            throw error;
        }
    }

    async createFunction(data) {
        if (!this.initialized) await this.initialize();
        
        const llmFunction = LLMFunction.fromJSON(data);
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());

        return {
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }

    async getFunction(identifier) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        return data;
    }

    async removeFunction(identifier) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        await this.storageService.removeFunction(identifier);
    }

    async listFunctions() {
        if (!this.initialized) await this.initialize();
        
        return await this.storageService.listFunctions();
    }

    async runFunction(identifier, input) {
        if (!this.initialized) await this.initialize();
        
        if (!this.mockache) {
            throw new FunctionExecutionError('Mockache is not initialized');
        }
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        const llmFunction = LLMFunction.fromJSON(data);
        return llmFunction.run(this.mockache, input);
    }

    async testFunction(identifier) {
        if (!this.initialized) await this.initialize();
        
        if (!this.mockache) {
            throw new FunctionExecutionError('Mockache is not initialized');
        }
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        const llmFunction = LLMFunction.fromJSON(data);
        return llmFunction.runAllExamples(this.mockache);
    }

    async improveFunction(identifier) {
        if (!this.initialized) await this.initialize();
        
        if (!this.mockache) {
            throw new FunctionExecutionError('Mockache is not initialized');
        }
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        const llmFunction = LLMFunction.fromJSON(data);
        const newLLMFunction = await llmFunction.improvePrompt(this.mockache);

        // Save the updated function
        await this.storageService.saveFunction(newLLMFunction.identifier, newLLMFunction.toJSON());
        
        return {
            message: 'Prompt improved',
            newPrompt: newLLMFunction.prompt,
            identifier: newLLMFunction.identifier
        };
    }

    async addTestToFunction(identifier, testCase) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }

        // Validera testCase
        if (!testCase.input || typeof testCase.input !== 'object') {
            throw new FunctionValidationError('Test case must have a valid input object');
        }
        if (!testCase.output || typeof testCase.output !== 'object') {
            throw new FunctionValidationError('Test case must have a valid output object');
        }

        const llmFunction = LLMFunction.fromJSON(data);
        llmFunction.examples.push(testCase);

        // Save the updated function
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        
        return {
            message: 'Test case added successfully',
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }

    async removeTestFromFunction(identifier, index) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }

        const llmFunction = LLMFunction.fromJSON(data);
        
        // Validera index
        if (index < 0 || index >= llmFunction.examples.length) {
            throw new FunctionValidationError('Invalid test case index');
        }

        // Ta bort testfallet
        llmFunction.examples.splice(index, 1);

        // Save the updated function
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        
        return {
            message: 'Test case removed successfully',
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }

    async updateTestInFunction(identifier, index, testCase) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }

        // Validera testCase
        if (!testCase.input || typeof testCase.input !== 'object') {
            throw new FunctionValidationError('Test case must have a valid input object');
        }
        if (!testCase.output || typeof testCase.output !== 'object') {
            throw new FunctionValidationError('Test case must have a valid output object');
        }

        const llmFunction = LLMFunction.fromJSON(data);
        
        // Validera index
        if (index < 0 || index >= llmFunction.examples.length) {
            throw new FunctionValidationError('Invalid test case index');
        }

        // Uppdatera testfallet
        llmFunction.examples[index] = testCase;

        // Save the updated function
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        
        return {
            message: 'Test case updated successfully',
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }
}

module.exports = APIController; 