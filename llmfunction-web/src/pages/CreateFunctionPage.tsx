import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createFunction } from '../services/api';
import { CreateFunctionForm } from '../components/CreateFunctionForm';
import type { CreateFunctionRequest } from '../types/api';

export const CreateFunctionPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isLoading, error } = useMutation({
    mutationFn: createFunction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['functions'] });
      navigate('/');
    },
  });

  const handleSubmit = async (data: CreateFunctionRequest) => {
    mutate(data);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Skapa ny funktion</h1>
          <p className="mt-2 text-sm text-gray-700">
            Skapa en ny LLM-funktion genom att ange en prompt och exempel.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700 font-medium">Fel vid skapande av funktion</div>
            <div className="text-red-600 mt-2">
              {error instanceof Error ? error.message : 'Ett oväntat fel uppstod'}
            </div>
          </div>
        )}

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <CreateFunctionForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}; 