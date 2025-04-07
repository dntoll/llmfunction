const CodeRunner = require('../models/CodeRunner');
const { v4: uuidv4 } = require('uuid');

describe('Container Tests', () => {
    let codeRunner;
    let testIdentifier;

    beforeAll(() => {
        codeRunner = new CodeRunner();
        testIdentifier = uuidv4();
    });

    afterAll(async () => {
        await codeRunner.cleanup(testIdentifier);
    });

    test('runs a function with code', async () => {
        const sourceCode = `const result = {
            // Your implementation here
            sum: 10 
        };`;

        const response = await codeRunner.execute(sourceCode, testIdentifier, { value: 5 });

        //console.log('Response:', response);
        expect(response.output).toBeDefined();
        expect(response.output.sum).toBe(10);
    }, 10000); // Öka timeout till 10 sekunder
}); 