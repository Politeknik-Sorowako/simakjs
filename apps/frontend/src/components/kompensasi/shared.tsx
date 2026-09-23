import { For, type JSX, Show } from 'solid-js';
import type { KetidakhadiranSumber } from '../../controllers/kompensasiAdminController';
import { Badge } from '../ui/Badge';

export function TableLoadingFallback(props: { cols: number }) {
  return (
    <tr>
      <For each={Array.from({ length: props.cols })}>
        {() => (
          <td class="px-6 py-4">
            <div class="h-4 w-3/4 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
          </td>
        )}
      </For>
    </tr>
  );
}

export function EmptyState(props: { message: string }) {
  return (
    <tr>
      <td colspan="99" class="text-center py-12 text-secondary-400 dark:text-secondary-200">
        {props.message}
      </td>
    </tr>
  );
}

export function ErrorState(props: { message: string; onRetry: () => void }) {
  return (
    <tr>
      <td colspan="99" class="text-center py-12">
        <div class="flex flex-col items-center gap-3">
          <div class="text-danger-600 dark:text-danger-400 font-bold text-sm">Gagal memuat data</div>
          <div class="text-xs text-secondary-400 dark:text-secondary-200 max-w-md break-words">{props.message}</div>
          <button
            type="button"
            onClick={props.onRetry}
            class="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary-700 hover:bg-primary-600 text-white transition-colors active:scale-95"
          >
            Coba Lagi
          </button>
        </div>
      </td>
    </tr>
  );
}

export function SumberBadge(props: { sumber: KetidakhadiranSumber }) {
  const variant = () => {
    switch (props.sumber) {
      case 'BAP':
        return 'info';
      case 'APEL':
        return 'warning';
      case 'PRAKTIKUM':
        return 'accent';
      default:
        return 'default';
    }
  };
  const label = () => {
    switch (props.sumber) {
      case 'BAP':
        return 'Perkuliahan';
      case 'APEL':
        return 'Apel';
      case 'PRAKTIKUM':
        return 'Praktikum';
      default:
        return 'Manual';
    }
  };
  return <Badge variant={variant()}>{label()}</Badge>;
}

const STATUS_VARIANT: Record<string, 'danger' | 'warning' | 'success' | 'info' | 'default'> = {
  ALPA: 'danger',
  TERLAMBAT: 'warning',
  TELAT: 'warning',
  SAKIT: 'info',
  IZIN: 'info',
  RUSAK: 'danger',
  UNKNOWN: 'default',
  HADIR: 'success',
};

export function StatusBadge(props: { status: string }) {
  const key = props.status.toUpperCase();
  return (
    <Badge variant={STATUS_VARIANT[key] || 'default'} size="sm">
      {key}
    </Badge>
  );
}

export function VerifBadge(props: { isVerified: boolean }) {
  return props.isVerified ? (
    <Badge variant="success" size="sm">
      Terverifikasi
    </Badge>
  ) : (
    <Badge variant="warning" size="sm">
      Belum
    </Badge>
  );
}

export function DurasiText(props: { menit: number }) {
  const text = () => {
    const m = Number(props.menit) || 0;
    const jam = Math.floor(m / 60);
    const sisa = m % 60;
    return sisa === 0 ? `${jam} jam` : `${jam} jam ${sisa} mnt`;
  };
  return <span class="font-semibold text-secondary-800 dark:text-secondary-100">{text()}</span>;
}

export function KpiCard(props: {
  label: string;
  value: string | number;
  accent?: 'primary' | 'danger' | 'success' | 'warning';
  hint?: string;
}) {
  const accent = () => props.accent || 'primary';
  const valueClass = () => {
    switch (accent()) {
      case 'danger':
        return 'text-danger-600 dark:text-danger-400';
      case 'success':
        return 'text-success-600 dark:text-success-400';
      case 'warning':
        return 'text-warning-600 dark:text-warning-400';
      default:
        return 'text-primary-700 dark:text-primary-400';
    }
  };
  return (
    <div class="rounded-2xl border border-secondary-200/80 dark:border-secondary-800 bg-white dark:bg-secondary-900 p-5 shadow-card dark:shadow-card-dark transition-colors">
      <div class="text-fine font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
        {props.label}
      </div>
      <div class={`mt-1 text-2xl font-bold ${valueClass()}`}>{props.value}</div>
      <Show when={props.hint}>
        <div class="text-caption text-secondary-400 dark:text-secondary-500 mt-0.5">{props.hint}</div>
      </Show>
    </div>
  );
}

export function FilterField(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-1 min-w-[150px]">
      <label class="text-fine font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

export function RefreshingBadge(props: { show: boolean }) {
  return (
    <Show when={props.show}>
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
        <span class="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        Memperbarui…
      </span>
    </Show>
  );
}
