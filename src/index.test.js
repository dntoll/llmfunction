const request = require('supertest');
const express = require('express');
const APIController = require('./controllers/APIController');
const fs = require('fs').promises;
const path = require('path');

// Hjälpfunktion för att rensa testdata
async function cleanupTestData() {
    try {
        // Ladda index-filen
        const indexPath = path.join('data', 'index.json');
        let index = {};
        try {
            const indexData = await fs.readFile(indexPath, 'utf8');
            index = JSON.parse(indexData);
        } catch (error) {
            // Om index-filen inte finns, inget att rensa
            return;
        }

        // Ta bort alla funktioner som skapades under testerna
        const testIdentifiers = Object.keys(index);
        for (const identifier of testIdentifiers) {
            const functionPath = path.join('data', 'functions', `${identifier}.json`);
            try {
                await fs.unlink(functionPath);
            } catch (error) {
                // Ignorera fel om filen inte finns
            }
            delete index[identifier];
        }

        // Spara uppdaterat index
        await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

        // Verifiera att alla funktioner är borta
        const remainingFunctions = Object.keys(index);
        if (remainingFunctions.length > 0) {
            console.warn('Varning: Några funktioner kunde inte rensas:', remainingFunctions);
        }
    } catch (error) {
        console.error('Fel vid rensning av testdata:', error);
    }
}

// Hjälpfunktion för att skapa en testapp
async function createTestApp() {
    const app = express();
    app.use(express.json());
    
    const controller = new APIController();
    await controller.initialize();
    app.locals.apiController = controller;

    app.post('/llmfunction/create', async (req, res) => {
        try {
            const result = await controller.createFunction(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    app.get('/llmfunction/get/:identifier', async (req, res) => {
        try {
            const result = await controller.getFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    app.get('/llmfunction/list', async (req, res) => {
        try {
            const functions = await controller.listFunctions();
            res.json(functions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/llmfunction/remove/:identifier', async (req, res) => {
        try {
            await controller.removeFunction(req.params.identifier);
            res.status(204).send();
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    return app;
}

describe('POST /llmfunction/create', () => {
    let app;

    beforeEach(async () => {
        await cleanupTestData();
        app = await createTestApp();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    test('skapar en funktion med giltig data', async () => {
        const requestData = {
            prompt: "Konvertera temperatur från Celsius till Fahrenheit",
            exampleInput: {
                celsius: 0
            },
            examples: [
                {
                    input: { celsius: 0 },
                    output: { fahrenheit: 32 }
                }
            ]
        };

        const response = await request(app)
            .post('/llmfunction/create')
            .send(requestData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('identifier');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toEqual(requestData);
        expect(typeof response.body.identifier).toBe('string');
        expect(response.body.identifier.length).toBe(64);

        // Verifiera att data sparades persistent
        const savedData = JSON.parse(await fs.readFile(path.join('data', 'functions', `${response.body.identifier}.json`), 'utf8'));
        expect(savedData).toEqual(requestData);
    });

    test('returnerar 400 när obligatoriska fält saknas', async () => {
        const invalidData = {
            prompt: "Konvertera temperatur",
            // exampleInput saknas
            examples: []
        };

        const response = await request(app)
            .post('/llmfunction/create')
            .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Saknade obligatoriska fält');
    });

    test('genererar samma identifier för samma data', async () => {
        const requestData = {
            prompt: "Test prompt",
            exampleInput: { test: "data" },
            examples: [{ input: { test: "data" }, output: { result: "data" } }]
        };

        const response1 = await request(app)
            .post('/llmfunction/create')
            .send(requestData);

        const response2 = await request(app)
            .post('/llmfunction/create')
            .send(requestData);

        expect(response1.body.identifier).toBe(response2.body.identifier);
    });
});

describe('GET /llmfunction/get/:identifier', () => {
    let app;
    let testIdentifier;

    beforeEach(async () => {
        await cleanupTestData();
        app = await createTestApp();
        // Skapa en testfunktion först
        const createResponse = await request(app)
            .post('/llmfunction/create')
            .send({
                prompt: "Test prompt",
                exampleInput: { test: "data" },
                examples: [{ input: { test: "data" }, output: { result: "data" } }]
            });
        
        testIdentifier = createResponse.body.identifier;
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    test('hämtar en existerande funktion', async () => {
        const response = await request(app)
            .get(`/llmfunction/get/${testIdentifier}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            prompt: "Test prompt",
            exampleInput: { test: "data" },
            examples: [{ input: { test: "data" }, output: { result: "data" } }]
        });
    });

    test('returnerar 404 för icke-existerande identifier', async () => {
        const response = await request(app)
            .get('/llmfunction/get/icke-existerande-identifier');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Funktion hittades inte');
    });
});

describe('DELETE /llmfunction/remove/:identifier', () => {
    let app;
    let testIdentifier;

    beforeEach(async () => {
        await cleanupTestData();
        app = await createTestApp();
        // Skapa en testfunktion först
        const createResponse = await request(app)
            .post('/llmfunction/create')
            .send({
                prompt: "Test prompt",
                exampleInput: { test: "data" },
                examples: [{ input: { test: "data" }, output: { result: "data" } }]
            });
        
        testIdentifier = createResponse.body.identifier;
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    test('tar bort en existerande funktion', async () => {
        const response = await request(app)
            .delete(`/llmfunction/remove/${testIdentifier}`);

        expect(response.status).toBe(204);

        // Verifiera att funktionen inte längre finns
        const getResponse = await request(app)
            .get(`/llmfunction/get/${testIdentifier}`);
        expect(getResponse.status).toBe(404);

        // Verifiera att funktionen inte finns i persistent lagring
        await expect(fs.access(path.join('data', 'functions', `${testIdentifier}.json`))).rejects.toThrow();
    });

    test('returnerar 404 för icke-existerande identifier', async () => {
        const response = await request(app)
            .delete('/llmfunction/remove/icke-existerande-identifier');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Funktion hittades inte');
    });
});

describe('GET /llmfunction/list', () => {
    let app;

    beforeEach(async () => {
        await cleanupTestData();
        app = await createTestApp();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    test('listar alla funktioner', async () => {
        // Skapa några testfunktioner
        const function1 = await request(app)
            .post('/llmfunction/create')
            .send({
                prompt: "Test prompt 1",
                exampleInput: { test: "data1" },
                examples: [{ input: { test: "data1" }, output: { result: "data1" } }]
            });

        const function2 = await request(app)
            .post('/llmfunction/create')
            .send({
                prompt: "Test prompt 2",
                exampleInput: { test: "data2" },
                examples: [{ input: { test: "data2" }, output: { result: "data2" } }]
            });

        const response = await request(app)
            .get('/llmfunction/list');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    identifier: function1.body.identifier,
                    prompt: "Test prompt 1"
                }),
                expect.objectContaining({
                    identifier: function2.body.identifier,
                    prompt: "Test prompt 2"
                })
            ])
        );
    });

    test('returnerar tom array när inga funktioner finns', async () => {
        const response = await request(app)
            .get('/llmfunction/list');

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
});

describe('APIController', () => {
    let controller;

    beforeEach(async () => {
        await cleanupTestData();
        controller = new APIController();
        await controller.initialize();
    });

    afterEach(async () => {
        await cleanupTestData();
    });

    test('skapar en funktion med giltig data', async () => {
        const data = {
            prompt: "Test prompt",
            exampleInput: { test: "data" },
            examples: [{ input: { test: "data" }, output: { result: "data" } }]
        };

        const result = await controller.createFunction(data);

        expect(result).toHaveProperty('identifier');
        expect(result).toHaveProperty('data');
        expect(result.data).toEqual(data);
        expect(typeof result.identifier).toBe('string');
        expect(result.identifier.length).toBe(64);

        // Verifiera persistent lagring
        const savedData = JSON.parse(await fs.readFile(path.join('data', 'functions', `${result.identifier}.json`), 'utf8'));
        expect(savedData).toEqual(data);
    });

    test('kastar fel vid ogiltig data', async () => {
        const invalidData = {
            prompt: "Test prompt",
            // exampleInput saknas
            examples: []
        };

        await expect(controller.createFunction(invalidData)).rejects.toThrow();
    });

    test('hämtar en existerande funktion', async () => {
        const data = {
            prompt: "Test prompt",
            exampleInput: { test: "data" },
            examples: [{ input: { test: "data" }, output: { result: "data" } }]
        };

        const createResult = await controller.createFunction(data);
        const getResult = await controller.getFunction(createResult.identifier);

        expect(getResult).toEqual(data);
    });

    test('kastar fel vid icke-existerande identifier', async () => {
        await expect(controller.getFunction('icke-existerande')).rejects.toThrow();
    });

    test('tar bort en funktion', async () => {
        const data = {
            prompt: "Test prompt",
            exampleInput: { test: "data" },
            examples: [{ input: { test: "data" }, output: { result: "data" } }]
        };

        const createResult = await controller.createFunction(data);
        await controller.removeFunction(createResult.identifier);

        // Verifiera att funktionen inte längre finns
        await expect(controller.getFunction(createResult.identifier)).rejects.toThrow();

        // Verifiera att funktionen inte finns i persistent lagring
        await expect(fs.access(path.join('data', 'functions', `${createResult.identifier}.json`))).rejects.toThrow();
    });

    test('kastar fel vid borttagning av icke-existerande identifier', async () => {
        await expect(controller.removeFunction('icke-existerande')).rejects.toThrow();
    });

    test('listar alla funktioner', async () => {
        const data1 = {
            prompt: "Test prompt 1",
            exampleInput: { test: "data1" },
            examples: [{ input: { test: "data1" }, output: { result: "data1" } }]
        };

        const data2 = {
            prompt: "Test prompt 2",
            exampleInput: { test: "data2" },
            examples: [{ input: { test: "data2" }, output: { result: "data2" } }]
        };

        const createResult1 = await controller.createFunction(data1);
        const createResult2 = await controller.createFunction(data2);

        const functions = await controller.listFunctions();

        expect(functions).toHaveLength(2);
        expect(functions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    identifier: createResult1.identifier,
                    prompt: "Test prompt 1"
                }),
                expect.objectContaining({
                    identifier: createResult2.identifier,
                    prompt: "Test prompt 2"
                })
            ])
        );
    });
}); 