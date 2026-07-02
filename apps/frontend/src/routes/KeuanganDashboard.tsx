import { createSignal, createResource, Show, For, createEffect } from 'solid-js';
import { tagihanController, Tagihan } from '../controllers/tagihanController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function KeuanganDashboard() {
  const toast = useToast();
  const auth = useAuth();
  const role = () => auth.user()?.role;

  const [search, setSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [isGenerating, setIsGenerating] = createSignal(false);

  // Modal & Printing Signals
  const [showGenerateModal, setShowGenerateModal] = createSignal(false);
  const [generateNominal, setGenerateNominal] = createSignal(5000000);
  
  const [showPayModal, setShowPayModal] = createSignal(false);
  const [selectedTagihan, setSelectedTagihan] = createSignal<Tagihan | null>(null);
  const [payNominal, setPayNominal] = createSignal(0);

  const [showPrintInvoice, setShowPrintInvoice] = createSignal(false);
  const [showPrintReceipt, setShowPrintReceipt] = createSignal(false);
  const [selectedPrintItem, setSelectedPrintItem] = createSignal<Tagihan | null>(null);

  // Fetch Periodes for Select Options
  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));

  createEffect(() => {
    const list = periodes()?.data;
    if (list && list.length > 0 && !selectedPeriode()) {
      setSelectedPeriode(list[0].id);
    }
  });

  // Fetch Tagihan
  const [tagihanData, { refetch }] = createResource(
    () => ({
      search: search(),
      status: statusFilter(),
      page: page(),
      limit: limit()
    }),
    async ({ search, status, page, limit }) => {
      try {
        return await tagihanController.getAll(search, status || undefined, page, limit);
      } catch (e: any) {
        toast.showToast(e.message || 'Gagal memuat data tagihan', 'error');
        throw e;
      }
    }
  );

  const handleGenerate = async () => {
    if (!selectedPeriode()) {
      toast.showToast('Silakan pilih periode akademik terlebih dahulu', 'error');
      return;
    }
    setShowGenerateModal(true);
  };

  const submitGenerate = async (e: Event) => {
    e.preventDefault();
    const nominal = generateNominal();
    if (isNaN(nominal) || nominal <= 0) {
      toast.showToast('Nominal tagihan tidak valid', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await tagihanController.generate(selectedPeriode(), nominal);
      toast.showToast(`${res.message} (${res.count} mahasiswa)`, 'success');
      setShowGenerateModal(false);
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal melakukan generate tagihan massal', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBayar = (item: Tagihan) => {
    setSelectedTagihan(item);
    const sisa = item.nominal - (item.nominalTerbayar || 0);
    setPayNominal(sisa);
    setShowPayModal(true);
  };

  const submitBayar = async (e: Event) => {
    e.preventDefault();
    const item = selectedTagihan();
    if (!item) return;

    const nominalBayar = payNominal();
    const sisa = item.nominal - (item.nominalTerbayar || 0);
    if (isNaN(nominalBayar) || nominalBayar <= 0 || nominalBayar > sisa) {
      toast.showToast('Nominal pembayaran tidak valid', 'error');
      return;
    }

    try {
      const res = await tagihanController.bayar(item.id, nominalBayar);
      toast.showToast(res.message, 'success');
      setShowPayModal(false);
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal memproses pembayaran', 'error');
    }
  };

  const handlePrintInvoice = (item: Tagihan) => {
    setSelectedPrintItem(item);
    setShowPrintInvoice(true);
  };

  const handlePrintReceipt = (item: Tagihan) => {
    setSelectedPrintItem(item);
    setShowPrintReceipt(true);
  };

  const formatRupiah = (num: number) => {
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">
              {role() === 'mahasiswa' ? 'Informasi Tagihan & SPP' : 'Manajemen Keuangan & SPP'}
            </h1>
            <p class="text-sm text-gray-500">
              {role() === 'mahasiswa' 
                ? 'Daftar riwayat dan status pembayaran SPP/UKT perkuliahan Anda.' 
                : 'Generate tagihan massal periode akademik baru dan verifikasi pembayaran mahasiswa.'}
            </p>
          </div>
          
          <Show when={role() !== 'mahasiswa'}>
            <div class="flex items-end gap-3 w-full md:w-auto">
              <div class="w-full md:w-48">
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Periode Akademik</label>
                <select
                  class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-colors font-medium text-gray-700"
                  value={selectedPeriode()}
                  onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
                >
                  <For each={periodes()?.data}>
                    {(p) => <option value={p.id}>{p.nama}</option>}
                  </For>
                </select>
              </div>
              
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating()}
                class="w-full md:w-auto py-2 h-[38px] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span class="text-xs font-bold">Generate Tagihan</span>
              </Button>
            </div>
          </Show>
        </div>

        {/* Search & Filter */}
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div class="w-full md:w-80">
            <Show when={role() !== 'mahasiswa'}>
              <Input
                type="text"
                placeholder="Cari mahasiswa atau NIM..."
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                class="w-full"
              />
            </Show>
          </div>
          <div class="flex items-center gap-2 w-full md:w-auto justify-end">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter Status:</span>
            <select
              class="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-colors text-slate-900 font-semibold"
              value={statusFilter()}
              onChange={(e) => setStatusFilter(e.currentTarget.value)}
            >
              <option value="">Semua</option>
              <option value="belum_bayar">Belum Bayar</option>
              <option value="cicilan">Cicilan</option>
              <option value="lunas">Lunas</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Show when={!tagihanData.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data keuangan...</div>}>
          <Table headers={['Mahasiswa', 'Periode', 'Tagihan', 'Terbayar', 'Sisa', 'Status', 'Tanggal Bayar', 'Aksi']}>
            <For each={tagihanData()?.data}>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="font-semibold text-gray-800">{item.mahasiswa?.nama || '-'}</div>
                    <div class="text-xs text-gray-400 font-mono">{item.mahasiswa?.nim || '-'}</div>
                  </td>
                  <td class="px-6 py-4 font-mono text-xs text-gray-600">{item.periodeId}</td>
                  <td class="px-6 py-4 font-semibold text-gray-700">{formatRupiah(item.nominal)}</td>
                  <td class="px-6 py-4 font-semibold text-emerald-600">{formatRupiah(item.nominalTerbayar || 0)}</td>
                  <td class="px-6 py-4 font-semibold text-rose-500">{formatRupiah(item.nominal - (item.nominalTerbayar || 0))}</td>
                  <td class="px-6 py-4">
                    <span
                      class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === 'lunas'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : item.status === 'cicilan'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}
                    >
                      {item.status === 'lunas' ? 'Lunas' : item.status === 'cicilan' ? 'Cicilan' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-xs font-mono text-gray-500">
                    {item.tanggalBayar ? new Date(item.tanggalBayar).toLocaleString('id-ID') : '-'}
                  </td>
                  <td class="px-6 py-4 flex gap-2 items-center">
                    <Show when={role() !== 'mahasiswa'}>
                      <Show
                        when={item.status !== 'lunas'}
                        fallback={
                          <span class="text-xs font-semibold italic text-emerald-600">Lunas</span>
                        }
                      >
                        <Button variant="primary" onClick={() => handleBayar(item)} class="!py-1 !px-3 text-xs">
                          Input Bayar
                        </Button>
                      </Show>
                    </Show>

                    {/* Print buttons accessible to both admin & student */}
                    <button
                      onClick={() => handlePrintInvoice(item)}
                      class="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      📄 Cetak Tagihan
                    </button>
                    <Show when={item.status === 'lunas' || item.status === 'cicilan'}>
                      <button
                        onClick={() => handlePrintReceipt(item)}
                        class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                      >
                        🧾 Struk Bayar
                      </button>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
            <Show when={tagihanData()?.data.length === 0}>
              <tr>
                <td colspan="8" class="px-6 py-10 text-center text-gray-400">
                  Tidak ada data tagihan ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={tagihanData() && tagihanData()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-gray-500">
                Menampilkan halaman {page()} dari {tagihanData()?.meta.totalPages} ({tagihanData()?.meta.total} total data)
              </span>
              <div class="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page() === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  class="!py-1 !px-3"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={page() >= tagihanData()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, tagihanData()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        {/* --- CUSTOM GENERATE TAGIHAN MODAL --- */}
        <Show when={showGenerateModal()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-gray-800 text-sm">Generate Tagihan Massal</h3>
                <button onClick={() => setShowGenerateModal(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>
              <form onSubmit={submitGenerate} class="flex flex-col gap-4">
                <p class="text-xs text-gray-500">
                  Anda akan membuat tagihan massal untuk semua mahasiswa terdaftar pada periode akademik <span class="font-bold text-gray-700">{selectedPeriode()}</span>.
                </p>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Nominal Tagihan (Rp)</label>
                  <input
                    type="number"
                    value={generateNominal()}
                    onInput={(e) => setGenerateNominal(parseInt(e.currentTarget.value))}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div class="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    class="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                  >
                    Generate Sekarang
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* --- CUSTOM INPUT BAYAR MODAL --- */}
        <Show when={showPayModal()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-gray-800 text-sm">Input Pembayaran SPP</h3>
                <button onClick={() => setShowPayModal(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>
              <form onSubmit={submitBayar} class="flex flex-col gap-4">
                <div class="text-xs text-gray-600 flex flex-col gap-1 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <p>Mahasiswa: <span class="font-bold text-gray-800">{selectedTagihan()?.mahasiswa?.nama}</span></p>
                  <p>NIM: <span class="font-bold text-gray-800">{selectedTagihan()?.mahasiswa?.nim}</span></p>
                  <p>Total Tagihan: <span class="font-bold text-gray-800">{formatRupiah(selectedTagihan()?.nominal || 0)}</span></p>
                  <p>Telah Dibayar: <span class="font-bold text-emerald-600">{formatRupiah(selectedTagihan()?.nominalTerbayar || 0)}</span></p>
                  <p>Sisa Pembayaran: <span class="font-bold text-rose-500">{formatRupiah((selectedTagihan()?.nominal || 0) - (selectedTagihan()?.nominalTerbayar || 0))}</span></p>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-gray-700">Nominal Bayar (Rp)</label>
                  <input
                    type="number"
                    value={payNominal()}
                    onInput={(e) => setPayNominal(parseInt(e.currentTarget.value))}
                    max={(selectedTagihan()?.nominal || 0) - (selectedTagihan()?.nominalTerbayar || 0)}
                    class="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>
                <div class="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    class="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                  >
                    Simpan Pembayaran
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* --- CUSTOM PRINT INVOICE MODAL --- */}
        <Show when={showPrintInvoice()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 print:shadow-none print:p-0">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-gray-800">Cetak Tagihan Kuliah</h3>
                <button onClick={() => setShowPrintInvoice(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>
              <div class="flex flex-col gap-4 text-slate-900" id="print-area-invoice">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-lg font-extrabold text-blue-700">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-xs font-bold text-gray-550 uppercase tracking-widest">INVOICE / TAGIHAN BIAYA PENDIDIKAN</h3>
                </div>
                <div class="grid grid-cols-2 gap-4 text-xs font-medium text-gray-600 mb-2">
                  <div>
                    <p>Nama: <span class="text-slate-900 font-bold">{selectedPrintItem()?.mahasiswa?.nama}</span></p>
                    <p>NIM: <span class="text-slate-900 font-bold">{selectedPrintItem()?.mahasiswa?.nim}</span></p>
                    <p>Prodi: <span class="text-slate-900 font-bold">{selectedPrintItem()?.mahasiswa?.programStudiId || '-'}</span></p>
                  </div>
                  <div class="text-right">
                    <p>Periode: <span class="text-slate-900 font-bold">{selectedPrintItem()?.periodeId}</span></p>
                    <p>Status: <span class="text-slate-900 font-extrabold uppercase">{selectedPrintItem()?.status}</span></p>
                  </div>
                </div>
                <table class="w-full text-left text-xs border border-gray-200 border-collapse">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                      <th class="p-2 border-r">Deskripsi Komponen</th>
                      <th class="p-2 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b">
                      <td class="p-2 border-r">Uang Kuliah Tunggal (UKT) / SPP Semester</td>
                      <td class="p-2 text-right font-semibold">{formatRupiah(selectedPrintItem()?.nominal || 0)}</td>
                    </tr>
                    <tr class="bg-gray-50 font-bold">
                      <td class="p-2 border-r text-right">Total Tagihan:</td>
                      <td class="p-2 text-right text-rose-600">{formatRupiah(selectedPrintItem()?.nominal || 0)}</td>
                    </tr>
                    <tr class="font-bold border-t">
                      <td class="p-2 border-r text-right">Telah Terbayar:</td>
                      <td class="p-2 text-right text-emerald-600">{formatRupiah(selectedPrintItem()?.nominalTerbayar || 0)}</td>
                    </tr>
                    <tr class="bg-gray-50 font-bold">
                      <td class="p-2 border-r text-right">Sisa Kewajiban:</td>
                      <td class="p-2 text-right text-rose-500">{formatRupiah((selectedPrintItem()?.nominal || 0) - (selectedPrintItem()?.nominalTerbayar || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="flex justify-end gap-2 mt-4 border-t pt-4 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowPrintInvoice(false)}
                  class="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  class="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* --- CUSTOM PRINT RECEIPT MODAL --- */}
        <Show when={showPrintReceipt()}>
          <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 print:shadow-none print:p-0">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-gray-800">Cetak Bukti Pembayaran</h3>
                <button onClick={() => setShowPrintReceipt(false)} class="text-gray-400 hover:text-gray-600">❌</button>
              </div>
              <div class="flex flex-col gap-4 text-slate-900" id="print-area-receipt">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-lg font-extrabold text-emerald-700">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-xs font-bold text-gray-550 uppercase tracking-widest">BUKTI RESMI PEMBAYARAN SPP (RECEIPT)</h3>
                </div>
                <div class="grid grid-cols-2 gap-4 text-xs font-medium text-gray-600 mb-2">
                  <div>
                    <p>Nama Mahasiswa: <span class="text-slate-900 font-bold">{selectedPrintItem()?.mahasiswa?.nama}</span></p>
                    <p>NIM: <span class="text-slate-900 font-bold">{selectedPrintItem()?.mahasiswa?.nim}</span></p>
                  </div>
                  <div class="text-right">
                    <p>Periode: <span class="text-slate-900 font-bold">{selectedPrintItem()?.periodeId}</span></p>
                    <p>Tanggal Bayar: <span class="text-slate-900 font-bold">{selectedPrintItem()?.tanggalBayar ? new Date(selectedPrintItem()?.tanggalBayar!).toLocaleDateString('id-ID') : '-'}</span></p>
                  </div>
                </div>
                <table class="w-full text-left text-xs border border-gray-200 border-collapse">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-200">
                      <th class="p-2 border-r">Rincian Pembayaran</th>
                      <th class="p-2 text-right">Jumlah Terbayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b">
                      <td class="p-2 border-r">Pembayaran Biaya Pendidikan Semester</td>
                      <td class="p-2 text-right font-semibold text-emerald-600">{formatRupiah(selectedPrintItem()?.nominalTerbayar || 0)}</td>
                    </tr>
                    <tr class="font-bold border-t">
                      <td class="p-2 border-r text-right">Total Kewajiban Tagihan:</td>
                      <td class="p-2 text-right">{formatRupiah(selectedPrintItem()?.nominal || 0)}</td>
                    </tr>
                    <tr class="bg-gray-50 font-bold">
                      <td class="p-2 border-r text-right">Status Pembayaran:</td>
                      <td class="p-2 text-right uppercase text-emerald-600">{selectedPrintItem()?.status === 'lunas' ? 'LUNAS' : 'CICILAN / SEBAGIAN'}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="mt-6 text-center text-[10px] text-gray-400 font-medium">
                  <p>Bukti pembayaran ini sah dan dikeluarkan secara otomatis oleh sistem akademik Politeknik Sorowako.</p>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-4 border-t pt-4 print:hidden">
                <button
                  type="button"
                  onClick={() => setShowPrintReceipt(false)}
                  class="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  class="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                >
                  🖨️ Cetak Bukti
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
