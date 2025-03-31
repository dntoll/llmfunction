#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if identifier is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: No identifier provided${NC}"
    echo -e "Usage: $0 <identifier>"
    echo -e "Example: $0 abc123..."
    exit 1
fi

# Get the function
echo -e "${YELLOW}Running tests for function with identifier: $1${NC}"
echo -e "----------------------------------------"

# Run the test and save the result
result=$(curl -s -X POST -H "Content-Type: application/json" http://localhost:3000/llmfunction/test/$1)

# Check if the request was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Could not reach server${NC}"
    exit 1
fi

# Extract values from JSON
total=$(echo "$result" | grep -o '"totalTests":[0-9]*' | cut -d':' -f2)
passed=$(echo "$result" | grep -o '"passedTests":[0-9]*' | cut -d':' -f2)
failed=$(echo "$result" | grep -o '"failedTests":[0-9]*' | cut -d':' -f2)

# Print summary
echo "Total number of tests: $total"
echo "Passed tests: $passed"
echo "Failed tests: $failed"
echo ""

# Extract and format each test result
echo "$result" | grep -o '"results":\[.*\]' | cut -d'[' -f2 | cut -d']' -f1 | sed 's/},{/\n/g' | while read -r line; do
    # Extract status first
    if [[ $line =~ \"success\":(true|false) ]]; then
        success="${BASH_REMATCH[1]}"
        if [ "$success" = "true" ]; then
            echo -e "${GREEN}✓ Test passed${NC}"
        else
            echo -e "${RED}✗ Test failed${NC}"
            
            # Extract and display input
            if [[ $line =~ \"input\":\{([^}]*)\} ]]; then
                input="${BASH_REMATCH[1]}"
                echo "  Input: {$input}"
            fi
            
            # Extract and display expected output
            if [[ $line =~ \"expectedOutput\":\{([^}]*)\} ]]; then
                expected="${BASH_REMATCH[1]}"
                echo "  Expected: {$expected}"
            fi
            
            # Extract and display actual output
            if [[ $line =~ \"actualOutput\":\{([^}]*)\} ]]; then
                actual="${BASH_REMATCH[1]}"
                echo "  Received: {$actual}"
            fi
            echo ""
        fi
    fi
done

# Print summary
echo -e "----------------------------------------"
if [ "$failed" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}Some tests failed.${NC}"
fi 