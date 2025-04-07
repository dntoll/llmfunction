const request = require('supertest');
const express = require('express');
const APIController = require('../controllers/APIController');
const { setupRoutes } = require('../routes/llmfunction');

// Create a mock version of Mockache that only returns test data
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        return `const result = {
            // Your implementation here
            sum: 10 
        };`;
    }
};

describe('Run functions with code', () => {
    let runcodeTestIdentifier;
    let app;

    beforeEach(async () => {
        // Create a test app
        app = express();
        app.use(express.json());

        // Create a controller with mockMockache
        const controller = new APIController(mockMockache);
        await controller.initialize();
        app.locals.apiController = controller;

        // Set up routes
        setupRoutes(app, controller);

        // Skapa en funktion för att testa runcode
        const response = await request(app)
            .post('/llmfunction/create')
            .send({
                prompt: "add numbers in input",
                examples: [
                    { input: { a: 5, b:5 }, output: { sum: 10 } }
                ]
            });
        expect(response.status).toBe(201);
        runcodeTestIdentifier = response.body.identifier;
    });

    test('runs a function with code', async () => {
        const response = await request(app)
            .post(`/llmfunction/runcode/${runcodeTestIdentifier}`)
            .send({ value: 5 });

        console.log(response.body);
        expect(response.status).toBe(200);
        expect(response.body.sum).toBe(10);
    }, 10000);

    /*test('returns 404 when running non-existent function with code', async () => {
        const response = await request(app)
            .post('/llmfunction/runcode/non-existent-id')
            .send({ test: 1 });

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
    });

    test('returns 400 when request body is invalid', async () => {
        const response = await request(app)
            .post(`/llmfunction/runcode/${runcodeTestIdentifier}`)
            .send('invalid-json');

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid request body');
    });

    test('creates and reuses container for same function', async () => {
        // Första körningen skapar containern
        const response1 = await request(app)
            .post(`/llmfunction/runcode/${runcodeTestIdentifier}`)
            .send({ test: 1 });

        expect(response1.status).toBe(200);

        // Andra körningen använder samma container
        const response2 = await request(app)
            .post(`/llmfunction/runcode/${runcodeTestIdentifier}`)
            .send({ test: 2 });

        expect(response2.status).toBe(200);
        expect(response2.body.status).toBe('completed');
    });*/
}); 