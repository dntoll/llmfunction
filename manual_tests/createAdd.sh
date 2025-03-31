#!/bin/bash

# Create a function to add numbers
echo "Creating a function to add two numbers..."

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add two numbers",
    "exampleOutput": {
        "sum": 3
    },
    "examples": [
        {
            "input": { "a": 1, "b": 2 },
            "output": { "sum": 3 }
        },
        {
            "input": { "a": -1, "b": 1 },
            "output": { "sum": 0 }
        },
        {
            "input": { "a": 0, "b": 0 },
            "output": { "sum": 0 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 