class FunctionError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class FunctionNotFoundError extends FunctionError {
    constructor(identifier) {
        super(`Function not found with identifier: ${identifier}`);
        this.identifier = identifier;
    }
}

class FunctionValidationError extends FunctionError {
    constructor(message) {
        super(message);
    }
}

class FunctionExecutionError extends FunctionError {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
}

module.exports = {
    FunctionError,
    FunctionNotFoundError,
    FunctionValidationError,
    FunctionExecutionError
}; 