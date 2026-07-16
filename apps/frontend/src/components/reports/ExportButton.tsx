import { Show } from 'solid-js';
import { ExportColumn, exportToCSV, exportToExcel, exportToPDF } from '../../utils/export';

interface ExportButtonProps {
  data: () => any[];
  columns: ExportColumn[];
  filename: string;
  title: string;
  subtitle?: string;
}

export function ExportButtonGroup(props: ExportButtonProps) {
  return (
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-secondary-400 uppercase tracking-wider mr-1">Export:</span>
      <button
        onClick={() => exportToExcel(props.data(), props.columns, props.filename)}
        class="px-3 py-1.5 text-xs font-bold rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors dark:bg-green-950/30 dark:border-green-800 dark:text-green-400"
      >
        📊 Excel
      </button>
      <button
        onClick={() => exportToPDF(props.data(), props.columns, props.filename, props.title, props.subtitle)}
        class="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
      >
        📄 PDF
      </button>
      <button
        onClick={() => exportToCSV(props.data(), props.columns, props.filename)}
        class="px-3 py-1.5 text-xs font-bold rounded-lg border border-secondary-300 bg-secondary-50 text-secondary-700 hover:bg-secondary-100 transition-colors dark:bg-secondary-800 dark:border-secondary-700 dark:text-secondary-300"
      >
        📋 CSV
      </button>
    </div>
  );
}
