import { createSignal, createResource, Show, For, createEffect } from 'solid-js';
import { tagihanController, Tagihan } from '../controllers/tagihanController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';

export default function KeuanganDashboard() {
  const toast = useToast();
  const [search, setSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [isGenerating, setIsGenerating] = createSignal(false);

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
    const inputNominal = prompt(`Masukkan nominal tagihan untuk periode ${selectedPeriode()}:`, "5000000");
    if (inputNominal === null) return;
    const nominal = parseInt(inputNominal);
    if (isNaN(nominal) || nominal <= 0) {
      toast.showToast('Nominal tagihan tidak valid', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await tagihanController.generate(selectedPeriode(), nominal);
      toast.showToast(`${res.message} (${res.count} mahasiswa)`, 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal melakukan generate tagihan massal', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBayar = async (item: Tagihan) => {
    const sisa = item.nominal - (item.nominalTerbayar || 0);
    const inputBayar = prompt(`Masukkan nominal pembayaran untuk mahasiswa ${item.mahasiswa?.nama} (Sisa: Rp ${sisa.toLocaleString('id-ID')}):`, sisa.toString());
    if (inputBayar === null) return;
    const nominalBayar = parseInt(inputBayar);
    if (isNaN(nominalBayar) || nominalBayar <= 0 || nominalBayar > sisa) {
      toast.showToast('Nominal pembayaran tidak valid', 'error');
      return;
    }

    try {
      const res = await tagihanController.bayar(item.id, nominalBayar);
      toast.showToast(res.message, 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal memproses pembayaran', 'error');
    }
  };

  const formatRupiah = (num: number) => {
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">Manajemen Keuangan & SPP</h1>
            <p class="text-sm text-gray-500">Generate tagihan massal periode akademik baru dan verifikasi pembayaran mahasiswa.</p>
          </div>
          
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
            <Button disabled={isGenerating()} onClick={handleGenerate} class="h-10 shrink-0">
              {isGenerating() ? 'Generating...' : 'Generate Tagihan'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div class="flex flex-col md:flex-row gap-4 max-w-2xl">
          <div class="flex-1">
            <Input
              placeholder="Cari NIM atau nama mahasiswa..."
              value={search()}
              onInput={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <div class="w-full md:w-48">
            <select
              class="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-colors font-medium text-gray-600"
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="belum_bayar">Belum Bayar</option>
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
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}
                    >
                      {item.status === 'lunas' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-xs font-mono text-gray-500">
                    {item.tanggalBayar ? new Date(item.tanggalBayar).toLocaleString('id-ID') : '-'}
                  </td>
                  <td class="px-6 py-4">
                    <Show
                      when={item.status === 'belum_bayar'}
                      fallback={
                        <span class="text-xs text-gray-400 font-semibold italic text-green-650">Lunas</span>
                      }
                    >
                      <Button variant="primary" onClick={() => handleBayar(item)} class="!py-1 !px-3 text-xs">
                        Input Bayar
                      </Button>
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
      </div>
    </MainLayout>
  );
}
