import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateFunctionRequest } from '../types/api';

const exampleSchema = z.object({
  input: z.record(z.any()),
  output: z.record(z.any()),
});

const createFunctionSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  exampleOutput: z.record(z.any()),
  examples: z.array(exampleSchema).min(1, 'At least one example is required'),
});

type CreateFunctionFormData = z.infer<typeof createFunctionSchema>;

interface CreateFunctionFormProps {
  onSubmit: (data: CreateFunctionRequest) => Promise<void>;
  isLoading: boolean;
}

export const CreateFunctionForm = ({ onSubmit, isLoading }: CreateFunctionFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateFunctionFormData>({
    resolver: zodResolver(createFunctionSchema),
    defaultValues: {
      prompt: '',
      exampleOutput: {},
      examples: [{ input: {}, output: {} }],
    },
  });

  const examples = watch('examples');

  const addExample = () => {
    setValue('examples', [...examples, { input: {}, output: {} }]);
  };

  const removeExample = (index: number) => {
    setValue(
      'examples',
      examples.filter((_, i) => i !== index)
    );
  };

  const updateExample = (index: number, field: 'input' | 'output', value: string) => {
    try {
      const parsedValue = JSON.parse(value);
      const newExamples = [...examples];
      newExamples[index] = {
        ...newExamples[index],
        [field]: parsedValue,
      };
      setValue('examples', newExamples);
    } catch {
      // Ignorera JSON-parsningsfel
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
          Prompt
        </label>
        <div className="mt-1">
          <textarea
            id="prompt"
            rows={3}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            {...register('prompt')}
          />
        </div>
        {errors.prompt && (
          <p className="mt-2 text-sm text-red-600">{errors.prompt.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="exampleOutput" className="block text-sm font-medium text-gray-700">
          Exempel på output
        </label>
        <div className="mt-1">
          <textarea
            id="exampleOutput"
            rows={3}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            onChange={(e) => {
              try {
                const parsedValue = JSON.parse(e.target.value);
                setValue('exampleOutput', parsedValue);
              } catch {
                // Ignorera JSON-parsningsfel
              }
            }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Examples
          </label>
          <button
            type="button"
            onClick={addExample}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add example
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {examples.map((_, index) => (
            <div key={index} className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-700">Example {index + 1}</h4>
                {examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExample(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Input
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    onChange={(e) => updateExample(index, 'input', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Output
                  </label>
                  <textarea
                    rows={3}
                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    onChange={(e) => updateExample(index, 'output', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {errors.examples && (
          <p className="mt-2 text-sm text-red-600">{errors.examples.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create function'}
        </button>
      </div>
    </form>
  );
}; 