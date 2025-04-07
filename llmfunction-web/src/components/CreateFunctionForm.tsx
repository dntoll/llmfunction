import { useForm, useFieldArray } from 'react-hook-form';
import type { CreateFunctionRequest } from '../types/api';
import { JsonInput } from './JsonInput';
import { ExampleCard } from './ExampleCard';

interface FormData {
  prompt: string;
  examples: Array<{
    input: string;
    output: string;
  }>;
}

interface Props {
  onSubmit: (data: CreateFunctionRequest) => void;
  isLoading: boolean;
}

export function CreateFunctionForm({ onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      prompt: '',
      examples: [{
        input: JSON.stringify({ "text": "Hello world" }, null, 2),
        output: JSON.stringify({ "result": "Greeting message received" }, null, 2)
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'examples',
  });

  const validateJSON = (value: unknown) => {
    try {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);
        if (typeof parsed !== 'object' || parsed === null) {
          return 'Must be a JSON object';
        }
        return true;
      }
      return 'Must be a string';
    } catch {
      return 'Invalid JSON';
    }
  };

  const handleFormSubmit = (data: FormData) => {
    const processedData: CreateFunctionRequest = {
      prompt: data.prompt,
      examples: data.examples.map(example => ({
        input: JSON.parse(example.input),
        output: JSON.parse(example.output)
      }))
    };
    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <JsonInput
        label="Prompt"
        name="prompt"
        register={register}
        error={errors.prompt}
        rows={4}
      />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Examples</h3>
          <button
            type="button"
            onClick={() => append({ 
              input: JSON.stringify({ "key": "value" }, null, 2),
              output: JSON.stringify({ "result": "output" }, null, 2)
            })}
            className="px-3 py-1 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50"
          >
            Add Example
          </button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <ExampleCard
              key={field.id}
              index={index}
              register={register}
              errors={{
                input: errors.examples?.[index]?.input,
                output: errors.examples?.[index]?.output
              }}
              onRemove={fields.length > 1 ? () => remove(index) : undefined}
            />
          ))}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Function'}
        </button>
      </div>
    </form>
  );
} 