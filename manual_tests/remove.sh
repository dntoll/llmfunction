#!/bin/bash

# Kontrollera att identifier är angiven
if [ -z "$1" ]; then
    echo "Användning: $0 <identifier>"
    echo "Exempel: $0 abc123..."
    exit 1
fi

# Ta bort funktionen
echo "Tar bort funktion med identifier: $1"

curl -s -X DELETE http://localhost:3000/llmfunction/remove/$1

echo -e "\n" 