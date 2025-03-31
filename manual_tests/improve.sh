#!/bin/bash

# Kontrollera att identifier är angiven
if [ -z "$1" ]; then
    echo "Användning: $0 <identifier>"
    echo "Exempel: $0 abc123..."
    exit 1
fi

# Förbättra prompten för funktionen
echo "Förbättrar prompt för funktion med identifier: $1"

curl -X POST -s http://localhost:3000/llmfunction/improve/$1

echo -e "\n"