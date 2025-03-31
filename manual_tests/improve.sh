#!/bin/bash

# Check if identifier is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <identifier>"
    echo "Example: $0 abc123..."
    exit 1
fi

# Improve the prompt for the function
echo "Improving prompt for function with identifier: $1"

curl -X POST -s http://localhost:3000/llmfunction/improve/$1

echo -e "\n"