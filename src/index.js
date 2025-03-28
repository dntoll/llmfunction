require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const APIController = require('./controllers/APIController');
const Mockache = require('./models/mockache');
const { setupRoutes } = require('./routes/llmfunction');

const app = express();
const port = process.env.PORT || 3000;

const mockache = new Mockache(
    process.env.CACHE_SERVER,
    process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_ORG
);

// Middleware för att hantera JSON-data
app.use(bodyParser.json());

// Initialisera APIController
async function initializeController() {
    try {
        app.locals.apiController = new APIController(mockache);
        await app.locals.apiController.initialize();
        console.log('APIController initialiserad');
        
        // Sätt upp routes efter att controllern är initialiserad
        setupRoutes(app, app.locals.apiController);
    } catch (error) {
        console.error('Fel vid initialisering av APIController:', error);
        process.exit(1);
    }
}

// Starta servern
initializeController().then(() => {
    app.listen(port, () => {
        console.log(`Server kör på port ${port}`);
    });
});

module.exports = app; 