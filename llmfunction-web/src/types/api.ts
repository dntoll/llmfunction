export interface Example {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface TestCase {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface TestResult {
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  actualOutput: Record<string, unknown>;
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
  examples: Array<{
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>;
  testResults?: TestResults;
}

export interface CreateFunctionRequest {
  prompt: string;
  examples: Array<{
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>;
}

export interface RunFunctionRequest {
  input: Record<string, unknown>;
}

export interface RunFunctionResponse {
  output: Record<string, unknown>;
}

export interface TestFunctionResponse extends TestResults {
  identifier: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  lastRun: string;
}

export interface ImproveFunctionResponse {
  message: string;
  newPrompt: string;
  identifier: string;
  data: LLMFunction;
} 