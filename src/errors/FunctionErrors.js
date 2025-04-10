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

class InvalidGeneratedCodeError extends FunctionError {
    constructor(message, generatedCode, containerLogs) {
        super(message);
        this.generatedCode = generatedCode;
        this.containerLogs = containerLogs;
    }
}

module.exports = {
    FunctionError,
    FunctionNotFoundError,
    FunctionValidationError,
    FunctionExecutionError,
    InvalidGeneratedCodeError
}; 