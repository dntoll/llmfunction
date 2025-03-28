# LLM Function API

Ett RESTful API för att hantera LLM-funktioner med persistent lagring.

## Installation

1. Klona repot
2. Installera beroenden:
```bash
npm install
```

## Användning

Starta servern:
```bash
npm start
```

Servern kommer att starta på port 3000.

## API Endpoints

### Skapa en funktion
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Konvertera temperatur från Celsius till Fahrenheit",
    "exampleInput": {
        "celsius": 0
    },
    "examples": [
        {
            "input": { "celsius": 0 },
            "output": { "fahrenheit": 32 }
        }
    ]
}' \
  http://localhost:3000/llmfunction/create
```

### Hämta en funktion
```bash
curl http://localhost:3000/llmfunction/get/:identifier
```

### Lista alla funktioner
```bash
curl http://localhost:3000/llmfunction/list
```

### Ta bort en funktion
```bash
curl -X DELETE http://localhost:3000/llmfunction/remove/:identifier
```

## Lagring

Funktioner lagras individuellt i filsystemet under `data/functions/` med en index-fil i `data/index.json`. Varje funktion sparas i en separat JSON-fil med sin identifier som filnamn.

## Tester

### Automatiska tester
Kör testerna med:
```bash
npm test
```

### Manuella tester
Det finns en serie bash-script för manuell testning av API:et. Dessa använder `curl` för att göra HTTP-anrop.

1. Skapa en funktion:
```bash
./manual_tests/createConvert.sh
```

2. Hämta en funktion:
```bash
./manual_tests/getConvert.sh <identifier>
```

3. Ta bort en funktion:
```bash
./manual_tests/removeConvert.sh <identifier>
```

## Felhantering

API:et returnerar följande HTTP-statuskoder:
- 201: Funktion skapad
- 200: Funktion hämtad eller listad
- 204: Funktion borttagen
- 400: Ogiltig data
- 404: Funktion hittades inte
- 500: Serverfel 