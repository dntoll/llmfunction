const request = require('supertest');
const express = require('express');
const APIController = require('../controllers/APIController');
const { setupRoutes } = require('../routes/llmfunction');

// Skapa en mock-version av Mockache
const mockMockache = {
    gpt4SingleMessage: (prompt, input) => {
        // Simulera enkel logik för tester
        if (prompt.includes('temperatur')) {
            const celsius = input.celsius;
            return { fahrenheit: (celsius * 9/5) + 32 };
        } else if (prompt.includes('längd')) {
            const meters = input.meters;
            return { feet: meters * 3.28084 };
        }
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

    describe('Skapa och verifiera funktioner', () => {
        test('skapar två olika funktioner', async () => {
            // Skapa första funktionen
            const response1 = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Konvertera temperatur från Celsius till Fahrenheit",
                    exampleInput: { celsius: 0 },
                    examples: [
                        { input: { celsius: 0 }, output: { fahrenheit: 32 } },
                        { input: { celsius: 100 }, output: { fahrenheit: 212 } }
                    ]
                });
            expect(response1.status).toBe(201);
            testIdentifier1 = response1.body.identifier;

            // Skapa andra funktionen
            const response2 = await request(app)
                .post('/llmfunction/create')
                .send({
                    prompt: "Konvertera längd från meter till fot",
                    exampleInput: { meters: 1 },
                    examples: [
                        { input: { meters: 1 }, output: { feet: 3.28084 } },
                        { input: { meters: 2 }, output: { feet: 6.56168 } }
                    ]
                });
            expect(response2.status).toBe(201);
            testIdentifier2 = response2.body.identifier;
        });

        test('hämtar de skapade funktionerna', async () => {
            // Hämta första funktionen
            const getResponse1 = await request(app)
                .get(`/llmfunction/get/${testIdentifier1}`);
            expect(getResponse1.status).toBe(200);
            expect(getResponse1.body.prompt).toBe("Konvertera temperatur från Celsius till Fahrenheit");

            // Hämta andra funktionen
            const getResponse2 = await request(app)
                .get(`/llmfunction/get/${testIdentifier2}`);
            expect(getResponse2.status).toBe(200);
            expect(getResponse2.body.prompt).toBe("Konvertera längd från meter till fot");
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
        test('kör temperaturkonvertering', async () => {
            const response = await request(app)
                .post(`/llmfunction/run/${testIdentifier1}`)
                .send({ celsius: 25 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ fahrenheit: 77 });
        });

        test('kör längdkonvertering', async () => {
            const response = await request(app)
                .post(`/llmfunction/run/${testIdentifier2}`)
                .send({ meters: 5 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ feet: 16.4042 });
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
                .send({ celsius: 25 });
            expect(runResponse1.status).toBe(400);

            const runResponse2 = await request(app)
                .post(`/llmfunction/run/${testIdentifier2}`)
                .send({ meters: 5 });
            expect(runResponse2.status).toBe(400);
        });
    });
}); 