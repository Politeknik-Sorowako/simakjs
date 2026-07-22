import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { BarChart, PieChart, StatCard } from '../components/charts';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { presensiController } from '../controllers/presensiController';
import { prodiController } from '../controllers/prodiController';

const PER_PAGE = 20;

export default function LaporanKompensasi() {
  const toast = useToast();

  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [showPayModal, setShowPayModal] = createSignal(false);
  const [editingPay, setEditingPay] = createSignal<{
    id: number;
    jumlahMenit: number;
    keterangan: string;
    tanggal: string;
  } | null>(null);
  const [jumlahMenit, setJumlahMenit] = createSignal(60);
  const [keterangan, setKeterangan] = createSignal('');
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = createSignal('');
  const [filterProdiId, setFilterProdiId] = createSignal<number | string | undefined>();
  const [page, setPage] = createSignal(1);
  const [debouncedSearch, setDebouncedSearch] = createSignal('');

  // Debounce search input
  createEffect(() => {
    const q = search();
    const timer = setTimeout(() => {
      setDebouncedSearch(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  });

  // Fetch stats (once)
  const [stats] = createResource(() => presensiController.getKompensasiStats());

  // Fetch laporan with server-side pagination
  const [laporan, { refetch: refetchLaporan }] = createResource(
    () => ({ page: page(), search: debouncedSearch(), prodiId: filterProdiId() }),
    async ({ page, search, prodiId }) => {
      return await presensiController.getLaporanKompensasi(page, PER_PAGE, search || undefined, prodiId);
    },
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const totalPages = () => laporan()?.meta?.totalPages || 1;
  const filteredCount = () => laporan()?.meta?.total || 0;

  const [mhsDetail, { refetch: refetchDetail }] = createResource(selectedMhsId, async (id) => {
    if (!id) return null;
    return await presensiController.getKompensasiDetail(id);
  });

  const handleOpenDetail = (id: number) => setSelectedMhsId(id);
  const handleCloseDetail = () => setSelectedMhsId(null);

  const openAddPaymentModal = () => {
    setEditingPay(null);
    setJumlahMenit(60);
    setKeterangan('');
    setTanggal(new Date().toISOString().split('T')[0]);
    setShowPayModal(true);
  };
  const openEditPaymentModal = (pay: { id: number; jumlahMenit: number; keterangan: string; tanggal: string }) => {
    setEditingPay(pay);
    setJumlahMenit(pay.jumlahMenit);
    setKeterangan(pay.keterangan);
    setTanggal(new Date(pay.tanggal).toISOString().split('T')[0]);
    setShowPayModal(true);
  };

  const handleSavePayment = async (e: Event) => {
    e.preventDefault();
    const id = selectedMhsId();
    if (!id) return;
    try {
      const data = { jumlahMenit: jumlahMenit(), tanggal: tanggal(), keterangan: keterangan() };
      const editTarget = editingPay();
      if (editTarget) {
        await presensiController.updateKompensasiBayar(editTarget.id, data);
        toast.showToast('Pembayaran berhasil diupdate', 'success');
      } else {
        await presensiController.bayarKompensasi({ mahasiswaId: id, ...data });
        toast.showToast('Pembayaran berhasil diinput', 'success');
      }
      setShowPayModal(false);
      setKeterangan('');
      setJumlahMenit(60);
      refetchDetail();
      refetchLaporan();
      stats.refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? (err as Error).message : 'Gagal menyimpan', 'error');
    }
  };

  const handleFilterProdi = (prodiId: number | undefined) => {
    setFilterProdiId(filterProdiId() === prodiId ? undefined : prodiId);
    setPage(1);
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Jam Kompensasi</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Pantau dan kelola tanggungan jam kompensasi (Disiplin Vokasi) mahasiswa
          </p>
        </div>

        {/* Summary Stats */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Mahasiswa"
            value={stats.loading ? '...' : stats()?.summary?.totalMahasiswa || 0}
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            color="brand"
          />
          <StatCard
            title="Total Akumulasi"
            value={stats.loading ? '...' : `${stats()?.summary?.totalKompensasi || 0} mnt`}
            subtitle="Menit kompensasi"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="rose"
          />
          <StatCard
            title="Total Dilunasi"
            value={stats.loading ? '...' : `${stats()?.summary?.totalDibayar || 0} mnt`}
            subtitle="Menit terbayar"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="green"
          />
          <StatCard
            title="Sisa Tanggungan"
            value={stats.loading ? '...' : `${stats()?.summary?.totalSisa || 0} mnt`}
            subtitle="Belum dilunasi"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="yellow"
          />
        </div>

        {/* Charts Row — from stats endpoint */}
        <Show when={!stats.loading && stats()}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">
                Top 10 Mahasiswa Kompensasi Tertinggi
              </h3>
              <Show
                when={(stats()?.top10?.length || 0) > 0}
                fallback={
                  <p class="text-xs text-secondary-400 text-center py-8">Tidak ada mahasiswa dengan sisa kompensasi</p>
                }
              >
                <BarChart
                  labels={(stats()?.top10 || []).map((i) => i.nama)}
                  datasets={[
                    {
                      label: 'Sisa Kompensasi (Menit)',
                      data: (stats()?.top10 || []).map((i) => i.sisaKompensasi),
                      backgroundColor: '#f43f5e',
                    },
                  ]}
                  height={300}
                  horizontal
                />
              </Show>
            </div>
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">
                Distribusi Sisa Kompensasi per Prodi
              </h3>
              <Show
                when={(stats()?.rekapProdi?.length || 0) > 0}
                fallback={<p class="text-xs text-secondary-400 text-center py-8">Tidak ada data</p>}
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PieChart
                    labels={(stats()?.rekapProdi || []).map((p) => p.prodiNama)}
                    data={(stats()?.rekapProdi || []).map((p) => p.sisaKompensasi)}
                    height={250}
                    donut
                  />
                  <div class="flex flex-col justify-center gap-2">
                    <For each={stats()?.rekapProdi || []}>
                      {(p) => (
                        <button
                          onClick={() => setFilterProdiId(filterProdiId() === undefined ? p.prodiNama : undefined)}
                          class={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${filterProdiId() !== undefined ? 'bg-brand-50 border-brand-300 text-brand-700 font-bold dark:bg-brand-950/40 dark:border-brand-700 dark:text-brand-400' : 'border-secondary-100 hover:bg-secondary-50 dark:border-secondary-800 dark:hover:bg-secondary-800/50'}`}
                        >
                          <span class="font-semibold">{p.prodiNama}</span>
                          <span class="float-right font-bold text-rose-600">{p.sisaKompensasi} mnt</span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </div>

          {/* Rekap per Prodi Table — from stats */}
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Rekap Kompensasi per Program Studi</h3>
              <Show when={filterProdiId()}>
                <button
                  onClick={() => setFilterProdiId(undefined)}
                  class="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
                >
                  Reset Filter Prodi
                </button>
              </Show>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:border-secondary-800 dark:bg-secondary-800">
                    <th class="py-3 px-5">Program Studi</th>
                    <th class="py-3 px-5 text-center">Jumlah Mhs</th>
                    <th class="py-3 px-5 text-center">Total Akumulasi</th>
                    <th class="py-3 px-5 text-center">Total Dilunasi</th>
                    <th class="py-3 px-5 text-center">Sisa Tanggungan</th>
                    <th class="py-3 px-5 text-center">Rata-rata/Mhs</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={stats()?.rekapProdi || []}>
                    {(p) => (
                      <tr
                        class={`border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30`}
                      >
                        <td class="py-3 px-5 font-bold text-secondary-800 dark:text-white">{p.prodiNama}</td>
                        <td class="py-3 px-5 text-center text-secondary-600 dark:text-secondary-300">
                          {p.jumlahMahasiswa}
                        </td>
                        <td class="py-3 px-5 text-center text-red-500 font-bold">{p.totalKompensasi} mnt</td>
                        <td class="py-3 px-5 text-center text-accent-600 font-bold dark:text-accent-400">
                          {p.totalDibayar} mnt
                        </td>
                        <td class="py-3 px-5 text-center">
                          <span
                            class={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${p.sisaKompensasi > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'}`}
                          >
                            {p.sisaKompensasi} mnt
                          </span>
                        </td>
                        <td class="py-3 px-5 text-center text-secondary-500">
                          {p.jumlahMahasiswa > 0 ? Math.round(p.sisaKompensasi / p.jumlahMahasiswa) : 0} mnt
                        </td>
                      </tr>
                    )}
                  </For>
                  <tr class="bg-secondary-50 dark:bg-secondary-800 font-bold">
                    <td class="py-3 px-5 text-secondary-800 dark:text-white">TOTAL</td>
                    <td class="py-3 px-5 text-center text-secondary-800 dark:text-white">
                      {stats()?.summary?.totalMahasiswa || 0}
                    </td>
                    <td class="py-3 px-5 text-center text-red-500">{stats()?.summary?.totalKompensasi || 0} mnt</td>
                    <td class="py-3 px-5 text-center text-accent-600 dark:text-accent-400">
                      {stats()?.summary?.totalDibayar || 0} mnt
                    </td>
                    <td class="py-3 px-5 text-center text-rose-600">{stats()?.summary?.totalSisa || 0} mnt</td>
                    <td class="py-3 px-5 text-center text-secondary-500">
                      {stats()?.summary?.totalMahasiswa
                        ? Math.round((stats()?.summary?.totalSisa || 0) / stats()?.summary?.totalMahasiswa)
                        : 0}{' '}
                      mnt
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Show>

        {/* Filters */}
        <div class="bg-white border border-secondary-100 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div class="relative w-full sm:w-80">
              <span class="absolute left-3.5 top-2.5 text-secondary-400 dark:text-secondary-200">🔍</span>
              <input
                type="text"
                placeholder="Cari NIM atau Nama..."
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
            </div>
            <Show when={(prodis()?.data?.length || 0) > 1}>
              <select
                class="px-3 py-2 text-xs bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-secondary-700 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={filterProdiId() || ''}
                onChange={(e) => {
                  setFilterProdiId(e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined);
                  setPage(1);
                }}
              >
                <option value="">Semua Prodi</option>
                <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </Show>
          </div>
          <Button
            onClick={() => {
              refetchLaporan();
              stats.refetch();
            }}
            variant="secondary"
          >
            🔄 Refresh Data
          </Button>
        </div>

        {/* Laporan Table — server-side paginated */}
        <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden dark:bg-secondary-900 dark:border-secondary-800">
          <Show when={filterProdiId() || debouncedSearch()}>
            <div class="px-5 py-2 bg-brand-50 dark:bg-brand-950/40 border-b border-brand-100 dark:border-brand-900/50 flex justify-between items-center">
              <span class="text-xs font-bold text-brand-700 dark:text-brand-400">
                {debouncedSearch() ? `Pencarian: "${debouncedSearch()}"` : ''}
                {filterProdiId() ? ' — Filter prodi aktif' : ''} ({filteredCount()} mahasiswa)
              </span>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterProdiId(undefined);
                  setPage(1);
                }}
                class="text-[10px] font-bold text-brand-600 hover:text-brand-700 underline"
              >
                Hapus Semua Filter
              </button>
            </div>
          </Show>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold bg-secondary-50/50 dark:border-secondary-800 dark:bg-secondary-800">
                  <th class="py-3 px-6">Mahasiswa</th>
                  <th class="py-3 px-6">Program Studi</th>
                  <th class="py-3 px-6 text-center">Akumulasi Mangkir</th>
                  <th class="py-3 px-6 text-center">Kompensasi Dilunasi</th>
                  <th class="py-3 px-6 text-center">Sisa Tanggungan</th>
                  <th class="py-3 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <Show
                  when={!laporan.loading}
                  fallback={
                    <tr>
                      <td colspan="6" class="text-center py-12 text-secondary-400 dark:text-secondary-200">
                        Memuat data laporan...
                      </td>
                    </tr>
                  }
                >
                  <For
                    each={laporan()?.data || []}
                    fallback={
                      <tr>
                        <td colspan="6" class="text-center py-12 text-secondary-400 dark:text-secondary-200">
                          Tidak ada data mahasiswa terkompensasi.
                        </td>
                      </tr>
                    }
                  >
                    {(item) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30">
                        <td class="py-4 px-6">
                          <div class="font-bold text-secondary-800 dark:text-white">{item.nama}</div>
                          <div class="text-xs text-secondary-400 dark:text-secondary-200">{item.nim}</div>
                        </td>
                        <td class="py-4 px-6 text-secondary-600 font-semibold dark:text-secondary-200">
                          {item.prodiNama || '-'}
                        </td>
                        <td class="py-4 px-6 text-center text-red-500 font-bold">{item.totalKompensasi} Menit</td>
                        <td class="py-4 px-6 text-center text-accent-600 font-bold dark:text-accent-400">
                          {item.totalDibayar} Menit
                        </td>
                        <td class="py-4 px-6 text-center">
                          <span
                            class={`px-3 py-1 rounded-full text-xs font-extrabold ${item.sisaKompensasi > 0 ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-accent-50 text-accent-700'}`}
                          >
                            {item.sisaKompensasi} Menit
                          </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                          <Button
                            onClick={() => handleOpenDetail(item.id)}
                            variant="primary"
                            class="!px-4 !py-1.5 text-xs font-bold"
                          >
                            Kelola Detail
                          </Button>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>
          {/* Server-side Pagination */}
          <Show when={filteredCount() > PER_PAGE}>
            <div class="flex justify-between items-center px-6 py-3 border-t border-secondary-100 dark:border-secondary-800 bg-secondary-50/50 dark:bg-secondary-800/50">
              <span class="text-xs text-secondary-500">
                Menampilkan {(page() - 1) * PER_PAGE + 1}-{Math.min(page() * PER_PAGE, filteredCount())} dari{' '}
                {filteredCount()} mahasiswa
              </span>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page() <= 1}
                  class="px-3 py-1.5 text-xs font-bold rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-white"
                >
                  ← Sebelumnya
                </button>
                <span class="text-xs font-semibold text-secondary-500 px-2">
                  {page()} / {totalPages()}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages()))}
                  disabled={page() >= totalPages()}
                  class="px-3 py-1.5 text-xs font-bold rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-white"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Modal Detail Mahasiswa */}
      <Modal isOpen={selectedMhsId() !== null} onClose={handleCloseDetail} title="Detail Riwayat Jam Kompensasi">
        <Show
          when={!mhsDetail.loading && mhsDetail()}
          fallback={<div class="p-6 text-center text-secondary-400 dark:text-secondary-200">Memuat riwayat...</div>}
        >
          {(detail) => (
            <div class="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
              <div class="bg-secondary-50 rounded-2xl p-5 border border-secondary-100 flex items-center justify-between dark:bg-secondary-800 dark:border-secondary-800">
                <div>
                  <h3 class="font-bold text-secondary-800 text-lg dark:text-white">{detail().mahasiswa.nama}</h3>
                  <p class="text-sm text-secondary-500 dark:text-secondary-200">NIM: {detail().mahasiswa.nim}</p>
                </div>
                <div class="text-right">
                  <div class="text-xs text-secondary-400 uppercase font-semibold dark:text-secondary-200">
                    Sisa Tanggungan
                  </div>
                  <div class="text-2xl font-black text-red-600 dark:text-red-400">
                    {detail().summary.sisaKompensasi} Menit
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col gap-3">
                  <h4 class="font-bold text-secondary-700 border-b pb-2 text-sm dark:text-secondary-200">
                    Log Akumulasi Absensi
                  </h4>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().historyKompensasi}
                      fallback={
                        <p class="text-xs text-secondary-400 italic dark:text-secondary-200">
                          Tidak ada log absensi bermasalah.
                        </p>
                      }
                    >
                      {(log) => (
                        <div class="bg-white border border-secondary-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center dark:bg-secondary-900 dark:border-secondary-800">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-secondary-700 dark:text-secondary-200">
                              {log.sumber === 'apel'
                                ? 'Presensi Apel'
                                : `${log.bapMateri || 'Perkuliahan'} (Pertemuan ${log.bapPertemuan || '-'})`}
                            </span>
                            <span class="text-secondary-400 dark:text-secondary-200">
                              {log.bapTanggal ? new Date(log.bapTanggal).toLocaleDateString('id-ID') : '-'}
                            </span>
                            <span class="font-semibold text-accent-600 dark:text-accent-400">
                              Status: {log.status.toUpperCase()} ({log.durasiMangkir} Menit)
                            </span>
                          </div>
                          <span class="font-bold text-red-600 font-mono dark:text-red-400">+{log.poinKompensasi}m</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
                <div class="flex flex-col gap-3">
                  <div class="flex justify-between items-center border-b pb-2">
                    <h4 class="font-bold text-secondary-700 text-sm dark:text-secondary-200">
                      Log Penyelesaian Kompensasi
                    </h4>
                    <Button onClick={openAddPaymentModal} variant="success" class="!px-2.5 !py-1 text-[11px] font-bold">
                      + Input Pelunasan
                    </Button>
                  </div>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().payments}
                      fallback={
                        <p class="text-xs text-secondary-400 italic dark:text-secondary-200">
                          Belum ada penyelesaian kompensasi yang dilaporkan.
                        </p>
                      }
                    >
                      {(pay) => (
                        <div class="bg-white border border-secondary-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center dark:bg-secondary-900 dark:border-secondary-800">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-secondary-700 dark:text-secondary-200">{pay.keterangan}</span>
                            <span class="text-secondary-400 dark:text-secondary-200">
                              {new Date(pay.tanggal).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-accent-600 font-mono dark:text-accent-400">
                              -{pay.jumlahMenit}m
                            </span>
                            <Button
                              onClick={() => openEditPaymentModal(pay)}
                              variant="secondary"
                              class="!py-0.5 !px-1.5 text-[10px]"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button onClick={handleCloseDetail} variant="secondary">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Modal>

      {/* Modal Input Payment */}
      <Modal
        isOpen={showPayModal()}
        onClose={() => setShowPayModal(false)}
        title={editingPay() ? 'Edit Penyelesaian Jam Kompensasi' : 'Input Penyelesaian Jam Kompensasi'}
      >
        <form onSubmit={handleSavePayment} class="flex flex-col gap-4">
          <Input
            type="number"
            label="Jumlah Pengurangan (Menit)"
            min="10"
            value={jumlahMenit()}
            onInput={(e) => setJumlahMenit(parseInt(e.currentTarget.value) || 60)}
            required
          />
          <Input
            type="date"
            label="Tanggal Kegiatan"
            value={tanggal()}
            onInput={(e) => setTanggal(e.currentTarget.value)}
            required
          />
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
              Keterangan Kegiatan Kompensasi
            </label>
            <textarea
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700"
              rows="3"
              placeholder="Misal: Menyapu dan mengepel Lab Komputer Vokasi"
              value={keterangan()}
              onInput={(e) => setKeterangan(e.currentTarget.value)}
              required
            />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowPayModal(false)} variant="secondary">
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Pelunasan
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
