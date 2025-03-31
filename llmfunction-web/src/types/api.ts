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

export interface RunFunctionResponse {
  output: Record<string, any>;
}

export interface TestFunctionResponse {
  success: boolean;
  message: string;
}

export interface ImproveFunctionResponse {
  improved_prompt: string;
  improved_examples: Example[];
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