import { createResource, createSignal, For, Show } from 'solid-js';
import { khsController, type LegacyImportResult } from '../controllers/khsController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface LegacyNilaiImportModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Modal impor nilai legacy berbasis huruf mutu (kolom CSV: NIM,KodeMatakuliah,Nilai).
 * Memetakan nilai ke indeks & midpoint rentang konversi global di backend.
 */
export default function LegacyNilaiImportModal(props: LegacyNilaiImportModalProps) {
  const [periodes] = createResource(async () => {
    const res = await periodeAkademikController.getAll(undefined, 1, 100);
    return res.data;
  });

  const [periodeId, setPeriodeId] = createSignal('');
  const [namaKelas, setNamaKelas] = createSignal('LEGACY');
  const [file, setFile] = createSignal<File | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [result, setResult] = createSignal<LegacyImportResult | null>(null);

  const reset = () => {
    setPeriodeId('');
    setNamaKelas('LEGACY');
    setFile(null);
    setLoading(false);
    setErrorMsg('');
    setResult(null);
  };

  const handleClose = () => {
    if (loading()) return;
    reset();
    props.onClose();
  };

  const handleSubmit = async () => {
    const currentFile = file();
    const currentPeriode = periodeId().trim();
    if (!currentFile) {
      setErrorMsg('Pilih berkas CSV terlebih dahulu.');
      return;
    }
    if (!currentPeriode) {
      setErrorMsg('Pilih periode akademik terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResult(null);
    try {
      const res = await khsController.importNilaiLegacy(currentFile, currentPeriode, namaKelas().trim() || undefined);
      setResult(res);
      if (res.successCount > 0) props.onSuccess?.();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Gagal mengimpor nilai legacy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={props.show} onClose={handleClose} title="Impor Nilai Legacy (Huruf Mutu)" maxWidth="lg">
      <div class="space-y-5 text-[15px] text-[#1d1d1f] dark:text-white">
        <p class="text-[15px] leading-[1.47] tracking-[-0.01em] text-[#7a7a7a] dark:text-neutral-400">
          Format CSV: <span class="font-medium text-[#1d1d1f] dark:text-white">NIM,KodeMatakuliah,Nilai</span>. Nilai
          berupa huruf mutu (A, A-, B+, ... E). Master mahasiswa, mata kuliah, dan periode harus sudah tersedia.
        </p>

        <div class="space-y-1.5">
          <label class="block text-[13px] font-semibold tracking-[-0.01em]" for="legacy-periode">
            Periode Akademik
          </label>
          <select
            id="legacy-periode"
            class="w-full rounded-xl border border-[#e0e0e0] dark:border-neutral-700 bg-[#fafafc] dark:bg-[#272729] px-3 py-2.5 text-[15px] outline-none focus:border-[#0071e3]"
            value={periodeId()}
            onChange={(e) => setPeriodeId(e.currentTarget.value)}
          >
            <option value="">— Pilih periode —</option>
            <For each={periodes() ?? []}>
              {(p: { id: string; nama: string }) => <option value={p.id}>{`${p.nama} (${p.id})`}</option>}
            </For>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-[13px] font-semibold tracking-[-0.01em]" for="legacy-kelas">
            Nama Kelas Legacy (opsional)
          </label>
          <input
            id="legacy-kelas"
            type="text"
            class="w-full rounded-xl border border-[#e0e0e0] dark:border-neutral-700 bg-[#fafafc] dark:bg-[#272729] px-3 py-2.5 text-[15px] outline-none focus:border-[#0071e3]"
            placeholder="LEGACY"
            value={namaKelas()}
            onInput={(e) => setNamaKelas(e.currentTarget.value)}
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-[13px] font-semibold tracking-[-0.01em]" for="legacy-file">
            Berkas CSV
          </label>
          <input
            id="legacy-file"
            type="file"
            accept=".csv,text/csv"
            class="w-full rounded-xl border border-[#e0e0e0] dark:border-neutral-700 bg-[#fafafc] dark:bg-[#272729] px-3 py-2 text-[14px] file:mr-3 file:rounded-full file:border-0 file:bg-[#0066cc] file:px-4 file:py-1.5 file:text-white"
            onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
          />
        </div>

        <Show when={errorMsg()}>
          <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {errorMsg()}
          </div>
        </Show>

        <Show when={result()}>
          {(res) => (
            <div class="space-y-3 rounded-xl border border-[#e0e0e0] dark:border-neutral-700 bg-[#fafafc] dark:bg-[#272729] p-4">
              <div class="flex flex-wrap gap-4 text-[14px]">
                <span class="text-emerald-600 dark:text-emerald-400">Sukses: {res().successCount}</span>
                <span class="text-[#7a7a7a] dark:text-neutral-400">Dilewati: {res().skippedCount}</span>
                <span class="text-red-600 dark:text-red-400">Gagal: {res().errors.length}</span>
              </div>
              <Show when={res().errors.length > 0}>
                <div class="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[#e0e0e0] dark:border-neutral-700 bg-white dark:bg-[#1d1d1f] p-3">
                  <For each={res().errors}>
                    {(err: { line: number; error: string }) => (
                      <div class="text-[13px] text-red-600 dark:text-red-400">
                        Baris {err.line}: {err.error}
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          )}
        </Show>

        <div class="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={loading()}>
            Tutup
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading()}>
            {loading() ? 'Mengimpor…' : 'Impor Nilai'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
