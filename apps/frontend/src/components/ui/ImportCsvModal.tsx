import { createSignal, For, type JSX, Show } from 'solid-js';
import * as XLSX from 'xlsx';
import { fetchApi } from '../../utils/api';
import { detectDelimiter, parseCsv } from '../../utils/csv';
import { Button } from './Button';
import { Modal } from './Modal';

interface ImportCsvModalProps {
  show: boolean;
  onClose: () => void;
  importUrl: string;
  templateHeaders: string[];
  customTemplateRows?: string[][];
  title: string;
  description?: string;
  headerExtras?: JSX.Element;
  onSuccess: () => void;
  onImport?: (
    rows: string[][],
    mode: string,
  ) => Promise<{ successCount: number; errors: { line: number; error: string }[] }>;
}

export function ImportCsvModal(props: ImportCsvModalProps) {
  const [activeTab, setActiveTab] = createSignal<'upload' | 'paste'>('upload');
  const [duplicateMode, setDuplicateMode] = createSignal('skip');
  const [file, setFile] = createSignal<File | null>(null);
  const [pasteContent, setPasteContent] = createSignal('');
  const [customDelimiter, setCustomDelimiter] = createSignal<string>('auto');
  const [detectedDelimiterName, setDetectedDelimiterName] = createSignal<string>('');
  const [parsedRows, setParsedRows] = createSignal<string[][]>([]);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [importReport, setImportReport] = createSignal<{
    successCount: number;
    errors: { line: number; error: string }[];
  } | null>(null);

  const parseTextWithDelimiter = (text: string, manualDelim: string): string[][] => {
    const delim = manualDelim === 'auto' ? undefined : manualDelim;
    const detected = detectDelimiter(text);
    if (detected === ';') setDetectedDelimiterName('Titik Koma (;)');
    else if (detected === '\t') setDetectedDelimiterName('Tab');
    else setDetectedDelimiterName('Koma (,)');
    return parseCsv(text, delim);
  };

  const handleFileChange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    setErrorMsg('');
    setSuccessMsg('');
    setImportReport(null);
    if (!selectedFile) {
      setFile(null);
      setParsedRows([]);
      setDetectedDelimiterName('');
      return;
    }

    setFile(selectedFile);
    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setErrorMsg('File Excel tidak memiliki lembar kerja (sheet).');
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          raw: false,
          defval: '',
        });
        setDetectedDelimiterName('Excel Spreadsheet');
        setParsedRows(rows.filter((r) => r.some((c) => String(c).trim() !== '')));
      } catch (err) {
        setErrorMsg(`Gagal membaca file Excel: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      // CSV or text
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = parseTextWithDelimiter(text, customDelimiter());
        setParsedRows(rows);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handlePasteChange = (text: string) => {
    setPasteContent(text);
    setErrorMsg('');
    setSuccessMsg('');
    setImportReport(null);
    if (!text.trim()) {
      setParsedRows([]);
      setDetectedDelimiterName('');
      return;
    }
    const rows = parseTextWithDelimiter(text, customDelimiter());
    setParsedRows(rows);
  };

  const handleDownloadExcelTemplate = () => {
    const rows: string[][] = [];
    if (props.customTemplateRows && props.customTemplateRows.length > 0) {
      rows.push(...props.customTemplateRows);
    } else {
      rows.push(props.templateHeaders);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `template_${props.title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDownloadCsvTemplate = () => {
    let rawCsv = '';
    if (props.customTemplateRows && props.customTemplateRows.length > 0) {
      rawCsv = props.customTemplateRows
        .map((row) =>
          row
            .map((cell) =>
              cell.includes(',') || cell.includes(';') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell,
            )
            .join(','),
        )
        .join('\r\n');
    } else {
      rawCsv = `${props.templateHeaders.join(',')}\r\n`;
    }
    const content = `\uFEFF${rawCsv}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${props.title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (parsedRows().length === 0) {
      setErrorMsg(
        activeTab() === 'upload' ? 'Silakan pilih file terlebih dahulu.' : 'Silakan tempel data terlebih dahulu.',
      );
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setImportReport(null);

    try {
      let res: { successCount: number; errors: { line: number; error: string }[] };

      if (props.onImport) {
        res = await props.onImport(parsedRows(), duplicateMode());
      } else {
        const formData = new FormData();
        if (file()) {
          formData.append('file', file()!);
        } else {
          // If from paste, convert parsedRows to CSV blob
          const csvString = parsedRows()
            .map((r) =>
              r
                .map((cell) =>
                  cell.includes(',') || cell.includes('\n') || cell.includes('"')
                    ? `"${cell.replace(/"/g, '""')}"`
                    : cell,
                )
                .join(','),
            )
            .join('\r\n');
          formData.append('file', new Blob([csvString], { type: 'text/csv' }), 'import.csv');
        }
        formData.append('mode', duplicateMode());
        res = await fetchApi<{ successCount: number; errors: { line: number; error: string }[] }>(props.importUrl, {
          method: 'POST',
          body: formData,
        });
      }
      setImportReport(res);
      if (res.errors && res.errors.length > 0) {
        if (res.successCount > 0) {
          setSuccessMsg(`Berhasil mengimpor ${res.successCount} data (dengan beberapa catatan kendala).`);
          props.onSuccess();
        } else {
          setErrorMsg('Gagal mengimpor data. Silakan cek detail error di bawah.');
        }
      } else {
        setSuccessMsg(`Berhasil mengimpor seluruh data (${res.successCount} baris).`);
        setTimeout(() => {
          props.onSuccess();
          props.onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={props.show} onClose={props.onClose} title={`Impor Data ${props.title}`}>
      <div class="flex flex-col gap-4">
        {/* Banner download template */}
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-action-50 dark:bg-secondary-800/50 p-3 rounded-xl border border-action-100 dark:border-secondary-800">
          <div>
            <p class="text-xs font-semibold text-secondary-800 dark:text-white">Unduh Template Standar:</p>
            <p class="text-fine text-secondary-500 dark:text-secondary-400">
              Gunakan format Excel (.xlsx) untuk menghindari masalah tanda pemisah regional.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleDownloadExcelTemplate}>
              Excel (.xlsx)
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadCsvTemplate}>
              CSV (.csv)
            </Button>
          </div>
        </div>

        <Show when={props.headerExtras}>
          <div>{props.headerExtras}</div>
        </Show>

        <Show when={props.description}>
          <div class="p-3 bg-secondary-50 dark:bg-secondary-800/50 border border-secondary-200 dark:border-secondary-800 rounded-lg text-xs text-secondary-600 dark:text-secondary-300 leading-relaxed">
            {props.description}
          </div>
        </Show>

        {/* Tab Navigasi */}
        <div class="flex border-b border-secondary-200 dark:border-secondary-700">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            class={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab() === 'upload'
                ? 'border-action text-action dark:text-action-ondark'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
            }`}
          >
            Unggah File (.xlsx / .csv)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            class={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab() === 'paste'
                ? 'border-action text-action dark:text-action-ondark'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
            }`}
          >
            Tempel dari Spreadsheet (Ctrl+V)
          </button>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-secondary-700 dark:text-secondary-200">
              Pilihan Penanganan Duplikat Key
            </label>
            <select
              value={duplicateMode()}
              onChange={(e) => setDuplicateMode(e.currentTarget.value)}
              class="w-full text-xs border border-secondary-300 dark:border-secondary-700 rounded-lg p-2 bg-white dark:bg-secondary-900 text-secondary-800 dark:text-secondary-200"
            >
              <option value="skip">Skip (Abaikan baris jika data key sudah ada)</option>
              <option value="update">Update / Overwrite (Ganti data lama jika data key sudah ada)</option>
            </select>
          </div>

          <Show when={activeTab() === 'upload'}>
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-secondary-700 dark:text-secondary-200">
                Pilih File Excel (.xlsx, .xls) atau CSV (.csv)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                class="w-full text-xs text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-action-50 file:text-action hover:file:bg-action-100 dark:file:bg-secondary-800 dark:file:text-white"
              />
            </div>
          </Show>

          <Show when={activeTab() === 'paste'}>
            <div class="flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <label class="text-xs font-semibold text-secondary-700 dark:text-secondary-200">
                  Tempel Baris Nilai dari Excel / Google Sheets:
                </label>
                <span class="text-fine text-secondary-400">Salin kolom dari spreadsheet lalu tempel ke bawah</span>
              </div>
              <textarea
                value={pasteContent()}
                onInput={(e) => handlePasteChange(e.currentTarget.value)}
                rows={5}
                placeholder="Contoh salinan Excel:&#10;NIM&#9;Nama&#9;UTS&#9;UAS&#10;2024001&#9;Ahmad&#9;85&#9;90"
                class="w-full font-mono text-xs border border-secondary-300 dark:border-secondary-700 rounded-xl p-2.5 bg-white dark:bg-secondary-900 text-secondary-800 dark:text-secondary-200 placeholder:text-secondary-400 focus:ring-1 focus:ring-action focus:outline-none"
              />
            </div>
          </Show>

          {/* Opsi Delimiter & Indikator */}
          <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 rounded-xl text-xs">
            <div class="flex items-center gap-2">
              <span class="text-secondary-500 font-medium">Format / Delimiter Terdeteksi:</span>
              <span class="px-2 py-0.5 rounded-full text-fine font-bold bg-action-50 text-action dark:bg-action/20 dark:text-action-ondark border border-action-100 dark:border-action/30">
                {detectedDelimiterName() || 'Otomatis'}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-fine text-secondary-500">Pilihan Manual:</span>
              <select
                value={customDelimiter()}
                onChange={(e) => {
                  setCustomDelimiter(e.currentTarget.value);
                  if (activeTab() === 'paste' && pasteContent()) {
                    setParsedRows(parseTextWithDelimiter(pasteContent(), e.currentTarget.value));
                  }
                }}
                class="text-fine border border-secondary-300 dark:border-secondary-700 rounded-md py-1 px-2 bg-white dark:bg-secondary-900 text-secondary-800 dark:text-secondary-200"
              >
                <option value="auto">Auto-Detect</option>
                <option value=",">Koma (,)</option>
                <option value=";">Titik Koma (;)</option>
                <option value="&#9;">Tab (\t)</option>
              </select>
            </div>
          </div>

          {/* Preview Table */}
          <Show when={parsedRows().length > 0}>
            <div class="flex flex-col gap-1.5">
              <span class="text-fine font-semibold text-secondary-500">
                Preview Data ({parsedRows().length} baris terdeteksi):
              </span>
              <div class="max-h-40 overflow-auto border border-secondary-200 dark:border-secondary-800 rounded-xl">
                <table class="min-w-full divide-y divide-secondary-200 dark:divide-secondary-800 text-left text-xs bg-white dark:bg-secondary-900">
                  <thead class="bg-secondary-50 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 font-bold sticky top-0">
                    <tr>
                      <For each={parsedRows()[0]}>{(h) => <th class="px-3 py-2 whitespace-nowrap">{h}</th>}</For>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                    <For each={parsedRows().slice(1, 6)}>
                      {(row) => (
                        <tr>
                          <For each={row}>
                            {(cell) => (
                              <td class="px-3 py-1.5 whitespace-nowrap text-secondary-700 dark:text-secondary-200">
                                {cell}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </Show>

          <Show when={errorMsg()}>
            <div class="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-xl text-xs font-medium border border-red-200 dark:border-red-900/50">
              {errorMsg()}
            </div>
          </Show>

          <Show when={successMsg()}>
            <div class="p-3 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 rounded-xl text-xs font-medium border border-green-200 dark:border-green-900/50">
              {successMsg()}
            </div>
          </Show>

          {/* Report Summary & Error Log */}
          <Show when={importReport()}>
            <div class="flex flex-col gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/60 rounded-xl border border-secondary-200 dark:border-secondary-800">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-secondary-700 dark:text-secondary-200">
                  Laporan Hasil Pengimporan:
                </span>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                    ✅ {importReport()!.successCount} Berhasil
                  </span>
                  <Show when={importReport()!.errors.length > 0}>
                    <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      ❌ {importReport()!.errors.length} Kendala
                    </span>
                  </Show>
                </div>
              </div>

              <Show when={importReport()!.errors.length > 0}>
                <div class="flex flex-col gap-1.5">
                  <span class="text-[11px] font-semibold text-red-600 dark:text-red-400">
                    Detail Kendala per Baris:
                  </span>
                  <div class="max-h-48 overflow-auto rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-secondary-900">
                    <table class="min-w-full divide-y divide-red-100 dark:divide-red-950 text-left text-xs">
                      <thead class="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold sticky top-0">
                        <tr>
                          <th class="px-3 py-1.5 w-24">Baris</th>
                          <th class="px-3 py-1.5 w-24">Status</th>
                          <th class="px-3 py-1.5">Detail Kendala</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-red-100 dark:divide-red-950/40 font-mono text-[11px]">
                        <For each={importReport()!.errors}>
                          {(err) => {
                            const lineNum = err.line || (err as { row?: number }).row || 0;
                            return (
                              <tr class="hover:bg-red-50/50 dark:hover:bg-red-950/20">
                                <td class="px-3 py-1.5 font-bold text-red-800 dark:text-red-300">
                                  {lineNum > 0 ? `Baris ${lineNum}` : 'Sistem'}
                                </td>
                                <td class="px-3 py-1.5">
                                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                    ❌ Gagal
                                  </span>
                                </td>
                                <td class="px-3 py-1.5 text-red-700 dark:text-red-300">{err.error}</td>
                              </tr>
                            );
                          }}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          <div class="flex justify-end gap-2 mt-2">
            <Button variant="secondary" type="button" onClick={props.onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading() || parsedRows().length === 0}>
              {loading() ? 'Mengimpor...' : 'Impor Sekarang'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
