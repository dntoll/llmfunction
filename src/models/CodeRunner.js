const ContainerClient = require('./ContainerClient');

class CodeRunner {
    constructor() {
        this.containerClient = new ContainerClient();
    }

    async generateCode(prompt, examples, mockache) {
        if (!mockache) {
            throw new Error('Mockache is required for code generation');
        }

        const codeGenerationPrompt = `
        You are a code generator. Your task is to generate JavaScript code that implements the following function:
        
        Prompt: ${prompt}
        
        Input format: ${JSON.stringify(examples[0].input)}
        Output format: ${JSON.stringify(examples[0].output)}
        
        The code should:
        1. Use the 'input' variable that contains the input object
        2. Calculate the result and store it in a variable named 'result'
        3. The result variable should match the structure of Example Output
        
        Generate only the JavaScript code, no explanations or markdown.
        The code should be a simple calculation that uses the input variable and creates a result variable.
        Do not include any input parsing or output formatting - that is already handled.
        Do not include any console.log statements or other output formatting.
        Do not include any error handling or try-catch blocks.
        `;

        const exampleCode = {
            code: `const result = {
            // Your implementation here
            sum: 10 //output formatted code 
        };`
        };

        const generatedCode = await mockache.gpt4SingleMessage(codeGenerationPrompt, { prompt, exampleCode }, exampleCode);

        
        console.log('Generated code:', generatedCode);
        // Extrahera koden från JSON-svaret
        const code = generatedCode.code ? generatedCode.code : generatedCode;
        
        // Validera att koden innehåller en result-variabel
        if (!code.includes('const result =') && !code.includes('let result =')) {
            throw new Error('Generated code must create a result variable');
        }

        // Validera att koden inte innehåller förbjudna konstruktioner
        const forbiddenPatterns = [
            'console.log',
            'process.argv',
            'JSON.parse',
            'JSON.stringify',
            'try {',
            'catch (',
            'throw new',
            'require(',
            'import ',
            'export ',
            'module.exports'
        ];

        for (const pattern of forbiddenPatterns) {
            if (code.includes(pattern)) {
                throw new Error(`Generated code contains forbidden pattern: ${pattern}`);
            }
        }

        

        return code;
    }

    async execute(sourceCode, functionId, inputJson) {
        // Lägg till input parsing och output formatting
        const completeCode = `
// Read input from command line arguments
//console.log('Received input:', process.argv[2]);
const rawInput = JSON.parse(process.argv[2]);
const input = rawInput.input;  // Extrahera det faktiska input-objektet
//console.log('Parsed input:', input);

// Process the input according to the prompt
${sourceCode}

// Output the result
//console.log('Result:', result);
console.log('Stringified result:', JSON.stringify(result));
`;

        //console.log('Complete code:', completeCode);

        return await this.containerClient.execute(completeCode, functionId, inputJson);
    }

    async cleanup(functionId) {
        await this.containerClient.removeContainer(functionId);
    }
}

module.exports = CodeRunner; 