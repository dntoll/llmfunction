#!/bin/bash

# Check if identifier is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <identifier>"
    echo "Example: $0 abc123..."
    exit 1
fi

# Convert temperature
echo "Converting temperature with function identifier: $1"

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "celsius": 0
  }' \
  http://localhost:3000/llmfunction/run/$1

echo -e "\n" 