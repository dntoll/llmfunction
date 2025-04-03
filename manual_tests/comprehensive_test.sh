#!/bin/bash

echo "=== Starting Comprehensive API Test ==="

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Warning: jq is not installed. JSON responses will be shown as raw text."
    echo "To install jq:"
    echo "  Windows (Chocolatey): choco install jq"
    echo "  Linux: sudo apt-get install jq or sudo yum install jq"
    echo ""
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Function to format JSON output
format_json() {
    if [ "$JQ_AVAILABLE" = true ]; then
        jq '.'
    else
        cat
    fi
}

# Create first function (temperature converter)
echo -e "\n1. Creating temperature converter function..."
CONVERT_RESPONSE=$(curl -s -X POST \
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
        }
    ]
}' \
  http://localhost:3000/llmfunction/create)

echo "$CONVERT_RESPONSE" | format_json

if [ "$JQ_AVAILABLE" = true ]; then
    CONVERT_ID=$(echo "$CONVERT_RESPONSE" | jq -r '.identifier')
else
    # Extract ID using grep and cut (fallback method)
    CONVERT_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"identifier":"[^"]*"' | cut -d'"' -f4)
fi

echo "Created function with ID: $CONVERT_ID"

# Create second function (number adder)
echo -e "\n2. Creating number adder function..."
ADD_RESPONSE=$(curl -s -X POST \
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
        }
    ]
}' \
  http://localhost:3000/llmfunction/create)

echo "$ADD_RESPONSE" | format_json

if [ "$JQ_AVAILABLE" = true ]; then
    ADD_ID=$(echo "$ADD_RESPONSE" | jq -r '.identifier')
else
    # Extract ID using grep and cut (fallback method)
    ADD_ID=$(echo "$ADD_RESPONSE" | grep -o '"identifier":"[^"]*"' | cut -d'"' -f4)
fi

echo "Created function with ID: $ADD_ID"

# List all functions
echo -e "\n3. Listing all functions..."
curl -s http://localhost:3000/llmfunction/list | format_json

# Run the convert function
echo -e "\n4. Running the convert function..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "celsius": 25 }
}' \
  http://localhost:3000/llmfunction/run/$CONVERT_ID | format_json

# Run tests for convert function
echo -e "\n5. Running tests for convert function..."
curl -s -X POST \
  http://localhost:3000/llmfunction/test/$CONVERT_ID | format_json

# Improve the convert function
echo -e "\n6. Improving the convert function..."
curl -s -X POST \
  http://localhost:3000/llmfunction/improve/$CONVERT_ID | format_json

# List functions again
echo -e "\n7. Listing functions after improvement..."
curl -s http://localhost:3000/llmfunction/list | format_json

# Remove all functions
echo -e "\n8. Removing all functions..."
if [ ! -z "$CONVERT_ID" ]; then
    curl -s -X DELETE http://localhost:3000/llmfunction/remove/$CONVERT_ID
fi
if [ ! -z "$ADD_ID" ]; then
    curl -s -X DELETE http://localhost:3000/llmfunction/remove/$ADD_ID
fi

echo -e "\n=== Test Completed ===" 