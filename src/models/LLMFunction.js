const crypto = require('crypto');

class LLMFunction {
    constructor(prompt, exampleInput, examples) {
        this.prompt = prompt;
        this.exampleInput = exampleInput;
        this.examples = examples;
        this.identifier = this.generateIdentifier();
    }

    generateIdentifier() {
        const jsonString = JSON.stringify({
            prompt: this.prompt,
            exampleInput: this.exampleInput,
            examples: this.examples
        });
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    toJSON() {
        return {
            prompt: this.prompt,
            exampleInput: this.exampleInput,
            examples: this.examples
        };
    }

    static fromJSON(json) {
        return new LLMFunction(json.prompt, json.exampleInput, json.examples);
    }

    static validate(json) {
        // Kontrollera att alla obligatoriska fält finns och har rätt typ
        if (!json.prompt || typeof json.prompt !== 'string') return false;
        if (!json.exampleInput || typeof json.exampleInput !== 'object') return false;
        if (!Array.isArray(json.examples) || json.examples.length === 0) return false;

        // Kontrollera att varje exempel har input och output
        return json.examples.every(example => 
            example && 
            typeof example === 'object' && 
            'input' in example && 
            'output' in example
        );
    }
}

module.exports = LLMFunction; 