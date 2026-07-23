import { createSignal, For, Show } from 'solid-js';
import { fetchApi } from '../../utils/api';
import { parseCsv } from '../../utils/csv';
import { Button } from './Button';
import { Modal } from './Modal';

interface ImportCsvModalProps {
  show: boolean;
  onClose: () => void;
  importUrl: string;
  templateHeaders: string[];
  customTemplateRows?: string[][];
  title: string;
  onSuccess: () => void;
  onImport?: (
    rows: string[][],
    mode: string,
  ) => Promise<{ successCount: number; errors: { line: number; error: string }[] }>;
}

export function ImportCsvModal(props: ImportCsvModalProps) {
  const [duplicateMode, setDuplicateMode] = createSignal('skip');
  const [file, setFile] = createSignal<File | null>(null);
  const [preview, setPreview] = createSignal<string[][]>([]);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [importReport, setImportReport] = createSignal<{
    successCount: number;
    errors: { line: number; error: string }[];
  } | null>(null);

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const selectedFile = target.files?.[0];
    setErrorMsg('');
    setSuccessMsg('');
    setImportReport(null);
    if (!selectedFile) {
      setFile(null);
      setPreview([]);
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCsv(text);
      setPreview(rows.slice(0, 6).filter((row) => row.some((cell) => cell.trim() !== '')));
    };
    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
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
    const selectedFile = file();
    if (!selectedFile) {
      setErrorMsg('Silakan pilih file terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setImportReport(null);

    try {
      let res: { successCount: number; errors: { line: number; error: string }[] };

      if (props.onImport) {
        const reader = new FileReader();
        const text = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(selectedFile);
        });
        const rows = parseCsv(text);
        res = await props.onImport(rows, duplicateMode());
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('mode', duplicateMode());
        res = await fetchApi<{ successCount: number; errors: { line: number; error: string }[] }>(props.importUrl, {
          method: 'POST',
          body: formData,
        });
      }
      setImportReport(res);
      if (res.errors && res.errors.length > 0) {
        if (res.successCount > 0) {
          setSuccessMsg(`Berhasil mengimpor ${res.successCount} data (dengan beberapa error).`);
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
    <Modal show={props.show} onClose={props.onClose} title={`Impor Data ${props.title} via CSV`}>
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center bg-accent-50 dark:bg-secondary-800/50 p-3 rounded-lg border border-accent-100 dark:border-secondary-800">
          <span class="text-xs text-accent-800 dark:text-accent-400 font-medium">
            Unduh template format CSV standar terlebih dahulu
          </span>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            Unduh Template
          </Button>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
              Pilihan Penanganan Duplikat Key
            </label>
            <select
              value={duplicateMode()}
              onChange={(e) => setDuplicateMode(e.currentTarget.value)}
              class="w-full text-sm border border-secondary-300 dark:border-secondary-700 rounded-lg p-2 bg-white dark:bg-secondary-900 text-secondary-800 dark:text-secondary-200"
            >
              <option value="skip">Skip (Abaikan baris jika data key sudah ada)</option>
              <option value="update">Update / Overwrite (Ganti data lama jika data key sudah ada)</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Pilih File CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              class="w-full text-sm text-secondary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 dark:file:bg-secondary-800 dark:file:text-white"
            />
          </div>

          {/* Preview Table */}
          <Show when={preview().length > 0}>
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold text-secondary-500">Preview 5 Baris Pertama CSV:</span>
              <div class="max-h-40 overflow-auto border border-secondary-200 dark:border-secondary-800 rounded-lg">
                <table class="min-w-full divide-y divide-secondary-200 dark:divide-secondary-800 text-left text-xs bg-white dark:bg-secondary-900">
                  <thead class="bg-secondary-50 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 font-bold">
                    <tr>
                      <For each={preview()[0]}>{(h) => <th class="px-3 py-2">{h}</th>}</For>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                    <For each={preview().slice(1)}>
                      {(row) => (
                        <tr>
                          <For each={row}>
                            {(cell) => <td class="px-3 py-1.5 text-secondary-700 dark:text-secondary-200">{cell}</td>}
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
            <div class="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium">{errorMsg()}</div>
          </Show>

          <Show when={successMsg()}>
            <div class="p-3 bg-green-50 text-green-700 rounded-lg text-xs font-medium">{successMsg()}</div>
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
                    Detail Kendala per Baris CSV:
                  </span>
                  <div class="max-h-48 overflow-auto rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-secondary-900">
                    <table class="min-w-full divide-y divide-red-100 dark:divide-red-950 text-left text-xs">
                      <thead class="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-bold sticky top-0">
                        <tr>
                          <th class="px-3 py-1.5 w-24">Baris CSV</th>
                          <th class="px-3 py-1.5 w-24">Status</th>
                          <th class="px-3 py-1.5">Detail Kendala</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-red-100 dark:divide-red-950/40 font-mono text-[11px]">
                        <For each={importReport()!.errors}>
                          {(err) => (
                            <tr class="hover:bg-red-50/50 dark:hover:bg-red-950/20">
                              <td class="px-3 py-1.5 font-bold text-red-800 dark:text-red-300">
                                {err.line > 0 ? `Baris ${err.line}` : 'Sistem'}
                              </td>
                              <td class="px-3 py-1.5">
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                  ❌ Gagal
                                </span>
                              </td>
                              <td class="px-3 py-1.5 text-red-700 dark:text-red-300">{err.error}</td>
                            </tr>
                          )}
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
            <Button type="submit" disabled={loading() || !file()}>
              {loading() ? 'Mengimpor...' : 'Impor Sekarang'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
