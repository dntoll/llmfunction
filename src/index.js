const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Middleware för att hantera JSON-data
app.use(bodyParser.json());

// Funktion för att generera SHA-256 hash av ett objekt
function generateIdentifier(obj) {
    const jsonString = JSON.stringify(obj);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
}

// POST endpoint för llmfunction/create
app.post('/llmfunction/create', (req, res) => {
    const { prompt, exampleInput, examples } = req.body;

    // Validera att alla obligatoriska fält finns
    if (!prompt || !exampleInput || !examples) {
        return res.status(400).json({
            error: 'Saknade obligatoriska fält. Kontrollera att prompt, exampleInput och examples finns med.'
        });
    }

    // Generera identifier baserat på hela request body
    const identifier = generateIdentifier(req.body);

    // Returnera svar med identifier
    res.status(201).json({
        identifier,
        data: {
            prompt,
            exampleInput,
            examples
        }
    });
});

// Starta servern endast om filen körs direkt
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server kör på port ${port}`);
    });
}

module.exports = app; 