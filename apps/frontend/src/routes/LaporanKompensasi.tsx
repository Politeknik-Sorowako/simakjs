import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { KompensasiDetailResponse, presensiController } from '../controllers/presensiController';

export default function LaporanKompensasi() {
  const toast = useToast();

  // Modal State
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [showPayModal, setShowPayModal] = createSignal(false);
  const [editingPay, setEditingPay] = createSignal<any | null>(null);

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
    return list.filter(
      (item) =>
        item.nama.toLowerCase().includes(q) ||
        item.nim.toLowerCase().includes(q) ||
        (item.prodiNama || '').toLowerCase().includes(q),
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

  const openAddPaymentModal = () => {
    setEditingPay(null);
    setJumlahMenit(60);
    setKeterangan('');
    setTanggal(new Date().toISOString().split('T')[0]);
    setShowPayModal(true);
  };

  const openEditPaymentModal = (pay: any) => {
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
      const data = {
        jumlahMenit: jumlahMenit(),
        tanggal: tanggal(),
        keterangan: keterangan(),
      };

      const editTarget = editingPay();
      if (editTarget) {
        await presensiController.updateKompensasiBayar(editTarget.id, data);
        toast.showToast('Pembayaran kompensasi berhasil diupdate', 'success');
      } else {
        await presensiController.bayarKompensasi({
          mahasiswaId: id,
          ...data,
        });
        toast.showToast('Pembayaran kompensasi berhasil diinput', 'success');
      }

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
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Jam Kompensasi</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">Pantau dan kelola tanggungan jam kompensasi (Disiplin Vokasi) mahasiswa</p>
        </div>

        {/* Filters */}
        <div class="bg-white border border-secondary-100 p-6 rounded-2xl shadow-sm flex items-center justify-between gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="relative w-80">
            <span class="absolute left-3.5 top-2.5 text-secondary-400 dark:text-secondary-200">🔍</span>
            <input
              type="text"
              placeholder="Cari NIM, Nama, atau Prodi..."
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
          <Button onClick={() => refetchLaporan()} variant="secondary">
            🔄 Refresh Data
          </Button>
        </div>

        {/* Laporan Table */}
        <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden dark:bg-secondary-900 dark:border-secondary-800">
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
                    each={filteredLaporan()}
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
                        <td class="py-4 px-6 text-secondary-600 font-semibold dark:text-secondary-200">{item.prodiNama || '-'}</td>
                        <td class="py-4 px-6 text-center text-red-500 font-bold">{item.totalKompensasi} Menit</td>
                        <td class="py-4 px-6 text-center text-accent-600 font-bold dark:text-accent-400">{item.totalDibayar} Menit</td>
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
              {/* Profile Card */}
              <div class="bg-secondary-50 rounded-2xl p-5 border border-secondary-100 flex items-center justify-between dark:bg-secondary-800 dark:border-secondary-800">
                <div>
                  <h3 class="font-bold text-secondary-800 text-lg dark:text-white">{detail().mahasiswa.nama}</h3>
                  <p class="text-sm text-secondary-500 dark:text-secondary-200">NIM: {detail().mahasiswa.nim}</p>
                </div>
                <div class="text-right">
                  <div class="text-xs text-secondary-400 uppercase font-semibold dark:text-secondary-200">Sisa Tanggungan</div>
                  <div class="text-2xl font-black text-red-600 dark:text-red-400">{detail().summary.sisaKompensasi} Menit</div>
                </div>
              </div>

              {/* Main lists */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Accrued Absences list */}
                <div class="flex flex-col gap-3">
                  <h4 class="font-bold text-secondary-700 border-b pb-2 text-sm dark:text-secondary-200">Log Akumulasi Absensi</h4>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().historyKompensasi}
                      fallback={<p class="text-xs text-secondary-400 italic dark:text-secondary-200">Tidak ada log absensi bermasalah.</p>}
                    >
                      {(log) => (
                        <div class="bg-white border border-secondary-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center dark:bg-secondary-900 dark:border-secondary-800">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-secondary-700 dark:text-secondary-200">
                              {log.bapMateri} (Pertemuan {log.bapPertemuan})
                            </span>
                            <span class="text-secondary-400 dark:text-secondary-200">{new Date(log.bapTanggal).toLocaleDateString('id-ID')}</span>
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

                {/* Payments list */}
                <div class="flex flex-col gap-3">
                  <div class="flex justify-between items-center border-b pb-2">
                    <h4 class="font-bold text-secondary-700 text-sm dark:text-secondary-200">Log Penyelesaian Kompensasi</h4>
                    <Button onClick={openAddPaymentModal} variant="success" class="!px-2.5 !py-1 text-[11px] font-bold">
                      + Input Pelunasan
                    </Button>
                  </div>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().payments}
                      fallback={
                        <p class="text-xs text-secondary-400 italic dark:text-secondary-200">Belum ada penyelesaian kompensasi yang dilaporkan.</p>
                      }
                    >
                      {(pay) => (
                        <div class="bg-white border border-secondary-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center dark:bg-secondary-900 dark:border-secondary-800">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-secondary-700 dark:text-secondary-200">{pay.keterangan}</span>
                            <span class="text-secondary-400 dark:text-secondary-200">{new Date(pay.tanggal).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-accent-600 font-mono dark:text-accent-400">-{pay.jumlahMenit}m</span>
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
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Keterangan Kegiatan Kompensasi</label>
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
