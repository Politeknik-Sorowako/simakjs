import { createMemo, createResource, createSignal, For, onMount, Show } from 'solid-js';
import KopSurat, { KOPI_FALLBACK } from '../components/cetak/KopSurat';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { type UserRole, useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  KasusTindakLanjut,
  pelanggaranTindakLanjutController,
  TindakLanjutPersetujuan,
  TingkatTindakLanjut,
} from '../controllers/pelanggaranTindakLanjutController';
import { systemController } from '../controllers/systemController';
import { usePagination } from '../hooks/usePagination';
import { fmtTanggal } from '../utils/format';

export default function PelanggaranTindakLanjut() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  const [activeTab, setActiveTab] = createSignal<'perlu_tindakan' | 'semua' | 'selesai'>('perlu_tindakan');
  const [filterTingkat, setFilterTingkat] = createSignal<string>('');
  const { page, limit, setPage, setLimit } = usePagination();

  // Resource kop surat untuk cetak dokumen resmi
  const [kop] = createResource(() => systemController.getKop().catch(() => KOPI_FALLBACK));

  // Modal State
  const [selectedKasus, setSelectedKasus] = createSignal<KasusTindakLanjut | null>(null);
  const [showDetailModal, setShowDetailModal] = createSignal(false);
  const [showFormModal, setShowFormModal] = createSignal(false);
  const [showApprovalModal, setShowApprovalModal] = createSignal(false);
  const [showRejectModal, setShowRejectModal] = createSignal(false);
  const [showPrintModal, setShowPrintModal] = createSignal(false);

  // Form State
  const [formDataState, setFormDataState] = createSignal<Record<string, string>>({});
  const [actionLoading, setActionLoading] = createSignal(false);
  const [approvalType, setApprovalType] = createSignal<'TTE' | 'MANUAL'>('TTE');
  const [approvalCatatan, setApprovalCatatan] = createSignal('');
  const [rejectAlasan, setRejectAlasan] = createSignal('');

  // Fetch Data
  const [kasusData, { refetch }] = createResource(
    () => ({
      tab: activeTab(),
      tingkat: filterTingkat(),
      page: page(),
      limit: limit(),
    }),
    async ({ tab, tingkat, page, limit }) => {
      try {
        const statusFilter = tab === 'selesai' ? 'SELESAI' : undefined;
        return await pelanggaranTindakLanjutController.list({
          status: statusFilter,
          tingkat: tingkat || undefined,
          page,
          limit,
        });
      } catch (e: unknown) {
        toast.showToast(e instanceof Error ? e.message : 'Terjadi kesalahan sistem', 'error');
        return { data: [], total: 0, page: 1, limit: 10 };
      }
    },
  );

  // Filter tab "Perlu Tindakan Saya" di frontend sesuai role pengguna
  const filteredList = createMemo(() => {
    const list = kasusData()?.data || [];
    const currentUser = user();
    if (!currentUser) return list;

    if (activeTab() === 'perlu_tindakan') {
      const userRoles = currentUser.roles || [currentUser.role];
      const isKemahasiswaan =
        userRoles.includes('kemahasiswaan') || userRoles.includes('admin') || userRoles.includes('super_admin');

      return list.filter((k) => {
        // Jika status masih MENUNGGU_FORM, perlu diisi oleh Kemahasiswaan
        if (k.status === 'MENUNGGU_FORM') {
          return isKemahasiswaan;
        }

        // Jika dalam proses persetujuan, cari langkah yang MENUNGGU
        if (k.status === 'DALAM_PROSES_PERSETUJUAN' && k.persetujuanList) {
          const pendingStep = k.persetujuanList.find((p) => p.status === 'MENUNGGU');
          if (!pendingStep) return false;

          // Cek apakah user memiliki target role tersebut
          if (userRoles.includes('admin') || userRoles.includes('super_admin')) return true;
          return userRoles.includes(pendingStep.roleTarget as UserRole);
        }

        return false;
      });
    }

    if (activeTab() === 'selesai') {
      return list.filter((k) => k.status === 'SELESAI');
    }

    return list;
  });

  const getTingkatBadge = (tingkat: TingkatTindakLanjut) => {
    switch (tingkat) {
      case 'LEVEL_1':
        return <Badge variant="info">Level 1: Coaching MHS</Badge>;
      case 'LEVEL_2':
        return <Badge variant="warning">Level 2: Coaching + Ortu</Badge>;
      case 'LEVEL_3':
        return <Badge variant="danger">Level 3: Coaching Pimpinan</Badge>;
      case 'LEVEL_4':
        return <Badge variant="danger">Level 4: Sidang Komdis</Badge>;
      default:
        return <Badge variant="default">{tingkat}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_FORM':
        return <Badge variant="warning">Menunggu Form Pembinaan</Badge>;
      case 'DALAM_PROSES_PERSETUJUAN':
        return <Badge variant="info">Proses Persetujuan</Badge>;
      case 'SELESAI':
        return <Badge variant="success">Selesai / Ditandatangani</Badge>;
      case 'DITOLAK':
        return <Badge variant="danger">Ditolak / Dikembalikan</Badge>;
      case 'DIBATALKAN':
        return <Badge variant="default">Dibatalkan</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const openDetail = (k: KasusTindakLanjut) => {
    setSelectedKasus(k);
    setShowDetailModal(true);
  };

  const openFormModal = (k: KasusTindakLanjut) => {
    setSelectedKasus(k);
    const converted: Record<string, string> = {};
    if (k.formData) {
      for (const [key, val] of Object.entries(k.formData)) {
        converted[key] = val !== null && val !== undefined ? String(val) : '';
      }
    }
    setFormDataState(converted);
    setShowFormModal(true);
  };

  const openApprovalModal = (k: KasusTindakLanjut) => {
    setSelectedKasus(k);
    setApprovalType('TTE');
    setApprovalCatatan('');
    setShowApprovalModal(true);
  };

  const openRejectModal = (k: KasusTindakLanjut) => {
    setSelectedKasus(k);
    setRejectAlasan('');
    setShowRejectModal(true);
  };

  const openPrintModal = (k: KasusTindakLanjut) => {
    setSelectedKasus(k);
    setShowPrintModal(true);
  };

  // Submit Form Pembinaan
  const handleSaveForm = async () => {
    const k = selectedKasus();
    if (!k) return;
    setActionLoading(true);
    try {
      await pelanggaranTindakLanjutController.submitForm(k.id, formDataState());
      toast.showToast('Form pembinaan telah disimpan dan dialirkan ke tahap persetujuan.', 'success');
      setShowFormModal(false);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Persetujuan (TTE atau Manual)
  const handleApprove = async () => {
    const k = selectedKasus();
    if (!k) return;
    setActionLoading(true);
    try {
      await pelanggaranTindakLanjutController.approve(k.id, {
        tipe: approvalType(),
        catatan: approvalCatatan() || undefined,
      });
      toast.showToast(
        approvalType() === 'TTE'
          ? 'Dokumen berhasil ditandatangani secara elektronik (TTE QR Valid).'
          : 'Dokumen disetujui secara manual.',
        'success',
      );
      setShowApprovalModal(false);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Penolakan
  const handleReject = async () => {
    const k = selectedKasus();
    if (!k) return;
    if (!rejectAlasan().trim()) {
      toast.showToast('Mohon tuliskan alasan penolakan/revisi berkas.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await pelanggaranTindakLanjutController.reject(k.id, rejectAlasan().trim());
      toast.showToast('Berkas kasus telah dikembalikan untuk revisi.', 'success');
      setShowRejectModal(false);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Terjadi kesalahan sistem', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isCurrentPendingApprover = (k: KasusTindakLanjut): boolean => {
    if (k.status !== 'DALAM_PROSES_PERSETUJUAN' || !k.persetujuanList) return false;
    const pendingStep = k.persetujuanList.find((p) => p.status === 'MENUNGGU');
    if (!pendingStep) return false;
    const currentUser = user();
    if (!currentUser) return false;
    const userRoles = currentUser.roles || [currentUser.role];
    if (userRoles.includes('admin') || userRoles.includes('super_admin')) return true;
    return userRoles.includes(pendingStep.roleTarget as UserRole);
  };

  return (
    <MainLayout>
      <div class="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-secondary-100">
              Tindak Lanjut & Pembinaan Pelanggaran (BPA)
            </h1>
            <p class="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              Alur pembinaan berjenjang mahasiswa: Coaching, Pemanggilan Orang Tua, hingga Sidang Komisi Disiplin
              beserta verifikasi TTE/manual.
            </p>
          </div>
        </div>

        {/* Filter & Tabs */}
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-secondary-200 dark:border-secondary-800 pb-3">
          {/* Tab Navigation Pill */}
          <div class="inline-flex rounded-full border border-secondary-200 bg-secondary-100/60 p-1 dark:border-secondary-700 dark:bg-secondary-900">
            <button
              type="button"
              onClick={() => setActiveTab('perlu_tindakan')}
              class={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeTab() === 'perlu_tindakan'
                  ? 'bg-white text-action dark:bg-secondary-800 dark:text-brand-400 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400'
              }`}
            >
              Perlu Tindakan Saya
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('semua')}
              class={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeTab() === 'semua'
                  ? 'bg-white text-action dark:bg-secondary-800 dark:text-brand-400 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400'
              }`}
            >
              Semua Kasus
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('selesai')}
              class={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeTab() === 'selesai'
                  ? 'bg-white text-action dark:bg-secondary-800 dark:text-brand-400 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400'
              }`}
            >
              Selesai Ditandatangani
            </button>
          </div>

          {/* Level Filter */}
          <div class="flex items-center gap-2">
            <span class="text-xs text-secondary-500 dark:text-secondary-400">Tingkat:</span>
            <select
              value={filterTingkat()}
              onChange={(e) => setFilterTingkat(e.currentTarget.value)}
              class="rounded-xl border border-secondary-200 bg-white px-3 py-1.5 text-xs text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
            >
              <option value="">Semua Tingkat</option>
              <option value="LEVEL_1">Level 1 (Coaching MHS - Kaprodi)</option>
              <option value="LEVEL_2">Level 2 (Coaching + Ortu - Wadir)</option>
              <option value="LEVEL_3">Level 3 (Coaching Pimpinan - Direktur)</option>
              <option value="LEVEL_4">Level 4 (Sidang Komdis)</option>
            </select>
          </div>
        </div>

        {/* List Card Data */}
        <div class="space-y-4">
          <Show
            when={filteredList().length > 0}
            fallback={
              <Card>
                <div class="py-12 text-center">
                  <svg
                    class="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p class="mt-2 text-sm font-medium text-secondary-600 dark:text-secondary-400">
                    Tidak ada kasus tindak lanjut pada tampilan ini.
                  </p>
                </div>
              </Card>
            }
          >
            <For each={filteredList()}>
              {(kasus) => (
                <Card>
                  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div class="space-y-1.5 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        {getTingkatBadge(kasus.tingkat)}
                        {getStatusBadge(kasus.status)}
                        <span class="text-xs font-mono text-secondary-400">
                          Pemicu: {kasus.pemicuTipe} T{kasus.pemicuTNilai}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <h3 class="text-base font-bold text-secondary-900 dark:text-secondary-100">
                          {kasus.namaMahasiswa}
                        </h3>
                        <span class="text-sm font-mono text-secondary-500">({kasus.nim})</span>
                        <span class="text-xs text-secondary-400">• {kasus.prodiNama || 'Program Studi'}</span>
                      </div>
                      <p class="text-xs text-secondary-500">
                        Periode: {kasus.periodeId} • Dibuat: {fmtTanggal(kasus.createdAt)}
                        <Show when={kasus.namaSubmitter}> • Disubmit oleh: {kasus.namaSubmitter}</Show>
                      </p>

                      {/* Approval Steps Mini Indicator */}
                      <Show when={kasus.persetujuanList && kasus.persetujuanList.length > 0}>
                        <div class="pt-2 flex flex-wrap items-center gap-1.5">
                          <For each={kasus.persetujuanList}>
                            {(step) => (
                              <div
                                class={`px-2 py-0.5 rounded text-fine flex items-center gap-1 ${
                                  step.status === 'DISETUJUI_TTE' || step.status === 'DISETUJUI_MANUAL'
                                    ? 'bg-success-50 text-success-700 border border-success-200 dark:bg-success-950 dark:border-success-800 dark:text-success-300'
                                    : step.status === 'DITOLAK'
                                      ? 'bg-danger-50 text-danger-700 border border-danger-200 dark:bg-danger-950 dark:border-danger-800 dark:text-danger-300'
                                      : 'bg-secondary-100 text-secondary-600 border border-secondary-200 dark:bg-secondary-800 dark:text-secondary-400'
                                }`}
                                title={`Langkah ${step.urutan}: ${step.roleTarget} - ${step.status}`}
                              >
                                <span>
                                  {step.urutan}. {step.roleTarget.toUpperCase()}
                                </span>
                                <Show when={step.status === 'DISETUJUI_TTE'}>
                                  <span class="font-bold text-success-600">✓ TTE</span>
                                </Show>
                                <Show when={step.status === 'DISETUJUI_MANUAL'}>
                                  <span class="font-bold text-success-600">✓ Manual</span>
                                </Show>
                                <Show when={step.status === 'MENUNGGU'}>
                                  <span class="text-secondary-400">⏳</span>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>

                    {/* Actions */}
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                      <Button size="sm" variant="secondary" onClick={() => openDetail(kasus)}>
                        Detail
                      </Button>

                      {/* Tombol isi form bagi Kemahasiswaan / Admin saat menunggu form */}
                      <Show when={kasus.status === 'MENUNGGU_FORM' || kasus.status === 'DITOLAK'}>
                        <Button size="sm" variant="primary" onClick={() => openFormModal(kasus)}>
                          Isi Form Pembinaan
                        </Button>
                      </Show>

                      {/* Tombol aksi approval jika user adalah approver saat ini */}
                      <Show when={isCurrentPendingApprover(kasus)}>
                        <Button size="sm" variant="success" onClick={() => openApprovalModal(kasus)}>
                          Setujui Dokumen
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => openRejectModal(kasus)}>
                          Kembalikan / Tolak
                        </Button>
                      </Show>

                      {/* Tombol Cetak Dokumen Resmi */}
                      <Show when={kasus.status !== 'MENUNGGU_FORM'}>
                        <Button size="sm" variant="secondary" onClick={() => openPrintModal(kasus)}>
                          <span class="flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                              />
                            </svg>
                            Cetak
                          </span>
                        </Button>
                      </Show>
                    </div>
                  </div>
                </Card>
              )}
            </For>
          </Show>
        </div>

        {/* Pagination */}
        <Show when={kasusData() && kasusData()!.total > limit()}>
          <Pagination
            currentPage={page()}
            totalPages={Math.ceil((kasusData()?.total || 0) / limit())}
            total={kasusData()?.total || 0}
            limit={limit()}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </Show>

        {/* Modal Detail & Timeline */}
        <Modal
          isOpen={showDetailModal()}
          onClose={() => setShowDetailModal(false)}
          title={`Detail Kasus: ${selectedKasus()?.namaMahasiswa} (${selectedKasus()?.nim})`}
          maxWidth="lg"
        >
          <Show when={selectedKasus()}>
            {(k) => (
              <div class="space-y-6">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary-50 dark:bg-secondary-800/40 p-4 rounded-xl text-xs">
                  <div>
                    <span class="text-secondary-400 block">Tingkat</span>
                    <span class="font-semibold text-secondary-800 dark:text-secondary-100">{k().tingkat}</span>
                  </div>
                  <div>
                    <span class="text-secondary-400 block">Pemicu</span>
                    <span class="font-semibold text-secondary-800 dark:text-secondary-100">
                      {k().pemicuTipe} T{k().pemicuTNilai}
                    </span>
                  </div>
                  <div>
                    <span class="text-secondary-400 block">Status</span>
                    <span class="font-semibold text-secondary-800 dark:text-secondary-100">{k().status}</span>
                  </div>
                  <div>
                    <span class="text-secondary-400 block">Periode</span>
                    <span class="font-semibold text-secondary-800 dark:text-secondary-100">{k().periodeId}</span>
                  </div>
                </div>

                {/* Form Data Summary */}
                <Show when={k().formData}>
                  <div class="border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 space-y-3">
                    <h4 class="text-sm font-bold text-secondary-800 dark:text-secondary-100">
                      Rincian Form Pembinaan & Berita Acara
                    </h4>
                    <div class="space-y-2 text-xs">
                      <For each={Object.entries(k().formData || {})}>
                        {([key, val]) => (
                          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-1 border-b border-secondary-100 dark:border-secondary-800 pb-1.5">
                            <span class="font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider">
                              {key}:
                            </span>
                            <span class="text-secondary-800 dark:text-secondary-200 sm:text-right max-w-md">
                              {String(val)}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* Timeline Persetujuan Berjenjang */}
                <div class="space-y-3">
                  <h4 class="text-sm font-bold text-secondary-800 dark:text-secondary-100">
                    Alur Persetujuan & Penandatanganan
                  </h4>
                  <div class="space-y-2">
                    <For each={k().persetujuanList || []}>
                      {(p) => (
                        <div class="flex items-start gap-3 p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800/30">
                          <div
                            class={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              p.status === 'DISETUJUI_TTE' || p.status === 'DISETUJUI_MANUAL'
                                ? 'bg-success-100 text-success-700 dark:bg-success-900/60 dark:text-success-300'
                                : p.status === 'DITOLAK'
                                  ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/60 dark:text-danger-300'
                                  : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300'
                            }`}
                          >
                            {p.urutan}
                          </div>
                          <div class="flex-1 text-xs space-y-0.5">
                            <div class="flex items-center justify-between">
                              <span class="font-bold text-secondary-800 dark:text-secondary-100 uppercase">
                                {p.roleTarget}
                              </span>
                              <Badge
                                variant={
                                  p.status === 'DISETUJUI_TTE' || p.status === 'DISETUJUI_MANUAL'
                                    ? 'success'
                                    : p.status === 'DITOLAK'
                                      ? 'danger'
                                      : 'default'
                                }
                              >
                                {p.status}
                              </Badge>
                            </div>
                            <Show when={p.namaPenandatangan}>
                              <p class="text-secondary-600 dark:text-secondary-400">
                                Oleh: {p.namaPenandatangan} ({p.jabatanPenandatangan || p.roleTarget})
                              </p>
                            </Show>
                            <Show when={p.catatan}>
                              <p class="text-secondary-500 italic mt-1">Catatan: "{p.catatan}"</p>
                            </Show>
                            <Show when={p.signatureUuid}>
                              <p class="font-mono text-secondary-400 text-fine mt-1">TTE UUID: {p.signatureUuid}</p>
                            </Show>
                            <Show when={p.respondedAt}>
                              <p class="text-secondary-400 text-fine">Waktu: {fmtTanggal(p.respondedAt!)}</p>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </Modal>

        {/* Modal Form Pembinaan */}
        <Modal
          isOpen={showFormModal()}
          onClose={() => setShowFormModal(false)}
          title={`Form Pembinaan: ${selectedKasus()?.namaMahasiswa} (${selectedKasus()?.tingkat})`}
          maxWidth="lg"
        >
          <div class="space-y-4">
            <p class="text-xs text-secondary-500 dark:text-secondary-400">
              Isikan rincian pembinaan mahasiswa sesuai ketentuan BPA. Setelah form ini disimpan, berkas akan diteruskan
              secara otomatis ke rantai persetujuan berjenjang.
            </p>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                  Tanggal Pelaksanaan Coaching / Sidang
                </label>
                <Input
                  type="date"
                  value={formDataState().tanggalPelaksanaan || ''}
                  onInput={(e) => setFormDataState((prev) => ({ ...prev, tanggalPelaksanaan: e.currentTarget.value }))}
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                  Nama Konselor / Tim Pembina
                </label>
                <Input
                  type="text"
                  placeholder="Nama staf kemahasiswaan / tim pembina"
                  value={formDataState().namaKonselor || ''}
                  onInput={(e) => setFormDataState((prev) => ({ ...prev, namaKonselor: e.currentTarget.value }))}
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                  Permasalahan & Pelanggaran yang Dibahas
                </label>
                <textarea
                  rows={3}
                  class="w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                  placeholder="Tuliskan ringkasan pokok permasalahan..."
                  value={formDataState().ringkasanMasalah || ''}
                  onInput={(e) => setFormDataState((prev) => ({ ...prev, ringkasanMasalah: e.currentTarget.value }))}
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                  Hasil Coaching / Kesepakatan Pembinaan
                </label>
                <textarea
                  rows={3}
                  class="w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                  placeholder="Komitmen perbaikan sikap, rencana tindak lanjut..."
                  value={formDataState().hasilCoaching || ''}
                  onInput={(e) => setFormDataState((prev) => ({ ...prev, hasilCoaching: e.currentTarget.value }))}
                />
              </div>

              <Show when={selectedKasus()?.tingkat === 'LEVEL_2'}>
                <div>
                  <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                    Catatan Pemanggilan Orang Tua
                  </label>
                  <textarea
                    rows={2}
                    class="w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                    placeholder="Waktu kehadiran orang tua, nomor surat pemanggilan, respon wali..."
                    value={formDataState().catatanOrtu || ''}
                    onInput={(e) => setFormDataState((prev) => ({ ...prev, catatanOrtu: e.currentTarget.value }))}
                  />
                </div>
              </Show>

              <Show when={selectedKasus()?.tingkat === 'LEVEL_4'}>
                <div>
                  <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                    Nomor & Rekomendasi Berita Acara Sidang Komisi Disiplin
                  </label>
                  <textarea
                    rows={3}
                    class="w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                    placeholder="Nomor BA Komdis, rekomendasi sanksi, susunan tim sidang..."
                    value={formDataState().rekomendasiKomdis || ''}
                    onInput={(e) => setFormDataState((prev) => ({ ...prev, rekomendasiKomdis: e.currentTarget.value }))}
                  />
                </div>
              </Show>
            </div>

            <div class="flex items-center justify-end gap-2 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <Button variant="secondary" onClick={() => setShowFormModal(false)}>
                Batal
              </Button>
              <Button variant="primary" loading={actionLoading()} onClick={handleSaveForm}>
                Simpan & Alirkan Persetujuan
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Approval (TTE vs Manual) */}
        <Modal
          isOpen={showApprovalModal()}
          onClose={() => setShowApprovalModal(false)}
          title="Persetujuan Berkas Tindak Lanjut"
          maxWidth="md"
        >
          <div class="space-y-4">
            <p class="text-xs text-secondary-500 dark:text-secondary-400">
              Pilih metode persetujuan untuk mahasiswa <span class="font-bold">{selectedKasus()?.namaMahasiswa}</span>:
            </p>

            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/40">
                <input
                  type="radio"
                  name="approvalType"
                  value="TTE"
                  checked={approvalType() === 'TTE'}
                  onChange={() => setApprovalType('TTE')}
                  class="text-action"
                />
                <div class="text-xs">
                  <span class="font-bold text-secondary-800 dark:text-secondary-100 block">
                    Digital Signature (TTE Ber-QR) [Rekomendasi]
                  </span>
                  <span class="text-secondary-500">
                    Menerbitkan QR Code tanda tangan digital tersertifikasi HMAC yang dapat diverifikasi publik.
                  </span>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/40">
                <input
                  type="radio"
                  name="approvalType"
                  value="MANUAL"
                  checked={approvalType() === 'MANUAL'}
                  onChange={() => setApprovalType('MANUAL')}
                  class="text-action"
                />
                <div class="text-xs">
                  <span class="font-bold text-secondary-800 dark:text-secondary-100 block">
                    Persetujuan Manual / Cetak Basah
                  </span>
                  <span class="text-secondary-500">
                    Menyetujui secara administratif dalam sistem untuk kemudian dicetak dan ditandatangani basah.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                Catatan Persetujuan (Opsional)
              </label>
              <Input
                type="text"
                placeholder="Misal: Disetujui dengan catatan perbaikan absensi..."
                value={approvalCatatan()}
                onInput={(e) => setApprovalCatatan(e.currentTarget.value)}
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
                Batal
              </Button>
              <Button variant="success" loading={actionLoading()} onClick={handleApprove}>
                {approvalType() === 'TTE' ? 'Tandatangani Digital (TTE)' : 'Setujui Manual'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Penolakan / Revisi */}
        <Modal
          isOpen={showRejectModal()}
          onClose={() => setShowRejectModal(false)}
          title="Tolak / Kembalikan Berkas"
          maxWidth="md"
        >
          <div class="space-y-4">
            <p class="text-xs text-secondary-500 dark:text-secondary-400">
              Tuliskan alasan mengapa berkas ini ditolak atau dikembalikan ke bagian Kemahasiswaan untuk revisi:
            </p>

            <div>
              <label class="block text-xs font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                Alasan Penolakan / Catatan Perbaikan <span class="text-danger-500">*</span>
              </label>
              <textarea
                rows={4}
                class="w-full rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                placeholder="Rincian bagian yang perlu direvisi..."
                value={rejectAlasan()}
                onInput={(e) => setRejectAlasan(e.currentTarget.value)}
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                Batal
              </Button>
              <Button variant="danger" loading={actionLoading()} onClick={handleReject}>
                Kembalikan Berkas
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Cetak Dokumen Resmi */}
        <Modal
          isOpen={showPrintModal()}
          onClose={() => setShowPrintModal(false)}
          title={`Cetak Dokumen Resmi: ${selectedKasus()?.tingkat}`}
          maxWidth="lg"
        >
          <Show when={selectedKasus()}>
            {(k) => (
              <div class="space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-secondary-200 dark:border-secondary-700">
                  <span class="text-xs text-secondary-500">Pratinjau Lembar Dokumen Resmi</span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      window.print();
                    }}
                  >
                    Cetak Lembar Dokumen
                  </Button>
                </div>

                {/* Print Preview Container */}
                <div class="bg-white text-secondary-900 p-8 rounded-xl border border-secondary-300 shadow-sm print:m-0 print:p-0 print:border-none print:shadow-none space-y-6">
                  {/* Kop Surat Resmi */}
                  <KopSurat kop={kop() || KOPI_FALLBACK} />

                  {/* Judul Dokumen */}
                  <div class="text-center space-y-1">
                    <h3 class="text-lg font-bold uppercase tracking-wider underline">
                      {k().tingkat === 'LEVEL_1'
                        ? 'FORMULIR COACHING & PEMBINAAN MAHASISWA'
                        : k().tingkat === 'LEVEL_2'
                          ? 'BERITA ACARA PEMBINAAN & PEMANGGILAN ORANG TUA'
                          : k().tingkat === 'LEVEL_3'
                            ? 'LEMBAR PEMBINAAN TINGKAT PIMPINAN DIREKTUR'
                            : 'BERITA ACARA SIDANG KOMISI DISIPLIN'}
                    </h3>
                    <p class="text-xs font-mono">
                      Nomor Referensi Kasus: BPA/TL/{k().periodeId}/{k().id.toString().padStart(4, '0')}
                    </p>
                  </div>

                  {/* Biodata Mahasiswa */}
                  <div class="text-xs space-y-1 border border-secondary-300 p-3 rounded">
                    <div class="grid grid-cols-3 gap-1">
                      <span class="font-semibold">Nama Mahasiswa</span>
                      <span class="col-span-2">: {k().namaMahasiswa}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                      <span class="font-semibold">NIM</span>
                      <span class="col-span-2">: {k().nim}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                      <span class="font-semibold">Program Studi</span>
                      <span class="col-span-2">: {k().prodiNama || '-'}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                      <span class="font-semibold">Ambang Pelanggaran</span>
                      <span class="col-span-2">
                        : Peringatan Tertulis (T) {k().pemicuTNilai} ({k().pemicuTipe})
                      </span>
                    </div>
                  </div>

                  {/* Rincian Masalah & Hasil Coaching */}
                  <div class="text-xs space-y-3">
                    <div>
                      <h5 class="font-bold uppercase tracking-wide text-secondary-800">
                        I. Ringkasan Pelanggaran & Pembahasan
                      </h5>
                      <p class="mt-1 p-2 border border-secondary-200 rounded min-h-[50px] bg-secondary-50/50">
                        {String(k().formData?.ringkasanMasalah || '— Belum diisi —')}
                      </p>
                    </div>

                    <div>
                      <h5 class="font-bold uppercase tracking-wide text-secondary-800">
                        II. Hasil Coaching & Komitmen Pembinaan
                      </h5>
                      <p class="mt-1 p-2 border border-secondary-200 rounded min-h-[50px] bg-secondary-50/50">
                        {String(k().formData?.hasilCoaching || '— Belum diisi —')}
                      </p>
                    </div>

                    <Show when={k().tingkat === 'LEVEL_2' && k().formData?.catatanOrtu}>
                      <div>
                        <h5 class="font-bold uppercase tracking-wide text-secondary-800">
                          III. Catatan Pemanggilan Orang Tua / Wali
                        </h5>
                        <p class="mt-1 p-2 border border-secondary-200 rounded min-h-[40px] bg-secondary-50/50">
                          {String(k().formData?.catatanOrtu || '—')}
                        </p>
                      </div>
                    </Show>

                    <Show when={k().tingkat === 'LEVEL_4' && k().formData?.rekomendasiKomdis}>
                      <div>
                        <h5 class="font-bold uppercase tracking-wide text-secondary-800">
                          III. Rekomendasi Sidang Komisi Disiplin
                        </h5>
                        <p class="mt-1 p-2 border border-secondary-200 rounded min-h-[40px] bg-secondary-50/50">
                          {String(k().formData?.rekomendasiKomdis || '—')}
                        </p>
                      </div>
                    </Show>
                  </div>

                  {/* Slot Tanda Tangan & QR TTE */}
                  <div class="pt-6 border-t border-secondary-300">
                    <h5 class="text-xs font-bold uppercase tracking-wide text-center mb-4">
                      LEMBAR PENGESAHAN & PERSETUJUAN BERJENJANG
                    </h5>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
                      <For each={k().persetujuanList || []}>
                        {(p) => (
                          <div class="flex flex-col items-center justify-between border border-secondary-200 p-2 rounded min-h-[140px]">
                            <span class="font-bold uppercase text-fine">{p.roleTarget}</span>
                            <div class="my-2 flex flex-col items-center justify-center">
                              <Show
                                when={p.status === 'DISETUJUI_TTE' && p.signatureUuid}
                                fallback={
                                  <Show
                                    when={p.status === 'DISETUJUI_MANUAL'}
                                    fallback={<span class="text-fine text-secondary-400 italic">Menunggu</span>}
                                  >
                                    <span class="text-fine text-success-700 font-semibold border-b border-secondary-900 pb-0.5">
                                      (Disetujui Manual)
                                    </span>
                                  </Show>
                                }
                              >
                                <div class="p-1 border border-secondary-400 rounded bg-white">
                                  {/* QR Code Placeholder / Info */}
                                  <div class="w-16 h-16 flex flex-col items-center justify-center bg-secondary-50 text-fine text-[8px] text-center font-mono">
                                    <span>TTE VALID</span>
                                    <span class="truncate w-14">{p.signatureUuid?.slice(0, 8)}</span>
                                  </div>
                                </div>
                              </Show>
                            </div>
                            <span class="text-fine font-semibold border-t border-secondary-300 pt-1 w-full truncate">
                              {p.namaPenandatangan || '( .......................... )'}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Show>
        </Modal>
      </div>
    </MainLayout>
  );
}
