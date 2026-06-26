import { createSignal, createResource, Show, For, createMemo } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { presensiController, KompensasiDetailResponse } from '../controllers/presensiController';

export default function LaporanKompensasi() {
  const toast = useToast();
  
  // Modal State
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [showPayModal, setShowPayModal] = createSignal(false);
  
  // Payment Form State
  const [jumlahMenit, setJumlahMenit] = createSignal(60);
  const [keterangan, setKeterangan] = createSignal('');
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().split('T')[0]);

  // Search Filter
  const [search, setSearch] = createSignal('');

  // 1. Fetch Reports
  const [laporan, { refetch: refetchLaporan }] = createResource(() => presensiController.getLaporanKompensasi());

  // Filtered reports list
  const filteredLaporan = createMemo(() => {
    const list = laporan() || [];
    const q = search().toLowerCase();
    if (!q) return list;
    return list.filter(item => 
      item.nama.toLowerCase().includes(q) || 
      item.nim.toLowerCase().includes(q) || 
      (item.prodiNama || '').toLowerCase().includes(q)
    );
  });

  // 2. Fetch Selected Student Details
  const [mhsDetail, { refetch: refetchDetail }] = createResource(selectedMhsId, async (id) => {
    if (!id) return null;
    try {
      return await presensiController.getKompensasiDetail(id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat detail kompensasi mahasiswa';
      toast.showToast(msg, 'error');
      return null;
    }
  });

  // Handlers
  const handleOpenDetail = (id: number) => {
    setSelectedMhsId(id);
  };

  const handleCloseDetail = () => {
    setSelectedMhsId(null);
  };

  const handleSavePayment = async (e: Event) => {
    e.preventDefault();
    const id = selectedMhsId();
    if (!id) return;

    try {
      await presensiController.bayarKompensasi({
        mahasiswaId: id,
        jumlahMenit: jumlahMenit(),
        tanggal: tanggal(),
        keterangan: keterangan(),
      });
      toast.showToast('Pembayaran kompensasi berhasil diinput', 'success');
      setShowPayModal(false);
      setKeterangan('');
      setJumlahMenit(60);
      
      // Refresh data
      refetchDetail();
      refetchLaporan();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pembayaran';
      toast.showToast(msg, 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Laporan Jam Kompensasi</h1>
          <p class="text-sm text-gray-500">Pantau dan kelola tanggungan jam kompensasi (Disiplin Vokasi) mahasiswa</p>
        </div>

        {/* Filters */}
        <div class="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-4">
          <div class="relative w-80">
            <span class="absolute left-3.5 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Cari NIM, Nama, atau Prodi..."
              class="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
          <Button onClick={() => refetchLaporan()} variant="secondary">
            🔄 Refresh Data
          </Button>
        </div>

        {/* Laporan Table */}
        <div class="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="border-b border-gray-100 text-gray-400 uppercase text-xs font-semibold bg-gray-50/50">
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
                      <td colspan="6" class="text-center py-12 text-gray-400">
                        Memuat data laporan...
                      </td>
                    </tr>
                  }
                >
                  <For
                    each={filteredLaporan()}
                    fallback={
                      <tr>
                        <td colspan="6" class="text-center py-12 text-gray-400">
                          Tidak ada data mahasiswa terkompensasi.
                        </td>
                      </tr>
                    }
                  >
                    {(item) => (
                      <tr class="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                        <td class="py-4 px-6">
                          <div class="font-bold text-gray-800">{item.nama}</div>
                          <div class="text-xs text-gray-400">{item.nim}</div>
                        </td>
                        <td class="py-4 px-6 text-gray-600 font-semibold">{item.prodiNama || '-'}</td>
                        <td class="py-4 px-6 text-center text-red-500 font-bold">{item.totalKompensasi} Menit</td>
                        <td class="py-4 px-6 text-center text-emerald-600 font-bold">{item.totalDibayar} Menit</td>
                        <td class="py-4 px-6 text-center">
                          <span class={`px-3 py-1 rounded-full text-xs font-extrabold ${item.sisaKompensasi > 0 ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-emerald-50 text-emerald-700'}`}>
                            {item.sisaKompensasi} Menit
                          </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                          <Button onClick={() => handleOpenDetail(item.id)} variant="primary" class="!px-4 !py-1.5 text-xs font-bold">
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
        </div>
      </div>

      {/* Modal Detail Mahasiswa */}
      <Modal isOpen={selectedMhsId() !== null} onClose={handleCloseDetail} title="Detail Riwayat Jam Kompensasi">
        <Show when={!mhsDetail.loading && mhsDetail()} fallback={<div class="p-6 text-center text-gray-400">Memuat riwayat...</div>}>
          {(detail) => (
            <div class="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
              {/* Profile Card */}
              <div class="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-gray-800 text-lg">{detail().mahasiswa.nama}</h3>
                  <p class="text-sm text-gray-500">NIM: {detail().mahasiswa.nim}</p>
                </div>
                <div class="text-right">
                  <div class="text-xs text-gray-400 uppercase font-semibold">Sisa Tanggungan</div>
                  <div class="text-2xl font-black text-red-600">{detail().summary.sisaKompensasi} Menit</div>
                </div>
              </div>

              {/* Main lists */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Accrued Absences list */}
                <div class="flex flex-col gap-3">
                  <h4 class="font-bold text-gray-700 border-b pb-2 text-sm">Log Akumulasi Absensi</h4>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().historyKompensasi}
                      fallback={<p class="text-xs text-gray-400 italic">Tidak ada log absensi bermasalah.</p>}
                    >
                      {(log) => (
                        <div class="bg-white border border-gray-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-gray-700">{log.bapMateri} (Pertemuan {log.bapPertemuan})</span>
                            <span class="text-gray-400">{new Date(log.bapTanggal).toLocaleDateString('id-ID')}</span>
                            <span class="font-semibold text-amber-600">Status: {log.status.toUpperCase()} ({log.durasiMangkir} Menit)</span>
                          </div>
                          <span class="font-bold text-red-600 font-mono">+{log.poinKompensasi}m</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>

                {/* Payments list */}
                <div class="flex flex-col gap-3">
                  <div class="flex justify-between items-center border-b pb-2">
                    <h4 class="font-bold text-gray-700 text-sm">Log Penyelesaian Kompensasi</h4>
                    <Button onClick={() => setShowPayModal(true)} variant="success" class="!px-2.5 !py-1 text-[11px] font-bold">
                      + Input Pelunasan
                    </Button>
                  </div>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().payments}
                      fallback={<p class="text-xs text-gray-400 italic">Belum ada penyelesaian kompensasi yang dilaporkan.</p>}
                    >
                      {(pay) => (
                        <div class="bg-white border border-gray-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-gray-700">{pay.keterangan}</span>
                            <span class="text-gray-400">{new Date(pay.tanggal).toLocaleDateString('id-ID')}</span>
                          </div>
                          <span class="font-bold text-emerald-600 font-mono">-{pay.jumlahMenit}m</span>
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
      <Modal isOpen={showPayModal()} onClose={() => setShowPayModal(false)} title="Input Penyelesaian Jam Kompensasi">
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
            <label class="text-sm font-semibold text-gray-600">Keterangan Kegiatan Kompensasi</label>
            <textarea
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
