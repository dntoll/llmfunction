import { UseFormRegister, FieldError } from 'react-hook-form';

interface JsonInputProps {
  label: string;
  name: string;
  register?: UseFormRegister<any>;
  error?: FieldError;
  rows?: number;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function JsonInput({ 
  label, 
  name, 
  register, 
  error, 
  rows = 3, 
  placeholder,
  value,
  onChange
}: JsonInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
          error ? 'border-red-500' : ''
        }`}
        rows={rows}
        placeholder={placeholder}
        {...(register ? register(name) : {})}
        {...(value !== undefined ? { value } : {})}
        {...(onChange ? { onChange } : {})}
      />
      {error?.message && (
        <p className="mt-1 text-sm text-red-600">{String(error.message)}</p>
      )}
    </div>
  );
} 