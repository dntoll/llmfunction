#!/bin/bash

# Färger för output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kontrollera att identifier är angiven
if [ -z "$1" ]; then
    echo -e "${RED}Fel: Ingen identifier angiven${NC}"
    echo -e "Användning: $0 <identifier>"
    echo -e "Exempel: $0 abc123..."
    exit 1
fi

# Hämta funktionen
echo -e "${YELLOW}Kör tester för funktion med identifier: $1${NC}"
echo -e "----------------------------------------"

# Kör testet och spara resultatet
result=$(curl -s -X POST -H "Content-Type: application/json" http://localhost:3000/llmfunction/test/$1)

# Kontrollera om anropet lyckades
if [ $? -ne 0 ]; then
    echo -e "${RED}Fel: Kunde inte nå servern${NC}"
    exit 1
fi

# Extrahera värden från JSON
total=$(echo "$result" | grep -o '"totalTests":[0-9]*' | cut -d':' -f2)
passed=$(echo "$result" | grep -o '"passedTests":[0-9]*' | cut -d':' -f2)
failed=$(echo "$result" | grep -o '"failedTests":[0-9]*' | cut -d':' -f2)

# Skriv ut sammanfattning
echo "Totalt antal tester: $total"
echo "Lyckade tester: $passed"
echo "Misslyckade tester: $failed"
echo ""

# Extrahera och formatera varje testresultat
echo "$result" | grep -o '"results":\[.*\]' | cut -d'[' -f2 | cut -d']' -f1 | sed 's/},{/\n/g' | while read -r line; do
    # Extrahera status först
    if [[ $line =~ \"success\":(true|false) ]]; then
        success="${BASH_REMATCH[1]}"
        if [ "$success" = "true" ]; then
            echo -e "${GREEN}✓ Test lyckades${NC}"
        else
            echo -e "${RED}✗ Test misslyckades${NC}"
            
            # Extrahera och visa input
            if [[ $line =~ \"input\":\{([^}]*)\} ]]; then
                input="${BASH_REMATCH[1]}"
                echo "  Input: {$input}"
            fi
            
            # Extrahera och visa förväntad utdata
            if [[ $line =~ \"expectedOutput\":\{([^}]*)\} ]]; then
                expected="${BASH_REMATCH[1]}"
                echo "  Expected: {$expected}"
            fi
            
            # Extrahera och visa faktisk utdata
            if [[ $line =~ \"actualOutput\":\{([^}]*)\} ]]; then
                actual="${BASH_REMATCH[1]}"
                echo "  Received: {$actual}"
            fi
            echo ""
        fi
    fi
done

# Skriv ut sammanfattning
echo -e "----------------------------------------"
if [ "$failed" -eq 0 ]; then
    echo -e "${GREEN}Alla tester lyckades!${NC}"
else
    echo -e "${RED}Några tester misslyckades.${NC}"
fi 