#!/bin/bash

# Create a function to remove curse words from text
echo "Creating a function that removes curse words from text"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Return the same text but replace all curse words with 'beeeep': ",
    "exampleOutput": {
        "correctedText": "You are a beep piece of crap"
    },
    "examples": [
        {
            "input": { "text": "Damn piece of crap" },
            "output": { "correctedText": "beeeep piece of crap" }
        },
        {
            "input": { "text": "I am a nice text without any curse words" },
            "output": { "correctedText": "I am a nice text without any curse words" }
        },
        {
            "input": { "text": "In my text there is one curse word, fuck too!" },
            "output": { "correctedText": "In my text there is one curse word, beeeep too!" }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create

echo -e "\n" 