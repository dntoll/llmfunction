const APIController = require('../controllers/APIController');
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

// Create a mock version of Mockache that only returns test data
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        return { result: "testu" };
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

    describe('Create and verify functions', () => {
        test('creates two different functions', async () => {
            // Create first function
            const result1 = await controller.createFunction({
                prompt: "Test function 1",
                exampleOutput: { result: "test1" },
                examples: [
                    { input: { test: 1 }, output: { result: "test1" } }
                ]
            });
            expect(result1).toHaveProperty('identifier');
            expect(result1).toHaveProperty('data');
            testIdentifier1 = result1.identifier;

            // Create second function
            const result2 = await controller.createFunction({
                prompt: "Test function 2",
                exampleOutput: { result: "test2" },
                examples: [
                    { input: { test: 2 }, output: { result: "test2" } }
                ]
            });
            expect(result2).toHaveProperty('identifier');
            expect(result2).toHaveProperty('data');
            testIdentifier2 = result2.identifier;
        });

        test('throws FunctionValidationError for invalid data', async () => {
            await expect(controller.createFunction({
                prompt: "Test function",
                // Missing exampleOutput and examples
            })).rejects.toThrow(FunctionValidationError);
        });

        test('retrieves the created functions', async () => {
            // Get first function
            const data1 = await controller.getFunction(testIdentifier1);
            expect(data1.prompt).toBe("Test function 1");

            // Get second function
            const data2 = await controller.getFunction(testIdentifier2);
            expect(data2.prompt).toBe("Test function 2");
        });

        test('throws FunctionNotFoundError for non-existent function', async () => {
            await expect(controller.getFunction('non-existent-id'))
                .rejects.toThrow(FunctionNotFoundError);
        });

        test('lists all functions', async () => {
            const functions = await controller.listFunctions();
            expect(functions).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ identifier: testIdentifier1 }),
                    expect.objectContaining({ identifier: testIdentifier2 })
                ])
            );
        });
    });

    describe('Run functions', () => {
        test('runs a function', async () => {
            const result = await controller.runFunction(testIdentifier1, { test: 1 });
            expect(result).toHaveProperty('result');
        });

        test('throws FunctionNotFoundError when running non-existent function', async () => {
            await expect(controller.runFunction('non-existent-id', { test: 1 }))
                .rejects.toThrow(FunctionNotFoundError);
        });

        
    });

    describe('Test functions', () => {
        test('runs all examples for a function', async () => {
            const result = await controller.testFunction(testIdentifier1);
            expect(result).toMatchObject({
                identifier: testIdentifier1,
                totalTests: 1,
                results: expect.any(Array)
            });
        });

        test('throws FunctionNotFoundError when testing non-existent function', async () => {
            await expect(controller.testFunction('non-existent-id'))
                .rejects.toThrow(FunctionNotFoundError);
        });

        
    });

    describe('Remove functions', () => {
        test('removes the functions', async () => {
            // Remove first function
            await controller.removeFunction(testIdentifier1);

            // Remove second function
            await controller.removeFunction(testIdentifier2);
        });

        test('verifies that the functions are gone', async () => {
            // Check that get throws FunctionNotFoundError
            await expect(controller.getFunction(testIdentifier1))
                .rejects.toThrow(FunctionNotFoundError);
            await expect(controller.getFunction(testIdentifier2))
                .rejects.toThrow(FunctionNotFoundError);

            // Check that run throws FunctionNotFoundError
            await expect(controller.runFunction(testIdentifier1, { test: 1 }))
                .rejects.toThrow(FunctionNotFoundError);
            await expect(controller.runFunction(testIdentifier2, { test: 2 }))
                .rejects.toThrow(FunctionNotFoundError);
        });
    });
}); 