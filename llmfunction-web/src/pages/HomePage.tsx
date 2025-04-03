import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getFunctions, removeFunction, testFunction } from '../services/api';
import type { LLMFunction } from '../types/api';

export function HomePage() {
  const queryClient = useQueryClient();
  const { data: functions, isLoading, error } = useQuery({
    queryKey: ['functions'],
    queryFn: getFunctions,
    staleTime: 0, // Ladda alltid senaste data
    refetchOnMount: true, // Ladda om när komponenten mountas
  });

  const removeMutation = useMutation({
    mutationFn: removeFunction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testFunction,
    onSuccess: (data, identifier) => {
      // Uppdatera cache med nya testresultat
      queryClient.setQueryData(['functions'], (oldData: LLMFunction[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(func => 
          func.identifier === identifier 
            ? { ...func, testResults: data }
            : func
        );
      });
    },
  });

  const handleTestFunction = async (identifier: string) => {
    await testMutation.mutateAsync(identifier);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-4">An error occurred</h2>
        <p className="text-gray-600">Could not load the functions. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">LLM Functions</h1>
        <Link
          to="/create"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Create new function
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prompt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Examples
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Passed Tests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {functions?.map((func: LLMFunction) => (
              <tr key={func.identifier}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{func.prompt}</div>
                  <div className="text-sm text-gray-500">ID: {func.identifier}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{func.examples.length}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {func.testResults ? (
                      <span className={`${func.testResults.passedTests === func.testResults.totalTests ? 'text-green-600' : 'text-red-600'}`}>
                        {func.testResults.passedTests} / {func.testResults.totalTests}
                      </span>
                    ) : (
                      <span className="text-gray-500">Not tested</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    to={`/function/${func.identifier}`}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleTestFunction(func.identifier)}
                    disabled={testMutation.isPending}
                    className="text-green-600 hover:text-green-900 mr-4"
                  >
                    {testMutation.isPending ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(func.identifier)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 