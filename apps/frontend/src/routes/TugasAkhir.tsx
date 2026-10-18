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
  type TugasAkhirLogbook,
  type TugasAkhirStatus,
  type TugasAkhirTipe,
  tugasAkhirController,
  type UpdateTugasAkhirPayload,
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
        setTotalItems(Number(res.total) || 0);
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
  const [rawActiveMhsList, setRawActiveMhsList] = createSignal<{ id: number; programStudiId?: number | null }[]>([]);
  const [activeMahasiswaList] = createResource(
    () => ({ search: mhsSearchQuery(), prodiId: programStudiId() }),
    async ({ search, prodiId }) => {
      try {
        const res = await mahasiswaController.getAll(search || undefined, 1, 50, prodiId || undefined, {
          filterStatus: 'aktif',
        });
        const items = res.data || [];
        setRawActiveMhsList(items.map((m) => ({ id: m.id, programStudiId: m.programStudiId })));
        return items.map((m) => ({
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

  // Ruang Bimbingan Modal
  const [showBimbinganModal, setShowBimbinganModal] = createSignal(false);
  const [bimbinganTa, setBimbinganTa] = createSignal<TugasAkhir | null>(null);
  const [logbooks, setLogbooks] = createSignal<TugasAkhirLogbook[]>([]);
  const [isLoadingLogbooks, setIsLoadingLogbooks] = createSignal(false);
  const [showAddLogbookForm, setShowAddLogbookForm] = createSignal(false);
  const [logbookPertemuanKe, setLogbookPertemuanKe] = createSignal<number>(1);
  const [logbookTanggal, setLogbookTanggal] = createSignal<string>(new Date().toISOString().split('T')[0]);
  const [logbookTopik, setLogbookTopik] = createSignal<string>('');
  const [logbookDeskripsi, setLogbookDeskripsi] = createSignal<string>('');
  const [logbookKendala, setLogbookKendala] = createSignal<string>('');
  const [logbookDraftUrl, setLogbookDraftUrl] = createSignal<string>('');
  const [logbookDosenId, setLogbookDosenId] = createSignal<number | null>(null);
  const [isSubmittingLogbook, setIsSubmittingLogbook] = createSignal(false);

  // Review Logbook Modal (Dosen/Staf)
  const [reviewingLogbook, setReviewingLogbook] = createSignal<TugasAkhirLogbook | null>(null);
  const [logbookReviewStatus, setLogbookReviewStatus] = createSignal<'disetujui' | 'perlu_revisi' | 'menunggu'>(
    'disetujui',
  );
  const [logbookCatatanDosen, setLogbookCatatanDosen] = createSignal<string>('');
  const [isSubmittingLogbookReview, setIsSubmittingLogbookReview] = createSignal(false);

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

  // Edit Modal
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [editingTa, setEditingTa] = createSignal<TugasAkhir | null>(null);
  const [editTargetMahasiswaId, setEditTargetMahasiswaId] = createSignal<number | null>(null);
  const [editProgramStudiId, setEditProgramStudiId] = createSignal<number | null>(null);
  const [editMhsSearchQuery, setEditMhsSearchQuery] = createSignal('');
  const [editAnggotaNimInput, setEditAnggotaNimInput] = createSignal('');
  const [editSelectedAnggota, setEditSelectedAnggota] = createSignal<{ id: number; nim: string; nama: string }[]>([]);
  const [editIsSearchingMhs, setEditIsSearchingMhs] = createSignal(false);
  const [editJudul, setEditJudul] = createSignal('');
  const [editJudulInggris, setEditJudulInggris] = createSignal('');
  const [editTipe, setEditTipe] = createSignal<TugasAkhirTipe>('individu');
  const [editJenisKarya, setEditJenisKarya] = createSignal<TugasAkhirJenisKarya>('prototipe');
  const [editBidangKajian, setEditBidangKajian] = createSignal('');
  const [editLatarBelakang, setEditLatarBelakang] = createSignal('');
  const [editRumusanMasalah, setEditRumusanMasalah] = createSignal('');
  const [editTujuan, setEditTujuan] = createSignal('');
  const [editMetodologi, setEditMetodologi] = createSignal('');
  const [editMitraIndustri, setEditMitraIndustri] = createSignal('');
  const [editUsulanPembimbing1, setEditUsulanPembimbing1] = createSignal<number | null>(null);
  const [editUsulanPembimbing2, setEditUsulanPembimbing2] = createSignal<number | null>(null);

  const [editRawActiveMhsList, setEditRawActiveMhsList] = createSignal<
    { id: number; programStudiId?: number | null }[]
  >([]);
  const [editActiveMahasiswaList] = createResource(
    () => ({ search: editMhsSearchQuery(), prodiId: editProgramStudiId() }),
    async ({ search, prodiId }) => {
      try {
        const res = await mahasiswaController.getAll(search || undefined, 1, 50, prodiId || undefined, {
          filterStatus: 'aktif',
        });
        const items = res.data || [];
        setEditRawActiveMhsList(items.map((m) => ({ id: m.id, programStudiId: m.programStudiId })));
        return items.map((m) => ({
          value: m.id,
          label: formatMahasiswaOption(m),
        }));
      } catch {
        return [];
      }
    },
  );

  const handleEditAddAnggota = async () => {
    const nim = editAnggotaNimInput().trim();
    if (!nim) {
      showToast('Masukkan NIM rekan mahasiswa terlebih dahulu.', 'error');
      return;
    }
    try {
      setEditIsSearchingMhs(true);
      const res = await mahasiswaController.getAll(nim, 1, 1, undefined, { filterStatus: 'aktif' });
      const mhs = res.data?.find((m: { nim: string }) => m.nim === nim);
      if (!mhs) {
        showToast(`Mahasiswa aktif dengan NIM ${nim} tidak ditemukan.`, 'error');
        return;
      }
      if (editSelectedAnggota().some((a) => a.id === mhs.id)) {
        showToast('Mahasiswa ini sudah ada dalam daftar tim.', 'error');
        return;
      }
      if (editTargetMahasiswaId() === mhs.id) {
        showToast('Mahasiswa ini sudah dipilih sebagai ketua tim.', 'error');
        return;
      }
      setEditSelectedAnggota([
        ...editSelectedAnggota(),
        { id: mhs.id, nim: mhs.nim, nama: formatMahasiswaOption(mhs) },
      ]);
      setEditAnggotaNimInput('');
      showToast(`Mahasiswa ${mhs.nama} ditambahkan ke tim.`, 'success');
    } catch {
      showToast('Gagal mencari mahasiswa.', 'error');
    } finally {
      setEditIsSearchingMhs(false);
    }
  };

  const handleEditRemoveAnggota = (id: number) => {
    setEditSelectedAnggota(editSelectedAnggota().filter((a) => a.id !== id));
  };

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [deletingTa, setDeletingTa] = createSignal<TugasAkhir | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  const canEdit = (ta: TugasAkhir) => {
    if (isStaff()) return true;
    return user()?.id === ta.createdById && ['draft', 'diajukan', 'revisi_proposal_topik'].includes(ta.status);
  };

  const canDelete = (ta: TugasAkhir) => {
    if (isStaff()) return true;
    return user()?.id === ta.createdById && ['draft', 'diajukan', 'revisi_proposal_topik'].includes(ta.status);
  };

  const openEditModal = (ta: TugasAkhir) => {
    setEditingTa(ta);
    setEditJudul(ta.judul);
    setEditJudulInggris(ta.judulInggris || '');
    setEditTipe(ta.tipe);
    setEditJenisKarya(ta.jenisKarya);
    setEditBidangKajian(ta.bidangKajian || '');
    setEditLatarBelakang(ta.latarBelakang || '');
    setEditRumusanMasalah(ta.rumusanMasalah || '');
    setEditTujuan(ta.tujuan || '');
    setEditMetodologi(ta.metodologi || '');
    setEditMitraIndustri(ta.mitraIndustri || '');
    setEditProgramStudiId(ta.programStudiId || null);

    const ketua = ta.anggota?.find((a) => a.peran === 'ketua');
    setEditTargetMahasiswaId(ketua?.mahasiswaId || null);

    const nonKetua = (ta.anggota || []).filter((a) => a.peran === 'anggota');
    setEditSelectedAnggota(
      nonKetua.map((a) => ({
        id: a.mahasiswaId,
        nim: a.mahasiswaNim || '-',
        nama: a.mahasiswaNama ? `${a.mahasiswaNama}${a.mahasiswaNim ? ` (${a.mahasiswaNim})` : ''}` : '-',
      })),
    );
    setEditAnggotaNimInput('');

    const p1 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_1');
    const p2 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_2');
    setEditUsulanPembimbing1(p1?.dosenId || null);
    setEditUsulanPembimbing2(p2?.dosenId || null);

    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: Event) => {
    e.preventDefault();
    if (!editingTa()) return;
    const judulTrimmed = editJudul().trim();
    if (!judulTrimmed) {
      showToast('Judul tugas akhir wajib diisi.', 'error');
      return;
    }
    if (judulTrimmed.length < 3) {
      showToast('Judul tugas akhir minimal 3 karakter.', 'error');
      return;
    }

    const usulan: UpdateTugasAkhirPayload['usulanPembimbing'] = [];
    if (editUsulanPembimbing1() && Number(editUsulanPembimbing1()) > 0) {
      usulan.push({ peran: 'pembimbing_1', dosenId: Number(editUsulanPembimbing1()) });
    }
    if (editUsulanPembimbing2() && Number(editUsulanPembimbing2()) > 0) {
      usulan.push({ peran: 'pembimbing_2', dosenId: Number(editUsulanPembimbing2()) });
    }

    const payload: UpdateTugasAkhirPayload = {
      judul: judulTrimmed,
      judulInggris: editJudulInggris().trim() || undefined,
      tipe: editTipe(),
      jenisKarya: editJenisKarya(),
      bidangKajian: editBidangKajian().trim() || undefined,
      latarBelakang: editLatarBelakang().trim() || undefined,
      rumusanMasalah: editRumusanMasalah().trim() || undefined,
      tujuan: editTujuan().trim() || undefined,
      metodologi: editMetodologi().trim() || undefined,
      mitraIndustri: editMitraIndustri().trim() || undefined,
      usulanPembimbing: usulan.length > 0 ? usulan : undefined,
    };

    if (isStaff()) {
      if (editTargetMahasiswaId()) {
        payload.mahasiswaId = Number(editTargetMahasiswaId());
      }
      if (editProgramStudiId()) {
        payload.programStudiId = Number(editProgramStudiId());
      }
      payload.anggotaMahasiswaIds = editTipe() === 'kelompok' ? editSelectedAnggota().map((a) => a.id) : [];
    }

    try {
      setIsSubmitting(true);
      await tugasAkhirController.update(editingTa()!.id, payload);
      showToast('Data tugas akhir berhasil diperbarui!', 'success');
      setShowEditModal(false);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui tugas akhir', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (ta: TugasAkhir) => {
    setDeletingTa(ta);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTa()) return;
    try {
      setIsDeleting(true);
      await tugasAkhirController.delete(deletingTa()!.id);
      showToast('Tugas akhir berhasil dihapus.', 'success');
      setShowDeleteModal(false);
      setDeletingTa(null);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus tugas akhir', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

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
    const judulTrimmed = judul().trim();
    if (!judulTrimmed) {
      showToast('Judul tugas akhir wajib diisi.', 'error');
      return;
    }
    if (judulTrimmed.length < 3) {
      showToast('Judul tugas akhir minimal 3 karakter.', 'error');
      return;
    }
    if (!isMahasiswa() && !programStudiId() && !targetMahasiswaId()) {
      showToast('Program studi atau mahasiswa pengusul wajib dipilih.', 'error');
      return;
    }
    if (!isMahasiswa() && !targetMahasiswaId()) {
      showToast('Mahasiswa pengusul (Ketua) wajib dipilih.', 'error');
      return;
    }

    const usulan: CreateTugasAkhirPayload['usulanPembimbing'] = [];
    if (usulanPembimbing1() && Number(usulanPembimbing1()) > 0) {
      usulan.push({ peran: 'pembimbing_1', dosenId: Number(usulanPembimbing1()) });
    }
    if (usulanPembimbing2() && Number(usulanPembimbing2()) > 0) {
      usulan.push({ peran: 'pembimbing_2', dosenId: Number(usulanPembimbing2()) });
    }

    const payload: CreateTugasAkhirPayload = {
      judul: judulTrimmed,
      judulInggris: judulInggris().trim() || undefined,
      tipe: tipe(),
      jenisKarya: jenisKarya(),
      bidangKajian: bidangKajian().trim() || undefined,
      latarBelakang: latarBelakang().trim() || undefined,
      rumusanMasalah: rumusanMasalah().trim() || undefined,
      tujuan: tujuan().trim() || undefined,
      metodologi: metodologi().trim() || undefined,
      mitraIndustri: mitraIndustri().trim() || undefined,
      programStudiId: programStudiId() ? Number(programStudiId()) : undefined,
      mahasiswaId: !isMahasiswa() && targetMahasiswaId() ? Number(targetMahasiswaId()) : undefined,
      anggotaMahasiswaIds:
        tipe() === 'kelompok' && selectedAnggota().length > 0 ? selectedAnggota().map((a) => a.id) : undefined,
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

  // Ruang Bimbingan Handlers
  const openBimbinganModal = async (ta: TugasAkhir) => {
    setBimbinganTa(ta);
    setShowBimbinganModal(true);
    setShowAddLogbookForm(false);
    await loadLogbooks(ta.id);
  };

  const loadLogbooks = async (taId: number) => {
    try {
      setIsLoadingLogbooks(true);
      const data = await tugasAkhirController.getLogbooks(taId);
      setLogbooks(data);
      setLogbookPertemuanKe(data.length + 1);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat logbook bimbingan', 'error');
    } finally {
      setIsLoadingLogbooks(false);
    }
  };

  const handleCreateLogbookSubmit = async (e: Event) => {
    e.preventDefault();
    if (!bimbinganTa()) return;
    if (!logbookTopik().trim()) {
      showToast('Topik bimbingan wajib diisi.', 'error');
      return;
    }
    if (!logbookDeskripsi().trim()) {
      showToast('Deskripsi kemajuan wajib diisi.', 'error');
      return;
    }

    try {
      setIsSubmittingLogbook(true);
      await tugasAkhirController.createLogbook(bimbinganTa()!.id, {
        pertemuanKe: logbookPertemuanKe(),
        tanggalBimbingan: logbookTanggal(),
        topik: logbookTopik().trim(),
        deskripsiKemajuan: logbookDeskripsi().trim(),
        kendala: logbookKendala().trim() || undefined,
        fileDraftUrl: logbookDraftUrl().trim() || undefined,
        dosenId: logbookDosenId() || undefined,
      });

      showToast('Logbook bimbingan berhasil dicatat!', 'success');
      setLogbookTopik('');
      setLogbookDeskripsi('');
      setLogbookKendala('');
      setLogbookDraftUrl('');
      setShowAddLogbookForm(false);
      await loadLogbooks(bimbinganTa()!.id);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mencatat logbook', 'error');
    } finally {
      setIsSubmittingLogbook(false);
    }
  };

  const handleReviewLogbookSubmit = async (e: Event) => {
    e.preventDefault();
    if (!bimbinganTa() || !reviewingLogbook()) return;

    try {
      setIsSubmittingLogbookReview(true);
      await tugasAkhirController.reviewLogbook(bimbinganTa()!.id, reviewingLogbook()!.id, {
        statusBimbingan: logbookReviewStatus(),
        catatanDosen: logbookCatatanDosen().trim() || undefined,
      });

      showToast('Review logbook bimbingan berhasil disimpan!', 'success');
      setReviewingLogbook(null);
      await loadLogbooks(bimbinganTa()!.id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mereview logbook', 'error');
    } finally {
      setIsSubmittingLogbookReview(false);
    }
  };

  const handleAccSidangAction = async (jenisSidang: 'proposal' | 'akhir', statusAcc: boolean) => {
    if (!bimbinganTa()) return;
    try {
      await tugasAkhirController.accSidang(bimbinganTa()!.id, {
        jenisSidang,
        statusAcc,
      });
      showToast(
        `Status ACC ${jenisSidang === 'proposal' ? 'Sidang Proposal' : 'Sidang Akhir'} berhasil diperbarui!`,
        'success',
      );
      // Refresh TA detail
      const updated = await tugasAkhirController.getById(bimbinganTa()!.id);
      setBimbinganTa(updated);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui status ACC sidang', 'error');
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
                          {item.anggota?.find((a) => a.peran === 'ketua')?.mahasiswaNama ||
                            item.creatorNama ||
                            'Mahasiswa'}
                        </div>
                        <Show when={item.anggota?.find((a) => a.peran === 'ketua')?.mahasiswaNim}>
                          <div class="text-caption text-secondary-500 font-mono">
                            {item.anggota?.find((a) => a.peran === 'ketua')?.mahasiswaNim}
                          </div>
                        </Show>
                        <Show when={item.tipe === 'kelompok' || (item.anggota && item.anggota.length > 1)}>
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
                        <div class="flex items-center justify-end gap-1.5 flex-wrap">
                          <Show
                            when={[
                              'disetujui',
                              'bimbingan',
                              'sempro_diajukan',
                              'sempro_dijadwalkan',
                              'sempro_selesai',
                              'sidang_diajukan',
                              'sidang_dijadwalkan',
                              'sidang_selesai',
                              'revisi',
                              'lulus',
                            ].includes(item.status)}
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              class="bg-action-500 hover:bg-action-600 text-white"
                              onClick={() => openBimbinganModal(item)}
                            >
                              Bimbingan
                            </Button>
                          </Show>
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
                          <Show when={canEdit(item)}>
                            <Button variant="secondary" size="sm" onClick={() => openEditModal(item)}>
                              Edit
                            </Button>
                          </Show>
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
                          <Show when={canDelete(item)}>
                            <Button variant="danger" size="sm" onClick={() => openDeleteModal(item)}>
                              Hapus
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
                  onChange={(val) => {
                    const id = Number(val);
                    setTargetMahasiswaId(id || null);
                    if (id) {
                      const found = rawActiveMhsList().find((m) => m.id === id);
                      if (found?.programStudiId) {
                        setProgramStudiId(found.programStudiId);
                      }
                    }
                  }}
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
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Program Studi {isMahasiswa() ? '(Opsional - Otomatis Sesuai Akun Mahasiswa)' : '*'}
              </label>
              <select
                value={programStudiId() || ''}
                onChange={(e) => setProgramStudiId(Number(e.currentTarget.value) || null)}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                required={!isMahasiswa()}
              >
                <option value="">{isMahasiswa() ? 'Gunakan Prodi Akun Saya (Otomatis)' : 'Pilih Program Studi'}</option>
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

      {/* MODAL EDIT TUGAS AKHIR */}
      <Show when={showEditModal() && editingTa()}>
        <Modal
          title={`Edit Tugas Akhir: ${editingTa()?.kodeTa}`}
          isOpen={showEditModal()}
          onClose={() => setShowEditModal(false)}
          maxWidth="xl"
        >
          <form onSubmit={handleEditSubmit} class="space-y-4 max-h-[75vh] overflow-y-auto px-1">
            <Show when={isStaff()}>
              <div class="p-4 bg-pearl dark:bg-canvas-dark rounded-xl border border-hairline dark:border-hairline-dark space-y-3">
                <label class="block text-caption font-bold text-ink dark:text-pearl">
                  Pengusul & Program Studi (Admin / Pengelola)
                </label>
                <div>
                  <label class="block text-fine font-semibold text-secondary-500 mb-1">
                    Mahasiswa Pengusul (Ketua Tim) *
                  </label>
                  <SearchableSelect
                    placeholder="Ketik NIM atau nama mahasiswa..."
                    options={editActiveMahasiswaList() || []}
                    value={editTargetMahasiswaId() || undefined}
                    onChange={(val) => {
                      const id = Number(val);
                      setEditTargetMahasiswaId(id || null);
                      if (id) {
                        const found = editRawActiveMhsList().find((m) => m.id === id);
                        if (found?.programStudiId) {
                          setEditProgramStudiId(found.programStudiId);
                        }
                      }
                    }}
                    onSearch={(q) => setEditMhsSearchQuery(q)}
                  />
                  <span class="text-fine text-secondary-500 mt-1 block">
                    Ganti mahasiswa ketua tim tugas akhir ini bila diperlukan.
                  </span>
                </div>
                <div>
                  <label class="block text-fine font-semibold text-secondary-500 mb-1">Program Studi</label>
                  <select
                    value={editProgramStudiId() || ''}
                    onChange={(e) => setEditProgramStudiId(Number(e.currentTarget.value) || null)}
                    class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  >
                    <option value="">Pilih Program Studi</option>
                    <For each={prodiList()}>{(p) => <option value={p.value}>{p.label}</option>}</For>
                  </select>
                </div>
              </div>
            </Show>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Tipe Kepesertaan *</label>
                <select
                  value={editTipe()}
                  onChange={(e) => setEditTipe(e.currentTarget.value as TugasAkhirTipe)}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                >
                  <option value="individu">Individu (Perorangan)</option>
                  <option value="kelompok">Kelompok (Tim)</option>
                </select>
              </div>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Jenis Karya *</label>
                <select
                  value={editJenisKarya()}
                  onChange={(e) => setEditJenisKarya(e.currentTarget.value as TugasAkhirJenisKarya)}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                >
                  <option value="prototipe">Prototipe Fisik / Perangkat</option>
                  <option value="proyek_rekayasa">Proyek Rekayasa / Sistem</option>
                  <option value="rancang_bangun">Rancang Bangun Mesin</option>
                  <option value="skripsi">Skripsi / Penelitian Terapan</option>
                </select>
              </div>
            </div>

            <Show when={editTipe() === 'kelompok'}>
              <div class="p-4 bg-secondary-50/70 dark:bg-secondary-900/30 rounded-xl border border-hairline dark:border-hairline-dark space-y-3">
                <label class="block text-caption font-bold text-ink dark:text-pearl">
                  Anggota Tim Mahasiswa (Kelompok)
                </label>
                <p class="text-fine text-secondary-500">
                  {isStaff()
                    ? 'Kelola anggota tim mahasiswa untuk tugas akhir kelompok ini.'
                    : 'Masukkan NIM rekan mahasiswa Anda.'}
                </p>
                <div class="flex gap-2">
                  <Input
                    placeholder="Masukkan NIM rekan..."
                    value={editAnggotaNimInput()}
                    onInput={(e) => setEditAnggotaNimInput(e.currentTarget.value)}
                    class="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleEditAddAnggota}
                    disabled={editIsSearchingMhs()}
                  >
                    Tambah Rekan
                  </Button>
                </div>
                <Show when={editSelectedAnggota().length > 0}>
                  <div class="space-y-1.5 pt-2">
                    <For each={editSelectedAnggota()}>
                      {(ang) => (
                        <div class="flex items-center justify-between bg-white dark:bg-canvas-dark px-3 py-2 rounded-lg border border-hairline dark:border-hairline-dark text-table">
                          <div>
                            <span class="font-mono text-xs font-semibold text-action mr-2">{ang.nim}</span>
                            <span class="text-ink dark:text-pearl">{ang.nama}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEditRemoveAnggota(ang.id)}
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
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Judul Tugas Akhir (Bahasa Indonesia) *
              </label>
              <Input
                placeholder="Contoh: Rancang Bangun Sistem Konveyor..."
                value={editJudul()}
                onInput={(e) => setEditJudul(e.currentTarget.value)}
                required
              />
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Judul Tugas Akhir (Bahasa Inggris)
              </label>
              <Input
                placeholder="Example: Design and Implementation..."
                value={editJudulInggris()}
                onInput={(e) => setEditJudulInggris(e.currentTarget.value)}
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Bidang Kajian</label>
                <Input
                  placeholder="Contoh: Otomasi Manufaktur"
                  value={editBidangKajian()}
                  onInput={(e) => setEditBidangKajian(e.currentTarget.value)}
                />
              </div>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                  Mitra Industri (Jika Ada)
                </label>
                <Input
                  placeholder="Contoh: PT Vale Indonesia Tbk"
                  value={editMitraIndustri()}
                  onInput={(e) => setEditMitraIndustri(e.currentTarget.value)}
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
                placeholder="Jelaskan urgensi masalah..."
                value={editLatarBelakang()}
                onInput={(e) => setEditLatarBelakang(e.currentTarget.value)}
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Rumusan Masalah</label>
                <textarea
                  rows={2}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  placeholder="Fokus persoalan teknis..."
                  value={editRumusanMasalah()}
                  onInput={(e) => setEditRumusanMasalah(e.currentTarget.value)}
                />
              </div>
              <div>
                <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">Tujuan / Luaran</label>
                <textarea
                  rows={2}
                  class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  placeholder="Target spesifikasi atau kinerja..."
                  value={editTujuan()}
                  onInput={(e) => setEditTujuan(e.currentTarget.value)}
                />
              </div>
            </div>

            {/* Usulan Pembimbing */}
            <div class="p-4 bg-pearl dark:bg-canvas-dark rounded-xl border border-hairline dark:border-hairline-dark space-y-3">
              <label class="block text-caption font-bold text-ink dark:text-pearl">Dosen Pembimbing</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span class="block text-fine font-semibold text-secondary-500 mb-1">Pembimbing 1 (Utama)</span>
                  <select
                    value={editUsulanPembimbing1() || ''}
                    onChange={(e) => setEditUsulanPembimbing1(Number(e.currentTarget.value) || null)}
                    class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  >
                    <option value="">Pilih Dosen</option>
                    <For each={dosenList()}>{(d) => <option value={d.value}>{d.label}</option>}</For>
                  </select>
                </div>
                <div>
                  <span class="block text-fine font-semibold text-secondary-500 mb-1">Pembimbing 2 (Pendamping)</span>
                  <select
                    value={editUsulanPembimbing2() || ''}
                    onChange={(e) => setEditUsulanPembimbing2(Number(e.currentTarget.value) || null)}
                    class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                  >
                    <option value="">Pilih Dosen</option>
                    <For each={dosenList()}>{(d) => <option value={d.value}>{d.label}</option>}</For>
                  </select>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting()}>
                {isSubmitting() ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </Modal>
      </Show>

      {/* MODAL KONFIRMASI HAPUS */}
      <Show when={showDeleteModal() && deletingTa()}>
        <Modal
          title="Konfirmasi Hapus Tugas Akhir"
          isOpen={showDeleteModal()}
          onClose={() => setShowDeleteModal(false)}
          maxWidth="md"
        >
          <div class="space-y-4">
            <p class="text-table text-ink dark:text-pearl">
              Apakah Anda yakin ingin menghapus tugas akhir: <span class="font-semibold">{deletingTa()?.judul}</span> (
              {deletingTa()?.kodeTa})?
            </p>
            <p class="text-caption text-secondary-500">
              Data yang dihapus meliputi relasi anggota kelompok, pembimbing, dan riwayat status tugas akhir ini.
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="flex justify-end gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowDeleteModal(false)}>
                Batal
              </Button>
              <Button type="button" variant="danger" disabled={isDeleting()} onClick={handleDeleteConfirm}>
                {isDeleting() ? 'Menghapus...' : 'Hapus Tugas Akhir'}
              </Button>
            </div>
          </div>
        </Modal>
      </Show>

      {/* MODAL RUANG BIMBINGAN & LOGBOOK TA */}
      <Show when={showBimbinganModal() && bimbinganTa()}>
        <Modal
          title={`Ruang Bimbingan: ${bimbinganTa()?.kodeTa}`}
          isOpen={showBimbinganModal()}
          onClose={() => setShowBimbinganModal(false)}
          maxWidth="xl"
        >
          <div class="space-y-6 max-h-[80vh] overflow-y-auto px-1">
            {/* Header Ringkasan Tugas Akhir */}
            <div class="p-4 bg-pearl dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark space-y-3">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <span class="text-caption font-bold text-action uppercase tracking-wide">
                    {bimbinganTa()?.kodeTa} • {bimbinganTa()?.tipe === 'kelompok' ? 'Kelompok' : 'Individu'}
                  </span>
                  <h3 class="text-table font-bold text-ink dark:text-pearl mt-0.5 leading-snug">
                    {bimbinganTa()?.judul}
                  </h3>
                </div>
                <Badge variant={STATUS_META[bimbinganTa()!.status]?.variant || 'default'}>
                  {STATUS_META[bimbinganTa()!.status]?.label || bimbinganTa()!.status}
                </Badge>
              </div>

              {/* Progress Minimal Bimbingan (Target 8 Sesi) */}
              <div class="pt-2 border-t border-hairline dark:border-hairline-dark">
                <div class="flex items-center justify-between text-fine mb-1.5">
                  <span class="font-semibold text-ink dark:text-pearl">Progres Sesi Bimbingan Disetujui:</span>
                  <span class="font-bold text-action">
                    {logbooks().filter((l) => l.statusBimbingan === 'disetujui').length} / 8 Pertemuan Disetujui
                  </span>
                </div>
                <div class="w-full bg-secondary-200 dark:bg-secondary-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    class="bg-action h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (logbooks().filter((l) => l.statusBimbingan === 'disetujui').length / 8) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Status ACC Sidang oleh Pembimbing */}
              <div class="pt-2 border-t border-hairline dark:border-hairline-dark">
                <span class="text-fine font-semibold text-secondary-500 uppercase block mb-2">
                  Verifikasi Kelayakan Maju Sidang (ACC Pembimbing)
                </span>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <For each={bimbinganTa()?.pembimbing}>
                    {(p) => {
                      const isMyPembimbing = () =>
                        p.dosenNama === user()?.nama || p.dosenNip === (user() as Record<string, unknown> | null)?.nip;
                      const canGiveAcc = () => isStaff() || isMyPembimbing();

                      return (
                        <div class="p-3 bg-white dark:bg-secondary-900/40 rounded-xl border border-hairline dark:border-hairline-dark space-y-2">
                          <div class="flex items-center justify-between">
                            <span class="font-semibold text-fine text-action">
                              {p.peran === 'pembimbing_1' ? 'Pembimbing 1' : 'Pembimbing 2'}
                            </span>
                            <span class="text-fine text-secondary-500">{p.dosenNama || p.namaEksternal || '-'}</span>
                          </div>

                          <div class="flex items-center justify-between pt-1">
                            <span class="text-caption text-ink dark:text-pearl">ACC Sidang Proposal:</span>
                            <div class="flex items-center gap-1.5">
                              <Badge variant={p.accSidangProposal ? 'success' : 'default'} size="sm">
                                {p.accSidangProposal ? 'Sudah ACC' : 'Belum ACC'}
                              </Badge>
                              <Show when={canGiveAcc()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAccSidangAction('proposal', !p.accSidangProposal)}
                                >
                                  {p.accSidangProposal ? 'Batal ACC' : 'Beri ACC'}
                                </Button>
                              </Show>
                            </div>
                          </div>

                          <div class="flex items-center justify-between pt-1">
                            <span class="text-caption text-ink dark:text-pearl">ACC Sidang Akhir:</span>
                            <div class="flex items-center gap-1.5">
                              <Badge variant={p.accSidangAkhir ? 'success' : 'default'} size="sm">
                                {p.accSidangAkhir ? 'Sudah ACC' : 'Belum ACC'}
                              </Badge>
                              <Show when={canGiveAcc()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAccSidangAction('akhir', !p.accSidangAkhir)}
                                >
                                  {p.accSidangAkhir ? 'Batal ACC' : 'Beri ACC'}
                                </Button>
                              </Show>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>

            {/* Tombol Tambah Logbook */}
            <div class="flex items-center justify-between">
              <h4 class="text-table font-bold text-ink dark:text-pearl">
                Riwayat Logbook Konsultasi ({logbooks().length} Catatan)
              </h4>
              <Button
                variant={showAddLogbookForm() ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setShowAddLogbookForm(!showAddLogbookForm())}
              >
                {showAddLogbookForm() ? 'Tutup Form' : '+ Catat Bimbingan'}
              </Button>
            </div>

            {/* Form Tambah Logbook */}
            <Show when={showAddLogbookForm()}>
              <form
                onSubmit={handleCreateLogbookSubmit}
                class="p-4 bg-secondary-50/70 dark:bg-secondary-900/30 rounded-2xl border border-hairline dark:border-hairline-dark space-y-4"
              >
                <div class="font-semibold text-caption text-ink dark:text-pearl">Catat Sesi Bimbingan Baru</div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label class="block text-fine font-semibold text-secondary-500 mb-1">Pertemuan Ke *</label>
                    <Input
                      type="number"
                      min="1"
                      value={logbookPertemuanKe()}
                      onInput={(e) => setLogbookPertemuanKe(Number(e.currentTarget.value) || 1)}
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-fine font-semibold text-secondary-500 mb-1">Tanggal Bimbingan *</label>
                    <Input
                      type="date"
                      value={logbookTanggal()}
                      onInput={(e) => setLogbookTanggal(e.currentTarget.value)}
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-fine font-semibold text-secondary-500 mb-1">Dosen Pembimbing</label>
                    <select
                      value={logbookDosenId() || ''}
                      onChange={(e) => setLogbookDosenId(Number(e.currentTarget.value) || null)}
                      class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                    >
                      <option value="">Semua / Dosen Default</option>
                      <For each={bimbinganTa()?.pembimbing}>
                        {(p) => (
                          <option value={p.dosenId || ''}>
                            {p.peran === 'pembimbing_1' ? 'P1' : 'P2'}: {p.dosenNama || p.namaEksternal}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-fine font-semibold text-secondary-500 mb-1">
                    Topik / Bahasan Bimbingan *
                  </label>
                  <Input
                    placeholder="Contoh: Konsultasi Bab 2 Tinjauan Pustaka & Desain Skematik..."
                    value={logbookTopik()}
                    onInput={(e) => setLogbookTopik(e.currentTarget.value)}
                    required
                  />
                </div>

                <div>
                  <label class="block text-fine font-semibold text-secondary-500 mb-1">
                    Deskripsi Kemajuan yang Dicapai *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan secara spesifik materi kemajuan naskah atau prototipe..."
                    value={logbookDeskripsi()}
                    onInput={(e) => setLogbookDeskripsi(e.currentTarget.value)}
                    class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                    required
                  />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-fine font-semibold text-secondary-500 mb-1">
                      Kendala / Persoalan Teknis (Opsional)
                    </label>
                    <Input
                      placeholder="Kendala komponen atau literatur..."
                      value={logbookKendala()}
                      onInput={(e) => setLogbookKendala(e.currentTarget.value)}
                    />
                  </div>
                  <div>
                    <label class="block text-fine font-semibold text-secondary-500 mb-1">
                      Tautan Draft / Laporan File (Opsional)
                    </label>
                    <Input
                      placeholder="https://drive.google.com/..."
                      value={logbookDraftUrl()}
                      onInput={(e) => setLogbookDraftUrl(e.currentTarget.value)}
                    />
                  </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddLogbookForm(false)}>
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isSubmittingLogbook()}>
                    {isSubmittingLogbook() ? 'Menyimpan...' : 'Simpan Logbook'}
                  </Button>
                </div>
              </form>
            </Show>

            {/* Timeline Daftar Logbook */}
            <Show
              when={!isLoadingLogbooks()}
              fallback={<div class="text-center py-6 text-secondary-500">Memuat riwayat logbook...</div>}
            >
              <Show
                when={logbooks().length > 0}
                fallback={
                  <div class="text-center py-8 bg-secondary-50/50 dark:bg-secondary-900/20 rounded-2xl border border-dashed border-hairline dark:border-hairline-dark">
                    <p class="text-caption text-secondary-500">Belum ada sesi bimbingan yang dicatat.</p>
                    <p class="text-fine text-secondary-400 mt-1">
                      Mahasiswa dapat mulai mencatat logbook setelah berdiskusi dengan pembimbing.
                    </p>
                  </div>
                }
              >
                <div class="space-y-3">
                  <For each={logbooks()}>
                    {(lb) => (
                      <div class="p-4 bg-white dark:bg-canvas-dark rounded-xl border border-hairline dark:border-hairline-dark shadow-sm space-y-2">
                        <div class="flex items-start justify-between gap-3">
                          <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-action/10 text-action">
                              Pertemuan #{lb.pertemuanKe}
                            </span>
                            <span class="text-fine text-secondary-500">{lb.tanggalBimbingan}</span>
                            <Show when={lb.dosenNama}>
                              <span class="text-fine text-secondary-400">• Dosen: {lb.dosenNama}</span>
                            </Show>
                          </div>
                          <div class="flex items-center gap-2">
                            <Badge
                              variant={
                                lb.statusBimbingan === 'disetujui'
                                  ? 'success'
                                  : lb.statusBimbingan === 'perlu_revisi'
                                    ? 'warning'
                                    : 'default'
                              }
                              size="sm"
                            >
                              {lb.statusBimbingan === 'disetujui'
                                ? 'Disetujui Pembimbing'
                                : lb.statusBimbingan === 'perlu_revisi'
                                  ? 'Perlu Revisi'
                                  : 'Menunggu Review'}
                            </Badge>

                            {/* Tombol Review untuk Dosen / Staf */}
                            <Show when={isStaff() || hasRole(['dosen'])}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setReviewingLogbook(lb);
                                  setLogbookReviewStatus(lb.statusBimbingan);
                                  setLogbookCatatanDosen(lb.catatanDosen || '');
                                }}
                              >
                                Review
                              </Button>
                            </Show>
                          </div>
                        </div>

                        <div>
                          <div class="text-table font-semibold text-ink dark:text-pearl">{lb.topik}</div>
                          <p class="text-caption text-secondary-600 dark:text-secondary-300 mt-1 whitespace-pre-wrap">
                            {lb.deskripsiKemajuan}
                          </p>
                        </div>

                        <Show when={lb.kendala}>
                          <div class="text-fine text-secondary-500 bg-secondary-50 dark:bg-secondary-900/30 p-2.5 rounded-lg">
                            <span class="font-semibold text-danger-600 dark:text-danger-400">Kendala: </span>
                            {lb.kendala}
                          </div>
                        </Show>

                        <Show when={lb.catatanDosen}>
                          <div class="text-fine bg-success-50/70 dark:bg-success-900/20 text-success-800 dark:text-success-200 p-2.5 rounded-lg border border-success-200 dark:border-success-800/40">
                            <span class="font-semibold">Catatan / Arahan Dosen: </span>
                            {lb.catatanDosen}
                          </div>
                        </Show>

                        <Show when={lb.fileDraftUrl}>
                          <div class="pt-1">
                            <a
                              href={lb.fileDraftUrl!}
                              target="_blank"
                              rel="noreferrer"
                              class="text-fine text-action hover:underline inline-flex items-center gap-1"
                            >
                              📎 Lihat Dokumen Draft Naskah
                            </a>
                          </div>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>

            <div class="flex justify-end pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowBimbinganModal(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      </Show>

      {/* MODAL REVIEW LOGBOOK (DOSEN / STAF) */}
      <Show when={reviewingLogbook()}>
        <Modal
          title={`Review Logbook: Pertemuan #${reviewingLogbook()?.pertemuanKe}`}
          isOpen={!!reviewingLogbook()}
          onClose={() => setReviewingLogbook(null)}
          maxWidth="md"
        >
          <form onSubmit={handleReviewLogbookSubmit} class="space-y-4">
            <div>
              <span class="text-fine text-secondary-500 uppercase block mb-1">Topik Bimbingan</span>
              <p class="text-table font-semibold text-ink dark:text-pearl">{reviewingLogbook()?.topik}</p>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Status Verifikasi Bimbingan *
              </label>
              <select
                value={logbookReviewStatus()}
                onChange={(e) =>
                  setLogbookReviewStatus(e.currentTarget.value as 'disetujui' | 'perlu_revisi' | 'menunggu')
                }
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
              >
                <option value="disetujui">Disetujui (Memenuhi Syarat & Masuk BKD)</option>
                <option value="perlu_revisi">Perlu Revisi (Perbaiki Materi)</option>
                <option value="menunggu">Menunggu / Ditunda</option>
              </select>
            </div>

            <div>
              <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                Catatan / Arahan Perbaikan
              </label>
              <textarea
                rows={3}
                placeholder="Berikan arahan untuk bimbingan berikutnya..."
                value={logbookCatatanDosen()}
                onInput={(e) => setLogbookCatatanDosen(e.currentTarget.value)}
                class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
              />
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setReviewingLogbook(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingLogbookReview()}>
                {isSubmittingLogbookReview() ? 'Menyimpan...' : 'Simpan Review'}
              </Button>
            </div>
          </form>
        </Modal>
      </Show>
    </MainLayout>
  );
}
