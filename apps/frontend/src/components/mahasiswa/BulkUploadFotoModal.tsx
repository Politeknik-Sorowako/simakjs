import { createSignal, For, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { BulkUploadFotoDetail, mahasiswaController } from '../../controllers/mahasiswaController';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface BulkUploadFotoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadFotoModal(props: BulkUploadFotoModalProps) {
  const toast = useToast();
  const [files, setFiles] = createSignal<File[]>([]);
  const [isZipMode, setIsZipMode] = createSignal(false);
  const [overwrite, setOverwrite] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [progress, setProgress] = createSignal(0);
  const [results, setResults] = createSignal<{
    total: number;
    successCount: number;
    failedCount: number;
    details: BulkUploadFotoDetail[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = createSignal(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    processDroppedFiles(droppedFiles);
  };

  const processDroppedFiles = (droppedFiles: File[]) => {
    const zipFiles = droppedFiles.filter((f) => f.name.endsWith('.zip'));
    const imageFiles = droppedFiles.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name));

    if (zipFiles.length > 0) {
      setFiles(zipFiles);
      setIsZipMode(true);
    } else if (imageFiles.length > 0) {
      setFiles(imageFiles);
      setIsZipMode(false);
    } else {
      toast.showToast('File harus berupa .zip atau gambar (.jpg, .jpeg, .png, .webp)', 'error');
    }
  };

  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files || []);
    processDroppedFiles(selectedFiles);
  };

  const handleSubmit = async () => {
    if (files().length === 0) {
      toast.showToast('Pilih file terlebih dahulu', 'error');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('overwrite', String(overwrite()));

      if (isZipMode()) {
        formData.append('zip', files()[0]);
      } else {
        for (const file of files()) {
          formData.append('files', file);
        }
      }

      setProgress(30);
      const response = await mahasiswaController.bulkUploadFoto(formData);
      setProgress(100);
      setResults(response);

      if (response.successCount > 0) {
        toast.showToast(`Berhasil mengunggah ${response.successCount} foto dari ${response.total} file.`, 'success');
        props.onSuccess();
      }
      if (response.failedCount > 0) {
        toast.showToast(`${response.failedCount} file gagal diproses.`, 'info');
      }
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengunggah foto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setIsZipMode(false);
    setOverwrite(false);
    setResults(null);
    setProgress(0);
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  return (
    <Modal show={props.show} title="Upload Foto Massal Mahasiswa" onClose={handleClose} maxWidth="lg">
      <div class="flex flex-col gap-4">
        {/* Instructions */}
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 class="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-2">Panduan Penamaan File:</h4>
          <ul class="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Nama file gambar harus sesuai dengan NIM mahasiswa</li>
            <li>
              Contoh: <span class="font-mono">202401001.jpg</span>, <span class="font-mono">202401002.png</span>
            </li>
            <li>Format yang didukung: .jpg, .jpeg, .png, .webp</li>
            <li>Atau unggah file .zip berisi kumpulan foto dengan penamaan NIM</li>
          </ul>
        </div>

        {/* Drop Zone */}
        <Show when={!results()}>
          <div
            class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver()
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-secondary-300 dark:border-secondary-600 hover:border-brand-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('foto-file-input')?.click()}
          >
            <input
              id="foto-file-input"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.zip"
              class="hidden"
              onChange={handleFileInput}
            />
            <div class="text-secondary-400 dark:text-secondary-500">
              <svg class="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p class="text-sm font-medium">
                {isDragOver() ? 'Lepaskan file di sini' : 'Drag & drop file di sini atau klik untuk memilih'}
              </p>
              <p class="text-xs text-secondary-400 mt-1">ZIP atau Multiple Image (.jpg, .jpeg, .png, .webp)</p>
            </div>
          </div>

          {/* Selected Files */}
          <Show when={files().length > 0}>
            <div class="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-3">
              <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                {files().length} file dipilih {isZipMode() ? '(ZIP)' : '(Gambar)'}
              </p>
              <div class="mt-2 max-h-32 overflow-y-auto text-xs text-secondary-600 dark:text-secondary-400">
                <For each={files()}>
                  {(file) => (
                    <div class="py-1 border-b border-secondary-200 dark:border-secondary-700 last:border-0">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Overwrite Option */}
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overwrite()}
              onChange={(e) => setOverwrite(e.target.checked)}
              class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 dark:border-secondary-700"
            />
            <span class="text-sm text-secondary-700 dark:text-secondary-300">
              Timpa foto yang sudah ada (Overwrite)
            </span>
          </label>
        </Show>

        {/* Progress Bar */}
        <Show when={loading()}>
          <div class="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5">
            <div
              class="bg-brand-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress()}%` }}
            />
          </div>
          <p class="text-xs text-center text-secondary-500">Mengunggah dan memproses file...</p>
        </Show>

        {/* Results */}
        <Show when={results()}>
          <div class="border rounded-lg overflow-hidden">
            <div class="bg-secondary-50 dark:bg-secondary-800 px-4 py-3 border-b">
              <h4 class="font-semibold text-sm text-secondary-800 dark:text-white">Hasil Pemrosesan</h4>
            </div>
            <div class="p-4 space-y-3">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p class="text-2xl font-bold text-secondary-800 dark:text-white">{results()!.total}</p>
                  <p class="text-xs text-secondary-500">Total</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-success-600">{results()!.successCount}</p>
                  <p class="text-xs text-secondary-500">Berhasil</p>
                </div>
                <div>
                  <p class="text-2xl font-bold text-danger-600">{results()!.failedCount}</p>
                  <p class="text-xs text-secondary-500">Gagal</p>
                </div>
              </div>

              {/* Details Table */}
              <Show when={results()!.details.length > 0}>
                <div class="max-h-48 overflow-y-auto border rounded-lg">
                  <table class="w-full text-xs">
                    <thead class="bg-secondary-100 dark:bg-secondary-800 sticky top-0">
                      <tr>
                        <th class="px-3 py-2 text-left font-semibold">NIM</th>
                        <th class="px-3 py-2 text-left font-semibold">File</th>
                        <th class="px-3 py-2 text-left font-semibold">Status</th>
                        <th class="px-3 py-2 text-left font-semibold">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={results()!.details}>
                        {(detail) => (
                          <tr class="border-t border-secondary-100 dark:border-secondary-700">
                            <td class="px-3 py-2 font-mono">{detail.nim}</td>
                            <td class="px-3 py-2 text-secondary-600 dark:text-secondary-400">{detail.filename}</td>
                            <td class="px-3 py-2">
                              <span
                                class={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  detail.status === 'success'
                                    ? 'bg-success-100 text-success-700'
                                    : 'bg-danger-100 text-danger-700'
                                }`}
                              >
                                {detail.status === 'success' ? 'Berhasil' : 'Gagal'}
                              </span>
                            </td>
                            <td class="px-3 py-2 text-secondary-500">{detail.error || '-'}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Actions */}
        <div class="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="secondary" onClick={results() ? resetForm : handleClose}>
            {results() ? 'Upload Lagi' : 'Batal'}
          </Button>
          <Show when={!results()}>
            <Button onClick={handleSubmit} disabled={loading() || files().length === 0}>
              {loading() ? 'Memproses...' : 'Unggah Foto'}
            </Button>
          </Show>
          <Show when={results()}>
            <Button onClick={handleClose}>Tutup</Button>
          </Show>
        </div>
      </div>
    </Modal>
  );
}
