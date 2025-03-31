import { useQuery } from '@tanstack/react-query';
import { listFunctions } from '../services/api';
import { FunctionCard } from '../components/FunctionCard';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { data: functions, isLoading, error } = useQuery({
    queryKey: ['functions'],
    queryFn: listFunctions,
  });

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
        <h2 className="text-2xl font-bold text-red-600 mb-4">Ett fel uppstod</h2>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Funktioner</h1>
        <Link
          to="/create"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Skapa ny funktion
        </Link>
      </div>

      {functions && functions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {functions.map((func) => (
            <FunctionCard key={func.identifier} func={func} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">Inga funktioner hittades. Skapa en ny funktion för att komma igång.</p>
        </div>
      )}
    </div>
  );
} 