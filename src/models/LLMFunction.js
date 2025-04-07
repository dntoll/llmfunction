const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');
const ContainerClient = require('./ContainerClient');
const CodeRunner = require('./CodeRunner');
const crypto = require('crypto');

class LLMFunction {


    constructor(prompt, examples) {
        // Validera prompt
        if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
            throw new FunctionValidationError('Prompt must be non empty string');
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
        this.examples = examples;
        this.identifier = this.#generateIdentifier();
        this.testResults = null; // Lagrar senaste testresultaten
    }

    static fromJSON(data) {
        const llmFunction = new LLMFunction(data.prompt, data.examples);
     
        if (data.identifier) {
            llmFunction.identifier = data.identifier;
        }
        // Behåll testresultaten om de finns
        if (data.testResults) {
            llmFunction.testResults = data.testResults;
        }
        return llmFunction;
    }

   

    #generateIdentifier() {
        const data = JSON.stringify({
            prompt: this.prompt,
            examples: this.examples
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    toJSON() {
        return {
            identifier: this.identifier,
            prompt: this.prompt,
            examples: this.examples,
            testResults: this.testResults
        };
    }

    async run(mockache, inputJson) {
        const ret = await mockache.gpt4SingleMessage(this.prompt, inputJson, this.examples[0].output);
        return ret;
    }

    async runWithCode(mockache, inputJson) {
        try {
            if (!mockache) {
                throw new FunctionExecutionError('Mockache is not initialized');
            }

            const codeRunner = new CodeRunner();
            const code = await codeRunner.generateCode(this.prompt, this.examples, mockache);

            console.log('runWithCode::Generated code:', code);
            return await codeRunner.execute(code, this.identifier, inputJson);
        } catch (error) {
            throw new FunctionExecutionError(`Failed to run function with code: ${error.message}`);
        }
    }

    async improvePrompt(mockache) {
        //run all examples
        const results = await this.runAllExamples(mockache);
        //ask mockache to improve prompt

        const prompt_engineer_prompt = `
       You are a prompt engineer tasked with refining natural language prompts based on test results.

You will be given:
- An old prompt (old_prompt) used to generate outputs.
- A list of test results in JSON format. Each result includes:
  - input: the input used during the test
  - expectedOutput: the correct/intended output
  - actualOutput: the output that the old prompt produced
  - success: whether the actual matched the expected

Your job is to revise the old_prompt to make it more accurate, in order to guide the system to produce outputs closer to the expectedOutput in future test cases.

Instructions:
- Carefully analyze where actualOutput differs from expectedOutput.
- Your highest priority is to ensure that the behavior described by the new prompt leads to outputs that match the expectedOutput values. You are allowed and encouraged to discard or override the original prompt content completely if it does not align with the expected behavior. Do not preserve any part of the old prompt that would prevent correct results.
- Rewrite the old_prompt completely if necessary to ensure that the generated outputs match the expectedOutput in the test cases. Override the logic from the old_prompt if it conflicts with what is expected in the test cases.
- Make the revised prompt as clear and specific as possible.
- Do NOT focus on matching the actualOutput unless it already aligns with expectedOutput.
- Do NOT reference specific test cases or values — generalize the new prompt.
        

        Step 1: Carefully analyze the test results.
        - For each test, comment whether it passed or failed.
        - If it failed, explain specifically what behavior is missing or incorrect in the current prompt.
        - Based on your analysis, determine what changes are needed in the prompt wording.
        Step 2: Based on your analysis, rewrite the old_prompt entirely if needed.
Make sure the new prompt reflects all necessary behavior to satisfy the expected output of all test cases.

`
        const input = {
            old_prompt: this.prompt,
            test_results: results
        }

        const exampleOutput = {
            "test_results_analysis": [ "... your analysis per test case ..." ],
            prompt: "The new prompt should be here",
        }
        const improvedPrompt = await mockache.gpt4SingleMessage(prompt_engineer_prompt, input, exampleOutput);
        //set prompt to improved prompt
        //create new object with improved prompt
        const newLLMFunction = new LLMFunction(improvedPrompt.prompt, this.examples);   
        //this.prompt = improvedPrompt.prompt;

        
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

        const testResults = {
            identifier: this.identifier,
            totalTests,
            passedTests,
            failedTests,
            results,
            lastRun: new Date().toISOString()
        };

        this.testResults = testResults;
        return testResults;
    }

    // Metod för att kontrollera om funktionen har ändrats sedan senaste testet
    hasChangedSinceLastTest() {
        if (!this.testResults) return true;
        
        const currentIdentifier = this.#generateIdentifier();
        return currentIdentifier !== this.identifier;
    }

    // Metod för att rensa testresultat om funktionen har ändrats
    clearTestResultsIfChanged() {
        if (this.hasChangedSinceLastTest()) {
            this.testResults = null;
        }
    }

    // Metod för att rensa testresultat
    clearTestResults() {
        this.testResults = null;
    }
}

module.exports = LLMFunction; 