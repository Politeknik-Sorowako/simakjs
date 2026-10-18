import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { dosenController } from '../controllers/dosenController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { prodiController } from '../controllers/prodiController';
import {
  type CreateTugasAkhirPayload,
  type OverrideStatusPayload,
  type ReviewTopikPayload,
  type TugasAkhir,
  type TugasAkhirJenisKarya,
  type TugasAkhirStatus,
  type TugasAkhirTipe,
  tugasAkhirController,
} from '../controllers/tugasAkhirController';
import { usePagination } from '../hooks/usePagination';
import { formatMahasiswaOption } from '../utils/format';

const STATUS_META: Record<
  TugasAkhirStatus,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  diajukan: { label: 'Diajukan', variant: 'info' },
  revisi_proposal_topik: { label: 'Revisi Topik', variant: 'warning' },
  disetujui: { label: 'Topik Disetujui', variant: 'success' },
  bimbingan: { label: 'Masa Bimbingan', variant: 'info' },
  sempro_diajukan: { label: 'Sempro Diajukan', variant: 'info' },
  sempro_dijadwalkan: { label: 'Sempro Dijadwalkan', variant: 'warning' },
  sempro_selesai: { label: 'Sempro Selesai', variant: 'success' },
  sidang_diajukan: { label: 'Sidang Akhir Diajukan', variant: 'info' },
  sidang_dijadwalkan: { label: 'Sidang Dijadwalkan', variant: 'warning' },
  sidang_selesai: { label: 'Sidang Selesai', variant: 'success' },
  revisi: { label: 'Masa Revisi', variant: 'warning' },
  lulus: { label: 'Lulus Yudisium', variant: 'success' },
  tidak_lulus: { label: 'Tidak Lulus', variant: 'danger' },
};

export default function TugasAkhirPage() {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();

  const isStaff = () => hasRole(['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
  const isLppmOrAdmin = () => hasRole(['super_admin', 'admin', 'lppm']);
  const isMahasiswa = () => hasRole(['mahasiswa']);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = createSignal('');
  const [tipeFilter, setTipeFilter] = createSignal('');
  const [totalItems, setTotalItems] = createSignal(0);
  const pagination = usePagination(10);

  // Fetch list tugas akhir
  const [taListResource, { refetch }] = createResource(
    () => ({
      page: pagination.page(),
      limit: pagination.limit(),
      search: pagination.search(),
      status: statusFilter(),
      tipe: tipeFilter(),
    }),
    async (params) => {
      try {
        const res = await tugasAkhirController.getAll(params);
        setTotalItems(res.total);
        return res.data;
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Gagal memuat data tugas akhir', 'error');
        return [];
      }
    },
  );

  // Fetch master data for modal
  const [prodiList] = createResource(async () => {
    try {
      const res = await prodiController.getAll();
      return (res.data || []).map((p: { id: number; nama: string }) => ({ value: p.id, label: p.nama }));
    } catch {
      return [];
    }
  });

  const [dosenList] = createResource(async () => {
    try {
      const res = await dosenController.getAll(undefined, 1, 200);
      return (res.data || []).map((d: { id: number; nama: string; nip: string }) => ({
        value: d.id,
        label: `${d.nama} (${d.nip || '-'})`,
      }));
    } catch {
      return [];
    }
  });

  // Modal State: Pengusulan Topik
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [targetMahasiswaId, setTargetMahasiswaId] = createSignal<number | null>(null);
  const [mhsSearchQuery, setMhsSearchQuery] = createSignal('');
  const [judul, setJudul] = createSignal('');
  const [judulInggris, setJudulInggris] = createSignal('');
  const [tipe, setTipe] = createSignal<TugasAkhirTipe>('individu');
  const [jenisKarya, setJenisKarya] = createSignal<TugasAkhirJenisKarya>('prototipe');
  const [bidangKajian, setBidangKajian] = createSignal('');
  const [programStudiId, setProgramStudiId] = createSignal<number | null>(null);
  const [latarBelakang, setLatarBelakang] = createSignal('');
  const [rumusanMasalah, setRumusanMasalah] = createSignal('');
  const [tujuan, setTujuan] = createSignal('');
  const [metodologi, setMetodologi] = createSignal('');
  const [mitraIndustri, setMitraIndustri] = createSignal('');
  const [usulanPembimbing1, setUsulanPembimbing1] = createSignal<number | null>(null);
  const [usulanPembimbing2, setUsulanPembimbing2] = createSignal<number | null>(null);

  // Active student list for staff creating on behalf of student
  const [activeMahasiswaList] = createResource(
    () => ({ search: mhsSearchQuery(), prodiId: programStudiId() }),
    async ({ search, prodiId }) => {
      try {
        const res = await mahasiswaController.getAll(search || undefined, 1, 50, prodiId || undefined, {
          filterStatus: 'aktif',
        });
        return (res.data || []).map((m) => ({
          value: m.id,
          label: formatMahasiswaOption(m),
        }));
      } catch {
        return [];
      }
    },
  );

  // Rekan tim (kelompok)
  const [anggotaNimInput, setAnggotaNimInput] = createSignal('');
  const [selectedAnggota, setSelectedAnggota] = createSignal<{ id: number; nim: string; nama: string }[]>([]);
  const [isSearchingMhs, setIsSearchingMhs] = createSignal(false);

  // Detail & Action Modals
  const [selectedTa, setSelectedTa] = createSignal<TugasAkhir | null>(null);
  const [showDetailModal, setShowDetailModal] = createSignal(false);

  // Review Modal (Kaprodi / Prodi / Admin / LPPM)
  const [showReviewModal, setShowReviewModal] = createSignal(false);
  const [reviewStatus, setReviewStatus] = createSignal<'disetujui' | 'ditolak' | 'revisi_proposal_topik'>('disetujui');
  const [catatanProdi, setCatatanProdi] = createSignal('');
  const [assignedPembimbing1, setAssignedPembimbing1] = createSignal<number | null>(null);
  const [assignedPembimbing2, setAssignedPembimbing2] = createSignal<number | null>(null);

  // Override Status Modal (LPPM / Admin)
  const [showOverrideModal, setShowOverrideModal] = createSignal(false);
  const [overrideTargetStatus, setOverrideTargetStatus] = createSignal<TugasAkhirStatus>('bimbingan');
  const [overrideAlasan, setOverrideAlasan] = createSignal('');

  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Reset form pengusulan
  const resetCreateForm = () => {
    setTargetMahasiswaId(null);
    setMhsSearchQuery('');
    setJudul('');
    setJudulInggris('');
    setTipe('individu');
    setJenisKarya('prototipe');
    setBidangKajian('');
    setProgramStudiId(null);
    setLatarBelakang('');
    setRumusanMasalah('');
    setTujuan('');
    setMetodologi('');
    setMitraIndustri('');
    setUsulanPembimbing1(null);
    setUsulanPembimbing2(null);
    setSelectedAnggota([]);
    setAnggotaNimInput('');
  };

  // Add anggota kelompok by NIM
  const handleAddAnggota = async () => {
    const nim = anggotaNimInput().trim();
    if (!nim) return;
    try {
      setIsSearchingMhs(true);
      const res = await mahasiswaController.getAll(nim, 1, 1, undefined, { filterStatus: 'aktif' });
      const mhs = res.data?.find((m: { nim: string }) => m.nim === nim);
      if (!mhs) {
        showToast(`Mahasiswa aktif dengan NIM ${nim} tidak ditemukan.`, 'error');
        return;
      }
      if (selectedAnggota().some((a) => a.id === mhs.id)) {
        showToast('Mahasiswa ini sudah ada dalam daftar tim.', 'error');
        return;
      }
      if (!isMahasiswa() && targetMahasiswaId() === mhs.id) {
        showToast('Mahasiswa ini sudah dipilih sebagai ketua tim.', 'error');
        return;
      }
      setSelectedAnggota([...selectedAnggota(), { id: mhs.id, nim: mhs.nim, nama: formatMahasiswaOption(mhs) }]);
      setAnggotaNimInput('');
      showToast(`Mahasiswa ${mhs.nama} ditambahkan ke tim.`, 'success');
    } catch {
      showToast('Gagal mencari mahasiswa.', 'error');
    } finally {
      setIsSearchingMhs(false);
    }
  };

  const handleRemoveAnggota = (id: number) => {
    setSelectedAnggota(selectedAnggota().filter((a) => a.id !== id));
  };

  // Submit pengusulan topik
  const handleCreateSubmit = async (e: Event) => {
    e.preventDefault();
    if (!judul().trim()) {
      showToast('Judul tugas akhir wajib diisi.', 'error');
      return;
    }
    if (!programStudiId()) {
      showToast('Program studi wajib dipilih.', 'error');
      return;
    }
    if (!isMahasiswa() && !targetMahasiswaId()) {
      showToast('Mahasiswa pengusul (Ketua) wajib dipilih.', 'error');
      return;
    }

    const usulan: CreateTugasAkhirPayload['usulanPembimbing'] = [];
    if (usulanPembimbing1()) {
      usulan.push({ peran: 'pembimbing_1', dosenId: usulanPembimbing1()! });
    }
    if (usulanPembimbing2()) {
      usulan.push({ peran: 'pembimbing_2', dosenId: usulanPembimbing2()! });
    }

    const payload: CreateTugasAkhirPayload = {
      judul: judul().trim(),
      judulInggris: judulInggris().trim() || undefined,
      tipe: tipe(),
      jenisKarya: jenisKarya(),
      bidangKajian: bidangKajian().trim() || undefined,
      latarBelakang: latarBelakang().trim() || undefined,
      rumusanMasalah: rumusanMasalah().trim() || undefined,
      tujuan: tujuan().trim() || undefined,
      metodologi: metodologi().trim() || undefined,
      mitraIndustri: mitraIndustri().trim() || undefined,
      programStudiId: programStudiId()!,
      mahasiswaId: !isMahasiswa() ? targetMahasiswaId()! : undefined,
      anggotaMahasiswaIds: tipe() === 'kelompok' ? selectedAnggota().map((a) => a.id) : undefined,
      usulanPembimbing: usulan.length > 0 ? usulan : undefined,
    };

    try {
      setIsSubmitting(true);
      await tugasAkhirController.create(payload);
      showToast('Pengusulan topik tugas akhir berhasil diajukan!', 'success');
      setShowCreateModal(false);
      resetCreateForm();
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mengajukan topik', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open review modal
  const openReviewModal = (ta: TugasAkhir) => {
    setSelectedTa(ta);
    setReviewStatus('disetujui');
    setCatatanProdi(ta.catatanProdi || '');
    const p1 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_1');
    const p2 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_2');
    setAssignedPembimbing1(p1?.dosenId || null);
    setAssignedPembimbing2(p2?.dosenId || null);
    setShowReviewModal(true);
  };

  // Submit review
  const handleReviewSubmit = async (e: Event) => {
    e.preventDefault();
    if (!selectedTa()) return;

    const pembimbingList: ReviewTopikPayload['pembimbing'] = [];
    if (assignedPembimbing1()) {
      pembimbingList.push({ peran: 'pembimbing_1', dosenId: assignedPembimbing1()! });
    }
    if (assignedPembimbing2()) {
      pembimbingList.push({ peran: 'pembimbing_2', dosenId: assignedPembimbing2()! });
    }

    const payload: ReviewTopikPayload = {
      status: reviewStatus(),
      catatanProdi: catatanProdi().trim() || undefined,
      pembimbing: pembimbingList.length > 0 ? pembimbingList : undefined,
    };

    try {
      setIsSubmitting(true);
      await tugasAkhirController.reviewTopik(selectedTa()!.id, payload);
      showToast(`Review topik berhasil disimpan (Status: ${reviewStatus()}).`, 'success');
      setShowReviewModal(false);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses review topik', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open override modal
  const openOverrideModal = (ta: TugasAkhir) => {
    setSelectedTa(ta);
    setOverrideTargetStatus(ta.status);
    setOverrideAlasan('');
    setShowOverrideModal(true);
  };

  // Submit override
  const handleOverrideSubmit = async (e: Event) => {
    e.preventDefault();
    if (!selectedTa()) return;
    if (!overrideAlasan().trim()) {
      showToast('Alasan override status wajib diisi secara transparan.', 'error');
      return;
    }

    const payload: OverrideStatusPayload = {
      keStatus: overrideTargetStatus(),
      alasan: overrideAlasan().trim(),
    };

    try {
      setIsSubmitting(true);
      await tugasAkhirController.overrideStatus(selectedTa()!.id, payload);
      showToast(`Status berhasil di-override menjadi ${overrideTargetStatus()}!`, 'success');
      setShowOverrideModal(false);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal melakukan override status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Respon undangan tim
  const handleResponUndangan = async (taId: number, statusKonfirmasi: 'diterima' | 'ditolak') => {
    try {
      await tugasAkhirController.responUndangan(taId, statusKonfirmasi);
      showToast(`Undangan tim telah ${statusKonfirmasi === 'diterima' ? 'diterima' : 'ditolak'}.`, 'success');
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal merespon undangan', 'error');
    }
  };

  const tableHeaders = ['Kode & Judul', 'Tipe & Karya', 'Pengusul / Anggota', 'Pembimbing', 'Status', 'Aksi'];

  return (
    <MainLayout>
      <div class="space-y-6">
        {/* Header Action & Stats Banner */}
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-pearl dark:bg-canvas-dark border border-hairline dark:border-hairline-dark p-6 rounded-2xl shadow-sm">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-ink dark:text-pearl">Manajemen Tugas Akhir</h1>
            <p class="text-caption text-secondary-500 mt-1">
              Pengusulan topik individu/kelompok, pembimbingan vokasi terpadu, dan penjadwalan sidang.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {isMahasiswa() ? 'Usulkan Topik Baru' : 'Tambah Tugas Akhir'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-pearl dark:bg-canvas-dark p-4 rounded-xl border border-hairline dark:border-hairline-dark">
          <div class="flex flex-1 gap-3 w-full md:w-auto">
            <Input
              type="text"
              placeholder="Cari kode, judul, atau nama mahasiswa..."
              value={pagination.search()}
              onInput={(e) => {
                pagination.setSearch(e.currentTarget.value);
                pagination.resetPage();
              }}
              class="max-w-md w-full"
            />
            <select
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value);
                pagination.resetPage();
              }}
              class="border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
            >
              <option value="">Semua Status</option>
              <option value="diajukan">Diajukan</option>
              <option value="revisi_proposal_topik">Revisi Topik</option>
              <option value="disetujui">Disetujui</option>
              <option value="bimbingan">Bimbingan</option>
              <option value="sempro_dijadwalkan">Sempro Dijadwalkan</option>
              <option value="sidang_dijadwalkan">Sidang Dijadwalkan</option>
              <option value="lulus">Lulus</option>
            </select>
            <select
              value={tipeFilter()}
              onChange={(e) => {
                setTipeFilter(e.currentTarget.value);
                pagination.resetPage();
              }}
              class="border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
            >
              <option value="">Semua Tipe</option>
              <option value="individu">Individu</option>
              <option value="kelompok">Kelompok (Tim)</option>
            </select>
          </div>
        </div>

        {/* Table Listing */}
        <div class="bg-pearl dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark overflow-hidden">
          <Table headers={tableHeaders}>
            <Show
              when={!taListResource.loading}
              fallback={
                <tr>
                  <td colspan="6" class="text-center py-12 text-secondary-500">
                    Memuat data tugas akhir...
                  </td>
                </tr>
              }
            >
              <For
                each={taListResource()}
                fallback={
                  <tr>
                    <td colspan="6" class="text-center py-12 text-secondary-500">
                      Belum ada data tugas akhir yang diajukan.
                    </td>
                  </tr>
                }
              >
                {(item) => {
                  const myMembership = () =>
                    item.anggota?.find(
                      (a) =>
                        a.mahasiswaNama === user()?.nama ||
                        a.mahasiswaNim === (user() as Record<string, unknown> | null)?.nim,
                    );

                  return (
                    <tr class="hover:bg-secondary-50/30 dark:hover:bg-secondary-900/10 transition-colors">
                      <td class="py-4 px-4">
                        <div class="font-mono text-xs text-action font-semibold">{item.kodeTa}</div>
                        <div class="font-semibold text-ink dark:text-pearl mt-0.5 line-clamp-2">{item.judul}</div>
                        <div class="text-fine text-secondary-400 mt-0.5">{item.prodiNama || '-'}</div>
                      </td>
                      <td class="py-4 px-4">
                        <Badge variant={item.tipe === 'kelompok' ? 'warning' : 'default'} size="sm">
                          {item.tipe === 'kelompok' ? 'Kelompok' : 'Individu'}
                        </Badge>
                        <div class="text-fine text-secondary-500 mt-1 capitalize">
                          {item.jenisKarya.replace('_', ' ')}
                        </div>
                      </td>
                      <td class="py-4 px-4">
                        <div class="text-table text-ink dark:text-pearl font-medium">
                          {item.creatorNama || 'Mahasiswa'}
                        </div>
                        <Show when={item.anggota && item.anggota.length > 0}>
                          <div class="text-fine text-secondary-500 mt-0.5">
                            {item.anggota?.length} Anggota (
                            {item.anggota?.filter((a) => a.statusKonfirmasi === 'diterima').length} Dikonfirmasi)
                          </div>
                        </Show>
                      </td>
                      <td class="py-4 px-4">
                        <Show
                          when={item.pembimbing && item.pembimbing.length > 0}
                          fallback={<span class="text-secondary-400 text-fine">Belum ditetapkan</span>}
                        >
                          <For each={item.pembimbing}>
                            {(p) => (
                              <div class="text-fine text-ink dark:text-pearl">
                                <span class="font-semibold">{p.peran === 'pembimbing_1' ? 'P1' : 'P2'}:</span>{' '}
                                {p.dosenNama || p.namaEksternal || '-'}
                              </div>
                            )}
                          </For>
                        </Show>
                      </td>
                      <td class="py-4 px-4">
                        <Badge variant={STATUS_META[item.status]?.variant || 'default'}>
                          {STATUS_META[item.status]?.label || item.status}
                        </Badge>
                        <Show when={myMembership() && myMembership()?.statusKonfirmasi === 'menunggu'}>
                          <div class="mt-2 flex gap-1">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleResponUndangan(item.id, 'diterima')}
                            >
                              Terima
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleResponUndangan(item.id, 'ditolak')}>
                              Tolak
                            </Button>
                          </div>
                        </Show>
                      </td>
                      <td class="py-4 px-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTa(item);
                              setShowDetailModal(true);
                            }}
                          >
                            Detail
                          </Button>
                          <Show when={isStaff()}>
                            <Button variant="secondary" size="sm" onClick={() => openReviewModal(item)}>
                              Review
                            </Button>
                          </Show>
                          <Show when={isLppmOrAdmin()}>
                            <Button
                              variant="warning"
                              size="sm"
                              title="Administrative Override"
                              onClick={() => openOverrideModal(item)}
                            >
                              Override
                            </Button>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </Show>
          </Table>

          {/* Pagination */}
          <div class="p-4 border-t border-hairline dark:border-hairline-dark">
            <Pagination
              currentPage={pagination.page()}
              totalPages={Math.max(1, Math.ceil(totalItems() / pagination.limit()))}
              total={totalItems()}
              limit={pagination.limit()}
              onPageChange={pagination.setPage}
              onLimitChange={pagination.setLimit}
            />
          </div>
        </div>
      </div>

      {/* MODAL PENGUSULAN TOPIK */}
      <Show when={showCreateModal()}>
        <Modal
          title={isMahasiswa() ? 'Pengusulan Topik Tugas Akhir' : 'Tambah Tugas Akhir Mahasiswa'}
          isOpen={showCreateModal()}
          onClose={() => setShowCreateModal(false)}
          maxWidth="lg"
        >
          <form onSubmit={handleCreateSubmit} class="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <Show when={!isMahasiswa()}>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                  Mahasiswa Pengusul (Ketua) *
                </label>
                <SearchableSelect
                  placeholder="Ketik NIM atau nama mahasiswa..."
                  options={activeMahasiswaList() || []}
                  value={targetMahasiswaId() || undefined}
                  onChange={(val) => setTargetMahasiswaId(Number(val))}
                  onSearch={(q) => setMhsSearchQuery(q)}
                />
                <span class="text-fine text-secondary-500 mt-1 block">
                  Hanya mahasiswa berstatus aktif yang ditampilkan sesuai format standar.
                </span>
              </div>
            </Show>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Tipe Kepesertaan *</label>
                <select
                  value={tipe()}
                  onChange={(e) => setTipe(e.currentTarget.value as TugasAkhirTipe)}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                >
                  <option value="individu">Individu (Perorangan)</option>
                  <option value="kelompok">Kelompok (Tim)</option>
                </select>
              </div>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Jenis Karya *</label>
                <select
                  value={jenisKarya()}
                  onChange={(e) => setJenisKarya(e.currentTarget.value as TugasAkhirJenisKarya)}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                >
                  <option value="prototipe">Prototipe Fisik / Perangkat</option>
                  <option value="proyek_rekayasa">Proyek Rekayasa / Sistem</option>
                  <option value="rancang_bangun">Rancang Bangun Mesin</option>
                  <option value="skripsi">Skripsi / Penelitian Terapan</option>
                </select>
              </div>
            </div>

            <Show when={tipe() === 'kelompok'}>
              <div class="p-4 bg-secondary-50/70 dark:bg-secondary-900/30 rounded-xl border border-hairline dark:border-hairline-dark space-y-3">
                <label class="block text-caption font-bold text-ink dark:text-pearl">
                  Anggota Tim Mahasiswa (Kelompok)
                </label>
                <p class="text-fine text-secondary-500">
                  Masukkan NIM rekan mahasiswa Anda. Rekan akan menerima notifikasi konfirmasi undangan tim.
                </p>
                <div class="flex gap-2">
                  <Input
                    placeholder="Masukkan NIM rekan..."
                    value={anggotaNimInput()}
                    onInput={(e) => setAnggotaNimInput(e.currentTarget.value)}
                    class="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddAnggota} disabled={isSearchingMhs()}>
                    Tambah Rekan
                  </Button>
                </div>
                <Show when={selectedAnggota().length > 0}>
                  <div class="space-y-1.5 pt-2">
                    <For each={selectedAnggota()}>
                      {(ang) => (
                        <div class="flex items-center justify-between bg-white dark:bg-canvas-dark px-3 py-2 rounded-lg border border-hairline dark:border-hairline-dark text-table">
                          <div>
                            <span class="font-mono text-xs font-semibold text-action mr-2">{ang.nim}</span>
                            <span class="text-ink dark:text-pearl">{ang.nama}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAnggota(ang.id)}
                            class="text-danger-600 hover:text-danger-800 text-fine font-semibold"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Program Studi *</label>
              <select
                value={programStudiId() || ''}
                onChange={(e) => setProgramStudiId(Number(e.currentTarget.value) || null)}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                required
              >
                <option value="">Pilih Program Studi</option>
                <For each={prodiList()}>{(p) => <option value={p.value}>{p.label}</option>}</For>
              </select>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Judul Tugas Akhir (Bahasa Indonesia) *
              </label>
              <Input
                placeholder="Contoh: Rancang Bangun Sistem Konveyor Pemilah Berbasis PLC"
                value={judul()}
                onInput={(e) => setJudul(e.currentTarget.value)}
                required
              />
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Judul Tugas Akhir (Bahasa Inggris)
              </label>
              <Input
                placeholder="Example: Design and Implementation of Conveyor Sorting System"
                value={judulInggris()}
                onInput={(e) => setJudulInggris(e.currentTarget.value)}
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Bidang Kajian</label>
                <Input
                  placeholder="Contoh: Otomasi Manufaktur"
                  value={bidangKajian()}
                  onInput={(e) => setBidangKajian(e.currentTarget.value)}
                />
              </div>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                  Mitra Industri (Jika Ada)
                </label>
                <Input
                  placeholder="Contoh: PT Vale Indonesia Tbk"
                  value={mitraIndustri()}
                  onInput={(e) => setMitraIndustri(e.currentTarget.value)}
                />
              </div>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Latar Belakang Singkat
              </label>
              <textarea
                rows={3}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                placeholder="Jelaskan urgensi masalah di industri atau laboratorium..."
                value={latarBelakang()}
                onInput={(e) => setLatarBelakang(e.currentTarget.value)}
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Rumusan Masalah</label>
                <textarea
                  rows={2}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  placeholder="Fokus persoalan teknis..."
                  value={rumusanMasalah()}
                  onInput={(e) => setRumusanMasalah(e.currentTarget.value)}
                />
              </div>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Tujuan / Luaran</label>
                <textarea
                  rows={2}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  placeholder="Target spesifikasi atau kinerja..."
                  value={tujuan()}
                  onInput={(e) => setTujuan(e.currentTarget.value)}
                />
              </div>
            </div>

            {/* Usulan Pembimbing */}
            <div class="p-4 bg-pearl dark:bg-canvas-dark rounded-xl border border-hairline dark:border-hairline-dark space-y-3">
              <label class="block text-caption font-bold text-ink dark:text-pearl">
                Usulan Dosen Pembimbing (Opsional)
              </label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span class="block text-fine font-semibold text-secondary-500 mb-1">Usulan Pembimbing 1 (Utama)</span>
                  <select
                    value={usulanPembimbing1() || ''}
                    onChange={(e) => setUsulanPembimbing1(Number(e.currentTarget.value) || null)}
                    class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  >
                    <option value="">Pilih Dosen</option>
                    <For each={dosenList()}>{(d) => <option value={d.value}>{d.label}</option>}</For>
                  </select>
                </div>
                <div>
                  <span class="block text-fine font-semibold text-secondary-500 mb-1">
                    Usulan Pembimbing 2 (Pendamping)
                  </span>
                  <select
                    value={usulanPembimbing2() || ''}
                    onChange={(e) => setUsulanPembimbing2(Number(e.currentTarget.value) || null)}
                    class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  >
                    <option value="">Pilih Dosen</option>
                    <For each={dosenList()}>{(d) => <option value={d.value}>{d.label}</option>}</For>
                  </select>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting()}>
                {isSubmitting() ? 'Mengirimkan...' : 'Kirim Usulan Topik'}
              </Button>
            </div>
          </form>
        </Modal>
      </Show>

      {/* MODAL REVIEW TOPIK (KAPRODI / PRODI) */}
      <Show when={showReviewModal() && selectedTa()}>
        <Modal
          title={`Review Usulan Topik: ${selectedTa()?.kodeTa}`}
          isOpen={showReviewModal()}
          onClose={() => setShowReviewModal(false)}
          maxWidth="lg"
        >
          <form onSubmit={handleReviewSubmit} class="space-y-4">
            <div class="p-3 bg-secondary-50/70 dark:bg-secondary-900/30 rounded-xl border border-hairline dark:border-hairline-dark">
              <div class="text-caption font-semibold text-ink dark:text-pearl">{selectedTa()?.judul}</div>
              <div class="text-fine text-secondary-500 mt-1">
                Tipe: <span class="capitalize">{selectedTa()?.tipe}</span> | Program Studi:{' '}
                {selectedTa()?.prodiNama || '-'}
              </div>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Keputusan Review *</label>
              <select
                value={reviewStatus()}
                onChange={(e) =>
                  setReviewStatus(e.currentTarget.value as 'disetujui' | 'ditolak' | 'revisi_proposal_topik')
                }
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
              >
                <option value="disetujui">Disetujui (Lanjut Pembimbingan)</option>
                <option value="revisi_proposal_topik">Revisi Proposal Topik</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Catatan / Masukan Prodi
              </label>
              <textarea
                rows={3}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                placeholder="Berikan arahan lingkup kerja atau saran perbaikan..."
                value={catatanProdi()}
                onInput={(e) => setCatatanProdi(e.currentTarget.value)}
              />
            </div>

            {/* Penetapan Dosen Pembimbing Definitif */}
            <Show when={reviewStatus() === 'disetujui'}>
              <div class="p-4 bg-pearl dark:bg-canvas-dark rounded-xl border border-hairline dark:border-hairline-dark space-y-3">
                <label class="block text-caption font-bold text-ink dark:text-pearl">
                  Penetapan Resmi Dosen Pembimbing
                </label>
                <p class="text-fine text-secondary-500">
                  Pembimbing yang dipilih di sini akan otomatis disinkronkan ke tabel pembimbing mahasiswa dan terhitung
                  pada BKD Dosen.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span class="block text-fine font-semibold text-secondary-500 mb-1">Pembimbing 1 (Utama)</span>
                    <select
                      value={assignedPembimbing1() || ''}
                      onChange={(e) => setAssignedPembimbing1(Number(e.currentTarget.value) || null)}
                      class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                    >
                      <option value="">Pilih Dosen</option>
                      <For each={dosenList()}>{(d) => <option value={d.value}>{d.label}</option>}</For>
                    </select>
                  </div>
                  <div>
                    <span class="block text-fine font-semibold text-secondary-500 mb-1">Pembimbing 2 (Pendamping)</span>
                    <select
                      value={assignedPembimbing2() || ''}
                      onChange={(e) => setAssignedPembimbing2(Number(e.currentTarget.value) || null)}
                      class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                    >
                      <option value="">Pilih Dosen</option>
                      <For each={dosenList()}>{(d) => <option value={d.value}>{d.label}</option>}</For>
                    </select>
                  </div>
                </div>
              </div>
            </Show>

            <div class="flex justify-end gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowReviewModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting()}>
                {isSubmitting() ? 'Menyimpan...' : 'Simpan Keputusan Review'}
              </Button>
            </div>
          </form>
        </Modal>
      </Show>

      {/* MODAL ADMINISTRATIVE OVERRIDE (LPPM / ADMIN) */}
      <Show when={showOverrideModal() && selectedTa()}>
        <Modal
          title={`Administrative Override Status: ${selectedTa()?.kodeTa}`}
          isOpen={showOverrideModal()}
          onClose={() => setShowOverrideModal(false)}
          maxWidth="md"
        >
          <form onSubmit={handleOverrideSubmit} class="space-y-4">
            <div class="p-3 bg-warning-50/70 border border-warning-200 rounded-xl text-caption text-warning-800">
              <strong>Peringatan Kebijakan:</strong> Fitur override ini diperuntukkan bagi LPPM, Kaprodi, dan Admin
              untuk menyelesaikan hambatan administratif atau revisi mendesak. Seluruh aksi dicatat dalam audit trail
              permanen.
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Target Status Baru *</label>
              <select
                value={overrideTargetStatus()}
                onChange={(e) => setOverrideTargetStatus(e.currentTarget.value as TugasAkhirStatus)}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
              >
                <option value="draft">Draft</option>
                <option value="diajukan">Diajukan</option>
                <option value="revisi_proposal_topik">Revisi Proposal Topik</option>
                <option value="disetujui">Disetujui</option>
                <option value="bimbingan">Masa Bimbingan</option>
                <option value="sempro_diajukan">Sempro Diajukan</option>
                <option value="sempro_dijadwalkan">Sempro Dijadwalkan</option>
                <option value="sempro_selesai">Sempro Selesai</option>
                <option value="sidang_diajukan">Sidang Akhir Diajukan</option>
                <option value="sidang_dijadwalkan">Sidang Dijadwalkan</option>
                <option value="sidang_selesai">Sidang Selesai</option>
                <option value="revisi">Masa Revisi</option>
                <option value="lulus">Lulus</option>
                <option value="tidak_lulus">Tidak Lulus</option>
              </select>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Alasan / Dasar Kebijakan Override *
              </label>
              <textarea
                rows={3}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                placeholder="Tuliskan justifikasi administratif, nomor surat dispensasi, atau persetujuan LPPM..."
                value={overrideAlasan()}
                onInput={(e) => setOverrideAlasan(e.currentTarget.value)}
                required
              />
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowOverrideModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="warning" disabled={isSubmitting()}>
                {isSubmitting() ? 'Menyimpan...' : 'Terapkan Override'}
              </Button>
            </div>
          </form>
        </Modal>
      </Show>

      {/* MODAL DETAIL TUGAS AKHIR */}
      <Show when={showDetailModal() && selectedTa()}>
        <Modal
          title={`Detail Tugas Akhir: ${selectedTa()?.kodeTa}`}
          isOpen={showDetailModal()}
          onClose={() => setShowDetailModal(false)}
          maxWidth="lg"
        >
          <div class="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <div>
              <span class="text-fine font-semibold text-secondary-500 uppercase">Judul Tugas Akhir</span>
              <div class="text-body font-bold text-ink dark:text-pearl mt-0.5">{selectedTa()?.judul}</div>
              <Show when={selectedTa()?.judulInggris}>
                <div class="text-caption italic text-secondary-500 mt-0.5">{selectedTa()?.judulInggris}</div>
              </Show>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-secondary-50/50 dark:bg-secondary-900/20 rounded-xl border border-hairline dark:border-hairline-dark text-caption">
              <div>
                <span class="text-secondary-400 block text-fine">Tipe</span>
                <span class="font-semibold capitalize text-ink dark:text-pearl">{selectedTa()?.tipe}</span>
              </div>
              <div>
                <span class="text-secondary-400 block text-fine">Jenis Karya</span>
                <span class="font-semibold capitalize text-ink dark:text-pearl">
                  {selectedTa()?.jenisKarya.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span class="text-secondary-400 block text-fine">Program Studi</span>
                <span class="font-semibold text-ink dark:text-pearl">{selectedTa()?.prodiNama || '-'}</span>
              </div>
              <div>
                <span class="text-secondary-400 block text-fine">Status</span>
                <Badge variant={STATUS_META[selectedTa()!.status]?.variant || 'default'} size="sm">
                  {STATUS_META[selectedTa()!.status]?.label || selectedTa()!.status}
                </Badge>
              </div>
            </div>

            {/* Tim & Anggota */}
            <div>
              <span class="text-fine font-semibold text-secondary-500 uppercase block mb-2">Tim Mahasiswa</span>
              <div class="space-y-1.5">
                <For each={selectedTa()?.anggota}>
                  {(ang) => (
                    <div class="flex items-center justify-between p-3 rounded-lg border border-hairline dark:border-hairline-dark bg-white dark:bg-canvas-dark text-table">
                      <div>
                        <span class="font-mono text-xs font-semibold text-action mr-2">{ang.mahasiswaNim || '-'}</span>
                        <span class="font-medium text-ink dark:text-pearl">{ang.mahasiswaNama || 'Mahasiswa'}</span>
                        <span class="text-fine text-secondary-500 ml-2 capitalize">({ang.peran})</span>
                      </div>
                      <Badge variant={ang.statusKonfirmasi === 'diterima' ? 'success' : 'warning'} size="sm">
                        {ang.statusKonfirmasi === 'diterima' ? 'Diterima' : 'Menunggu Konfirmasi'}
                      </Badge>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Dosen Pembimbing */}
            <div>
              <span class="text-fine font-semibold text-secondary-500 uppercase block mb-2">Dosen Pembimbing</span>
              <div class="space-y-1.5">
                <For
                  each={selectedTa()?.pembimbing}
                  fallback={<span class="text-secondary-400 text-caption">Belum ada pembimbing terdaftar.</span>}
                >
                  {(p) => (
                    <div class="flex items-center justify-between p-3 rounded-lg border border-hairline dark:border-hairline-dark bg-white dark:bg-canvas-dark text-table">
                      <div>
                        <span class="font-semibold text-action mr-2">
                          {p.peran === 'pembimbing_1' ? 'Pembimbing 1 (Utama)' : 'Pembimbing 2 (Pendamping)'}
                        </span>
                        <span class="text-ink dark:text-pearl">{p.dosenNama || p.namaEksternal || '-'}</span>
                      </div>
                      <span class="text-fine font-mono text-secondary-500">{p.dosenNip || ''}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>

            {/* Catatan Prodi */}
            <Show when={selectedTa()?.catatanProdi}>
              <div class="p-4 bg-info-50 border border-info-200 rounded-xl">
                <span class="text-caption font-bold text-info-800 block mb-1">Catatan Program Studi:</span>
                <p class="text-table text-info-900">{selectedTa()?.catatanProdi}</p>
              </div>
            </Show>

            {/* Riwayat Audit Status Log */}
            <div>
              <span class="text-fine font-semibold text-secondary-500 uppercase block mb-2">
                Riwayat Status & Audit Trail
              </span>
              <div class="space-y-2 border-l-2 border-hairline dark:border-hairline-dark pl-3 ml-2">
                <For each={selectedTa()?.logs}>
                  {(log) => (
                    <div class="text-fine">
                      <div class="font-semibold text-ink dark:text-pearl">
                        Menjadi: <span class="text-action capitalize">{log.keStatus.replace('_', ' ')}</span>
                      </div>
                      <div class="text-secondary-600 dark:text-secondary-400">{log.alasan || '-'}</div>
                      <div class="text-secondary-400 text-xs">{new Date(log.createdAt).toLocaleString('id-ID')}</div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <div class="flex justify-end pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowDetailModal(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </MainLayout>
  );
}
