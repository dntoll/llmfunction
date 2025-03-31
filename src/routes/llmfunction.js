const express = require('express');
const router = express.Router();
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

function setupRoutes(app, controller) {
    // POST endpoint for llmfunction/create
    app.post('/llmfunction/create', async (req, res) => {
        try {
            const result = await controller.createFunction(req.body);
            res.status(201).json(result);
        } catch (error) {
            if (error instanceof FunctionValidationError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // GET endpoint for llmfunction/get
    app.get('/llmfunction/get/:identifier', async (req, res) => {
        try {
            const result = await controller.getFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // POST endpoint for llmfunction/run
    app.post('/llmfunction/run/:identifier', async (req, res) => {
        try {
            const result = await controller.runFunction(req.params.identifier, req.body);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionExecutionError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // GET endpoint for llmfunction/list
    app.get('/llmfunction/list', async (req, res) => {
        try {
            const result = await controller.listFunctions();
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // DELETE endpoint for llmfunction/remove
    app.delete('/llmfunction/remove/:identifier', async (req, res) => {
        try {
            await controller.removeFunction(req.params.identifier);
            res.status(204).send();
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // POST endpoint for llmfunction/test
    app.post('/llmfunction/test/:identifier', async (req, res) => {
        try {
            const result = await controller.testFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionExecutionError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    app.post('/llmfunction/improve/:identifier', async (req, res) => {
        try {
            const result = await controller.improveFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionExecutionError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });
}

module.exports = { setupRoutes }; 