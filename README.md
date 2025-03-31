# LLM Function API

A RESTful API for managing LLM functions with persistent storage.

## Installation

Dependencie
```bash
sudo apt install npm 
sudo apt install curl
```


1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. setup .env
```bash
touch .env


CACHE_SERVER=<your_cache_server_url>
OPENAI_API_KEY_2=<your_openai_api_key>
OPENAI_API_ORG=<your_openai_org_id>



```


## Usage

Start the server:
```bash
npm start
```

The server will start on port 3000.

## Quick Start Example

Here's a simple example using the manual test scripts:

1. Create a Celsius to Fahrenheit conversion function:
```bash
./manual_tests/createConvert.sh
```

2. Get the function details (replace `<identifier>` with the returned ID):
```bash
./manual_tests/getConvert.sh <identifier>
```

3. Remove the function:
```bash
./manual_tests/removeConvert.sh <identifier>
```

## Documentation

For detailed API documentation, please see [API.md](API.md).

## Testing

### Automated Tests
Run the tests with:
```bash
npm test
```

### Manual Tests
The repository includes a set of bash scripts for manual API testing using `curl`. These scripts are located in the `manual_tests` directory.

## Error Handling

The API returns the following HTTP status codes:
- 201: Function created
- 200: Function retrieved or listed
- 204: Function removed
- 400: Invalid data
- 404: Function not found
- 500: Server error

## API Endpoints

### Create a Function
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Convert Celsius to Fahrenheit",
    "exampleOutput": {
        "fahrenheit": 32
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

### Get a Function
```bash
curl http://localhost:3000/llmfunction/get/:identifier
```

### List All Functions
```bash
curl http://localhost:3000/llmfunction/list
```

### Remove a Function
```bash
curl -X DELETE http://localhost:3000/llmfunction/remove/:identifier
```

### Run All Examples for a Function
```bash
curl -X POST http://localhost:3000/llmfunction/test/:identifier
```

This will run all examples defined for the function and return a test report with the following information:
- Total number of tests
- Number of successful tests
- Number of failed tests
- Detailed information for each test, including:
  - Input
  - Expected output
  - Actual output
  - Whether the test passed or failed

## Lagring

Funktioner lagras individuellt i filsystemet under `data/functions/` med en index-fil i `data/index.json`. Varje funktion sparas i en separat JSON-fil med sin identifier som filnamn. 