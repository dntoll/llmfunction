import { UseFormRegister, FieldError } from 'react-hook-form';
import { JsonInput } from './JsonInput';
import type { TestResult } from '../types/api';

interface ExampleCardProps {
  index: number;
  register?: UseFormRegister<FormData>;
  errors?: {
    input?: FieldError;
    output?: FieldError;
  };
  onRemove?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  isRemovable?: boolean;
  isEditing?: boolean;
  value?: {
    input: string;
    output: string;
  };
  onChange?: (field: 'input' | 'output', value: string) => void;
  testResult?: TestResult;
}

interface FormData {
  prompt: string;
  examples: Array<{
    input: string;
    output: string;
  }>;
}

export function ExampleCard({ 
  index, 
  register, 
  errors, 
  onRemove,
  onCopy,
  onEdit,
  onSave,
  onCancel,
  isRemovable = true,
  isEditing = false,
  value,
  onChange,
  testResult
}: ExampleCardProps) {
  const getBackgroundColor = () => {
    if (!testResult) return '';
    return testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  return (
    <div className={`border rounded-md p-4 ${getBackgroundColor()}`}>
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-sm font-medium text-gray-900">Example {index + 1}</h4>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Copy
              </button>
              {isRemovable && onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Delete
                </button>
              )}
            </>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                onClick={onSave}
                className="text-sm text-green-600 hover:text-green-500"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-gray-600 hover:text-gray-500"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <JsonInput
          label="Input (JSON)"
          name={`examples.${index}.input`}
          register={register}
          error={errors?.input}
          placeholder='{"text": "Hello world"}'
          value={value?.input}
          onChange={onChange ? (e) => onChange('input', e.target.value) : undefined}
        />
        <JsonInput
          label="Output (JSON)"
          name={`examples.${index}.output`}
          register={register}
          error={errors?.output}
          placeholder='{"result": "Greeting message received"}'
          value={value?.output}
          onChange={onChange ? (e) => onChange('output', e.target.value) : undefined}
        />
        {testResult && !isEditing && (
          <div>
            <span className="font-medium text-gray-700">Actual Output:</span>
            <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
              {JSON.stringify(testResult.actualOutput, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 