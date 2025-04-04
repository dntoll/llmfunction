import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunction, removeFunction, runFunction, testFunction, improveFunction, addTestToFunction, removeTestFromFunction, updateTestInFunction, updateFunctionPrompt, updateFunctionOutputFormat } from '../services/api';
import type { RunFunctionRequest, TestCase, LLMFunction, TestResult } from '../types/api';
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
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingOutputFormat, setIsEditingOutputFormat] = useState(false);
  const [editOutputFormat, setEditOutputFormat] = useState('');

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
    onSuccess: async (data) => {
      // Uppdatera cache med nya testresultat
      queryClient.setQueryData(['function', id], (oldData: any) => ({
        ...oldData,
        testResults: data
      }));
    },
  });

  const improveMutation = useMutation({
    mutationFn: () => improveFunction(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
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
      console.log('Frontend: Sending update to server:', { index, testCase });
      return updateTestInFunction(id!, index, testCase);
    },
    onSuccess: async (data) => {
      console.log('Frontend: Update successful, data from server:', data);
      await queryClient.invalidateQueries({ queryKey: ['function', id] });
      await queryClient.refetchQueries({ queryKey: ['function', id] });
      setEditingIndex(null);
      setEditTestInput('');
      setEditTestOutput('');
    },
    onError: (error) => {
      console.error('Frontend: Error during update:', error);
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: (prompt: string) => updateFunctionPrompt(id!, prompt),
    onSuccess: async (data) => {
      console.log('Frontend: Prompt update successful:', data);
      await queryClient.invalidateQueries({ queryKey: ['function', id] });
      setIsEditingPrompt(false);
      setEditPrompt('');
    },
    onError: (error) => {
      console.error('Frontend: Error updating prompt:', error);
    }
  });

  const updateOutputFormatMutation = useMutation({
    mutationFn: (outputFormat: string) => updateFunctionOutputFormat(id!, outputFormat),
    onSuccess: async (data) => {
      console.log('Frontend: Output format update successful:', data);
      await queryClient.invalidateQueries({ queryKey: ['function', id] });
      setIsEditingOutputFormat(false);
      setEditOutputFormat('');
    },
    onError: (error) => {
      console.error('Frontend: Error updating output format:', error);
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
        <h2 className="text-2xl font-bold text-red-600 mb-4">An error occurred</h2>
        <p className="text-gray-600">Could not load the function. Please try again later.</p>
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
        throw new Error('Input must be a JSON object');
      }
      if (typeof outputObj !== 'object' || outputObj === null) {
        throw new Error('Output must be a JSON object');
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
        throw new Error('Input must be a JSON object');
      }
      if (typeof outputObj !== 'object' || outputObj === null) {
        throw new Error('Output must be a JSON object');
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

  const handleEditPrompt = () => {
    setEditPrompt(func.prompt);
    setIsEditingPrompt(true);
  };

  const handleUpdatePrompt = () => {
    if (!editPrompt.trim()) return;
    updatePromptMutation.mutate(editPrompt);
  };

  const handleCancelPromptEdit = () => {
    setIsEditingPrompt(false);
    setEditPrompt('');
  };

  const handleEditOutputFormat = () => {
    setEditOutputFormat(JSON.stringify(func?.exampleOutput, null, 2));
    setIsEditingOutputFormat(true);
  };

  const handleUpdateOutputFormat = () => {
    if (!editOutputFormat.trim()) return;
    try {
      const parsedOutput = JSON.parse(editOutputFormat);
      if (typeof parsedOutput !== 'object' || parsedOutput === null) {
        throw new Error('Output format must be a JSON object');
      }
      updateOutputFormatMutation.mutate(editOutputFormat);
    } catch (err) {
      const error = err as Error;
      setJsonError(error.message);
    }
  };

  const handleCancelOutputFormatEdit = () => {
    setIsEditingOutputFormat(false);
    setEditOutputFormat('');
    setJsonError(null);
  };

  const TestResults = ({ results }: { results: TestResult[] }) => {
    if (!results) return null;

    return (
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-md ${
                result.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Test {index + 1} - {result.success ? 'Passed' : 'Failed'}
                  </h4>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Input:</span>
                      <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded">
                        {JSON.stringify(result.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Expected Output:</span>
                      <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded">
                        {JSON.stringify(result.expectedOutput, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Actual Output:</span>
                      <pre className="mt-1 text-sm text-gray-900 bg-white p-2 rounded">
                        {JSON.stringify(result.actualOutput, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
            Back
          </button>
          <button
            onClick={() => removeMutation.mutate(func.identifier)}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Prompt</h2>
          {!isEditingPrompt && (
            <button
              onClick={handleEditPrompt}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
            >
              Edit
            </button>
          )}
        </div>
        {isEditingPrompt ? (
          <div className="space-y-4">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePrompt}
                disabled={updatePromptMutation.isPending}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updatePromptMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelPromptEdit}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">{func.prompt}</p>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Output Format</h2>
          {!isEditingOutputFormat && (
            <button
              onClick={handleEditOutputFormat}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
            >
              Edit
            </button>
          )}
        </div>
        {isEditingOutputFormat ? (
          <div className="space-y-4">
            <textarea
              value={editOutputFormat}
              onChange={(e) => {
                setEditOutputFormat(e.target.value);
                setJsonError(null);
              }}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                jsonError ? 'border-red-500' : ''
              }`}
              rows={4}
            />
            {jsonError && (
              <p className="text-sm text-red-600">{jsonError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleUpdateOutputFormat}
                disabled={updateOutputFormatMutation.isPending}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updateOutputFormatMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelOutputFormatEdit}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <pre className="text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(func.exampleOutput, null, 2)}
          </pre>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Examples</h2>
        <div className="space-y-4">
          {func.examples.map((example, index) => (
            <div 
              key={index} 
              className={`border rounded-md p-4 ${
                func.testResults?.results[index]?.success 
                  ? 'bg-green-50 border-green-200' 
                  : func.testResults?.results[index] 
                    ? 'bg-red-50 border-red-200' 
                    : ''
              }`}
            >
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
                      {updateTestMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
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
                  {func.testResults?.results[index] && (
                    <div>
                      <span className="font-medium text-gray-700">Actual Output:</span>
                      <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(func.testResults.results[index].actualOutput, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleEditTest(index, example)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeTestMutation.mutate(index)}
                      className="px-3 py-1 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Test Case</h2>
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
            {addTestMutation.isPending ? 'Adding...' : 'Add Test Case'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Function</h2>
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
            {runMutation.isPending ? 'Running...' : 'Run Function'}
          </button>
        </div>
      </div>

      {(runMutation.data || testMutation.data || improveMutation.data || addTestMutation.data) && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {renderResult(runMutation.data || testMutation.data || addTestMutation.data)}
            </pre>
            {improveMutation.data && (
              <div className="mt-4">
                <p className="text-green-600 font-medium">{improveMutation.data.message}</p>
                <p className="mt-2 text-gray-700">New prompt:</p>
                <pre className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                  {improveMutation.data.newPrompt}
                </pre>
                <div className="mt-4">
                  <a
                    href={`/function/${improveMutation.data.identifier}`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Go to new function
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => testMutation.mutate()}
          disabled={testMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {testMutation.isPending ? 'Testing...' : 'Test Function'}
        </button>
        <button
          onClick={() => improveMutation.mutate()}
          disabled={improveMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {improveMutation.isPending ? 'Improving...' : 'Improve Function'}
        </button>
      </div>
    </div>
  );
} 