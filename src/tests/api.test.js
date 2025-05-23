const request = require('supertest');
const express = require('express');
const APIController = require('../controllers/APIController');
const { setupRoutes } = require('../routes/llmfunction');
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

// Create a mock version of Mockache that only returns test data
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        return { result: "test" };
    }
};

// Create a mock version of Mockache for improved prompt tests
const mockMockacheWithImprovedPrompt = {
    gpt4SingleMessage: (prompt, input) => {
        return { prompt: "new improved prompt" };
    }
};

// Create a test app
const app = express();
app.use(express.json());

// Create a controller with mockMockache
const controller = new APIController(mockMockache);
app.locals.apiController = controller;

// Set up routes
setupRoutes(app, controller);

describe('API Tests', () => {
    let testIdentifier1;
    let testIdentifier2;

    beforeAll(async () => {
        await controller.initialize();
    });

    describe('Create and verify functions', () => {
        test('creates two different functions', async () => {
            // Create first function
            const response1 = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function 1",
                    examples: [
                        { input: { test: 1 }, output: { result: "test1" } }
                    ]
                });
            expect(response1.status).toBe(201);
            expect(response1.body).toHaveProperty('identifier');
            expect(response1.body).toHaveProperty('data');
            testIdentifier1 = response1.body.identifier;

            // Create second function
            const response2 = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function 2",
                    examples: [
                        { input: { test: 2 }, output: { result: "test2" } }
                    ]
                });
            expect(response2.status).toBe(201);
            expect(response2.body).toHaveProperty('identifier');
            expect(response2.body).toHaveProperty('data');
            testIdentifier2 = response2.body.identifier;
        });

        test('returns 400 for invalid data', async () => {
            const response = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function",
                    // Missing exampleOutput and examples
                });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Examples must be non empty array');
        });

        test('retrieves the created functions', async () => {
            // Get first function
            const getResponse1 = await request(app)
                .get(`/llmfunction/get/${testIdentifier1}`);
            expect(getResponse1.status).toBe(200);
            expect(getResponse1.body.prompt).toBe("Test function 1");

            // Get second function
            const getResponse2 = await request(app)
                .get(`/llmfunction/get/${testIdentifier2}`);
            expect(getResponse2.status).toBe(200);
            expect(getResponse2.body.prompt).toBe("Test function 2");
        });

        test('returns 404 for non-existent function', async () => {
            const response = await request(app)
                .get('/llmfunction/get/non-existent-id');
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

        test('lists all functions', async () => {
            const response = await request(app)
                .get('/llmfunction/list');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ identifier: testIdentifier1 }),
                    expect.objectContaining({ identifier: testIdentifier2 })
                ])
            );
        });
    });

    describe('Run functions', () => {
        test('runs a function', async () => {
            const response = await request(app)
                .post(`/llmfunction/run/${testIdentifier1}`)
                .send({ test: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('result');
        });

        test('returns 404 when running non-existent function', async () => {
            const response = await request(app)
                .post('/llmfunction/run/non-existent-id')
                .send({ test: 1 });

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

    });

    describe('Test functions', () => {
        test('runs all examples for a function', async () => {
            const response = await request(app)
                .post(`/llmfunction/test/${testIdentifier1}`);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                identifier: testIdentifier1,
                totalTests: 1,
                results: expect.any(Array)
            });
        });

        test('returns 404 when testing non-existent function', async () => {
            const response = await request(app)
                .post('/llmfunction/test/non-existent-id');

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

    });

    describe('Remove functions', () => {
        test('removes the functions', async () => {
            // Remove first function
            const removeResponse1 = await request(app)
                .delete(`/llmfunction/remove/${testIdentifier1}`);
            expect(removeResponse1.status).toBe(204);

            // Remove second function
            const removeResponse2 = await request(app)
                .delete(`/llmfunction/remove/${testIdentifier2}`);
            expect(removeResponse2.status).toBe(204);
        });

        test('verifies that the functions are gone', async () => {
            // Check that get returns 404
            const getResponse1 = await request(app)
                .get(`/llmfunction/get/${testIdentifier1}`);
            expect(getResponse1.status).toBe(404);

            const getResponse2 = await request(app)
                .get(`/llmfunction/get/${testIdentifier2}`);
            expect(getResponse2.status).toBe(404);

            // Check that run returns 404
            const runResponse1 = await request(app)
                .post(`/llmfunction/run/${testIdentifier1}`)
                .send({ test: 1 });
            expect(runResponse1.status).toBe(404);

            const runResponse2 = await request(app)
                .post(`/llmfunction/run/${testIdentifier2}`)
                .send({ test: 2 });
            expect(runResponse2.status).toBe(404);
        });
    });

    describe('Improve functions', () => {
        let improveTestIdentifier;
        let improvedTestIdentifier;
        let improveController;
        let testApp;

        beforeEach(async () => {
            // Create a new app with the improved prompt mock
            testApp = express();
            testApp.use(express.json());
            improveController = new APIController(mockMockacheWithImprovedPrompt);
            await improveController.initialize();
            testApp.locals.apiController = improveController;
            setupRoutes(testApp, improveController);

            // Create a function to improve
            const response = await request(testApp)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function to improve",
                    exampleOutput: { result: "test" },
                    examples: [
                        { input: { test: 1 }, output: { result: "test" } }
                    ]
                });
            expect(response.status).toBe(201);
            improveTestIdentifier = response.body.identifier;
        });

        test('improves a function successfully', async () => {
            const response = await request(testApp)
                .post(`/llmfunction/improve/${improveTestIdentifier}`);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                message: 'Prompt improved',
                newPrompt: "new improved prompt"
            });
            //remove the function here
            await request(testApp)
                .delete(`/llmfunction/remove/${response.body.identifier}`);    
        });

        test('returns 404 when improving non-existent function', async () => {
            const response = await request(testApp)
                .post('/llmfunction/improve/non-existent-id');

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

        

        afterEach(async () => {
            // Clean up by removing the test function
            await request(testApp)
                .delete(`/llmfunction/remove/${improveTestIdentifier}`);
        });
    });

    describe('Add test cases', () => {
        let testIdentifier;

        beforeEach(async () => {
            // Create a function to add tests to
            const response = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function for adding tests",
                    exampleOutput: { result: "test" },
                    examples: [
                        { input: { test: 1 }, output: { result: "test" } }
                    ]
                });
            expect(response.status).toBe(201);
            testIdentifier = response.body.identifier;
        });

        test('adds a valid test case successfully', async () => {
            const newTestCase = {
                input: { test: 2 },
                output: { result: "test2" }
            };

            const response = await request(app)
                .post(`/llmfunction/add-test/${testIdentifier}`)
                .send(newTestCase);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Test case added successfully');
            expect(response.body.data.examples).toHaveLength(2);
            expect(response.body.data.examples[1]).toEqual(newTestCase);
        });

        test('returns 404 when adding test to non-existent function', async () => {
            const response = await request(app)
                .post('/llmfunction/add-test/non-existent-id')
                .send({
                    input: { test: 1 },
                    output: { result: "test" }
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

        test('returns 400 for invalid test case', async () => {
            const invalidTestCase = {
                input: "not an object",
                output: { result: "test" }
            };

            const response = await request(app)
                .post(`/llmfunction/add-test/${testIdentifier}`)
                .send(invalidTestCase);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('must have a valid input object');
        });

        afterEach(async () => {
            // Clean up by removing the test function
            await request(app)
                .delete(`/llmfunction/remove/${testIdentifier}`);
        });
    });

    describe('Update test cases', () => {
        let testIdentifier;

        beforeEach(async () => {
            // Create a function to update tests for
            const response = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function for updating tests",
                    exampleOutput: { result: "test" },
                    examples: [
                        { input: { test: 1 }, output: { result: "test1" } },
                        { input: { test: 2 }, output: { result: "test2" } }
                    ]
                });
            expect(response.status).toBe(201);
            testIdentifier = response.body.identifier;
        });

        test('updates a valid test case successfully', async () => {
            const updatedTestCase = {
                input: { test: 1, updated: true },
                output: { result: "test1", updated: true }
            };

            const response = await request(app)
                .put(`/llmfunction/update-test/${testIdentifier}/0`)
                .send(updatedTestCase);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Test case updated successfully');
            expect(response.body.data.examples[0]).toEqual(updatedTestCase);
            expect(response.body.data.examples[1]).toEqual({
                input: { test: 2 },
                output: { result: "test2" }
            });
        });

        test('returns 404 when updating test in non-existent function', async () => {
            const response = await request(app)
                .put('/llmfunction/update-test/non-existent-id/0')
                .send({
                    input: { test: 1 },
                    output: { result: "test" }
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

        test('returns 400 for invalid test case', async () => {
            const invalidTestCase = {
                input: "not an object",
                output: { result: "test" }
            };

            const response = await request(app)
                .put(`/llmfunction/update-test/${testIdentifier}/0`)
                .send(invalidTestCase);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('must have a valid input object');
        });

        test('returns 400 for invalid index', async () => {
            const validTestCase = {
                input: { test: 1 },
                output: { result: "test" }
            };

            const response = await request(app)
                .put(`/llmfunction/update-test/${testIdentifier}/999`)
                .send(validTestCase);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid test case index');
        });

        test('returns 400 for negative index', async () => {
            const validTestCase = {
                input: { test: 1 },
                output: { result: "test" }
            };

            const response = await request(app)
                .put(`/llmfunction/update-test/${testIdentifier}/-1`)
                .send(validTestCase);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid test case index');
        });

        afterEach(async () => {
            // Clean up by removing the test function
            await request(app)
                .delete(`/llmfunction/remove/${testIdentifier}`);
        });
    });

    describe('Remove test cases', () => {
        let testIdentifier;

        beforeEach(async () => {
            // Skapa en funktion att testa
            const response = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test function for removing tests",
                    exampleOutput: { result: "test" },
                    examples: [
                        { input: { test: 1 }, output: { result: "test1" } },
                        { input: { test: 2 }, output: { result: "test2" } }
                    ]
                });
            expect(response.status).toBe(201);
            testIdentifier = response.body.identifier;
        });

        test('removes a test case successfully', async () => {
            const response = await request(app)
                .delete(`/llmfunction/remove-test/${testIdentifier}/0`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Test case removed successfully');
            expect(response.body.data.examples).toHaveLength(1);
            expect(response.body.data.examples[0]).toEqual({
                input: { test: 2 },
                output: { result: "test2" }
            });
        });

        test('returns 404 when removing test from non-existent function', async () => {
            const response = await request(app)
                .delete('/llmfunction/remove-test/non-existent-id/0');

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

        test('returns 400 for invalid index', async () => {
            const response = await request(app)
                .delete(`/llmfunction/remove-test/${testIdentifier}/999`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid test case index');
        });

        test('returns 400 for negative index', async () => {
            const response = await request(app)
                .delete(`/llmfunction/remove-test/${testIdentifier}/-1`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid test case index');
        });

        afterEach(async () => {
            await request(app)
                .delete(`/llmfunction/remove/${testIdentifier}`);
        });
    });

    describe('Update prompt', () => {
        let testIdentifier;

        beforeEach(async () => {
            const response = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Original test function",
                    exampleOutput: { result: "test" },
                    examples: [
                        { input: { test: 1 }, output: { result: "test1" } }
                    ]
                });
            expect(response.status).toBe(201);
            testIdentifier = response.body.identifier;
        });

        test('updates prompt successfully', async () => {
            const newPrompt = "Updated test function";
            const response = await request(app)
                .put(`/llmfunction/update-prompt/${testIdentifier}`)
                .send({ prompt: newPrompt });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Prompt updated successfully');
            expect(response.body.data.prompt).toBe(newPrompt);
        });

        test('returns 404 when updating prompt of non-existent function', async () => {
            const response = await request(app)
                .put('/llmfunction/update-prompt/non-existent-id')
                .send({ prompt: "New prompt" });

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });

        test('returns 400 when prompt is missing', async () => {
            const response = await request(app)
                .put(`/llmfunction/update-prompt/${testIdentifier}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Prompt must be a non-empty string');
        });

        test('returns 400 when prompt is not a string', async () => {
            const response = await request(app)
                .put(`/llmfunction/update-prompt/${testIdentifier}`)
                .send({ prompt: 123 });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Prompt must be a non-empty string');
        });

        afterEach(async () => {
            await request(app)
                .delete(`/llmfunction/remove/${testIdentifier}`);
        });
    });
});

describe('Test Results', () => {
    let testIdentifier;
    let testController;
    let testApp;

    beforeEach(async () => {
        // Skapa en ny app med en mock för testresultat
        testApp = express();
        testApp.use(express.json());
        testController = new APIController(mockMockache);
        await testController.initialize();
        testApp.locals.apiController = testController;
        setupRoutes(testApp, testController);

        // Skapa en funktion att testa
        const response = await request(testApp)
            .post('/llmfunction/create')
            .send({
                prompt: "Test function for test results",
                exampleOutput: { result: "test" },
                examples: [
                    { input: { test: 1 }, output: { result: "test1" } },
                    { input: { test: 2 }, output: { result: "test2" } }
                ]
            });
        expect(response.status).toBe(201);
        testIdentifier = response.body.identifier;
    });

    test('saves test results when running tests', async () => {
        // Kör tester
        const testResponse = await request(testApp)
            .post(`/llmfunction/test/${testIdentifier}`);

        expect(testResponse.status).toBe(200);
        expect(testResponse.body).toMatchObject({
            identifier: testIdentifier,
            totalTests: 2,
            passedTests: expect.any(Number),
            failedTests: expect.any(Number),
            results: expect.any(Array),
            lastRun: expect.any(String)
        });

        // Verifiera att resultaten sparas
        const getResponse = await request(testApp)
            .get(`/llmfunction/get/${testIdentifier}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.testResults).toBeDefined();
        expect(getResponse.body.testResults).toMatchObject({
            identifier: testIdentifier,
            totalTests: 2,
            passedTests: expect.any(Number),
            failedTests: expect.any(Number),
            results: expect.any(Array),
            lastRun: expect.any(String)
        });
    });

    test('clears test results when function is modified', async () => {
        // Kör tester först
        await request(testApp)
            .post(`/llmfunction/test/${testIdentifier}`);

        // Uppdatera funktionen genom att lägga till ett nytt test
        const newTestCase = {
            input: { test: 3 },
            output: { result: "test3" }
        };

        const updateResponse = await request(testApp)
            .post(`/llmfunction/add-test/${testIdentifier}`)
            .send(newTestCase);

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.testResults).toBeNull();
    });

    test('clears test results when prompt is updated', async () => {
        // Kör tester först
        await request(testApp)
            .post(`/llmfunction/test/${testIdentifier}`);

        // Uppdatera prompten
        const updateResponse = await request(testApp)
            .put(`/llmfunction/update-prompt/${testIdentifier}`)
            .send({ prompt: "Updated test function" });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.testResults).toBeNull();
    });

    test('clears test results when test case is updated', async () => {
        // Kör tester först
        await request(testApp)
            .post(`/llmfunction/test/${testIdentifier}`);

        // Uppdatera ett testfall
        const updatedTestCase = {
            input: { test: 1, updated: true },
            output: { result: "test1", updated: true }
        };

        const updateResponse = await request(testApp)
            .put(`/llmfunction/update-test/${testIdentifier}/0`)
            .send(updatedTestCase);

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.testResults).toBeNull();
    });

    test('clears test results when test case is removed', async () => {
        // Kör tester först
        await request(testApp)
            .post(`/llmfunction/test/${testIdentifier}`);

        // Ta bort ett testfall
        const removeResponse = await request(testApp)
            .delete(`/llmfunction/remove-test/${testIdentifier}/0`);

        expect(removeResponse.status).toBe(200);
        expect(removeResponse.body.data.testResults).toBeNull();
    });

    afterEach(async () => {
        // Städa upp genom att ta bort testfunktionen
        await request(testApp)
            .delete(`/llmfunction/remove/${testIdentifier}`);
    });
}); 