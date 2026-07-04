import { createSignal, createResource, Show, For } from 'solid-js';
import { cutiController } from '../controllers/cutiController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';

export default function CutiMahasiswa() {
  const toast = useToast();
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
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
    ({ page, limit }) => cutiController.getAll(page, limit)
  );

  // Fetch Periods
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 50));

  const handleOpenModal = () => {
    setErrorMsg('');
    setAlasan('');
    // default to active period or first period
    const active = periodes()?.data?.find(p => p.aktif);
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
        alasan: alasan()
      });
      toast.showToast('Pengajuan cuti berhasil diajukan.', 'success');
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal mengajukan cuti.');
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
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal membatalkan pengajuan.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Menunggu PA</span>;
      case 'disetujui_pa':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Disetujui PA (Menunggu Keuangan)</span>;
      case 'disetujui_keuangan':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Disetujui Keuangan (Menunggu Final)</span>;
      case 'disetujui_prodi':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Disetujui Final</span>;
      case 'ditolak':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>;
      default:
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">Pengajuan Cuti</h1>
            <p class="text-sm text-gray-500">Ajukan cuti akademik dan pantau status persetujuan dari dosen PA, keuangan, dan program studi.</p>
          </div>
          <Button onClick={handleOpenModal}>+ Ajukan Cuti</Button>
        </div>

        <Show when={!cutis.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
          <Table headers={['Periode Akademik', 'Alasan Cuti', 'Status', 'SK & Tanggal Surat', 'Catatan', 'Tanggal Pengajuan', 'Aksi']}>
            <For each={cutis()?.data} fallback={
              <tr>
                <td colspan="7" class="text-center py-10 text-gray-400">Belum ada riwayat pengajuan cuti.</td>
              </tr>
            }>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-semibold text-gray-700">{item.periodeAkademik?.nama || item.periodeId}</td>
                  <td class="px-6 py-4 text-gray-600 max-w-xs truncate" title={item.alasan}>{item.alasan}</td>
                  <td class="px-6 py-4">{getStatusBadge(item.status)}</td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    <Show when={item.noSuratIzin} fallback={<span class="text-gray-300">-</span>}>
                      <div>No: {item.noSuratIzin}</div>
                      <div class="text-xs text-gray-400">Tgl: {item.tanggalSuratIzin}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500 italic">{item.catatan || <span class="text-gray-300">-</span>}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
                  <td class="px-6 py-4">
                    <Show when={item.status === 'pending'}>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Batal</Button>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </Table>
        </Show>
      </div>

      <Modal show={showModal()} onClose={() => setShowModal(false)} title="Ajukan Cuti Akademik">
        <form onSubmit={handleSave} class="flex flex-col gap-4">
          <Show when={errorMsg()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{errorMsg()}</div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Periode Akademik</label>
            <select
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={periodeId()}
              onChange={(e) => setPeriodeId(e.currentTarget.value)}
            >
              <option value="">-- Pilih Periode --</option>
              <For each={periodes()?.data}>
                {(p) => (
                  <option value={p.id}>{p.nama} {p.aktif ? '(Aktif)' : ''}</option>
                )}
              </For>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Alasan Cuti</label>
            <textarea
              rows={4}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Jelaskan alasan pengajuan cuti secara mendetail..."
              value={alasan()}
              onInput={(e) => setAlasan(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Tutup</Button>
            <Button type="submit" disabled={submitting()}>{submitting() ? 'Mengajukan...' : 'Kirim Pengajuan'}</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
