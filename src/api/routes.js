const express = require('express');
const router = express.Router();
const LLMFunction = require('../models/LLMFunction');
const Mockache = require('../models/Mockache');

// Hämta en funktion med identifier
router.get('/llmfunction/get/:identifier', async (req, res) => {
    try {
        const mockache = new Mockache();
        const functionData = await mockache.getFunction(req.params.identifier);
        if (!functionData) {
            return res.status(404).json({ error: 'Funktion hittades inte' });
        }
        res.json(functionData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Förbättra prompt för en funktion
router.post('/llmfunction/improve/:identifier', async (req, res) => {
    try {
        const mockache = new Mockache();
        const functionData = await mockache.getFunction(req.params.identifier);
        if (!functionData) {
            return res.status(404).json({ error: 'Funktion hittades inte' });
        }

        const llmFunction = LLMFunction.fromJSON(functionData);
        await llmFunction.improvePrompt(mockache);
        
        // Spara den uppdaterade funktionen
        await mockache.saveFunction(llmFunction.toJSON());
        
        res.json({
            message: 'Prompt förbättrad',
            newPrompt: llmFunction.prompt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 