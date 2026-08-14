import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apelController, UnknownPresensiItem } from '../controllers/apelController';
import { PaginatedResponse, prodiController } from '../controllers/prodiController';
import { fmtWaktu } from '../utils/format';

export default function ApelVerifikasi() {
  const auth = useAuth();
  const toast = useToast();
  const ws = useWorkspace();

  const [page, setPage] = createSignal(1);
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [filterProdi, setFilterProdi] = createSignal<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = createSignal<'belum' | 'sudah' | 'all'>('all');
  const [sortBy, setSortBy] = createSignal('');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  createEffect(() => {
    const q = search();
    const timer = setTimeout(() => setDebouncedSearch(q), 400);
    return () => clearTimeout(timer);
  });

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [verifyModal, setVerifyModal] = createSignal<{ id: number; nama: string; menit: number | null } | null>(null);
  const [verifyStatus, setVerifyStatus] = createSignal('alpa');
  const [verifyNote, setVerifyNote] = createSignal('');
  const [verifyDuration, setVerifyDuration] = createSignal(0);
  const [isAnulir, setIsAnulir] = createSignal(false);

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      prodiId: filterProdi() || ws.selectedProdiId(),
      search: debouncedSearch(),
      statusFilter: filterStatus(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
    }),
    async (params) => {
      return apelController.getPresensiUnknown({
        page: params.page,
        limit: 20,
        prodiId: params.prodiId ?? undefined,
        search: params.search || undefined,
        statusFilter: params.statusFilter,
        sortBy: params.sortBy || undefined,
        sortOrder: params.sortOrder,
      });
    },
  );

  const handleSort = (col: string) => {
    if (sortBy() === col) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const sortIcon = (col: string) => (sortBy() === col ? (sortOrder() === 'asc' ? ' ▲' : ' ▼') : ' ⇅');

  const handleVerify = async () => {
    const modal = verifyModal();
    if (!modal) return;
    if (!verifyStatus()) {
      toast.showToast('Pilih status verifikasi terlebih dahulu', 'error');
      return;
    }
    try {
      if (isAnulir() && !verifyNote().trim()) {
        toast.showToast('Alasan/keterangan wajib diisi saat menganulir', 'error');
        return;
      }
      await apelController.verifikasiUnknown({
        sumber: 'APEL',
        sumberId: modal.id,
        statusKonfirmasi: verifyStatus().toUpperCase() as 'SAKIT' | 'IZIN' | 'ALPA' | 'HADIR',
        durasiMenit: isAnulir() ? 0 : verifyStatus() !== 'hadir' ? verifyDuration() : 0,
        keterangan: verifyNote() || undefined,
      });
      toast.showToast('Presensi berhasil diverifikasi', 'success');
      setVerifyModal(null);
      setVerifyNote('');
      setVerifyDuration(0);
      setIsAnulir(false);
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal verifikasi presensi';
      toast.showToast(msg, 'error');
    }
  };

  const statusBadge = (count: number, color: string) => (
    <span class={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${color}`}>
      {count}
    </span>
  );

  const statusLabel = (s?: string | null) => {
    switch (s) {
      case 'hadir':
        return 'Hadir';
      case 'sakit':
        return 'Sakit';
      case 'izin':
        return 'Izin';
      case 'alpa':
        return 'Alpa';
      case 'telat':
        return 'Telat';
      default:
        return '';
    }
  };

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
              onInput={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              class="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              value={filterStatus()}
              onChange={(e) => {
                setFilterStatus(e.target.value as 'belum' | 'sudah' | 'all');
                setPage(1);
              }}
            >
              <option value="all">Semua Status</option>
              <option value="belum">Belum Diverifikasi</option>
              <option value="sudah">Sudah Diverifikasi</option>
            </select>
            <select
              class="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              value={filterProdi() || ''}
              onChange={(e) => {
                setFilterProdi(e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined);
                setPage(1);
              }}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">No</th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600"
                    onClick={() => handleSort('nim')}
                  >
                    NIM{sortIcon('nim')}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600"
                    onClick={() => handleSort('nama')}
                  >
                    Nama{sortIcon('nama')}
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600"
                    onClick={() => handleSort('prodi')}
                  >
                    Prodi{sortIcon('prodi')}
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-medium uppercase">Kelompok</th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600"
                    onClick={() => handleSort('tanggal')}
                  >
                    Tanggal{sortIcon('tanggal')}
                  </th>
                  <th
                    class="px-4 py-3 text-center text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600"
                    onClick={() => handleSort('shift')}
                  >
                    Shift{sortIcon('shift')}
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Dosen</th>
                  <th
                    class="px-4 py-3 text-center text-xs font-medium uppercase cursor-pointer select-none hover:text-blue-600"
                    onClick={() => handleSort('waktu')}
                  >
                    Waktu Pencatatan{sortIcon('waktu')}
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Durasi</th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Status</th>
                  <th class="px-4 py-3 text-center text-xs font-medium uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y dark:divide-gray-700">
                <For each={data()?.data}>
                  {(item: UnknownPresensiItem, idx) => (
                    <tr
                      class={`hover:bg-gray-50 dark:hover:bg-gray-750 ${
                        item.verifiedStatus ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <td class="px-4 py-3 text-sm">{idx() + 1}</td>
                      <td class="px-4 py-3 text-sm font-mono">{item.mahasiswaNim}</td>
                      <td class="px-4 py-3 text-sm">{item.mahasiswaNama}</td>
                      <td class="px-4 py-3 text-sm">{item.prodiNama}</td>
                      <td class="px-4 py-3 text-sm">{item.kelompokNama}</td>
                      <td class="px-4 py-3 text-sm">{item.tanggal}</td>
                      <td class="px-4 py-3 text-center text-sm">{item.shift}</td>
                      <td class="px-4 py-3 text-center text-sm">{item.dosenNama}</td>
                      <td class="px-4 py-3 text-center text-sm">{fmtWaktu(item.createdAt)}</td>
                      <td class="px-4 py-3 text-center text-sm">
                        {item.menitTerlambat != null ? `${item.menitTerlambat} mnt` : '-'}
                      </td>
                      <td class="px-4 py-3 text-center">
                        {item.verifiedStatus ? (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            ✓ {statusLabel(item.verifiedStatus)}
                          </span>
                        ) : (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            ⏳ Belum
                          </span>
                        )}
                      </td>
                      <td class="px-4 py-3 text-center">
                        <button
                          class={
                            item.verifiedStatus
                              ? 'bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600'
                              : 'bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700'
                          }
                          onClick={() => {
                            setVerifyModal({
                              id: item.id,
                              nama: item.mahasiswaNama,
                              menit: item.menitTerlambat ?? null,
                            });
                            setVerifyStatus(item.verifiedStatus || 'alpa');
                            setVerifyDuration(item.menitTerlambat || 0);
                            setIsAnulir(false);
                            setVerifyNote('');
                          }}
                        >
                          {item.verifiedStatus ? 'Koreksi' : 'Verifikasi'}
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
                <Show when={!data()?.data.length}>
                  <tr>
                    <td colspan="12" class="px-4 py-8 text-center text-gray-500">
                      Tidak ada data presensi unknown
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
              <h2 class="text-lg font-semibold mb-2">Verifikasi - {verifyModal()?.nama}</h2>
              <p class="text-sm text-gray-500 mb-4">
                Durasi tercatat:{' '}
                <span class="font-semibold text-gray-700 dark:text-gray-200">
                  {verifyModal()?.menit != null ? `${verifyModal()?.menit} menit` : '-'}
                </span>
              </p>
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
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anulir-checkbox"
                    class="h-4 w-4 accent-blue-600"
                    checked={isAnulir()}
                    onChange={(e) => {
                      const on = e.currentTarget.checked;
                      setIsAnulir(on);
                      if (!on) setVerifyDuration(verifyModal()?.menit ?? 0);
                    }}
                  />
                  <label for="anulir-checkbox" class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Anulir (Durasi = 0)
                  </label>
                </div>
                <Show when={!isAnulir() && verifyStatus() !== 'hadir'}>
                  <div>
                    <label class="block text-sm font-medium mb-1">Durasi Ketidakhadiran (Menit)</label>
                    <input
                      type="number"
                      min="0"
                      class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                      value={verifyDuration()}
                      onInput={(e) => setVerifyDuration(Number(e.currentTarget.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </Show>
                <Show when={isAnulir()}>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Ketidakhadiran dikonfirmasi sebagai <strong>{statusLabel(verifyStatus())}</strong> dengan durasi 0
                    menit sehingga tidak masuk dalam rekap kompensasi.
                  </p>
                </Show>
                <div>
                  <label class="block text-sm font-medium mb-1">
                    {isAnulir() ? 'Alasan/Keterangan (wajib)' : 'Catatan (opsional)'}
                  </label>
                  <textarea
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                    placeholder="Misal: Surat Keterangan Dokter / Penjelasan dari Admin..."
                    value={verifyNote()}
                    onInput={(e) => setVerifyNote(e.target.value)}
                  />
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    class="px-4 py-2 border rounded-lg text-sm"
                    onClick={() => {
                      setVerifyModal(null);
                      setVerifyNote('');
                      setVerifyDuration(0);
                      setIsAnulir(false);
                    }}
                  >
                    Batal
                  </button>
                  <button
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                    onClick={handleVerify}
                  >
                    {isAnulir()
                      ? `Anulir Presensi (${statusLabel(verifyStatus())})`
                      : `Simpan sebagai ${statusLabel(verifyStatus())}`}
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
