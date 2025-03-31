#!/bin/bash

# Create a function to count 'hello' occurrences
echo "Creating a function that counts the number of 'hello' in a string"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Count the number of 'hello' in a string",
    "exampleOutput": {
        "count": 2
    },
    "examples": [
        {
            "input": { "text": "hello world hello" },
            "output": { "count": 2 }
        },
        {
            "input": { "text": "hello" },
            "output": { "count": 1 }
        },
        {
            "input": { "text": "no hello here" },
            "output": { "count": 0 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 