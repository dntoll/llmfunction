import { useQuery } from '@tanstack/react-query';
import { listFunctions } from '../services/api';
import { FunctionCard } from '../components/FunctionCard';

export const HomePage = () => {
  const { data: functions, isLoading, error } = useQuery({
    queryKey: ['functions'],
    queryFn: listFunctions,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-700">Error loading functions</div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Functions</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all available LLM functions.
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {functions?.map((func) => (
          <FunctionCard key={func.identifier} function={func} />
        ))}
      </div>
    </div>
  );
}; 