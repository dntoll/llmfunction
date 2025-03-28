#!/bin/bash

# Kontrollera att identifier är angiven
if [ -z "$1" ]; then
    echo "Användning: $0 <identifier>"
    echo "Exempel: $0 abc123..."
    exit 1
fi

# Testa temperaturkonvertering
echo "Testar temperaturkonvertering med identifier: $1"

curl -X POST http://localhost:3000/llmfunction/run/$1 \
  -H "Content-Type: application/json" \
  -d '{"celsius": 26}' 