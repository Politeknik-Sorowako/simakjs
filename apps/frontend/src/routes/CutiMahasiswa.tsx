import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import { cutiController } from '../controllers/cutiController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { usePagination } from '../hooks/usePagination';

export default function CutiMahasiswa() {
  const toast = useToast();
  const { page, limit, setPage, setLimit, resetPage } = usePagination();
  const [showModal, setShowModal] = createSignal(false);
  const [periodeId, setPeriodeId] = createSignal('');
  const [alasan, setAlasan] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);

  // Fetch Cuti Requests
  const [cutis, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
    }),
    ({ page, limit }) => cutiController.getAll(page, limit),
  );

  // Fetch Periods
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 50));

  const [sortBy, setSortBy] = createSignal('nim');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => {
    const data = cutis()?.data || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

  const handleOpenModal = () => {
    setErrorMsg('');
    setAlasan('');
    // default to active period or first period
    const active = periodes()?.data?.find((p) => p.aktif);
    setPeriodeId(active?.id || periodes()?.data?.[0]?.id || '');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!periodeId()) {
      setErrorMsg('Pilih periode akademik terlebih dahulu.');
      return;
    }
    if (!alasan().trim()) {
      setErrorMsg('Alasan cuti harus diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await cutiController.create({
        periodeId: periodeId(),
        alasan: alasan(),
      });
      toast.showToast('Pengajuan cuti berhasil diajukan.', 'success');
      setShowModal(false);
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal mengajukan cuti.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan/menghapus pengajuan cuti ini?')) return;
    try {
      await cutiController.delete(id);
      toast.showToast('Pengajuan cuti berhasil dibatalkan.', 'success');
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membatalkan pengajuan.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Menunggu PA
          </span>
        );
      case 'disetujui_pa':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
            Disetujui PA (Menunggu Keuangan)
          </span>
        );
      case 'disetujui_keuangan':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            Disetujui Keuangan (Menunggu Final)
          </span>
        );
      case 'disetujui_prodi':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Disetujui Final
          </span>
        );
      case 'ditolak':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Ditolak
          </span>
        );
      default:
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary-100 text-secondary-800 dark:text-white">
            {status}
          </span>
        );
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Pengajuan Cuti</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Ajukan cuti akademik dan pantau status persetujuan dari dosen PA, keuangan, dan program studi.
            </p>
          </div>
          <Button onClick={handleOpenModal}>+ Ajukan Cuti</Button>
        </div>

        <Show
          when={!cutis.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Table
            headers={[
              <SortableHeader field="periodeId" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Periode Akademik
              </SortableHeader>,
              <SortableHeader field="alasan" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Alasan Cuti
              </SortableHeader>,
              'Status',
              'SK & Tanggal Surat',
              'Catatan',
              <SortableHeader field="createdAt" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Tanggal Pengajuan
              </SortableHeader>,
              'Aksi',
            ]}
          >
            <For
              each={sortedData()}
              fallback={
                <tr>
                  <td colspan="7" class="text-center py-10 text-secondary-400 dark:text-secondary-200">
                    Belum ada riwayat pengajuan cuti.
                  </td>
                </tr>
              }
            >
              {(item) => (
                <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                  <td class="px-6 py-4 font-semibold text-secondary-700 dark:text-secondary-200">
                    {item.periodeAkademik?.nama || item.periodeId}
                  </td>
                  <td
                    class="px-6 py-4 text-secondary-600 max-w-xs truncate dark:text-secondary-200"
                    title={item.alasan}
                  >
                    {item.alasan}
                  </td>
                  <td class="px-6 py-4">{getStatusBadge(item.status)}</td>
                  <td class="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-200">
                    <Show
                      when={item.noSuratIzin}
                      fallback={<span class="text-secondary-300 dark:border-secondary-700">-</span>}
                    >
                      <div>No: {item.noSuratIzin}</div>
                      <div class="text-xs text-secondary-400 dark:text-secondary-200">Tgl: {item.tanggalSuratIzin}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4 text-sm text-secondary-500 italic dark:text-secondary-200">
                    {item.catatan || <span class="text-secondary-300 dark:border-secondary-700">-</span>}
                  </td>
                  <td class="px-6 py-4 text-sm text-secondary-400 dark:text-secondary-200">
                    {new Date(item.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td class="px-6 py-4">
                    <Show when={item.status === 'pending'}>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                        Batal
                      </Button>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </Table>
        </Show>

        <Show when={cutis()?.meta}>
          <Pagination
            currentPage={page()}
            totalPages={cutis()!.meta.totalPages}
            total={cutis()!.meta.total}
            limit={limit()}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </Show>
      </div>

      <Modal show={showModal()} onClose={() => setShowModal(false)} title="Ajukan Cuti Akademik">
        <form onSubmit={handleSave} class="flex flex-col gap-4">
          <Show when={errorMsg()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 dark:bg-red-900/30 dark:text-red-400">
              {errorMsg()}
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Periode Akademik</label>
            <select
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              value={periodeId()}
              onChange={(e) => setPeriodeId(e.currentTarget.value)}
            >
              <option value="">-- Pilih Periode --</option>
              <For each={periodes()?.data}>
                {(p) => (
                  <option value={p.id}>
                    {p.nama} {p.aktif ? '(Aktif)' : ''}
                  </option>
                )}
              </For>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Alasan Cuti</label>
            <textarea
              rows={4}
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              placeholder="Jelaskan alasan pengajuan cuti secara mendetail..."
              value={alasan()}
              onInput={(e) => setAlasan(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
              Tutup
            </Button>
            <Button type="submit" disabled={submitting()}>
              {submitting() ? 'Mengajukan...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
