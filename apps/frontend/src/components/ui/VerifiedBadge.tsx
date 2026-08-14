import { fmtWaktu } from '../../utils/format';

interface VerifiedBadgeProps {
  verifiedAt?: string | null;
  verifiedByName?: string | null;
  label?: string;
}

export function VerifiedBadge(props: VerifiedBadgeProps) {
  const hasDetail = Boolean(props.verifiedAt || props.verifiedByName);
  const title = hasDetail
    ? [
        props.verifiedAt ? `Diverifikasi pada: ${fmtWaktu(props.verifiedAt)}` : null,
        props.verifiedByName ? `Oleh: ${props.verifiedByName}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : undefined;

  return (
    <span
      title={title}
      class="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
    >
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {props.label ?? 'Terverifikasi'}
    </span>
  );
}
