import axios from 'axios';
import type { LLMFunction, CreateFunctionRequest, RunFunctionRequest, TestResult } from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createFunction = async (data: CreateFunctionRequest): Promise<LLMFunction> => {
  const response = await api.post('/llmfunction/create', data);
  return response.data;
};

export const getFunction = async (identifier: string): Promise<LLMFunction> => {
  const response = await api.get(`/llmfunction/get/${identifier}`);
  return response.data;
};

export const listFunctions = async (): Promise<LLMFunction[]> => {
  const response = await api.get('/llmfunction/list');
  return response.data;
};

export const removeFunction = async (identifier: string): Promise<void> => {
  await api.delete(`/llmfunction/remove/${identifier}`);
};

export const runFunction = async (identifier: string, data: RunFunctionRequest): Promise<any> => {
  const response = await api.post(`/llmfunction/run/${identifier}`, data);
  return response.data;
};

export const testFunction = async (identifier: string): Promise<TestResult> => {
  const response = await api.post(`/llmfunction/test/${identifier}`);
  return response.data;
};

export const improveFunction = async (identifier: string): Promise<{ message: string; newPrompt: string }> => {
  const response = await api.post(`/llmfunction/improve/${identifier}`);
  return response.data;
}; 