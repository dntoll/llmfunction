const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

const crypto = require('crypto');

class LLMFunction {


    constructor(prompt, exampleOutput, examples) {
        // Validera prompt
        if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
            throw new FunctionValidationError('Prompt must be non empty string');
        }

               // Validera exampleOutput
        if (!exampleOutput || typeof exampleOutput !== 'object') {
            throw new FunctionValidationError('ExampleOutput must be a json object');
        }

        // Validera examples
        if (!Array.isArray(examples) || examples.length === 0) {
            throw new FunctionValidationError('Examples must be non empty array');
        }

        // Validera varje exempel
        examples.forEach((example, index) => {
            if (!example.input || typeof example.input !== 'object') {
                throw new Error(`Exempel ${index} is missing or has invalid input`);
            }
            if (!example.output || typeof example.output !== 'object') {
                throw new Error(`Exempel ${index} is missing or has invalid output`);
            }
        });

        this.prompt = prompt;
        this.exampleOutput = exampleOutput;
        this.examples = examples;
        this.identifier = this.#generateIdentifier();
    }

    static fromJSON(data) {
        const llmFunction = new LLMFunction(data.prompt, data.exampleOutput, data.examples);
        // Behåll det befintliga ID:t om det finns
        if (data.identifier) {
            llmFunction.identifier = data.identifier;
        }
        return llmFunction;
    }

   

    #generateIdentifier() {
        const data = JSON.stringify({
            prompt: this.prompt,
            exampleOutput: this.exampleOutput,
            examples: this.examples,
            identifier: this.identifier
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    toJSON() {
        return {
            identifier: this.identifier,
            prompt: this.prompt,
            exampleOutput: this.exampleOutput,
            examples: this.examples
        };
    }

    async run(mockache, inputJson) {
        const ret = await mockache.gpt4SingleMessage(this.prompt, inputJson, this.exampleOutput);
        return ret;
    }

    async improvePrompt(mockache) {
        //run all examples
        const results = await this.runAllExamples(mockache);
        //ask mockache to improve prompt

        const prompt_engineer_prompt = `
        You are a prompt engineer.
        You are given an old_prompt and a list results from testing the prompt in a json format.
        You are to improve the prompt to be more accurate so for each of the results.
        Analyse the test results. With the new prompt try to get the actualOutput to be more like the expectedOutput. 
        Assume the test expectedOutput is correct and takes precident over the old_prompt.
        Return the new prompt in a json format as in the exampleOutput.
        `

        const input = {
            old_prompt: this.prompt,
            test_results: results
        }

        const exampleOutput = {
            prompt: "The new prompt should be here",
        }
        const improvedPrompt = await mockache.gpt4SingleMessage(prompt_engineer_prompt, input, exampleOutput);
        //set prompt to improved prompt
        //create new object with improved prompt
        const newLLMFunction = new LLMFunction(improvedPrompt.prompt, this.exampleOutput, this.examples);   
        //this.prompt = improvedPrompt.prompt;

        //console.log("Improved prompt: " + improvedPrompt.prompt);
        return newLLMFunction;
    }

    async runAllExamples(mockache) {
        const results = [];
        for (const example of this.examples) {
            const output = await this.run(mockache, example.input);
            const success = JSON.stringify(output) === JSON.stringify(example.output);
            results.push({
                input: example.input,
                expectedOutput: example.output,
                actualOutput: output,
                success
            });
        }
        
        const totalTests = results.length;
        const passedTests = results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;

        return {
            identifier: this.identifier,
            totalTests,
            passedTests,
            failedTests,
            results
        };
    }
}

module.exports = LLMFunction; 