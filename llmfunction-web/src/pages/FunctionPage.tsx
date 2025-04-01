import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunction, removeFunction, runFunction, testFunction, improveFunction, addTestToFunction, removeTestFromFunction, updateTestInFunction } from '../services/api';
import type { RunFunctionRequest, TestCase } from '../types/api';
import { useState } from 'react';

export function FunctionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [newTestInput, setNewTestInput] = useState('');
  const [newTestOutput, setNewTestOutput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTestInput, setEditTestInput] = useState('');
  const [editTestOutput, setEditTestOutput] = useState('');

  const { data: func, isLoading } = useQuery({
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

  const addTestMutation = useMutation({
    mutationFn: (testCase: TestCase) => addTestToFunction(id!, testCase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function', id] });
      setNewTestInput('');
      setNewTestOutput('');
    },
  });

  const removeTestMutation = useMutation({
    mutationFn: (index: number) => removeTestFromFunction(id!, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['function', id] });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: ({ index, testCase }: { index: number; testCase: TestCase }) => {
      console.log('Frontend: Skickar uppdatering till servern:', { index, testCase });
      return updateTestInFunction(id!, index, testCase);
    },
    onSuccess: async (data) => {
      console.log('Frontend: Uppdatering lyckades, data från servern:', data);
      await queryClient.invalidateQueries({ queryKey: ['function', id] });
      await queryClient.refetchQueries({ queryKey: ['function', id] });
      setEditingIndex(null);
      setEditTestInput('');
      setEditTestOutput('');
    },
    onError: (error) => {
      console.error('Frontend: Fel vid uppdatering:', error);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!func) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Ett fel uppstod</h2>
        <p className="text-gray-600">Kunde inte ladda funktionen. Försök igen senare.</p>
      </div>
    );
  }

  const renderResult = (data: unknown): string => {
    if (!data) return '';

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object') {
      if ('text' in data) {
        return (data as { text: string }).text;
      }
      if ('message' in data) {
        return (data as { message: string }).message;
      }
      if ('output' in data) {
        return JSON.stringify((data as { output: unknown }).output, null, 2);
      }
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  };

  const handleAddTest = () => {
    setJsonError(null);
    try {
      const inputObj = JSON.parse(newTestInput) as Record<string, unknown>;
      const outputObj = JSON.parse(newTestOutput) as Record<string, unknown>;
      
      if (typeof inputObj !== 'object' || inputObj === null) {
        throw new Error('Input måste vara ett JSON-objekt');
      }
      if (typeof outputObj !== 'object' || outputObj === null) {
        throw new Error('Output måste vara ett JSON-objekt');
      }

      addTestMutation.mutate({ input: inputObj, output: outputObj });
    } catch (err) {
      const error = err as Error;
      setJsonError(error.message);
    }
  };

  const handleEditTest = (index: number, example: TestCase) => {
    setEditingIndex(index);
    setEditTestInput(JSON.stringify(example.input, null, 2));
    setEditTestOutput(JSON.stringify(example.output, null, 2));
  };

  const handleUpdateTest = () => {
    if (editingIndex === null) return;

    setJsonError(null);
    try {
      const inputObj = JSON.parse(editTestInput) as Record<string, unknown>;
      const outputObj = JSON.parse(editTestOutput) as Record<string, unknown>;
      
      if (typeof inputObj !== 'object' || inputObj === null) {
        throw new Error('Input måste vara ett JSON-objekt');
      }
      if (typeof outputObj !== 'object' || outputObj === null) {
        throw new Error('Output måste vara ett JSON-objekt');
      }

      const testCase = { input: inputObj, output: outputObj };
      console.log('Frontend: Förbereder uppdatering:', { editingIndex, testCase });
      
      // Uppdatera lokalt först för bättre UX
      const updatedExamples = [...func.examples];
      updatedExamples[editingIndex] = testCase;
      
      // Uppdatera cache direkt
      queryClient.setQueryData(['function', id], {
        ...func,
        examples: updatedExamples
      });

      // Skicka uppdateringen till servern
      updateTestMutation.mutate({ 
        index: editingIndex, 
        testCase 
      });
    } catch (err) {
      const error = err as Error;
      console.error('Frontend: Fel vid validering:', error);
      setJsonError(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditTestInput('');
    setEditTestOutput('');
    setJsonError(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{func.prompt}</h1>
          <p className="text-gray-600">ID: {func.identifier}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Tillbaka
          </button>
          <button
            onClick={() => removeMutation.mutate(func.identifier)}
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
              {editingIndex === index ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Input (JSON)
                    </label>
                    <textarea
                      value={editTestInput}
                      onChange={(e) => {
                        setEditTestInput(e.target.value);
                        setJsonError(null);
                      }}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        jsonError ? 'border-red-500' : ''
                      }`}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Output (JSON)
                    </label>
                    <textarea
                      value={editTestOutput}
                      onChange={(e) => {
                        setEditTestOutput(e.target.value);
                        setJsonError(null);
                      }}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        jsonError ? 'border-red-500' : ''
                      }`}
                      rows={3}
                    />
                  </div>
                  {jsonError && (
                    <p className="text-sm text-red-600">{jsonError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateTest}
                      disabled={updateTestMutation.isPending}
                      className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateTestMutation.isPending ? 'Sparar...' : 'Spara'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">Input:</span>
                    <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(example.input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Output:</span>
                    <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(example.output, null, 2)}
                    </pre>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleEditTest(index, example)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
                    >
                      Redigera
                    </button>
                    <button
                      onClick={() => removeTestMutation.mutate(index)}
                      className="px-3 py-1 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                    >
                      Ta bort
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Lägg till testfall</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="newTestInput" className="block text-sm font-medium text-gray-700">
              Input (JSON)
            </label>
            <textarea
              id="newTestInput"
              value={newTestInput}
              onChange={(e) => {
                setNewTestInput(e.target.value);
                setJsonError(null);
              }}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                jsonError ? 'border-red-500' : ''
              }`}
              rows={3}
              placeholder='{"test": 1}'
            />
            {jsonError && (
              <p className="mt-1 text-sm text-red-600">{jsonError}</p>
            )}
          </div>
          <div>
            <label htmlFor="newTestOutput" className="block text-sm font-medium text-gray-700">
              Output (JSON)
            </label>
            <textarea
              id="newTestOutput"
              value={newTestOutput}
              onChange={(e) => {
                setNewTestOutput(e.target.value);
                setJsonError(null);
              }}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                jsonError ? 'border-red-500' : ''
              }`}
              rows={3}
              placeholder='{"result": "test"}'
            />
          </div>
          <button
            onClick={handleAddTest}
            disabled={addTestMutation.isPending || !newTestInput.trim() || !newTestOutput.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {addTestMutation.isPending ? 'Lägger till...' : 'Lägg till testfall'}
          </button>
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
            onClick={() => runMutation.mutate({ input: JSON.parse(input) })}
            disabled={runMutation.isPending || !input.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {runMutation.isPending ? 'Kör...' : 'Kör funktion'}
          </button>
        </div>
      </div>

      {(runMutation.data || testMutation.data || improveMutation.data || addTestMutation.data) && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultat</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {renderResult(runMutation.data || testMutation.data || improveMutation.data || addTestMutation.data)}
            </pre>
          </div>
        </div>
      )}

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
    </div>
  );
} 