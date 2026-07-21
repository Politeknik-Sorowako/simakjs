import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apelController, UnknownPresensiItem } from '../controllers/apelController';
import { PaginatedResponse } from '../controllers/prodiController';

export default function ApelVerifikasi() {
  const auth = useAuth();
  const toast = useToast();
  const ws = useWorkspace();

  const [page, setPage] = createSignal(1);
  const [search, setSearch] = createSignal('');
  const [filterProdi, setFilterProdi] = createSignal<number | undefined>(undefined);

  const [verifyModal, setVerifyModal] = createSignal<{ id: number; nama: string } | null>(null);
  const [verifyStatus, setVerifyStatus] = createSignal('alpa');
  const [verifyNote, setVerifyNote] = createSignal('');

  const [data, { refetch }] = createResource(
    () => ({ page: page(), prodiId: filterProdi() || ws.selectedProdiId() }),
    async (params) => {
      return apelController.getPresensiUnknown({
        page: params.page,
        limit: 20,
        prodiId: params.prodiId,
      });
    },
  );

  const handleVerify = async () => {
    const modal = verifyModal();
    if (!modal) return;
    try {
      await apelController.verifyPresensi(modal.id, {
        verifiedStatus: verifyStatus(),
        verificationNote: verifyNote() || undefined,
      });
      toast.showToast('Presensi berhasil diverifikasi', 'success');
      setVerifyModal(null);
      setVerifyNote('');
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memverifikasi';
      toast.showToast(msg, 'error');
    }
  };

  const statusBadge = (count: number, color: string) => (
    <span class={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${color}`}>
      {count}
    </span>
  );

  return (
    <MainLayout>
      <div class="space-y-6">
        <h1 class="text-2xl font-bold">Verifikasi Presensi Apel</h1>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="flex flex-wrap gap-4 items-center mb-4">
            <input
              type="text"
              placeholder="Cari NIM/Nama..."
              class="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              value={search()}
              onInput={(e) => setSearch(e.target.value)}
            />
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">No</th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">NIM</th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">Nama</th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">Prodi</th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">Kelompok</th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">Tanggal</th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Shift</th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Dosen</th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y dark:divide-gray-700">
                <For each={data()?.data}>
                  {(item: UnknownPresensiItem, idx) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td class="px-4 py-3 text-sm">{idx() + 1}</td>
                      <td class="px-4 py-3 text-sm font-mono">{item.mahasiswaNim}</td>
                      <td class="px-4 py-3 text-sm">{item.mahasiswaNama}</td>
                      <td class="px-4 py-3 text-sm">{item.prodiNama}</td>
                      <td class="px-4 py-3 text-sm">{item.kelompokNama}</td>
                      <td class="px-4 py-3 text-sm">{item.tanggal}</td>
                      <td class="px-4 py-3 text-center text-sm">{item.shift}</td>
                      <td class="px-4 py-3 text-center text-sm">{item.dosenNama}</td>
                      <td class="px-4 py-3 text-center">
                        <button
                          class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                          onClick={() => {
                            setVerifyModal({ id: item.id, nama: item.mahasiswaNama });
                            setVerifyStatus('alpa');
                          }}
                        >
                          Verifikasi
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
                <Show when={!data()?.data.length}>
                  <tr>
                    <td colspan="9" class="px-4 py-8 text-center text-gray-500">
                      Tidak ada data presensi unknown yang perlu diverifikasi
                    </td>
                  </tr>
                </Show>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Show when={data()?.meta && data()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-sm text-gray-500">Total: {data()?.meta.total} data</span>
              <div class="flex gap-2">
                <button
                  class="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  disabled={page() <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span class="px-3 py-1 text-sm">
                  {page()} / {data()?.meta.totalPages}
                </span>
                <button
                  class="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  disabled={page() >= (data()?.meta.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </Show>
        </div>

        {/* Verify Modal */}
        <Show when={verifyModal()}>
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
              <h2 class="text-lg font-semibold mb-4">Verifikasi - {verifyModal()?.nama}</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Ubah status menjadi</label>
                  <select
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    value={verifyStatus()}
                    onChange={(e) => setVerifyStatus(e.target.value)}
                  >
                    <option value="alpa">Alpa (Tanpa Keterangan)</option>
                    <option value="sakit">Sakit</option>
                    <option value="izin">Izin</option>
                    <option value="hadir">Hadir (ternyata datang)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Catatan (opsional)</label>
                  <textarea
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    value={verifyNote()}
                    onInput={(e) => setVerifyNote(e.target.value)}
                  />
                </div>
                <div class="flex gap-2 justify-end">
                  <button class="px-4 py-2 border rounded-lg text-sm" onClick={() => setVerifyModal(null)}>
                    Batal
                  </button>
                  <button
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                    onClick={handleVerify}
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
