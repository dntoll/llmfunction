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
        const result = await codeRunner.execute(sourceCode, testIdentifier, { a: 5, b: 5 });
        expect(result).toEqual({ output: { sum: 10 } });
    }, 30000);
}); 