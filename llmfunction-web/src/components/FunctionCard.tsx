import { Link } from 'react-router-dom';
import type { LLMFunction } from '../types/api';

interface FunctionCardProps {
  func: LLMFunction;
}

export function FunctionCard({ func }: FunctionCardProps) {
  if (!func) return null;

  return (
    <Link
      to={`/function/${func.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{func.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{func.prompt}</p>
        <div className="flex items-center text-sm text-gray-500">
          <span>{func.examples?.length || 0} exempel</span>
        </div>
      </div>
    </Link>
  );
} 