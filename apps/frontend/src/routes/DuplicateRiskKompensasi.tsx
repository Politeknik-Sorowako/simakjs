import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import {
  type DuplicateRiskItem,
  JENIS_KOMPEN_LABEL,
  kompensasiManualController,
} from '../controllers/kompensasiManualController';

export default function DuplicateRiskKompensasi() {
  const toast = useToast();

  const [filterMhsId, setFilterMhsId] = createSignal<string | number>('');
  const [filterTanggal, setFilterTanggal] = createSignal('');
  const [selectedItem, setSelectedItem] = createSignal<DuplicateRiskItem | null>(null);

  const [data, { refetch }] = createResource(
    () => ({ mhsId: filterMhsId(), tanggal: filterTanggal() }),
    async ({ mhsId, tanggal }) => {
      return await kompensasiManualController.getDuplicateRisk(mhsId ? Number(mhsId) : undefined, tanggal || undefined);
    },
  );

  const [stats, { refetch: refetchStats }] = createResource(() => kompensasiManualController.getStats());

  const handleDelete = async (recordId: number) => {
    if (!window.confirm('Hapus catatan kompensasi ini?')) return;
    try {
      await kompensasiManualController.remove(recordId);
      toast.showToast('Data kompensasi dihapus', 'success');
      const item = selectedItem();
      if (item) {
        item.records = item.records.filter((r) => r.id !== recordId);
        setSelectedItem({ ...item });
        if (item.records.length <= 1) setSelectedItem(null);
      }
      refetch();
      refetchStats();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-900 dark:text-white">Riwayat Kompensasi Berpeluang Ganda</h1>
          <p class="text-sm text-secondary-500 mt-1">
            Menampilkan mahasiswa yang memiliki lebih dari satu catatan kompensasi dalam satu hari untuk keperluan
            audit.
          </p>
        </div>

        <Show when={stats()}>
          {(s) => (
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-5">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-500">Total Data Kompensasi</p>
                <p class="text-3xl font-bold text-secondary-900 dark:text-white mt-1">{s().totalRecords}</p>
                <p class="text-sm text-secondary-500">{s().totalMenit} menit</p>
              </div>
              <div class="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-5">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-500">Per Hari (maks)</p>
                <p class="text-3xl font-bold text-secondary-900 dark:text-white mt-1">480</p>
                <p class="text-sm text-secondary-500">menit per mahasiswa</p>
              </div>
              <div class="bg-white dark:bg-secondary-900 rounded-2xl border border-amber-300 dark:border-amber-700 p-5">
                <p class="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Kasus Berpeluang Ganda
                </p>
                <p class="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{s().duplicateRiskCount}</p>
                <p class="text-sm text-secondary-500">lebih dari satu data per hari</p>
              </div>
            </div>
          )}
        </Show>

        <div class="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-4 flex flex-col md:flex-row gap-4 items-end">
          <div class="w-full md:w-64">
            <Input
              type="number"
              label="ID Mahasiswa"
              placeholder="Filter per mahasiswa (opsional)"
              value={filterMhsId()}
              onChange={(e: Event) => setFilterMhsId((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <div class="w-full md:w-64">
            <Input
              type="date"
              label="Tanggal"
              value={filterTanggal()}
              onChange={(e: Event) => setFilterTanggal((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
          <Button onClick={() => refetch()} variant="secondary">
            Terapkan Filter
          </Button>
        </div>

        <div class="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <Table headers={['NIM', 'Nama', 'Tanggal', 'Jumlah Data', 'Total Menit', '']}>
            <For each={data() || []}>
              {(item: DuplicateRiskItem) => (
                <tr class="hover:bg-secondary-50/80 dark:hover:bg-secondary-800/40 transition-colors">
                  <td class="px-6 py-4 text-sm font-medium text-secondary-900 dark:text-white">{item.nim}</td>
                  <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">{item.nama}</td>
                  <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">{item.tanggal}</td>
                  <td class="px-6 py-4">
                    <Badge variant="warning">{item.count} data</Badge>
                  </td>
                  <td class="px-6 py-4 text-sm font-semibold text-secondary-900 dark:text-white">
                    {item.totalMenit} mnt
                  </td>
                  <td class="px-6 py-4 text-right">
                    <Button variant="secondary" onClick={() => setSelectedItem(item)}>
                      Detail
                    </Button>
                  </td>
                </tr>
              )}
            </For>
          </Table>
          <Show when={(data() || []).length === 0 && data() !== undefined}>
            <p class="text-center text-sm text-secondary-500 py-6">Tidak ada data berpeluang ganda.</p>
          </Show>
        </div>

        <Modal isOpen={!!selectedItem()} onClose={() => setSelectedItem(null)}>
          <Show when={selectedItem()}>
            {(item) => (
              <div class="flex flex-col gap-4">
                <div>
                  <h2 class="text-lg font-bold text-secondary-900 dark:text-white">Detail Kompensasi</h2>
                  <p class="text-sm text-secondary-500">
                    {item().nama} ({item().nim}) — {item().tanggal}
                  </p>
                </div>
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs font-semibold uppercase tracking-wider text-secondary-500">
                      <th class="py-2">Jenis</th>
                      <th class="py-2">Durasi</th>
                      <th class="py-2">Keterangan</th>
                      <th class="py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={item().records}>
                      {(rec) => (
                        <tr class="border-t border-secondary-100 dark:border-secondary-800">
                          <td class="py-2">
                            <Badge variant="warning">{JENIS_KOMPEN_LABEL[rec.jenisKompen] || rec.jenisKompen}</Badge>
                          </td>
                          <td class="py-2 font-medium">{rec.durasiMenit} mnt</td>
                          <td class="py-2 text-secondary-600 dark:text-secondary-300">{rec.keterangan || '-'}</td>
                          <td class="py-2 text-right">
                            <Button variant="danger" onClick={() => handleDelete(rec.id)}>
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            )}
          </Show>
        </Modal>
      </div>
    </MainLayout>
  );
}
