import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunction, removeFunction, runFunction, testFunction, improveFunction } from '../services/api';
import type { LLMFunction, RunFunctionRequest } from '../types/api';
import { useState } from 'react';

export function FunctionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');

  const { data: func, isLoading, error } = useQuery({
    queryKey: ['function', id],
    queryFn: () => getFunction(id!),
  });

  const removeMutation = useMutation({
    mutationFn: removeFunction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      navigate('/');
    },
  });

  const runMutation = useMutation({
    mutationFn: (data: RunFunctionRequest) => runFunction(id!, data),
  });

  const testMutation = useMutation({
    mutationFn: () => testFunction(id!),
  });

  const improveMutation = useMutation({
    mutationFn: () => improveFunction(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !func) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Ett fel uppstod</h2>
        <p className="text-gray-600">Kunde inte ladda funktionen. Försök igen senare.</p>
      </div>
    );
  }

  const renderResult = (data: any) => {
    if (!data) return null;

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object') {
      if ('text' in data) {
        return data.text;
      }
      if ('message' in data) {
        return data.message;
      }
      if ('output' in data) {
        return data.output;
      }
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{func.name}</h1>
          <p className="text-gray-600">Skapad: {new Date(func.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Tillbaka
          </button>
          <button
            onClick={() => removeMutation.mutate(func.id)}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            Ta bort
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Prompt</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{func.prompt}</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Exempel</h2>
        <div className="space-y-4">
          {func.examples.map((example, index) => (
            <div key={index} className="border rounded-md p-4">
              <div className="mb-2">
                <span className="font-medium text-gray-700">Input:</span>
                <p className="mt-1 text-gray-600">{example.input}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Output:</span>
                <p className="mt-1 text-gray-600">{example.output}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Kör funktion</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="input" className="block text-sm font-medium text-gray-700">
              Input
            </label>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              rows={4}
            />
          </div>
          <button
            onClick={() => runMutation.mutate({ input })}
            disabled={runMutation.isPending || !input.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {runMutation.isPending ? 'Kör...' : 'Kör funktion'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testar...' : 'Testa funktion'}
        </button>
        <button
          onClick={() => improveMutation.mutate()}
          disabled={improveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {improveMutation.isPending ? 'Förbättrar...' : 'Förbättra funktion'}
        </button>
      </div>

      {(runMutation.data || testMutation.data || improveMutation.data) && (
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultat</h2>
          <pre className="bg-gray-50 p-4 rounded-md overflow-auto whitespace-pre-wrap">
            {renderResult(runMutation.data || testMutation.data || improveMutation.data)}
          </pre>
        </div>
      )}
    </div>
  );
} 