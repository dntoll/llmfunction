#!/bin/bash

# Skapa en funktion för att konvertera temperatur
echo "Skapar en funktion för att konvertera temperatur från Celsius till Fahrenheit..."

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Konvertera temperatur från Celsius till Fahrenheit",
    "exampleInput": {
        "celsius": 0
    },
    "examples": [
        {
            "input": { "celsius": 0 },
            "output": { "fahrenheit": 32 }
        },
        {
            "input": { "celsius": 100 },
            "output": { "fahrenheit": 212 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 