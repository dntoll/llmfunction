const APIController = require('../controllers/APIController');
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

// Skapa en mock-version av Mockache som bara returnerar testdata
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        return { result: "test" };
    }
};

describe('APIController', () => {
    let controller;
    let testIdentifier1;
    let testIdentifier2;

    beforeAll(async () => {
        controller = new APIController(mockMockache);
        await controller.initialize();
    });

    describe('Skapa och verifiera funktioner', () => {
        test('skapar två olika funktioner', async () => {
            // Skapa första funktionen
            const result1 = await controller.createFunction({
                prompt: "Test funktion 1",
                exampleOutput: { result: "test1" },
                examples: [
                    { input: { test: 1 }, output: { result: "test1" } }
                ]
            });
            expect(result1).toHaveProperty('identifier');
            expect(result1).toHaveProperty('data');
            testIdentifier1 = result1.identifier;

            // Skapa andra funktionen
            const result2 = await controller.createFunction({
                prompt: "Test funktion 2",
                exampleOutput: { result: "test2" },
                examples: [
                    { input: { test: 2 }, output: { result: "test2" } }
                ]
            });
            expect(result2).toHaveProperty('identifier');
            expect(result2).toHaveProperty('data');
            testIdentifier2 = result2.identifier;
        });

        test('kastar FunctionValidationError vid ogiltig data', async () => {
            await expect(controller.createFunction({
                prompt: "Test funktion",
                // Saknar exampleOutput och examples
            })).rejects.toThrow(FunctionValidationError);
        });

        test('hämtar de skapade funktionerna', async () => {
            // Hämta första funktionen
            const data1 = await controller.getFunction(testIdentifier1);
            expect(data1.prompt).toBe("Test funktion 1");

            // Hämta andra funktionen
            const data2 = await controller.getFunction(testIdentifier2);
            expect(data2.prompt).toBe("Test funktion 2");
        });

        test('kastar FunctionNotFoundError vid icke-existerande funktion', async () => {
            await expect(controller.getFunction('icke-existerande-id'))
                .rejects.toThrow(FunctionNotFoundError);
        });

        test('listar alla funktioner', async () => {
            const functions = await controller.listFunctions();
            expect(functions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ identifier: testIdentifier1 }),
                    expect.objectContaining({ identifier: testIdentifier2 })
                ])
            );
        });
    });

    describe('Kör funktioner', () => {
        test('kör en funktion', async () => {
            const result = await controller.runFunction(testIdentifier1, { test: 1 });
            expect(result).toHaveProperty('result');
        });

        test('kastar FunctionNotFoundError vid körning av icke-existerande funktion', async () => {
            await expect(controller.runFunction('icke-existerande-id', { test: 1 }))
                .rejects.toThrow(FunctionNotFoundError);
        });

        test('kastar FunctionExecutionError när mockache inte är initialiserad', async () => {
            const controllerWithoutMockache = new APIController();
            await controllerWithoutMockache.initialize();
            
            await expect(controllerWithoutMockache.runFunction(testIdentifier1, { test: 1 }))
                .rejects.toThrow(FunctionExecutionError);
        });
    });

    describe('Testa funktioner', () => {
        test('kör alla exempel för en funktion', async () => {
            const result = await controller.testFunction(testIdentifier1);
            expect(result).toMatchObject({
                identifier: testIdentifier1,
                totalTests: 1,
                results: expect.any(Array)
            });
        });

        test('kastar FunctionNotFoundError vid test av icke-existerande funktion', async () => {
            await expect(controller.testFunction('icke-existerande-id'))
                .rejects.toThrow(FunctionNotFoundError);
        });

        test('kastar FunctionExecutionError när mockache inte är initialiserad', async () => {
            const controllerWithoutMockache = new APIController();
            await controllerWithoutMockache.initialize();
            
            await expect(controllerWithoutMockache.testFunction(testIdentifier1))
                .rejects.toThrow(FunctionExecutionError);
        });
    });

    describe('Ta bort funktioner', () => {
        test('tar bort funktionerna', async () => {
            // Ta bort första funktionen
            await controller.removeFunction(testIdentifier1);

            // Ta bort andra funktionen
            await controller.removeFunction(testIdentifier2);
        });

        test('verifierar att funktionerna är borta', async () => {
            // Kontrollera att get kastar FunctionNotFoundError
            await expect(controller.getFunction(testIdentifier1))
                .rejects.toThrow(FunctionNotFoundError);
            await expect(controller.getFunction(testIdentifier2))
                .rejects.toThrow(FunctionNotFoundError);

            // Kontrollera att run kastar FunctionNotFoundError
            await expect(controller.runFunction(testIdentifier1, { test: 1 }))
                .rejects.toThrow(FunctionNotFoundError);
            await expect(controller.runFunction(testIdentifier2, { test: 2 }))
                .rejects.toThrow(FunctionNotFoundError);
        });
    });
}); 