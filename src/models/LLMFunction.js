const crypto = require('crypto');

class LLMFunction {


    constructor(prompt, exampleInput, examples) {
        this.prompt = prompt;
        this.exampleInput = exampleInput;
        this.examples = examples;
        this.identifier = this.#generateIdentifier();
    }

    static fromJSON(data) {
        if (!LLMFunction.validate(data)) {
            throw new Error('Ogiltig data för LLMFunction');
        }
        return new LLMFunction(data.prompt, data.exampleInput, data.examples);
    }

    static validate(data) {
        return (
            data &&
            typeof data.prompt === 'string' &&
            data.exampleInput &&
            Array.isArray(data.examples) &&
            data.examples.length > 0 &&
            data.examples.every(example => 
                example.input && 
                example.output &&
                typeof example.input === 'object' &&
                typeof example.output === 'object'
            )
        );
    }

    #generateIdentifier() {
        const data = JSON.stringify({
            prompt: this.prompt,
            exampleInput: this.exampleInput,
            examples: this.examples
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    toJSON() {
        return {
            prompt: this.prompt,
            exampleInput: this.exampleInput,
            examples: this.examples
        };
    }

    run(mockache, inputJson) {
        const ret = mockache.gpt4SingleMessage(this.prompt, inputJson);
        return ret
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