import axios from 'axios';
import type { AxiosError } from 'axios';
import type {
  LLMFunction,
  CreateFunctionRequest,
  RunFunctionRequest,
  RunFunctionResponse,
  TestFunctionResponse,
  ImproveFunctionResponse,
  TestCase,
} from '../types/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 5000, // 5 sekunders timeout
});

interface ErrorResponse {
  message: string;
  error?: string;
}

const handleError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    
    // Kontrollera om API:et är tillgängligt
    if (!import.meta.env.VITE_API_URL) {
      throw new Error('API URL saknas. Kontrollera att VITE_API_URL är satt i .env-filen.');
    }

    if (axiosError.code === 'ECONNREFUSED') {
      throw new Error(`Kunde inte nå API:et på ${import.meta.env.VITE_API_URL}. Kontrollera att servern körs.`);
    }

    if (axiosError.code === 'ETIMEDOUT') {
      throw new Error('API:et svarade inte inom förväntad tid. Kontrollera att servern är tillgänglig.');
    }

    if (axiosError.response) {
      // Server svarade med ett felstatus
      const errorMessage = axiosError.response.data?.message || 
                          axiosError.response.data?.error || 
                          axiosError.response.statusText ||
                          'Ett fel uppstod på servern';
      throw new Error(`${errorMessage} (Status: ${axiosError.response.status})`);
    } else if (axiosError.request) {
      // Ingen respons mottogs
      throw new Error(`Kunde inte nå API:et på ${import.meta.env.VITE_API_URL}. Kontrollera att servern körs.`);
    } else {
      // Ett fel uppstod när förfrågan konfigurerades
      throw new Error('Ett fel uppstod när förfrågan konfigurerades');
    }
  }
  throw error;
};

export async function createFunction(data: CreateFunctionRequest): Promise<LLMFunction> {
  try {
    const response = await api.post<LLMFunction>('/llmfunction/create', data);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function getFunction(id: string): Promise<LLMFunction> {
  try {
    const response = await api.get<LLMFunction>(`/llmfunction/get/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function listFunctions(): Promise<LLMFunction[]> {
  try {
    const response = await api.get<LLMFunction[]>('/llmfunction/list');
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function removeFunction(id: string): Promise<void> {
  try {
    await api.delete(`/llmfunction/remove/${id}`);
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export const runFunction = async (id: string, data: RunFunctionRequest): Promise<RunFunctionResponse> => {
  try {
    const response = await api.post<RunFunctionResponse>(`/llmfunction/run/${id}`, data);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const runFunctionWithCode = async (id: string, data: RunFunctionRequest): Promise<RunFunctionResponse> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/llmfunction/runcode/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to run function with code');
  }
  return response.json();
};

export async function testFunction(id: string): Promise<TestFunctionResponse> {
  try {
    const response = await api.post<TestFunctionResponse>(`/llmfunction/test/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function improveFunction(id: string): Promise<ImproveFunctionResponse> {
  try {
    const response = await api.post<ImproveFunctionResponse>(`/llmfunction/improve/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function addTestToFunction(id: string, testCase: TestCase): Promise<LLMFunction> {
  try {
    const response = await api.post<LLMFunction>(`/llmfunction/add-test/${id}`, testCase);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export async function removeTestFromFunction(id: string, index: number): Promise<LLMFunction> {
  try {
    const response = await api.delete<LLMFunction>(`/llmfunction/remove-test/${id}/${index}`);
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export const updateTestInFunction = async (id: string, index: number, testCase: TestCase): Promise<LLMFunction> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/llmfunction/update-test/${id}/${index}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase),
    });

    if (!response.ok) {
      throw await handleError(response);
    }

    return response.json();
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const updateFunctionPrompt = async (id: string, prompt: string) => {
  const response = await fetch(`/api/functions/${id}/prompt`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    throw new Error('Failed to update function prompt');
  }
  return response.json();
};

export const updateFunctionOutputFormat = async (id: string, outputFormat: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/llmfunction/update-output-format/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ outputFormat: JSON.parse(outputFormat) }),
    });

    if (!response.ok) {
      throw await handleError(response);
    }

    return response.json();
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const getFunctions = async (): Promise<LLMFunction[]> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/llmfunction/list`);
  if (!response.ok) {
    throw new Error('Failed to fetch functions');
  }
  return response.json();
}; 