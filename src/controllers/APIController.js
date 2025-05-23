const LLMFunction = require('../models/LLMFunction');
const StorageService = require('../services/StorageService');
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');
const ContainerClient = require('../models/ContainerClient');

class APIController {
    constructor(mockache = null) {
        if (!mockache) {
            throw new FunctionExecutionError('Mockache must be provided to APIController');
        }
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
            throw new Error(`Failed to initialize APIController: ${error.message}`);
        }
    }

    async createFunction(data) {
        if (!this.initialized) await this.initialize();
        
        if (!data || typeof data !== 'object') {
            throw new FunctionValidationError('Invalid function data provided');
        }

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

    async getFunctionCode(identifier) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        return data.generatedCode || null;
    }

    async removeFunction(identifier) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }

        try {
            // Ta bort containern
            const containerClient = new ContainerClient();
            await containerClient.removeContainer(identifier);
        } catch (error) {
            console.error('Failed to remove container:', error);
            // Fortsätt ändå med borttagningen av funktionen
        }

        await this.storageService.removeFunction(identifier);
    }

    async listFunctions() {
        if (!this.initialized) await this.initialize();
        
        return await this.storageService.listFunctions();
    }

    

    async runFunctionWithCode(identifier, input) {
        if (!this.initialized) await this.initialize();
        
        if (!this.mockache) {
            throw new FunctionExecutionError('Mockache is not initialized');
        }
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        const llmFunction = LLMFunction.fromJSON(data);
        return llmFunction.runWithCode(this.mockache, input);
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
        const testResults = await llmFunction.runAllExamples(this.mockache);
        
        // Spara den uppdaterade funktionen med testresultaten
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        
        return testResults;
    }

    async testFunctionWithCode(identifier) {
        if (!this.initialized) await this.initialize();
        
        if (!this.mockache) {
            throw new FunctionExecutionError('Mockache is not initialized');
        }
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }
        const llmFunction = LLMFunction.fromJSON(data);
        const testResults = await llmFunction.runAllExamplesWithCode(this.mockache);
        
        // Spara den uppdaterade funktionen med testresultaten
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        
        return testResults;
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
            identifier: newLLMFunction.identifier,
            data: newLLMFunction.toJSON()
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
        llmFunction.clearTestResults(); // Rensa testresultat när funktionen ändras

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
        llmFunction.clearTestResults(); // Rensa testresultat när funktionen ändras

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
        
        //console.log('Backend: Mottog förfrågan att uppdatera testfall:', { identifier, index, testCase });
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            //console.log('Backend: Funktion hittades inte:', identifier);
            throw new FunctionNotFoundError(identifier);
        }

        // Validera testCase
        if (!testCase.input || typeof testCase.input !== 'object') {
            //console.log('Backend: Ogiltig input i testfall:', testCase);
            throw new FunctionValidationError('Test case must have a valid input object');
        }
        if (!testCase.output || typeof testCase.output !== 'object') {
            //console.log('Backend: Ogiltig output i testfall:', testCase);
            throw new FunctionValidationError('Test case must have a valid output object');
        }

        const llmFunction = LLMFunction.fromJSON(data);
        //console.log('Backend: Laddade funktion:', { 
        //    identifier: llmFunction.identifier,
        //    antalExempel: llmFunction.examples.length 
        //});
        
        // Validera index
        if (index < 0 || index >= llmFunction.examples.length) {
            //console.log('Backend: Ogiltigt index:', { index, maxIndex: llmFunction.examples.length - 1 });
            throw new FunctionValidationError('Invalid test case index');
        }

        // Uppdatera testfallet
        llmFunction.examples[index] = testCase;
        llmFunction.clearTestResults(); // Rensa testresultat när funktionen ändras
        //console.log('Backend: Uppdaterade testfall:', { 
        //    index,
        //    nyttTestfall: testCase 
        //});

        // Save the updated function
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        //console.log('Backend: Sparade uppdaterad funktion');
        
        return {
            message: 'Test case updated successfully',
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }

    async updateFunctionPrompt(identifier, newPrompt) {
        if (!this.initialized) await this.initialize();
        
        const data = await this.storageService.loadFunction(identifier);
        if (!data) {
            throw new FunctionNotFoundError(identifier);
        }

        if (!newPrompt || typeof newPrompt !== 'string' || newPrompt.length === 0) {
            throw new FunctionValidationError('Prompt must be a non-empty string');
        }

        const llmFunction = LLMFunction.fromJSON(data);
        
        // Rensa genererad kod och containrar om prompten ändras
        if (llmFunction.prompt !== newPrompt) {
            console.log('Clearing generated code and removing container for function:', identifier);
            llmFunction.clearGeneratedCode();
            console.log('Cleared generated code');
            
            try {
                // Ta bort containern med rätt identifier
                const containerClient = new ContainerClient();
                console.log('ContainerClient created');
            
                console.log('Remove the container')
                await containerClient.removeContainer(identifier);
                console.log('Successfully removed container for function:', identifier);
            } catch (error) {
                console.error('Failed to remove container:', error);
                // Fortsätt ändå med uppdateringen av prompten
            }
        }
        
        llmFunction.prompt = newPrompt;
        llmFunction.clearTestResults();
        
        await this.storageService.saveFunction(llmFunction.identifier, llmFunction.toJSON());
        
        return {
            message: 'Prompt updated successfully',
            identifier: llmFunction.identifier,
            data: llmFunction.toJSON()
        };
    }

    
}

module.exports = APIController; 