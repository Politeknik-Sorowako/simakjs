import { createSignal, createResource, Show, For } from 'solid-js';
import { cutiController, CutiRequest } from '../controllers/cutiController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function CutiApproval() {
  const toast = useToast();
  const auth = useAuth();
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [statusFilter, setStatusFilter] = createSignal('');
  const [periodeFilter, setPeriodeFilter] = createSignal('');

  // Fetch Cuti Requests
  const [cutis, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      periodeId: periodeFilter(),
      status: statusFilter()
    }),
    ({ page, limit, periodeId, status }) => cutiController.getAll(page, limit, periodeId || undefined, status || undefined)
  );

  // Fetch Periods
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 50));

  // Modal State for Action (Approve / Reject)
  const [showModal, setShowModal] = createSignal(false);
  const [selectedRequest, setSelectedRequest] = createSignal<CutiRequest | null>(null);
  const [actionType, setActionType] = createSignal<'approve' | 'reject'>('approve');
  const [catatan, setCatatan] = createSignal('');
  const [noSuratIzin, setNoSuratIzin] = createSignal('');
  const [tanggalSuratIzin, setTanggalSuratIzin] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);

  const openActionModal = (req: CutiRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setCatatan('');
    setNoSuratIzin('');
    setTanggalSuratIzin('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleAction = async (e: Event) => {
    e.preventDefault();
    const req = selectedRequest();
    if (!req) return;

    if (actionType() === 'approve' && (auth.user()?.role === 'admin' || auth.user()?.role === 'prodi')) {
      if (!noSuratIzin().trim() || !tanggalSuratIzin()) {
        setErrorMsg('Nomor dan tanggal surat izin cuti wajib diisi.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await cutiController.approve(req.id, {
        action: actionType(),
        catatan: catatan(),
        noSuratIzin: noSuratIzin() || undefined,
        tanggalSuratIzin: tanggalSuratIzin() || undefined
      });
      toast.showToast(
        actionType() === 'approve' ? 'Pengajuan cuti berhasil disetujui.' : 'Pengajuan cuti ditolak.',
        actionType() === 'approve' ? 'success' : 'warning'
      );
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal memproses persetujuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Menunggu PA</span>;
      case 'disetujui_pa':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Disetujui PA</span>;
      case 'disetujui_keuangan':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Disetujui Keuangan</span>;
      case 'disetujui_prodi':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Disetujui Final</span>;
      case 'ditolak':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>;
      default:
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  // Determine if a user can approve this item based on role and status
  const canApprove = (req: CutiRequest) => {
    const role = auth.user()?.role;
    if (role === 'dosen' && req.status === 'pending') return true;
    if (role === 'keuangan' && req.status === 'disetujui_pa') return true;
    if ((role === 'admin' || role === 'prodi') && req.status === 'disetujui_keuangan') return true;
    return false;
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-extrabold text-gray-800">Persetujuan Cuti Mahasiswa</h1>
          <p class="text-sm text-gray-500">Daftar pengajuan cuti akademik yang memerlukan verifikasi dan persetujuan.</p>
        </div>

        <div class="flex gap-4 items-center">
          <div class="w-48">
            <select
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={periodeFilter()}
              onChange={(e) => {
                setPeriodeFilter(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">Semua Periode</option>
              <For each={periodes()?.data}>
                {(p) => <option value={p.id}>{p.nama}</option>}
              </For>
            </select>
          </div>
          <div class="w-48">
            <select
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu PA</option>
              <option value="disetujui_pa">Disetujui PA</option>
              <option value="disetujui_keuangan">Disetujui Keuangan</option>
              <option value="disetujui_prodi">Disetujui Final</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        <Show when={!cutis.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
          <Table headers={['NIM', 'Nama Mahasiswa', 'Prodi', 'Periode', 'Alasan Cuti', 'Status', 'SK Cuti', 'Aksi']}>
            <For each={cutis()?.data} fallback={
              <tr>
                <td colspan="8" class="text-center py-10 text-gray-400">Tidak ada pengajuan cuti yang ditemukan.</td>
              </tr>
            }>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-sm font-semibold text-gray-600">{item.mahasiswa?.nim}</td>
                  <td class="px-6 py-4 font-medium text-gray-800">{item.mahasiswa?.nama}</td>
                  <td class="px-6 py-4 text-gray-500">{item.mahasiswa?.programStudi?.nama || '-'}</td>
                  <td class="px-6 py-4 text-gray-700">{item.periodeAkademik?.nama || item.periodeId}</td>
                  <td class="px-6 py-4 text-gray-600 max-w-xs truncate" title={item.alasan}>{item.alasan}</td>
                  <td class="px-6 py-4">{getStatusBadge(item.status)}</td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    <Show when={item.noSuratIzin} fallback={<span class="text-gray-300">-</span>}>
                      <div>No: {item.noSuratIzin}</div>
                      <div class="text-xs text-gray-400">Tgl: {item.tanggalSuratIzin}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4">
                    <Show when={canApprove(item)} fallback={<span class="text-xs text-gray-400 italic">No action needed</span>}>
                      <div class="flex gap-2">
                        <Button variant="success" size="sm" onClick={() => openActionModal(item, 'approve')}>Setujui</Button>
                        <Button variant="danger" size="sm" onClick={() => openActionModal(item, 'reject')}>Tolak</Button>
                      </div>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </Table>
        </Show>
      </div>

      <Modal show={showModal()} onClose={() => setShowModal(false)} title={actionType() === 'approve' ? 'Setujui Pengajuan Cuti' : 'Tolak Pengajuan Cuti'}>
        <form onSubmit={handleAction} class="flex flex-col gap-4">
          <Show when={errorMsg()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{errorMsg()}</div>
          </Show>

          <div class="text-sm text-gray-600">
            <div><strong>Mahasiswa:</strong> {selectedRequest()?.mahasiswa?.nama} ({selectedRequest()?.mahasiswa?.nim})</div>
            <div><strong>Periode Cuti:</strong> {selectedRequest()?.periodeAkademik?.nama || selectedRequest()?.periodeId}</div>
          </div>

          <Show when={actionType() === 'approve' && (auth.user()?.role === 'admin' || auth.user()?.role === 'prodi')}>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-gray-700">Nomor Surat Izin Cuti</label>
              <Input
                placeholder="misal: 123/DIR/CUTI/2024"
                value={noSuratIzin()}
                onInput={(e) => setNoSuratIzin(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-gray-700">Tanggal Surat Izin Cuti</label>
              <Input
                type="date"
                value={tanggalSuratIzin()}
                onInput={(e) => setTanggalSuratIzin(e.currentTarget.value)}
              />
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Catatan/Keterangan</label>
            <textarea
              rows={3}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Tambahkan catatan jika diperlukan..."
              value={catatan()}
              onInput={(e) => setCatatan(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Batal</Button>
            <Button type="submit" variant={actionType() === 'approve' ? 'primary' : 'danger'} disabled={submitting()}>
              {submitting() ? 'Memproses...' : actionType() === 'approve' ? 'Setujui' : 'Tolak'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
