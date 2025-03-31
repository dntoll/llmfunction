#!/bin/bash

# Check if identifier is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <identifier>"
    exit 1
fi

# Get the function
echo "Getting function with identifier: $1"

curl -s -X GET \
  http://localhost:3000/llmfunction/get/$1

echo -e "\n" 