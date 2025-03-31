#!/bin/bash

# Testa list endpoint
echo "Testar list endpoint"

curl -X GET http://localhost:3000/llmfunction/list \
  -H "Content-Type: application/json" 