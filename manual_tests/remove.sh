#!/bin/bash

# Check if identifier is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <identifier>"
    echo "Example: $0 abc123..."
    exit 1
fi

# Remove the function
echo "Removing function with identifier: $1"

curl -s -X DELETE http://localhost:3000/llmfunction/remove/$1

echo -e "\n" 