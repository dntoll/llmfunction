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
        
        Input example format: ${JSON.stringify(examples[0].input)}
        Output example format: ${JSON.stringify(examples[0].output)}
        
        The code should:
        1. Use the 'input' variable that contains the input object as in the input example format
        2. Calculate the result and store it in a variable named 'result' as in the example code
        3. The result variable content should match the structure of Example Output
        
        Generate only the JavaScript code, no explanations or markdown.
        The code should be a generic calculation that uses the input variable and creates a result variable. 
        Do not include any input parsing or output formatting - that is already handled.
        Do not include any console.log statements or other output formatting.
        Do not include any error handling or try-catch blocks.
        Code should try to implement generic code that can be used for any input and not just the example input. Avoid using the example input in the code.
        The result should be a const variable called "result" as in the example code. Even if there is a result variable in the json output.
        The example code needs indentation and newlines, please note that it should still be a part of a valid json object.
        IMPORTANT: Do not try to modify the result object while it is being created. First create the object, then modify it in separate statements.
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
        
        try {
            //code is json, make it a string
            const stringCode = JSON.stringify(code);
            // Validera att koden innehåller en result-variabel
            if (!stringCode.includes('const result =') && !stringCode.includes('let result =')) {
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
                if (stringCode.includes(pattern)) {
                    
                    throw new Error(`Generated code contains forbidden pattern: ${pattern}`);
                }
            }
        } catch (error) {
            console.error(code);
            throw new Error(`Generated code contains forbidden pattern: ${error} `);
        }

        

        return code;
    }

    async execute(sourceCode, functionId, inputJson) {
        // Lägg till input parsing och output formatting
        const completeCode = `
// Process the input according to the prompt
${sourceCode}

// Return the result
return result;
`;

        console.log('Executing code with input:', JSON.stringify(inputJson, null, 2));
        const outputLines = await this.containerClient.execute(completeCode, functionId, inputJson);
        console.log('Execution result:', JSON.stringify(outputLines, null, 2));
        return outputLines;
    }

    async cleanup(functionId) {
        await this.containerClient.removeContainer(functionId);
    }
}

module.exports = CodeRunner; 