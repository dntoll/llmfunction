export interface Example {
  input: Record<string, any>;
  output: Record<string, any>;
}

export interface TestCase {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface TestResult {
  input: Record<string, any>;
  expectedOutput: Record<string, any>;
  actualOutput: Record<string, any>;
  success: boolean;
}

export interface TestResults {
  identifier: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  lastRun: string;
}

export interface LLMFunction {
  identifier: string;
  prompt: string;
  exampleOutput: Record<string, any>;
  examples: Array<{
    input: Record<string, any>;
    output: Record<string, any>;
  }>;
  testResults?: TestResults;
}

export interface CreateFunctionRequest {
  prompt: string;
  exampleOutput: Record<string, any>;
  examples: Array<{
    input: Record<string, any>;
    output: Record<string, any>;
  }>;
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
  message: string;
  newPrompt: string;
  identifier: string;
  data: LLMFunction;
} 