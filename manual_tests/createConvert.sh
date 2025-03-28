#!/bin/bash

# Skapa en funktion för att konvertera temperatur
echo "Skapar en funktion för att konvertera temperatur från Celsius till Fahrenheit..."

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Konvertera Celsius till Fahrenheit",
    "exampleOutput": {
        "fahrenheit": 32
    },
    "examples": [
        {
            "input": { "celsius": 0 },
            "output": { "fahrenheit": 32 }
        },
        {
            "input": { "celsius": 50 },
            "output": { "fahrenheit": 122 }
        },
        {
            "input": { "celsius": 100 },
            "output": { "fahrenheit": 212 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 