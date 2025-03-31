export interface Example {
  input: Record<string, any>;
  output: Record<string, any>;
}

export interface LLMFunction {
  identifier: string;
  prompt: string;
  exampleOutput: Record<string, any>;
  examples: Example[];
}

export interface CreateFunctionRequest {
  prompt: string;
  exampleOutput: Record<string, any>;
  examples: Example[];
}

export interface RunFunctionRequest {
  input: Record<string, any>;
}

export interface TestResult {
  identifier: string;
  totalTests: number;
  results: {
    input: Record<string, any>;
    expectedOutput: Record<string, any>;
    actualOutput: Record<string, any>;
    success: boolean;
  }[];
} 