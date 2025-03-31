# LLM Function API Documentation

A RESTful API for managing LLM functions with persistent storage.

## Endpoints

### Create Function
```http
POST /llmfunction/create
Content-Type: application/json

{
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
}
```

**Response:**
- 201: Function created successfully
- 400: Invalid input data
- 500: Server error

### Get Function
```http
GET /llmfunction/get/:identifier
```

**Response:**
- 200: Function retrieved successfully
- 404: Function not found
- 500: Server error

### List Functions
```http
GET /llmfunction/list
```

**Response:**
- 200: List of all functions
- 500: Server error

### Remove Function
```http
DELETE /llmfunction/remove/:identifier
```

**Response:**
- 204: Function removed successfully
- 404: Function not found
- 500: Server error

### Test Function
```http
POST /llmfunction/test/:identifier
```

**Response:**
- 200: Test results
- 404: Function not found
- 400: Test execution error
- 500: Server error

### Run Function
```http
POST /llmfunction/run/:identifier
Content-Type: application/json

{
    "input": {
        "celsius": 25
    }
}
```

**Response:**
- 200: Function execution result
- 404: Function not found
- 400: Execution error
- 500: Server error

### Improve Function
```http
POST /llmfunction/improve/:identifier
```

**Response:**
- 200: Improved function
- 404: Function not found
- 400: Improvement error
- 500: Server error

## Error Responses

All error responses follow this format:
```json
{
    "error": "Error message description"
}
```

## Storage

Functions are stored individually in the filesystem under `data/functions/` with an index file in `data/index.json`. Each function is saved in a separate JSON file with its identifier as the filename. 