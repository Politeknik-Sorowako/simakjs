import { JSX } from 'solid-js';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: JSX.Element;
  color?: 'brand' | 'accent' | 'green' | 'rose' | 'yellow';
  href?: string;
  loading?: boolean;
}

const colorMap = {
  brand: { bg: 'bg-brand-50 dark:bg-brand-950/40', text: 'text-brand-600 dark:text-brand-400', border: 'border-brand-200 dark:border-brand-900/50' },
  accent: { bg: 'bg-accent-50 dark:bg-accent-950/40', text: 'text-accent-600 dark:text-accent-400', border: 'border-accent-200 dark:border-accent-900/50' },
  green: { bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-900/50' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-900/50' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-900/50' },
};

export function StatCard(props: StatCardProps) {
  const c = colorMap[props.color || 'brand'];

  const content = (
    <div class={`bg-white dark:bg-secondary-900 border ${c.border} p-5 rounded-2xl shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-md ${props.href ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
      <div class="flex flex-col gap-0.5">
        <span class="text-xs font-semibold text-secondary-400 dark:text-secondary-200 uppercase tracking-wider">{props.title}</span>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-secondary-800 dark:text-white">
            {props.loading ? (
              <span class="inline-block w-16 h-8 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse" />
            ) : props.value}
          </span>
          {props.subtitle && <span class="text-xs text-secondary-400">{props.subtitle}</span>}
        </div>
      </div>
      {props.icon && (
        <div class={`p-3 ${c.bg} ${c.text} rounded-xl flex-shrink-0`}>
          {props.icon}
        </div>
      )}
    </div>
  );

  if (props.href) {
    return <a href={props.href}>{content}</a>;
  }
  return content;
}
