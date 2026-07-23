import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { ExportColumn, exportToCSV, exportToExcel, exportToPDF } from '../../utils/export';

export interface ExportButtonProps {
  data?: () => unknown[];
  onFetchAll?: () => Promise<unknown[]>;
  columns: ExportColumn[];
  filename: string;
  title: string;
  subtitle?: string;
}

export function ExportButtonGroup(props: ExportButtonProps) {
  const toast = useToast();
  const [open, setOpen] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  let dropdownRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      setOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    setOpen(false);
    setExporting(true);
    try {
      let exportData: unknown[] = [];
      if (props.onFetchAll) {
        toast.showToast('Mengunduh data untuk ekspor...', 'info');
        exportData = await props.onFetchAll();
      } else if (props.data) {
        exportData = props.data();
      }

      if (!exportData || exportData.length === 0) {
        toast.showToast('Tidak ada data untuk diekspor', 'info');
        return;
      }

      if (format === 'excel') exportToExcel(exportData, props.columns, props.filename);
      else if (format === 'pdf') exportToPDF(exportData, props.columns, props.filename, props.title, props.subtitle);
      else if (format === 'csv') exportToCSV(exportData, props.columns, props.filename);

      toast.showToast('Ekspor berhasil diunduh', 'success');
    } catch (err) {
      console.error('Export failed:', err);
      toast.showToast('Gagal mengunduh data ekspor', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div class="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={exporting()}
        onClick={() => setOpen(!open())}
        class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-700 shadow-sm transition-all focus:outline-none active:scale-95 disabled:opacity-50"
      >
        <span class="text-sm">{exporting() ? '⏳' : '📤'}</span>
        <span>{exporting() ? 'Mengunduh...' : 'Ekspor'}</span>
        <svg
          class={`w-3.5 h-3.5 transition-transform duration-200 ${open() ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={open()}>
        <div class="origin-top-right absolute right-0 mt-1.5 w-48 rounded-xl shadow-lg bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-fadeIn">
          <div class="py-1" role="menu">
            <button
              onClick={() => handleExport('excel')}
              class="w-full text-left px-3.5 py-2 text-xs font-medium text-secondary-700 dark:text-secondary-200 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-700 dark:hover:text-green-400 flex items-center gap-2.5 transition-colors"
              role="menuitem"
            >
              <span class="text-base">📊</span>
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              class="w-full text-left px-3.5 py-2 text-xs font-medium text-secondary-700 dark:text-secondary-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-2.5 transition-colors"
              role="menuitem"
            >
              <span class="text-base">📄</span>
              <span>PDF Document (.pdf)</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              class="w-full text-left px-3.5 py-2 text-xs font-medium text-secondary-700 dark:text-secondary-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-2.5 transition-colors"
              role="menuitem"
            >
              <span class="text-base">📋</span>
              <span>CSV File (.csv)</span>
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}

export const ExportButton = ExportButtonGroup;
