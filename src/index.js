const express = require('express');
const bodyParser = require('body-parser');
const APIController = require('./controllers/APIController');

const app = express();
const port = process.env.PORT || 3000;

// Middleware för att hantera JSON-data
app.use(bodyParser.json());

// Initialisera APIController
async function initializeController() {
    try {
        app.locals.apiController = new APIController();
        await app.locals.apiController.initialize();
        console.log('APIController initialiserad');
    } catch (error) {
        console.error('Fel vid initialisering av APIController:', error);
        process.exit(1);
    }
}

// POST endpoint för llmfunction/create
app.post('/llmfunction/create', async (req, res) => {
    try {
        const result = await app.locals.apiController.createFunction(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET endpoint för llmfunction/get
app.get('/llmfunction/get/:identifier', async (req, res) => {
    try {
        const result = await app.locals.apiController.getFunction(req.params.identifier);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// GET endpoint för llmfunction/list
app.get('/llmfunction/list', async (req, res) => {
    try {
        const functions = await app.locals.apiController.listFunctions();
        res.json(functions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE endpoint för llmfunction/remove
app.delete('/llmfunction/remove/:identifier', async (req, res) => {
    try {
        await app.locals.apiController.removeFunction(req.params.identifier);
        res.status(204).send();
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// Starta servern endast om filen körs direkt
if (require.main === module) {
    initializeController().then(() => {
        app.listen(port, () => {
            console.log(`Server kör på port ${port}`);
        });
    });
}

module.exports = app; 