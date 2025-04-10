const CodeRunner = require('../models/CodeRunner');
const { v4: uuidv4 } = require('uuid');
const { InvalidGeneratedCodeError } = require('../errors/FunctionErrors');

describe('Container Tests', () => {
    let codeRunner;
    let testIdentifier;

    beforeAll(() => {
        codeRunner = new CodeRunner();
        testIdentifier = uuidv4();
    });

    afterAll(async () => {
        await codeRunner.cleanup(testIdentifier);
    }, 60000);

    test('1. kör en funktion med korrekt kod och får korrekt svar', async () => {
        const sourceCode = `const result = {
            sum: input.a + input.b
        };`;
        const result = await codeRunner.execute(sourceCode, testIdentifier, { a: 5, b: 5 });
        expect(result).toEqual({ sum: 10 });
    }, 60000);

    test('2. kastar InvalidGeneratedCodeError för syntaktiskt felaktig kod', async () => {
        const sourceCode = `const result = {
            sum: invalid_syntax_error_here
            missing_semicolon
            }`;

        await expect(codeRunner.execute(sourceCode, testIdentifier, { a: 5, b: 5 }))
            .rejects
            .toThrow(InvalidGeneratedCodeError);
    }, 60000);
/*
    test('3. hanterar runtime-fel och returnerar felmeddelande', async () => {
        const sourceCode = `
        if (!input.a || !input.b) {
            throw new Error('Båda värdena måste anges');
        }
        const result = {
            sum: input.a + input.b
        };`;

        // Testa med felaktig input
        const response = await codeRunner.execute(sourceCode, testIdentifier, { a: 5 });
        
        // Vi förväntar oss att få tillbaka ett felobjekt med felmeddelandet
        expect(response).toHaveProperty('error');
        expect(response.error).toBe('Båda värdena måste anges');
    }, 60000);*/
}); 