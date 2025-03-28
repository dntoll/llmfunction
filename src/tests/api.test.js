const request = require('supertest');
const express = require('express');
const APIController = require('../controllers/APIController');
const { setupRoutes } = require('../routes/llmfunction');
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

// Skapa en mock-version av Mockache som bara returnerar testdata
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        return { result: "test" };
    }
};

// Skapa en test-app
const app = express();
app.use(express.json());

// Skapa en controller med mockMockache
const controller = new APIController(mockMockache);
app.locals.apiController = controller;

// Sätt upp routes
setupRoutes(app, controller);

describe('API-tester', () => {
    let testIdentifier1;
    let testIdentifier2;

    beforeAll(async () => {
        await controller.initialize();
    });

    describe('Skapa och verifiera funktioner', () => {
        test('skapar två olika funktioner', async () => {
            // Skapa första funktionen
            const response1 = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test funktion 1",
                    exampleOutput: { result: "test1" },
                    examples: [
                        { input: { test: 1 }, output: { result: "test1" } }
                    ]
                });
            expect(response1.status).toBe(201);
            expect(response1.body).toHaveProperty('identifier');
            expect(response1.body).toHaveProperty('data');
            testIdentifier1 = response1.body.identifier;

            // Skapa andra funktionen
            const response2 = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test funktion 2",
                    exampleOutput: { result: "test2" },
                    examples: [
                        { input: { test: 2 }, output: { result: "test2" } }
                    ]
                });
            expect(response2.status).toBe(201);
            expect(response2.body).toHaveProperty('identifier');
            expect(response2.body).toHaveProperty('data');
            testIdentifier2 = response2.body.identifier;
        });

        test('returnerar 400 vid ogiltig data', async () => {
            const response = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Test funktion",
                    // Saknar exampleOutput och examples
                });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Saknade obligatoriska fält');
        });

        test('hämtar de skapade funktionerna', async () => {
            // Hämta första funktionen
            const getResponse1 = await request(app)
                .get(`/llmfunction/get/${testIdentifier1}`);
            expect(getResponse1.status).toBe(200);
            expect(getResponse1.body.prompt).toBe("Test funktion 1");

            // Hämta andra funktionen
            const getResponse2 = await request(app)
                .get(`/llmfunction/get/${testIdentifier2}`);
            expect(getResponse2.status).toBe(200);
            expect(getResponse2.body.prompt).toBe("Test funktion 2");
        });

        test('returnerar 404 vid icke-existerande funktion', async () => {
            const response = await request(app)
                .get('/llmfunction/get/icke-existerande-id');
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('hittades inte');
        });

        test('listar alla funktioner', async () => {
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

    describe('Kör funktioner', () => {
        test('kör en funktion', async () => {
            const response = await request(app)
                .post(`/llmfunction/run/${testIdentifier1}`)
                .send({ test: 1 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('result');
        });

        test('returnerar 404 vid körning av icke-existerande funktion', async () => {
            const response = await request(app)
                .post('/llmfunction/run/icke-existerande-id')
                .send({ test: 1 });

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('hittades inte');
        });

        test('returnerar 400 när mockache inte är initialiserad', async () => {
            // Skapa en ny app med en controller utan mockache
            const testApp = express();
            testApp.use(express.json());
            const controllerWithoutMockache = new APIController();
            await controllerWithoutMockache.initialize();
            testApp.locals.apiController = controllerWithoutMockache;
            setupRoutes(testApp, controllerWithoutMockache);

            const response = await request(testApp)
                .post(`/llmfunction/run/${testIdentifier1}`)
                .send({ test: 1 });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Mockache är inte initialiserad');
        });
    });

    describe('Testa funktioner', () => {
        test('kör alla exempel för en funktion', async () => {
            const response = await request(app)
                .post(`/llmfunction/test/${testIdentifier1}`);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                identifier: testIdentifier1,
                totalTests: 1,
                results: expect.any(Array)
            });
        });

        test('returnerar 404 vid test av icke-existerande funktion', async () => {
            const response = await request(app)
                .post('/llmfunction/test/icke-existerande-id');

            expect(response.status).toBe(404);
            expect(response.body.error).toContain('hittades inte');
        });

        test('returnerar 400 när mockache inte är initialiserad', async () => {
            // Skapa en ny app med en controller utan mockache
            const testApp = express();
            testApp.use(express.json());
            const controllerWithoutMockache = new APIController();
            await controllerWithoutMockache.initialize();
            testApp.locals.apiController = controllerWithoutMockache;
            setupRoutes(testApp, controllerWithoutMockache);

            const response = await request(testApp)
                .post(`/llmfunction/test/${testIdentifier1}`);

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Mockache är inte initialiserad');
        });
    });

    describe('Ta bort funktioner', () => {
        test('tar bort funktionerna', async () => {
            // Ta bort första funktionen
            const removeResponse1 = await request(app)
                .delete(`/llmfunction/remove/${testIdentifier1}`);
            expect(removeResponse1.status).toBe(204);

            // Ta bort andra funktionen
            const removeResponse2 = await request(app)
                .delete(`/llmfunction/remove/${testIdentifier2}`);
            expect(removeResponse2.status).toBe(204);
        });

        test('verifierar att funktionerna är borta', async () => {
            // Kontrollera att get returnerar 404
            const getResponse1 = await request(app)
                .get(`/llmfunction/get/${testIdentifier1}`);
            expect(getResponse1.status).toBe(404);

            const getResponse2 = await request(app)
                .get(`/llmfunction/get/${testIdentifier2}`);
            expect(getResponse2.status).toBe(404);

            // Kontrollera att run returnerar 404
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
}); 