import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CutiRequest, cutiController, MahasiswaCuti } from '../controllers/cutiController';
import { Mahasiswa, mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';

type Tab = 'input' | 'approval' | 'aktif';

export default function ManajemenCuti() {
  const toast = useToast();
  const auth = useAuth();
  const role = () => auth.user()?.role || '';

  const tabs: { key: Tab; label: string; visible: boolean }[] = [
    { key: 'input', label: 'Input Cuti', visible: role() === 'admin' || role() === 'prodi' },
    { key: 'approval', label: 'Persetujuan Cuti', visible: role() !== 'mahasiswa' && role() !== 'guest' },
    {
      key: 'aktif',
      label: 'Aktifkan Kembali',
      visible: role() === 'admin' || role() === 'prodi' || role() === 'dosen',
    },
  ];

  const visibleTabs = () => tabs.filter((t) => t.visible);
  const [activeTab, setActiveTab] = createSignal<Tab>(visibleTabs()[0]?.key || 'input');

  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 50));

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu PA' },
      disetujui_pa: { bg: 'bg-brand-100', text: 'text-brand-800', label: 'Disetujui PA' },
      disetujui_keuangan: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Disetujui Keuangan' },
      disetujui_prodi: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui (Cuti)' },
      ditolak: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' },
      kembali_aktif: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Kembali Aktif' },
    };
    const s = map[status] || { bg: 'bg-secondary-100', text: 'text-secondary-800', label: status };
    return <span class={`px-2.5 py-1 text-xs font-semibold rounded-full ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  // =========================== TAB 1: INPUT CUTI ===========================
  const [inputPage, setInputPage] = createSignal(1);
  const [inputSearch, setInputSearch] = createSignal('');
  const [inputPeriode, setInputPeriode] = createSignal('');

  const [inputRecords, { refetch: refetchInput }] = createResource(
    () => ({ page: inputPage(), limit: 10, search: inputSearch(), periodeId: inputPeriode() }),
    ({ page, limit, search, periodeId }) =>
      cutiController.getMahasiswaCuti(page, limit, search || undefined, periodeId || undefined),
  );

  const [mhsList, setMhsList] = createSignal<Mahasiswa[]>([]);

  const [showInputModal, setShowInputModal] = createSignal(false);
  const [selectedMhs, setSelectedMhs] = createSignal<Mahasiswa | null>(null);
  const [inputPeriodeId, setInputPeriodeId] = createSignal('');
  const [alasan, setAlasan] = createSignal('');
  const [semesterMulaiCuti, setSemesterMulaiCuti] = createSignal('');
  const [semesterBerakhirCuti, setSemesterBerakhirCuti] = createSignal('');
  const [autoBerakhir, setAutoBerakhir] = createSignal(true);
  const [noSuratIzin, setNoSuratIzin] = createSignal('');
  const [tanggalSuratIzin, setTanggalSuratIzin] = createSignal('');
  const [inputError, setInputError] = createSignal('');
  const [inputSubmitting, setInputSubmitting] = createSignal(false);

  const hitungSemesterBerakhir = (mulai: string) => {
    if (!mulai || mulai.length < 5) return '';
    const tahun = parseInt(mulai.slice(0, 4));
    const semester = parseInt(mulai.slice(4));
    if (semester === 1) return `${tahun}2`;
    return `${tahun + 1}1`;
  };

  const openFormModal = async () => {
    setSelectedMhs(null);
    const active = periodes()?.data?.find((p) => p.aktif);
    const activeId = active?.id || periodes()?.data?.[0]?.id || '';
    setInputPeriodeId(activeId);
    setSemesterMulaiCuti(activeId);
    setSemesterBerakhirCuti(hitungSemesterBerakhir(activeId));
    setAutoBerakhir(true);
    setAlasan('');
    setNoSuratIzin('');
    setTanggalSuratIzin(new Date().toISOString().split('T')[0]);
    setInputError('');
    setShowInputModal(true);
    try {
      const result = await mahasiswaController.getAll('', 1, 500);
      setMhsList(result.data || []);
    } catch {
      setMhsList([]);
    }
  };

  const handleSaveInput = async (e: Event) => {
    e.preventDefault();
    const mhs = selectedMhs();
    if (!mhs) {
      setInputError('Pilih mahasiswa terlebih dahulu.');
      return;
    }
    if (!inputPeriodeId()) {
      setInputError('Pilih periode akademik.');
      return;
    }
    if (!alasan()) {
      setInputError('Isi alasan cuti.');
      return;
    }

    setInputSubmitting(true);
    setInputError('');
    try {
      await cutiController.inputByAdmin({
        mahasiswaId: mhs.id,
        periodeId: inputPeriodeId(),
        alasan: alasan(),
        semesterMulaiCuti: semesterMulaiCuti() || undefined,
        semesterBerakhirCuti: semesterBerakhirCuti() || undefined,
        noSuratIzin: noSuratIzin() || undefined,
        tanggalSuratIzin: tanggalSuratIzin() || undefined,
      });
      toast.showToast(`Mahasiswa "${mhs.nama}" berhasil dicatat cuti.`, 'success');
      setShowInputModal(false);
      refetchInput();
    } catch (e: unknown) {
      setInputError((e as Error).message || 'Gagal mencatat cuti mahasiswa.');
    } finally {
      setInputSubmitting(false);
    }
  };

  const handleDeleteCuti = async (id: number, nama: string) => {
    if (!confirm(`Batalkan cuti mahasiswa "${nama}"? Data cuti akan dihapus dan status kembali aktif.`)) return;
    try {
      await cutiController.delete(id);
      toast.showToast(`Cuti "${nama}" berhasil dibatalkan.`, 'success');
      refetchInput();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membatalkan cuti.', 'error');
    }
  };

  const handleAktifKembaliFromInput = async (id: number, nama: string) => {
    if (!confirm(`Aktifkan kembali mahasiswa "${nama}"?`)) return;
    try {
      await cutiController.aktifKembali(id);
      toast.showToast(`"${nama}" berhasil diaktifkan kembali.`, 'success');
      refetchInput();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal.', 'error');
    }
  };

  // =========================== TAB 2: APPROVAL ===========================
  const [apprPage, setApprPage] = createSignal(1);
  const [apprStatus, setApprStatus] = createSignal('');
  const [apprPeriode, setApprPeriode] = createSignal('');

  const [approvals, { refetch: refetchApprovals }] = createResource(
    () => ({ page: apprPage(), limit: 10, periodeId: apprPeriode(), status: apprStatus() }),
    ({ page, limit, periodeId, status }) =>
      cutiController.getAll(page, limit, periodeId || undefined, status || undefined),
  );

  const [showApprModal, setShowApprModal] = createSignal(false);
  const [selectedRequest, setSelectedRequest] = createSignal<CutiRequest | null>(null);
  const [actionType, setActionType] = createSignal<'approve' | 'reject'>('approve');
  const [apprCatatan, setApprCatatan] = createSignal('');
  const [apprNoSurat, setApprNoSurat] = createSignal('');
  const [apprTglSurat, setApprTglSurat] = createSignal('');
  const [apprError, setApprError] = createSignal('');
  const [apprSubmitting, setApprSubmitting] = createSignal(false);

  const openActionModal = (req: CutiRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setApprCatatan('');
    setApprNoSurat('');
    setApprTglSurat('');
    setApprError('');
    setShowApprModal(true);
  };

  const handleApprovalAction = async (e: Event) => {
    e.preventDefault();
    const req = selectedRequest();
    if (!req) return;

    if (actionType() === 'approve' && (role() === 'admin' || role() === 'prodi')) {
      if (!apprNoSurat().trim() || !apprTglSurat()) {
        setApprError('Nomor dan tanggal surat izin cuti wajib diisi.');
        return;
      }
    }

    setApprSubmitting(true);
    setApprError('');
    try {
      await cutiController.approve(req.id, {
        action: actionType(),
        catatan: apprCatatan(),
        noSuratIzin: apprNoSurat() || undefined,
        tanggalSuratIzin: apprTglSurat() || undefined,
      });
      toast.showToast(
        actionType() === 'approve' ? 'Pengajuan cuti berhasil disetujui.' : 'Pengajuan cuti ditolak.',
        actionType() === 'approve' ? 'success' : 'warning',
      );
      setShowApprModal(false);
      refetchApprovals();
    } catch (e: unknown) {
      setApprError((e as Error).message || 'Gagal memproses persetujuan.');
    } finally {
      setApprSubmitting(false);
    }
  };

  const canApprove = (req: CutiRequest) => {
    const r = role();
    if (r === 'dosen' && req.status === 'pending') return true;
    if (r === 'keuangan' && req.status === 'disetujui_pa') return true;
    if ((r === 'admin' || r === 'prodi') && req.status === 'disetujui_keuangan') return true;
    return false;
  };

  // =========================== TAB 3: AKTIFKAN KEMBALI ===========================
  const [aktifPage, setAktifPage] = createSignal(1);
  const [aktifSearch, setAktifSearch] = createSignal('');
  const [aktifPeriode, setAktifPeriode] = createSignal('');

  const [aktifList, { refetch: refetchAktif }] = createResource(
    () => ({ page: aktifPage(), limit: 10, search: aktifSearch(), periodeId: aktifPeriode() }),
    ({ page, limit, search, periodeId }) =>
      cutiController.getMahasiswaCuti(page, limit, search || undefined, periodeId || undefined),
  );

  const [processing, setProcessing] = createSignal<number | null>(null);

  const getStatusCuti = (item: MahasiswaCuti) => item.pengajuanCuti?.[0]?.status || '-';
  const getPeriodeCuti = (item: MahasiswaCuti) =>
    item.pengajuanCuti?.[0]?.periodeAkademik?.nama || item.pengajuanCuti?.[0]?.periodeId || '-';
  const getRentangCuti = (item: MahasiswaCuti) => {
    const cuti = item.pengajuanCuti?.[0];
    if (cuti?.semesterMulaiCuti && cuti?.semesterBerakhirCuti)
      return `${cuti.semesterMulaiCuti} - ${cuti.semesterBerakhirCuti}`;
    return cuti?.semesterMulaiCuti || '-';
  };

  const handleAktifKembali = async (id: number, nama: string) => {
    if (!confirm(`Aktifkan kembali mahasiswa "${nama}" dari status cuti?`)) return;
    setProcessing(id);
    try {
      await cutiController.aktifKembali(id);
      toast.showToast(`Mahasiswa "${nama}" berhasil diaktifkan kembali.`, 'success');
      refetchAktif();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengaktifkan kembali.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  // =========================== RENDER ===========================
  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Manajemen Cuti Mahasiswa</h1>
          <p class="text-sm text-secondary-500">
            Input cuti, persetujuan, dan aktivasi kembali mahasiswa secara terpadu.
          </p>
        </div>

        <div class="flex gap-1 border-b border-secondary-200 dark:border-secondary-700">
          <For each={visibleTabs()}>
            {(tab) => (
              <button
                onClick={() => setActiveTab(tab.key)}
                class={`px-5 py-3 text-sm font-semibold transition-colors duration-150 rounded-t-lg border-b-2 -mb-px ${
                  activeTab() === tab.key
                    ? 'border-brand-600 text-brand-600 bg-brand-50/50'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>

        {/* ===================== TAB: INPUT CUTI ===================== */}
        <Show when={activeTab() === 'input'}>
          <div class="flex justify-between items-center">
            <div class="flex gap-4 items-center">
              <div class="max-w-xs flex-1">
                <Input
                  placeholder="Cari NIM atau nama..."
                  value={inputSearch()}
                  onInput={(e) => {
                    setInputSearch(e.currentTarget.value);
                    setInputPage(1);
                  }}
                />
              </div>
              <div class="w-48">
                <select
                  class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                  value={inputPeriode()}
                  onChange={(e) => {
                    setInputPeriode(e.currentTarget.value);
                    setInputPage(1);
                  }}
                >
                  <option value="">Semua Periode</option>
                  <For each={periodes()?.data}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
                </select>
              </div>
            </div>
            <Button onClick={openFormModal}>+ Catat Cuti</Button>
          </div>

          <Show
            when={!inputRecords.loading}
            fallback={<div class="text-center py-10 text-secondary-400">Loading data...</div>}
          >
            <Table headers={['NIM', 'Nama Mahasiswa', 'Status', 'Periode Cuti', 'Rentang Cuti', 'No SK', 'Aksi']}>
              <For
                each={inputRecords()?.data}
                fallback={
                  <tr>
                    <td colspan="7" class="text-center py-10 text-secondary-400">
                      Tidak ada data mahasiswa cuti.
                    </td>
                  </tr>
                }
              >
                {(item) => {
                  const cutiRecord = item.pengajuanCuti?.[0];
                  return (
                    <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                      <td class="px-6 py-4 font-mono text-sm font-semibold text-secondary-600">{item.nim}</td>
                      <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.nama}</td>
                      <td class="px-6 py-4">
                        {cutiRecord ? (
                          getStatusBadge(cutiRecord.status)
                        ) : (
                          <span class="text-xs text-secondary-400">Tidak ada record</span>
                        )}
                      </td>
                      <td class="px-6 py-4 text-secondary-700">
                        {cutiRecord?.periodeAkademik?.nama || cutiRecord?.periodeId || '-'}
                      </td>
                      <td class="px-6 py-4 text-sm text-secondary-500">
                        {cutiRecord?.semesterMulaiCuti && cutiRecord?.semesterBerakhirCuti
                          ? `${cutiRecord.semesterMulaiCuti} - ${cutiRecord.semesterBerakhirCuti}`
                          : cutiRecord?.semesterMulaiCuti || '-'}
                      </td>
                      <td class="px-6 py-4 text-sm text-secondary-500">
                        <Show when={cutiRecord?.noSuratIzin} fallback={<span class="text-secondary-300">-</span>}>
                          <div>{cutiRecord?.noSuratIzin}</div>
                        </Show>
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex gap-2">
                          <Show
                            when={
                              cutiRecord && (cutiRecord.status === 'disetujui_prodi' || cutiRecord.status === 'pending')
                            }
                          >
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteCuti(cutiRecord!.id, item.nama)}
                            >
                              Batalkan Cuti
                            </Button>
                          </Show>
                          <Show when={cutiRecord?.status === 'disetujui_prodi'}>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAktifKembaliFromInput(cutiRecord!.id, item.nama)}
                            >
                              Kembalikan
                            </Button>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </Table>
          </Show>
        </Show>

        {/* ===================== TAB: PERSETUJUAN CUTI ===================== */}
        <Show when={activeTab() === 'approval'}>
          <div class="flex gap-4 items-center">
            <div class="w-48">
              <select
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                value={apprPeriode()}
                onChange={(e) => {
                  setApprPeriode(e.currentTarget.value);
                  setApprPage(1);
                }}
              >
                <option value="">Semua Periode</option>
                <For each={periodes()?.data}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
            <div class="w-48">
              <select
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                value={apprStatus()}
                onChange={(e) => {
                  setApprStatus(e.currentTarget.value);
                  setApprPage(1);
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

          <Show
            when={!approvals.loading}
            fallback={<div class="text-center py-10 text-secondary-400">Loading data...</div>}
          >
            <Table headers={['NIM', 'Nama Mahasiswa', 'Prodi', 'Periode', 'Alasan Cuti', 'Status', 'SK Cuti', 'Aksi']}>
              <For
                each={approvals()?.data}
                fallback={
                  <tr>
                    <td colspan="8" class="text-center py-10 text-secondary-400">
                      Tidak ada pengajuan cuti yang ditemukan.
                    </td>
                  </tr>
                }
              >
                {(item) => (
                  <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                    <td class="px-6 py-4 font-mono text-sm font-semibold text-secondary-600">{item.mahasiswa?.nim}</td>
                    <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.mahasiswa?.nama}</td>
                    <td class="px-6 py-4 text-secondary-500">{item.mahasiswa?.programStudi?.nama || '-'}</td>
                    <td class="px-6 py-4 text-secondary-700">{item.periodeAkademik?.nama || item.periodeId}</td>
                    <td class="px-6 py-4 text-secondary-600 max-w-xs truncate" title={item.alasan}>
                      {item.alasan}
                    </td>
                    <td class="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td class="px-6 py-4 text-sm text-secondary-500">
                      <Show when={item.noSuratIzin} fallback={<span class="text-secondary-300">-</span>}>
                        <div>No: {item.noSuratIzin}</div>
                        <div class="text-xs text-secondary-400">Tgl: {item.tanggalSuratIzin}</div>
                      </Show>
                    </td>
                    <td class="px-6 py-4">
                      <Show
                        when={canApprove(item)}
                        fallback={<span class="text-xs text-secondary-400 italic">No action needed</span>}
                      >
                        <div class="flex gap-2">
                          <Button variant="success" size="sm" onClick={() => openActionModal(item, 'approve')}>
                            Setujui
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => openActionModal(item, 'reject')}>
                            Tolak
                          </Button>
                        </div>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </Table>
          </Show>
        </Show>

        {/* ===================== TAB: AKTIFKAN KEMBALI ===================== */}
        <Show when={activeTab() === 'aktif'}>
          <div class="flex gap-4 items-center">
            <div class="w-64">
              <input
                type="text"
                placeholder="Cari NIM atau Nama..."
                value={aktifSearch()}
                onInput={(e) => {
                  setAktifSearch(e.currentTarget.value);
                  setAktifPage(1);
                }}
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              />
            </div>
            <div class="w-48">
              <select
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                value={aktifPeriode()}
                onChange={(e) => {
                  setAktifPeriode(e.currentTarget.value);
                  setAktifPage(1);
                }}
              >
                <option value="">Semua Periode</option>
                <For each={periodes()?.data}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
          </div>

          <Show
            when={!aktifList.loading}
            fallback={<div class="text-center py-10 text-secondary-400">Loading data...</div>}
          >
            <Table headers={['NIM', 'Nama Mahasiswa', 'Prodi', 'Periode Cuti', 'Rentang Cuti', 'Aksi']}>
              <For
                each={aktifList()?.data}
                fallback={
                  <tr>
                    <td colspan="6" class="text-center py-10 text-secondary-400">
                      Tidak ada mahasiswa yang sedang cuti.
                    </td>
                  </tr>
                }
              >
                {(item) => (
                  <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                    <td class="px-6 py-4 font-mono text-sm font-semibold text-secondary-600">{item.nim}</td>
                    <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.nama}</td>
                    <td class="px-6 py-4 text-secondary-500">{item.programStudi?.nama || '-'}</td>
                    <td class="px-6 py-4 text-secondary-700">{getPeriodeCuti(item)}</td>
                    <td class="px-6 py-4 text-secondary-700">{getRentangCuti(item)}</td>
                    <td class="px-6 py-4">
                      <Show
                        when={getStatusCuti(item) === 'disetujui_prodi'}
                        fallback={
                          <span class="text-xs text-secondary-400 italic">
                            {getStatusCuti(item) === 'kembali_aktif' ? 'Sudah aktif' : 'Belum disetujui final'}
                          </span>
                        }
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            const cuti = item.pengajuanCuti?.[0];
                            if (cuti) handleAktifKembali(cuti.id, item.nama);
                          }}
                          disabled={processing() === item.pengajuanCuti?.[0]?.id}
                        >
                          {processing() === item.pengajuanCuti?.[0]?.id ? 'Memproses...' : 'Aktifkan Kembali'}
                        </Button>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </Table>
          </Show>
        </Show>
      </div>

      {/* ===================== MODAL INPUT CUTI ===================== */}
      <Modal show={showInputModal()} onClose={() => setShowInputModal(false)} title="Catat Cuti Mahasiswa">
        <form onSubmit={handleSaveInput} class="flex flex-col gap-4">
          <Show when={inputError()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 dark:bg-red-900/30 dark:text-red-400">
              {inputError()}
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700">Cari Mahasiswa Aktif</label>
            <Show
              when={!selectedMhs()}
              fallback={
                <div class="flex justify-between items-center p-3 bg-brand-50 border border-brand-200 rounded-lg">
                  <div>
                    <div class="font-semibold text-brand-900">{selectedMhs()?.nama}</div>
                    <div class="text-xs text-brand-700">
                      NIM: {selectedMhs()?.nim} | Status: {selectedMhs()?.status}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedMhs(null)}>
                    Ganti
                  </Button>
                </div>
              }
            >
              <SearchableSelect
                placeholder="Ketik NIM atau nama mahasiswa..."
                options={mhsList().map((m) => ({ label: `${m.nama} (${m.nim})`, value: m.id }))}
                value={null}
                onChange={(val) => {
                  const mhs = mhsList().find((m) => m.id === val);
                  if (mhs) setSelectedMhs(mhs);
                }}
              />
            </Show>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700">Periode Cuti</label>
              <select
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                value={inputPeriodeId()}
                onChange={(e) => setInputPeriodeId(e.currentTarget.value)}
              >
                <option value="">-- Pilih Periode --</option>
                <For each={periodes()?.data}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700">Semester Mulai Cuti</label>
              <Input
                placeholder="Contoh: 20241"
                value={semesterMulaiCuti()}
                onInput={(e) => {
                  const val = e.currentTarget.value;
                  setSemesterMulaiCuti(val);
                  if (autoBerakhir()) setSemesterBerakhirCuti(hitungSemesterBerakhir(val));
                }}
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700">Semester Berakhir Cuti</label>
              <Input
                placeholder="Otomatis 2 semester"
                value={semesterBerakhirCuti()}
                onInput={(e) => {
                  setSemesterBerakhirCuti(e.currentTarget.value);
                  setAutoBerakhir(false);
                }}
              />
              <span class="text-xs text-secondary-400">Default 2 semester (otomatis). Ubah untuk manual.</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700">Tanggal Surat Izin</label>
              <Input
                type="date"
                value={tanggalSuratIzin()}
                onInput={(e) => setTanggalSuratIzin(e.currentTarget.value)}
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700">Nomor Surat Izin Cuti</label>
            <Input
              placeholder="Contoh: SK/CUTI/2024/001"
              value={noSuratIzin()}
              onInput={(e) => setNoSuratIzin(e.currentTarget.value)}
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700">Alasan Cuti</label>
            <textarea
              rows={2}
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              placeholder="Alasan cuti mahasiswa..."
              value={alasan()}
              onInput={(e) => setAlasan(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowInputModal(false)} type="button">
              Batal
            </Button>
            <Button type="submit" disabled={inputSubmitting()}>
              {inputSubmitting() ? 'Menyimpan...' : 'Simpan Data'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================== MODAL PERSETUJUAN ===================== */}
      <Modal
        show={showApprModal()}
        onClose={() => setShowApprModal(false)}
        title={actionType() === 'approve' ? 'Setujui Pengajuan Cuti' : 'Tolak Pengajuan Cuti'}
      >
        <form onSubmit={handleApprovalAction} class="flex flex-col gap-4">
          <Show when={apprError()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 dark:bg-red-900/30 dark:text-red-400">
              {apprError()}
            </div>
          </Show>

          <div class="text-sm text-secondary-600">
            <div>
              <strong>Mahasiswa:</strong> {selectedRequest()?.mahasiswa?.nama} ({selectedRequest()?.mahasiswa?.nim})
            </div>
            <div>
              <strong>Periode Cuti:</strong> {selectedRequest()?.periodeAkademik?.nama || selectedRequest()?.periodeId}
            </div>
          </div>

          <Show when={actionType() === 'approve' && (role() === 'admin' || role() === 'prodi')}>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700">Nomor Surat Izin Cuti</label>
              <Input
                placeholder="misal: 123/DIR/CUTI/2024"
                value={apprNoSurat()}
                onInput={(e) => setApprNoSurat(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700">Tanggal Surat Izin Cuti</label>
              <Input type="date" value={apprTglSurat()} onInput={(e) => setApprTglSurat(e.currentTarget.value)} />
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700">Catatan/Keterangan</label>
            <textarea
              rows={3}
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              placeholder="Tambahkan catatan jika diperlukan..."
              value={apprCatatan()}
              onInput={(e) => setApprCatatan(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowApprModal(false)} type="button">
              Batal
            </Button>
            <Button
              type="submit"
              variant={actionType() === 'approve' ? 'primary' : 'danger'}
              disabled={apprSubmitting()}
            >
              {apprSubmitting() ? 'Memproses...' : actionType() === 'approve' ? 'Setujui' : 'Tolak'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
