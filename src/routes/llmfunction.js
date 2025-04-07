const express = require('express');
const router = express.Router();
const { FunctionNotFoundError, FunctionValidationError, FunctionExecutionError } = require('../errors/FunctionErrors');

// Gemensam felhanteringsfunktion
const handleError = (error, res) => {
    //console.error('Error in route handler:', error);
    
    if (error instanceof FunctionNotFoundError) {
        return res.status(404).json({ error: error.message });
    } else if (error instanceof FunctionValidationError) {
        return res.status(400).json({ error: error.message });
    } else if (error instanceof FunctionExecutionError) {
        return res.status(400).json({ error: error.message });
    } else {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Valideringsfunktion för request body
const validateRequestBody = (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body' });
    }
    next();
};

function setupRoutes(app, controller) {
    // POST endpoint for llmfunction/create
    app.post('/llmfunction/create', validateRequestBody, async (req, res) => {
        try {
            const result = await controller.createFunction(req.body);
            res.status(201).json(result);
        } catch (error) {
            handleError(error, res);
        }
    });

    // GET endpoint for llmfunction/get
    app.get('/llmfunction/get/:identifier', async (req, res) => {
        try {
            if (!req.params.identifier) {
                throw new FunctionValidationError('Identifier is required');
            }
            const result = await controller.getFunction(req.params.identifier);
            res.json(result);
        } catch (error) {
            handleError(error, res);
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

    // POST endpoint for llmfunction/runcode
    app.post('/llmfunction/runcode/:identifier', validateRequestBody, async (req, res) => {
        try {
            if (!req.params.identifier) {
                throw new FunctionValidationError('Identifier is required');
            }
            const output = await controller.runFunctionWithCode(req.params.identifier, req.body);

            const ret = output.output ? output.output : output;
            console.log('Output:', ret);
            res.json(ret);
            
        } catch (error) {
            console.error('Error in runcode:', error);
            handleError(error, res);
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

    app.post('/llmfunction/add-test/:identifier', async (req, res) => {
        try {
            const result = await controller.addTestToFunction(req.params.identifier, req.body);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionValidationError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    app.delete('/llmfunction/remove-test/:identifier/:index', async (req, res) => {
        try {
            const result = await controller.removeTestFromFunction(req.params.identifier, parseInt(req.params.index));
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionValidationError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    app.put('/llmfunction/update-test/:identifier/:index', async (req, res) => {
        try {
            const result = await controller.updateTestInFunction(req.params.identifier, parseInt(req.params.index), req.body);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionValidationError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    app.put('/llmfunction/update-prompt/:identifier', async (req, res) => {
        try {
            const result = await controller.updateFunctionPrompt(req.params.identifier, req.body.prompt);
            res.json(result);
        } catch (error) {
            if (error instanceof FunctionNotFoundError) {
                res.status(404).json({ error: error.message });
            } else if (error instanceof FunctionValidationError) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    
}

module.exports = { setupRoutes }; 