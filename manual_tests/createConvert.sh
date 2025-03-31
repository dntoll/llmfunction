#!/bin/bash

# Create a function to convert temperature
echo "Creating a function to convert temperature from Celsius to Fahrenheit..."

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Convert temperature from Celsius to Fahrenheit",
    "exampleOutput": {
        "fahrenheit": 32
    },
    "examples": [
        {
            "input": { "celsius": 0 },
            "output": { "fahrenheit": 32 }
        },
        {
            "input": { "celsius": 100 },
            "output": { "fahrenheit": 212 }
        },
        {
            "input": { "celsius": -40 },
            "output": { "fahrenheit": -40 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 