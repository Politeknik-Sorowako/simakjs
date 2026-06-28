import { JSX, splitProps } from 'solid-js';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'class', 'onClick']);
  const baseStyle = "px-4 py-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 transform active:scale-95 text-sm";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 focus:ring-blue-500",
    secondary: "bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 focus:ring-gray-400",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/20 focus:ring-red-500",
    success: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 focus:ring-emerald-500",
  };

  return (
    <button
      {...others}
      onclick={(e) => {
        if (local.onClick) (local.onClick as any)(e);
      }}
      class={`${baseStyle} ${variants[local.variant || 'primary']} ${local.class || ''}`}
    />
  );
}
