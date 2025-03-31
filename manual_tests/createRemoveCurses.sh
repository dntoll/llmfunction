#!/bin/bash

# Skapa en funktion för att konvertera temperatur
echo "Skapar en funktion som tar bort fula ord från en text"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Returnera samma text men låt alla fula ord ersättas med 'beeeep': ",
    "exampleOutput": {
        "correctedText": "Du är en beep skit"
    },
    "examples": [
        {
            "input": { "text": "Jävla skit" },
            "output": { "correctedText": "beeeep skit" }
        },
        {
            "input": { "text": "Jag är en snäll text som inte har några fula ord" },
            "output": { "correctedText": "Jag är en snäll text som inte har några fula ord" }
        },
        {
            "input": { "text": "I min text finns ett enda svärord, fuck också!" },
            "output": { "correctedText": "I min text finns ett enda svärord, beeeep också!" }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 