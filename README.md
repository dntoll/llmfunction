# LLM Function API

Ett RESTful API för att skapa och hantera LLM-funktioner.

## Installation

```bash
npm install
```

## Starta servern

```bash
npm start
```

Servern startar på port 3000 som standard. Du kan ändra porten genom att sätta miljövariabeln `PORT`.

## API Endpoints

### POST /llmfunction/create

Skapar en ny LLM-funktion baserad på angiven prompt och exempel.

#### Request Body

```json
{
    "prompt": "string",
    "exampleInput": object,
    "examples": array
}
```

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| prompt | string | Beskrivningen av funktionen |
| exampleInput | object | Ett exempel på indata för funktionen |
| examples | array | Lista med exempel på input/output-par |

#### Exempel Request

```json
{
    "prompt": "Konvertera temperatur från Celsius till Fahrenheit",
    "exampleInput": {
        "celsius": 0
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
}
```

#### Response

```json
{
    "identifier": "string",
    "data": {
        "prompt": "string",
        "exampleInput": object,
        "examples": array
    }
}
```

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| identifier | string | Unik SHA-256 hash av request body |
| data | object | Originaldata från request |

#### Exempel Response

```json
{
    "identifier": "a1b2c3d4e5f6g7h8i9j0...",
    "data": {
        "prompt": "Konvertera temperatur från Celsius till Fahrenheit",
        "exampleInput": {
            "celsius": 0
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
    }
}
```

#### Felhantering

Om obligatoriska fält saknas returneras statuskod 400 med följande response:

```json
{
    "error": "Saknade obligatoriska fält. Kontrollera att prompt, exampleInput och examples finns med."
}
```

#### Statuskoder

- 201: Funktion skapad framgångsrikt
- 400: Felaktig request (saknade fält) 