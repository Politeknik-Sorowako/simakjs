import { createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { PresensiUnknownItem, presensiController } from '../controllers/presensiController';
import { fmtWaktu } from '../utils/format';

export default function PresensiUnknown() {
  const toast = useToast();
  const workspace = useWorkspace();

  const [page, setPage] = createSignal(1);
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(searchDebounceTimer));

  const [resolveModal, setResolveModal] = createSignal<PresensiUnknownItem | null>(null);
  const [resolveStatus, setResolveStatus] = createSignal<'sakit' | 'izin' | 'alpa'>('alpa');
  const [resolveNote, setResolveNote] = createSignal('');

  const [data, { refetch }] = createResource(
    () => ({ page: page(), search: debouncedSearch(), prodiId: workspace.selectedProdiId() }),
    async (params) => {
      return presensiController.getUnknownList(
        params.page,
        20,
        params.search || undefined,
        params.prodiId ?? undefined,
      );
    },
  );

  const openResolve = (item: PresensiUnknownItem) => {
    setResolveModal(item);
    setResolveStatus('alpa');
    setResolveNote('');
  };

  const handleResolve = async () => {
    const item = resolveModal();
    if (!item) return;
    setSubmitting(true);
    try {
      await presensiController.resolveUnknown(item.id, {
        newStatus: resolveStatus(),
        keteranganAdmin: resolveNote() || undefined,
      });
      toast.showToast(`Status ${item.nama} berhasil dikonfirmasi menjadi ${resolveStatus()}`, 'success');
      setResolveModal(null);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengonfirmasi status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusWord = (st: string) => (st === 'sakit' ? 'Sakit' : st === 'izin' ? 'Izin' : st === 'alpa' ? 'Alpa' : st);

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Konfirmasi Presensi Unknown</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Kelola presensi perkuliahan (BAP) berstatus <strong>Unknown</strong> yang belum dikonfirmasi. Status unknown
            tidak diperhitungkan ke dalam rekap kompensasi sampai dikonfirmasi menjadi Sakit / Izin / Alpa.
          </p>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-wrap gap-4 items-center mb-4">
            <input
              type="text"
              placeholder="Cari NIM / Nama mahasiswa..."
              class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={search()}
              onInput={(e) => {
                const q = e.currentTarget.value;
                setSearch(q);
                setPage(1);
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => setDebouncedSearch(q), 350);
              }}
            />
            <span class="text-xs text-secondary-500 dark:text-secondary-300 ml-auto">
              Total menunggu konfirmasi: <strong>{data()?.meta.total || 0}</strong>
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold">
                  <th class="py-3 px-4">No</th>
                  <th class="py-3 px-4">Mahasiswa</th>
                  <th class="py-3 px-4">Prodi</th>
                  <th class="py-3 px-4">Mata Kuliah (Kelas)</th>
                  <th class="py-3 px-4">Dosen Pengampu</th>
                  <th class="py-3 px-4">Pertemuan & Tanggal</th>
                  <th class="py-3 px-4">Waktu Pencatatan</th>
                  <th class="py-3 px-4">Materi</th>
                  <th class="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                <For each={data()?.data}>
                  {(item, idx) => (
                    <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                      <td class="py-3 px-4">{idx() + 1}</td>
                      <td class="py-3 px-4">
                        <div class="font-bold text-secondary-800 dark:text-white">{item.nama}</div>
                        <div class="text-xs text-secondary-400 dark:text-secondary-200 font-mono">{item.nim}</div>
                      </td>
                      <td class="py-3 px-4 text-xs">{item.prodiNama || '-'}</td>
                      <td class="py-3 px-4 text-xs">
                        <div class="font-semibold text-secondary-700 dark:text-secondary-100">
                          {item.mataKuliahNama || '-'}
                        </div>
                        <div class="text-xs text-secondary-400">
                          {item.mataKuliahKode || ''} · Kelas {item.namaKelas}
                        </div>
                      </td>
                      <td class="py-3 px-4 text-xs">{item.dosenNama || '-'}</td>
                      <td class="py-3 px-4 text-xs">
                        <div>Pertemuan {item.bapPertemuan}</div>
                        <div class="text-secondary-400 dark:text-secondary-200">{item.bapTanggal}</div>
                      </td>
                      <td class="py-3 px-4 text-xs">{fmtWaktu(item.createdAt)}</td>
                      <td class="py-3 px-4 text-xs max-w-xs truncate" title={item.bapMateri}>
                        {item.bapMateri}
                      </td>
                      <td class="py-3 px-4 text-center">
                        <Button variant="accent" class="py-1 px-3 text-xs" onClick={() => openResolve(item)}>
                          Konfirmasi
                        </Button>
                      </td>
                    </tr>
                  )}
                </For>
                <Show when={(data()?.data || []).length === 0}>
                  <tr>
                    <td colspan="9" class="py-10 text-center text-secondary-400 text-sm">
                      Tidak ada presensi unknown yang menunggu konfirmasi.
                    </td>
                  </tr>
                </Show>
              </tbody>
            </table>
          </div>

          <Show when={data()?.meta && data()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-sm text-secondary-500">Total: {data()?.meta.total} data</span>
              <div class="flex gap-2 items-center">
                <button
                  class="px-3 py-1 border rounded-xl text-sm disabled:opacity-50 text-secondary-700 dark:text-secondary-200"
                  disabled={page() <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span class="px-3 py-1 text-sm text-secondary-600 dark:text-secondary-200">
                  {page()} / {data()?.meta.totalPages}
                </span>
                <button
                  class="px-3 py-1 border rounded-xl text-sm disabled:opacity-50 text-secondary-700 dark:text-secondary-200"
                  disabled={page() >= (data()?.meta.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!resolveModal()}
        onClose={() => setResolveModal(null)}
        title={`Konfirmasi Status - ${resolveModal()?.nama || ''}`}
      >
        <Show when={resolveModal()}>
          {(item) => (
            <div class="flex flex-col gap-4">
              <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800 p-3 text-xs text-secondary-600 dark:text-secondary-200 flex flex-col gap-1">
                <span>
                  <strong>Mata kuliah:</strong> {item().mataKuliahNama || '-'} (Kelas {item().namaKelas})
                </span>
                <span>
                  <strong>Pertemuan:</strong> {item().bapPertemuan} · {item().bapTanggal}
                </span>
                <span>
                  <strong>Dosen pengampu:</strong> {item().dosenNama || '-'}
                </span>
                <span>
                  <strong>Materi:</strong> {item().bapMateri}
                </span>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                  Ubah status menjadi
                </label>
                <select
                  class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={resolveStatus()}
                  onChange={(e) => setResolveStatus(e.currentTarget.value as 'sakit' | 'izin' | 'alpa')}
                >
                  <option value="alpa">Alpa (Tanpa Keterangan)</option>
                  <option value="sakit">Sakit</option>
                  <option value="izin">Izin</option>
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                  Catatan Konfirmasi (opsional)
                </label>
                <textarea
                  rows={3}
                  class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Misal: keterangan dari dosen / mahasiswa..."
                  value={resolveNote()}
                  onInput={(e) => setResolveNote(e.currentTarget.value)}
                />
              </div>

              <div class="flex justify-end gap-2 mt-2">
                <Button variant="secondary" onClick={() => setResolveModal(null)}>
                  Batal
                </Button>
                <Button variant="primary" onClick={handleResolve} disabled={submitting()}>
                  {submitting() ? 'Menyimpan...' : `Simpan sebagai ${statusWord(resolveStatus())}`}
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Modal>
    </MainLayout>
  );
}
