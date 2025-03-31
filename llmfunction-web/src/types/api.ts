export interface Example {
  input: string;
  output: string;
}

export interface LLMFunction {
  id: string;
  name: string;
  prompt: string;
  example_output: string;
  examples: Example[];
  created_at: string;
}

export interface CreateFunctionRequest {
  prompt: string;
  example_output: string;
  examples: Example[];
}

export interface RunFunctionRequest {
  input: string;
}

export interface RunFunctionResponse {
  output: string;
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