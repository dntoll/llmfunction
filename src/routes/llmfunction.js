const express = require('express');
const router = express.Router();

function setupRoutes(app, controller) {
    // POST endpoint för llmfunction/create
    app.post('/llmfunction/create', async (req, res) => {
        try {
            const result = await controller.createFunction(req.body);
            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // GET endpoint för llmfunction/get
    app.get('/llmfunction/get/:identifier', async (req, res) => {
        try {
            const result = await controller.getFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // POST endpoint för llmfunction/run
    app.post('/llmfunction/run/:identifier', async (req, res) => {
        try {
            const result = await controller.runFunction(req.params.identifier, req.body);
            res.json(result);
        } catch (error) {
            // Om funktionen inte hittas, returnera 404, annars 400
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    // GET endpoint för llmfunction/list
    app.get('/llmfunction/list', async (req, res) => {
        try {
            const result = await controller.listFunctions();
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // DELETE endpoint för llmfunction/remove
    app.delete('/llmfunction/remove/:identifier', async (req, res) => {
        try {
            await controller.removeFunction(req.params.identifier);
            res.status(204).send();
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    });

    // POST endpoint för llmfunction/test
    app.post('/llmfunction/test/:identifier', async (req, res) => {
        try {
            const result = await controller.testFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });
}

module.exports = { setupRoutes }; 