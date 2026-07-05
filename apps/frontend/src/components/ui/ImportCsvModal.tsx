import { createSignal, For, Show } from 'solid-js';
import { Button } from './Button';
import { Modal } from './Modal';

interface ImportCsvModalProps {
  show: boolean;
  onClose: () => void;
  importUrl: string;
  templateHeaders: string[];
  title: string;
  onSuccess: () => void;
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
      const rows = text.split(/\r?\n/).map((line) => line.split(','));
      setPreview(rows.slice(0, 6).filter((row) => row.some((cell) => cell.trim() !== '')));
    };
    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + props.templateHeaders.join(',') + '\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `template_${props.title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', duplicateMode());

      const token = localStorage.getItem('token');
      const response = await fetch(`/api${props.importUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Terjadi kesalahan saat mengimpor.');
      }

      const res = await response.json();
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={props.show} onClose={props.onClose} title={`Impor Data ${props.title} via CSV`}>
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center bg-blue-50 dark:bg-slate-800/50 p-3 rounded-lg border border-blue-100 dark:border-slate-800">
          <span class="text-xs text-blue-800 dark:text-blue-400 font-medium">
            Unduh template format CSV standar terlebih dahulu
          </span>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            Unduh Template
          </Button>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Pilihan Penanganan Duplikat Key
            </label>
            <select
              value={duplicateMode()}
              onChange={(e) => setDuplicateMode(e.currentTarget.value)}
              class="w-full text-sm border border-gray-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
            >
              <option value="skip">Skip (Abaikan baris jika data key sudah ada)</option>
              <option value="update">Update / Overwrite (Ganti data lama jika data key sudah ada)</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Pilih File CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-white"
            />
          </div>

          {/* Preview Table */}
          <Show when={preview().length > 0}>
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold text-gray-500">Preview 5 Baris Pertama CSV:</span>
              <div class="max-h-40 overflow-auto border border-gray-200 dark:border-slate-800 rounded-lg">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-left text-xs bg-white dark:bg-slate-900">
                  <thead class="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-bold">
                    <tr>
                      <For each={preview()[0]}>{(h) => <th class="px-3 py-2">{h}</th>}</For>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-slate-800">
                    <For each={preview().slice(1)}>
                      {(row) => (
                        <tr>
                          <For each={row}>
                            {(cell) => <td class="px-3 py-1.5 text-gray-700 dark:text-gray-300">{cell}</td>}
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

          {/* Report Errors log */}
          <Show when={importReport() && importReport()!.errors.length > 0}>
            <div class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold text-red-500">Log Detail Error Pengimporan:</span>
              <div class="max-h-32 overflow-auto bg-red-50/50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-950/50 text-[11px] text-red-700 dark:text-red-400 space-y-1 font-mono">
                <For each={importReport()!.errors}>
                  {(err) => (
                    <div>
                      <span class="font-bold">{err.line > 0 ? `Baris ${err.line}:` : 'Sistem:'}</span> {err.error}
                    </div>
                  )}
                </For>
              </div>
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
