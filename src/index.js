require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
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

// Middleware for handling JSON data and CORS
app.use(cors());
app.use(bodyParser.json());

// Initialize APIController
async function initializeController() {
    try {
        app.locals.apiController = new APIController(mockache);
        await app.locals.apiController.initialize();
        console.log('APIController initialized');
        
        // Set up routes after controller is initialized
        setupRoutes(app, app.locals.apiController);
    } catch (error) {
        console.error('Error initializing APIController:', error);
        process.exit(1);
    }
}

// Start the server
initializeController().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});

module.exports = app; 