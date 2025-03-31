import { Link } from 'react-router-dom';
import type { LLMFunction } from '../types/api';

interface FunctionCardProps {
  function: LLMFunction;
}

export const FunctionCard = ({ function: func }: FunctionCardProps) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {func.prompt}
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>Examples: {func.examples.length}</p>
        </div>
        <div className="mt-5">
          <Link
            to={`/function/${func.identifier}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}; 