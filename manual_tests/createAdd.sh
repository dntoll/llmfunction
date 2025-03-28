#!/bin/bash

# Skapa en funktion för att konvertera temperatur
echo "Skapar en funktion för att konvertera temperatur från Celsius till Fahrenheit..."

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Addera två tal",
    "exampleOutput": {
        "sum": 32
    },
    "examples": [
        {
            "input": { "a": 1, "b": 2 },
            "output": { "sum": 3 }
        },
        {
            "input": { "a": -5, "b": 2 },
            "output": { "sum": -3 }
        },
        {
            "input": { "a": 100, "b": 200 },
            "output": { "sum": 300 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 