import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFunction, removeFunction, runFunction, testFunction, improveFunction, addTestToFunction, removeTestFromFunction, updateTestInFunction, updateFunctionPrompt, runFunctionWithCode, getFunctionCode } from '../services/api';
import type { RunFunctionRequest, TestCase, TestResult, TestResults, LLMFunction } from '../types/api';
import { useState, useEffect } from 'react';
import { JsonInput } from '../components/JsonInput';
import { ExampleCard } from '../components/ExampleCard';

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

  const { data: func, isLoading } = useQuery({
    queryKey: ['function', id],
    queryFn: () => getFunction(id!)
  });

  useEffect(() => {
    if (func?.examples && func.examples.length > 0) {
      setInput(JSON.stringify(func.examples[0].input, null, 2));
    }
  }, [func]);

  const { data: generatedCode, isLoading: isCodeLoading } = useQuery({
    queryKey: ['functionCode', id],
    queryFn: () => getFunctionCode(id!),
    enabled: !!id && !isLoading,
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
    onSuccess: () => {
      runWithCodeMutation.reset();
    }
  });

  const runWithCodeMutation = useMutation({
    mutationFn: (data: RunFunctionRequest) => runFunctionWithCode(id!, data),
    onSuccess: () => {
      runMutation.reset();
      queryClient.invalidateQueries({ queryKey: ['functionCode', id] });
    }
  });

  const testMutation = useMutation({
    mutationFn: () => testFunction(id!),
    onSuccess: async (data) => {
      queryClient.setQueryData(['function', id], (oldData: { testResults?: TestResults }) => ({
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
      await queryClient.setQueryData(['function', id], (oldData: any) => ({
        ...oldData,
        prompt: data.data.prompt
      }));
      setIsEditingPrompt(false);
      setEditPrompt('');
    },
    onError: (error) => {
      console.error('Frontend: Error updating prompt:', error);
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

  const handleEditTest = (index: number) => {
    setEditingIndex(index);
    setEditTestInput(JSON.stringify(func.examples[index].input, null, 2));
    setEditTestOutput(JSON.stringify(func.examples[index].output, null, 2));
  };

  const handleUpdateTest = (index: number) => {
    try {
      const inputObj = JSON.parse(editTestInput);
      const outputObj = JSON.parse(editTestOutput);
      
      if (typeof inputObj !== 'object' || inputObj === null) {
        throw new Error('Input must be a JSON object');
      }
      if (typeof outputObj !== 'object' || outputObj === null) {
        throw new Error('Output must be a JSON object');
      }

      updateTestMutation.mutate({ 
        index, 
        testCase: { input: inputObj, output: outputObj }
      });
    } catch (err) {
      console.error('Error updating test:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditTestInput('');
    setEditTestOutput('');
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

  const handleCopyTest = (example: TestCase) => {
    // Skapa en djup kopia av exemplet
    const copiedExample = {
      input: JSON.parse(JSON.stringify(example.input)),
      output: JSON.parse(JSON.stringify(example.output))
    };
    addTestMutation.mutate(copiedExample);
  };

  const TestResultsComponent = ({ results }: { results: TestResult[] }) => {
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
            onClick={() => removeMutation.mutate(id!)}
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
            <JsonInput
              label="Prompt"
              name="editPrompt"
              register={() => ({})}
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdatePrompt}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
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
          <div className="space-y-4">
            <p className="text-gray-700 whitespace-pre-wrap">{func.prompt}</p>
            {isCodeLoading ? (
              <div className="mt-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : generatedCode ? (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Genererad kod</h3>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                  <code className="text-sm text-gray-700">{generatedCode}</code>
                </pre>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Examples</h2>
        <div className="space-y-4">
          {func.examples.map((example, index) => (
            <ExampleCard
              key={index}
              index={index}
              value={editingIndex === index ? {
                input: editTestInput,
                output: editTestOutput
              } : {
                input: JSON.stringify(example.input, null, 2),
                output: JSON.stringify(example.output, null, 2)
              }}
              onChange={(field, value) => {
                if (field === 'input') setEditTestInput(value);
                if (field === 'output') setEditTestOutput(value);
              }}
              onRemove={func.examples.length > 1 ? () => removeTestMutation.mutate(index) : undefined}
              onCopy={() => handleCopyTest(example)}
              onEdit={() => handleEditTest(index)}
              onSave={() => handleUpdateTest(index)}
              onCancel={handleCancelEdit}
              isEditing={editingIndex === index}
              testResult={func.testResults?.results[index]}
            />
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Function</h2>
        <div className="space-y-4">
          <JsonInput
            label="Input"
            name="input"
            register={() => ({})}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
          />
          <div className="flex gap-4">
            <button
              onClick={() => {
                try {
                  const parsedInput = JSON.parse(input);
                  runMutation.mutate({ input: parsedInput });
                } catch (error) {
                  console.error('Invalid JSON input:', error);
                }
              }}
              disabled={runMutation.isPending || !input.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {runMutation.isPending ? 'Running...' : 'Run Function'}
            </button>
            <button
              onClick={() => {
                try {
                  const parsedInput = JSON.parse(input);
                  runWithCodeMutation.mutate({ input: parsedInput });
                } catch (error) {
                  console.error('Invalid JSON input:', error);
                }
              }}
              disabled={runWithCodeMutation.isPending || !input.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {runWithCodeMutation.isPending ? 'Running...' : 'Run with Code'}
            </button>
          </div>
        </div>
      </div>

      {(runMutation.data || runWithCodeMutation.data || testMutation.data || improveMutation.data || addTestMutation.data) && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-gray-700">
              {runWithCodeMutation.data ? JSON.stringify(runWithCodeMutation.data, null, 2) : renderResult(runMutation.data || testMutation.data || addTestMutation.data)}
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

      {func.testResults?.results && (
        <TestResultsComponent results={func.testResults.results} />
      )}
    </div>
  );
} 