#!/bin/bash

# Skapa en funktion för att konvertera temperatur
echo "Skapar en funktion som räknar antal 'hello' i en sträng"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Räkna antal 'hello' i en sträng",
    "exampleOutput": {
        "count": 3
    },
    "examples": [
        {
            "input": { "str": "hello" },
            "output": { "count": 1 }
        },
        {
            "input": { "str": "hello world hello hi" },
            "output": { "count": 2 }
        },
        {
            "input": { "str": "hello hello hello" },
            "output": { "count": 3 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 