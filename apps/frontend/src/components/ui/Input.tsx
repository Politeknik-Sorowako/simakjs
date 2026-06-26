import { JSX, splitProps } from 'solid-js';

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  selectOptions?: { label: string; value: string | number }[]; // In case we want a select wrapper
  isSelect?: boolean;
}

export function Input(props: InputProps) {
  const [, local] = splitProps(props, ['label', 'error', 'class', 'selectOptions', 'isSelect']);

  return (
    <div class="flex flex-col gap-1.5 w-full">
      {props.label && (
        <label class="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {props.label}
        </label>
      )}
      {props.isSelect ? (
        <select
          {...(local as any)}
          class={`px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm shadow-sm ${
            props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'
          } ${props.class || ''}`}
        >
          {props.selectOptions?.map((opt) => (
            <option value={opt.value} selected={opt.value === props.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...local}
          class={`px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm shadow-sm ${
            props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'
          } ${props.class || ''}`}
        />
      )}
      {props.error && (
        <span class="text-xs text-red-500 font-medium">{props.error}</span>
      )}
    </div>
  );
}
