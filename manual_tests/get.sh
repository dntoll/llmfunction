#!/bin/bash

# Kontrollera att identifier är angiven
if [ -z "$1" ]; then
    echo "Användning: $0 <identifier>"
    echo "Exempel: $0 abc123..."
    exit 1
fi

# Hämta funktionen
echo "Hämtar funktion med identifier: $1"

curl -s http://localhost:3000/llmfunction/get/$1

echo -e "\n" 