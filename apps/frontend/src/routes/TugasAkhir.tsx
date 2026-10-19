import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DropdownMenu, type DropdownMenuItem } from '../components/ui/DropdownMenu';
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
  type FinalisasiSidangPayload,
  type InputNilaiSidangPayload,
  type JadwalSidangPayload,
  type OverrideStatusPayload,
  type ReviewTopikPayload,
  type RubrikKriteriaItem,
  type TugasAkhir,
  type TugasAkhirJenisKarya,
  type TugasAkhirLogbook,
  type TugasAkhirSidang,
  type TugasAkhirStatus,
  type TugasAkhirTipe,
  tugasAkhirController,
  type UpdateTugasAkhirPayload,
} from '../controllers/tugasAkhirController';
import { usePagination } from '../hooks/usePagination';
import { type ExportColumn, exportToCSV, exportToExcel } from '../utils/export';
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

  // Sidang Proposal Modal (Pendaftaran, Jadwal, Penilaian, Finalisasi)
  const [showSidangModal, setShowSidangModal] = createSignal(false);
  const [sidangTa, setSidangTa] = createSignal<TugasAkhir | null>(null);
  const [sidangList, setSidangList] = createSignal<TugasAkhirSidang[]>([]);
  const [isLoadingSidang, setIsLoadingSidang] = createSignal(false);
  const [sidangActiveTab, setSidangActiveTab] = createSignal<'daftar' | 'jadwal' | 'nilai' | 'hasil'>('daftar');

  // Form Pendaftaran Sidang
  const [daftarJenisSidang, setDaftarJenisSidang] = createSignal<'proposal' | 'akhir'>('proposal');
  const [daftarBerkasProposalUrl, setDaftarBerkasProposalUrl] = createSignal('');
  const [daftarBuktiKompensasiUrl, setDaftarBuktiKompensasiUrl] = createSignal('');
  const [daftarBuktiPlagiasiUrl, setDaftarBuktiPlagiasiUrl] = createSignal('');
  const [daftarCatatanMhs, setDaftarCatatanMhs] = createSignal('');
  const [isSubmittingDaftarSidang, setIsSubmittingDaftarSidang] = createSignal(false);

  // Form & Workflow Revisi Pasca Sidang
  const [revisiNaskahUrl, setRevisiNaskahUrl] = createSignal('');
  const [revisiCatatanMhs, setRevisiCatatanMhs] = createSignal('');
  const [isSubmittingRevisi, setIsSubmittingRevisi] = createSignal(false);
  const [isAccingRevisi, setIsAccingRevisi] = createSignal(false);
  const [isExportingNilai, setIsExportingNilai] = createSignal(false);

  // Form Penjadwalan Sidang (Prodi/Staf)
  const [selectedSidangForJadwal, setSelectedSidangForJadwal] = createSignal<TugasAkhirSidang | null>(null);
  const [jadwalTanggal, setJadwalTanggal] = createSignal(new Date().toISOString().split('T')[0]);
  const [jadwalJamMulai, setJadwalJamMulai] = createSignal('09:00');
  const [jadwalJamSelesai, setJadwalJamSelesai] = createSignal('11:00');
  const [jadwalRuangan, setJadwalRuangan] = createSignal('');
  const [jadwalPenguji1, setJadwalPenguji1] = createSignal<number | null>(null);
  const [jadwalPenguji2, setJadwalPenguji2] = createSignal<number | null>(null);
  const [jadwalKetuaPenguji, setJadwalKetuaPenguji] = createSignal<number | null>(null);
  const [jadwalSekretaris, setJadwalSekretaris] = createSignal<number | null>(null);
  const [isSubmittingJadwal, setIsSubmittingJadwal] = createSignal(false);

  // Form Penilaian Sidang (Penguji)
  const [selectedSidangForNilai, setSelectedSidangForNilai] = createSignal<TugasAkhirSidang | null>(null);
  const [rubrikKriteria, setRubrikKriteria] = createSignal<RubrikKriteriaItem[]>([]);
  const [nilaiMap, setNilaiMap] = createSignal<Record<string, number>>({}); // key: `${kriteriaId}_${mhsId}`
  const [nilaiCatatanRevisi, setNilaiCatatanRevisi] = createSignal('');
  const [isSubmittingNilai, setIsSubmittingNilai] = createSignal(false);

  // Helper Konversi Nilai BPA Resmi Skala 0 - 10
  const konversiBpaFrontend = (nilai: number) => {
    if (nilai >= 8.5) return { huruf: 'A', indeks: '4.00', predikat: 'Sangat Istimewa (Lulus)' };
    if (nilai >= 8.0) return { huruf: 'A-', indeks: '3.70', predikat: 'Istimewa (Lulus)' };
    if (nilai >= 7.5) return { huruf: 'B+', indeks: '3.30', predikat: 'Sangat Baik (Lulus)' };
    if (nilai >= 7.0) return { huruf: 'B', indeks: '3.00', predikat: 'Baik (Lulus)' };
    if (nilai >= 6.3) return { huruf: 'B-', indeks: '2.70', predikat: 'Cukup Baik (Lulus)' };
    if (nilai >= 5.7) return { huruf: 'C+', indeks: '2.30', predikat: 'Lebih dari Cukup' };
    if (nilai >= 5.1) return { huruf: 'C', indeks: '2.00', predikat: 'Cukup' };
    if (nilai >= 4.6) return { huruf: 'D+', indeks: '1.50', predikat: 'Kurang (Sidang Ulang)' };
    if (nilai >= 4.0) return { huruf: 'D', indeks: '1.00', predikat: 'Sangat Kurang (Sidang Ulang)' };
    return { huruf: 'E', indeks: '0.00', predikat: 'Gagal / Tidak Lulus' };
  };

  // Form Finalisasi Sidang (Prodi/Kaprodi)
  const [finalisasiStatusHasil, setFinalisasiStatusHasil] = createSignal<
    'lulus_tanpa_revisi' | 'lulus_dengan_revisi' | 'sidang_ulang' | 'tidak_lulus'
  >('lulus_dengan_revisi');
  const [finalisasiBatasRevisi, setFinalisasiBatasRevisi] = createSignal('');
  const [finalisasiCatatan, setFinalisasiCatatan] = createSignal('');
  const [isSubmittingFinalisasi, setIsSubmittingFinalisasi] = createSignal(false);

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

  // =================== SIDANG PROPOSAL HANDLERS ===================
  const openSidangModal = async (ta: TugasAkhir) => {
    setSidangTa(ta);
    setShowSidangModal(true);
    await loadSidangData(ta.id);
  };

  const loadSidangData = async (taId: number) => {
    try {
      setIsLoadingSidang(true);
      const list = await tugasAkhirController.getSidangList(taId);
      setSidangList(list);

      // Auto-pilih sidang proposal aktif jika ada
      const propSidang = list.find((s) => s.jenisSidang === 'proposal') || list[0] || null;
      if (propSidang) {
        setSelectedSidangForJadwal(propSidang);
        setSelectedSidangForNilai(propSidang);
        if (propSidang.tanggalSidang) setJadwalTanggal(propSidang.tanggalSidang);
        if (propSidang.jamMulai) setJadwalJamMulai(propSidang.jamMulai);
        if (propSidang.jamSelesai) setJadwalJamSelesai(propSidang.jamSelesai);
        if (propSidang.ruangan) setJadwalRuangan(propSidang.ruangan);
        if (propSidang.statusHasil && propSidang.statusHasil !== 'belum_ditentukan') {
          setFinalisasiStatusHasil(propSidang.statusHasil);
        }
        if (propSidang.batasWaktuRevisi) setFinalisasiBatasRevisi(propSidang.batasWaktuRevisi);
        if (propSidang.catatanSidang) setFinalisasiCatatan(propSidang.catatanSidang);

        // Pre-fill penguji jika sudah ada
        if (propSidang.penguji && propSidang.penguji.length > 0) {
          const p1 = propSidang.penguji.find((p) => p.peranPenguji === 'penguji_1');
          const p2 = propSidang.penguji.find((p) => p.peranPenguji === 'penguji_2');
          const ketua = propSidang.penguji.find((p) => p.peranPenguji === 'ketua_penguji');
          const sek = propSidang.penguji.find((p) => p.peranPenguji === 'sekretaris');
          if (p1) setJadwalPenguji1(p1.dosenId);
          if (p2) setJadwalPenguji2(p2.dosenId);
          if (ketua) setJadwalKetuaPenguji(ketua.dosenId);
          if (sek) setJadwalSekretaris(sek.dosenId);
        }

        // Tentukan tab default berdasarkan status sidang
        if (propSidang.statusSidang === 'mendaftar') {
          setSidangActiveTab(isStaff() ? 'jadwal' : 'daftar');
        } else if (propSidang.statusSidang === 'dijadwalkan' || propSidang.statusSidang === 'berlangsung') {
          setSidangActiveTab(hasRole(['dosen']) ? 'nilai' : 'jadwal');
        } else if (propSidang.statusSidang === 'selesai') {
          setSidangActiveTab('hasil');
        }
      } else {
        setSidangActiveTab('daftar');
      }

      // Load rubrik kriteria untuk jenis sidang aktif (proposal / akhir)
      const jenisSidangAktif = propSidang?.jenisSidang || 'proposal';
      const rubrik = await tugasAkhirController.getRubrikKriteria(taId, jenisSidangAktif);
      setRubrikKriteria(rubrik);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat data sidang', 'error');
    } finally {
      setIsLoadingSidang(false);
    }
  };

  const handleDaftarSidangSubmit = async (e: Event) => {
    e.preventDefault();
    if (!sidangTa()) return;
    try {
      setIsSubmittingDaftarSidang(true);
      await tugasAkhirController.daftarSidang(sidangTa()!.id, {
        jenisSidang: daftarJenisSidang(),
        berkasProposalUrl: daftarBerkasProposalUrl().trim() || null,
        buktiBebasKompensasiUrl: daftarBuktiKompensasiUrl().trim() || null,
        buktiPlagiasiUrl: daftarBuktiPlagiasiUrl().trim() || null,
        catatanMahasiswa: daftarCatatanMhs().trim() || null,
      });
      showToast(
        `Pendaftaran ${daftarJenisSidang() === 'proposal' ? 'sidang proposal' : 'sidang akhir'} berhasil diajukan!`,
        'success',
      );
      setDaftarBerkasProposalUrl('');
      setDaftarBuktiKompensasiUrl('');
      setDaftarBuktiPlagiasiUrl('');
      setDaftarCatatanMhs('');
      await loadSidangData(sidangTa()!.id);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mendaftar sidang', 'error');
    } finally {
      setIsSubmittingDaftarSidang(false);
    }
  };

  const handleExportNilaiExcel = async (sidangId: number) => {
    const ta = sidangTa();
    if (!ta) return;
    setIsExportingNilai(true);
    try {
      const rekap = await tugasAkhirController.getRekapNilaiSidang(ta.id, sidangId);
      const columns: ExportColumn[] = [
        { header: 'No', accessor: 'no' },
        { header: 'NIM', accessor: 'nim' },
        { header: 'Nama Mahasiswa', accessor: 'nama' },
        { header: 'Peran Tim', accessor: 'peran' },
        { header: 'Judul Tugas Akhir', accessor: 'judulTa' },
        { header: 'Program Studi', accessor: 'programStudi' },
        { header: 'Jenis Sidang', accessor: 'jenisSidang' },
        { header: 'Tanggal Sidang', accessor: 'tanggalSidang' },
        { header: 'Ruangan', accessor: 'ruangan' },
        { header: 'Nilai Akhir (0-10)', accessor: 'nilaiAkhir' },
        { header: 'Nilai Skala 100', accessor: 'nilaiAkhirSkala100' },
        { header: 'Huruf Mutu BPA', accessor: 'hurufMutu' },
        { header: 'Indeks Mutu', accessor: 'indeksMutu' },
        { header: 'Keputusan Sidang', accessor: 'statusHasil' },
        { header: 'Status Revisi', accessor: 'statusRevisi' },
        { header: 'Catatan Sidang', accessor: 'catatanSidang' },
      ];
      exportToExcel(
        rekap.exportRows,
        columns,
        `Rekap_Nilai_Sidang_${rekap.tugasAkhir.kodeTa || rekap.tugasAkhir.id}_${rekap.sidang.jenisSidang}`,
      );
      showToast('Rekap nilai sidang berhasil diekspor ke Excel.', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gagal mengekspor nilai sidang ke Excel', 'error');
    } finally {
      setIsExportingNilai(false);
    }
  };

  const handleExportNilaiCsv = async (sidangId: number) => {
    const ta = sidangTa();
    if (!ta) return;
    setIsExportingNilai(true);
    try {
      const rekap = await tugasAkhirController.getRekapNilaiSidang(ta.id, sidangId);
      // Kolom disesuaikan dengan template impor /input-nilai: nim, nama, nilai, nilai_skala_100, huruf_mutu
      const columns: ExportColumn[] = [
        { header: 'nim', accessor: 'nim' },
        { header: 'nama', accessor: 'nama' },
        { header: 'nilai', accessor: 'nilaiAkhir' },
        { header: 'nilai_skala_100', accessor: 'nilaiAkhirSkala100' },
        { header: 'huruf_mutu', accessor: 'hurufMutu' },
        { header: 'keterangan', accessor: 'statusHasil' },
      ];
      exportToCSV(rekap.exportRows, columns, `Nilai_TA_${rekap.tugasAkhir.kodeTa || rekap.tugasAkhir.id}_input_nilai`);
      showToast('Data nilai sidang berhasil diekspor format CSV (/input-nilai).', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Gagal mengekspor CSV untuk /input-nilai', 'error');
    } finally {
      setIsExportingNilai(false);
    }
  };

  const handleSubmitRevisi = async (e: Event) => {
    e.preventDefault();
    const ta = sidangTa();
    const sidang = selectedSidangForJadwal();
    if (!ta || !sidang) return;

    if (!revisiNaskahUrl().trim()) {
      showToast('Tautan berkas naskah revisi wajib diisi.', 'error');
      return;
    }

    setIsSubmittingRevisi(true);
    try {
      const res = await tugasAkhirController.submitRevisiSidang(ta.id, sidang.id, {
        fileRevisiUrl: revisiNaskahUrl().trim(),
        catatanMahasiswa: revisiCatatanMhs().trim() || null,
      });
      showToast(res.message, 'success');
      setRevisiNaskahUrl('');
      setRevisiCatatanMhs('');
      await loadSidangData(ta.id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim naskah revisi', 'error');
    } finally {
      setIsSubmittingRevisi(false);
    }
  };

  const handleAccRevisiPenguji = async (pengujiId: number) => {
    const ta = sidangTa();
    const sidang = selectedSidangForJadwal();
    if (!ta || !sidang) return;

    setIsAccingRevisi(true);
    try {
      const res = await tugasAkhirController.accRevisiPenguji(ta.id, sidang.id, pengujiId);
      showToast(res.message, 'success');
      await loadSidangData(ta.id);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menyetujui revisi', 'error');
    } finally {
      setIsAccingRevisi(false);
    }
  };

  const handleJadwalkanSidangSubmit = async (e: Event) => {
    e.preventDefault();
    if (!sidangTa() || !selectedSidangForJadwal()) {
      showToast('Pilih sesi sidang yang akan dijadwalkan', 'error');
      return;
    }
    if (!jadwalTanggal() || !jadwalRuangan().trim()) {
      showToast('Tanggal dan ruangan sidang wajib diisi', 'error');
      return;
    }

    const timPenguji: {
      dosenId: number;
      peranPenguji: 'ketua_penguji' | 'sekretaris' | 'penguji_1' | 'penguji_2' | 'pembimbing_1' | 'pembimbing_2';
    }[] = [];

    if (jadwalPenguji1()) timPenguji.push({ dosenId: jadwalPenguji1()!, peranPenguji: 'penguji_1' });
    if (jadwalPenguji2()) timPenguji.push({ dosenId: jadwalPenguji2()!, peranPenguji: 'penguji_2' });
    if (jadwalKetuaPenguji()) timPenguji.push({ dosenId: jadwalKetuaPenguji()!, peranPenguji: 'ketua_penguji' });
    if (jadwalSekretaris()) timPenguji.push({ dosenId: jadwalSekretaris()!, peranPenguji: 'sekretaris' });

    // Tambahkan otomatis dosen pembimbing jika belum ada di list penguji
    const p1 = sidangTa()?.pembimbing?.find((p) => p.peran === 'pembimbing_1')?.dosenId;
    const p2 = sidangTa()?.pembimbing?.find((p) => p.peran === 'pembimbing_2')?.dosenId;
    if (p1 && !timPenguji.some((tp) => tp.dosenId === p1)) {
      timPenguji.push({ dosenId: p1, peranPenguji: 'pembimbing_1' });
    }
    if (p2 && !timPenguji.some((tp) => tp.dosenId === p2)) {
      timPenguji.push({ dosenId: p2, peranPenguji: 'pembimbing_2' });
    }

    if (timPenguji.length === 0) {
      showToast('Minimal tentukan 1 dosen penguji untuk jadwal sidang', 'error');
      return;
    }

    try {
      setIsSubmittingJadwal(true);
      await tugasAkhirController.jadwalkanSidang(sidangTa()!.id, selectedSidangForJadwal()!.id, {
        tanggalSidang: jadwalTanggal(),
        jamMulai: jadwalJamMulai(),
        jamSelesai: jadwalJamSelesai(),
        ruangan: jadwalRuangan().trim(),
        timPenguji,
      });
      showToast('Jadwal sidang dan dewan penguji berhasil ditetapkan!', 'success');
      await loadSidangData(sidangTa()!.id);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menjadwalkan sidang', 'error');
    } finally {
      setIsSubmittingJadwal(false);
    }
  };

  const handleInputNilaiSubmit = async (e: Event) => {
    e.preventDefault();
    if (!sidangTa() || !selectedSidangForNilai()) return;

    // Kumpulkan nilai berdasarkan rubrik & anggota
    const ta = sidangTa()!;
    const mhsIds: number[] = [];
    if (ta.anggota && ta.anggota.length > 0) {
      ta.anggota.forEach((a) => mhsIds.push(a.mahasiswaId));
    }

    const nilaiList: { kriteriaId: number; mahasiswaId: number; nilai: number }[] = [];
    for (const crit of rubrikKriteria()) {
      for (const mhsId of mhsIds) {
        const val = nilaiMap()[`${crit.id}_${mhsId}`];
        if (val !== undefined && val !== null) {
          nilaiList.push({
            kriteriaId: crit.id,
            mahasiswaId: mhsId,
            nilai: Number(val),
          });
        }
      }
    }

    if (nilaiList.length === 0) {
      showToast('Masukkan minimal satu nilai kriteria penilaian', 'error');
      return;
    }

    try {
      setIsSubmittingNilai(true);
      await tugasAkhirController.inputNilaiSidang(ta.id, selectedSidangForNilai()!.id, {
        nilaiList,
        catatanRevisi: nilaiCatatanRevisi().trim() || null,
      });
      showToast('Penilaian sidang berhasil disimpan!', 'success');
      await loadSidangData(ta.id);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan nilai sidang', 'error');
    } finally {
      setIsSubmittingNilai(false);
    }
  };

  const handleFinalisasiSidangSubmit = async (e: Event) => {
    e.preventDefault();
    if (!sidangTa() || !selectedSidangForJadwal()) return;
    try {
      setIsSubmittingFinalisasi(true);
      await tugasAkhirController.finalisasiSidang(sidangTa()!.id, selectedSidangForJadwal()!.id, {
        statusHasil: finalisasiStatusHasil(),
        batasWaktuRevisi: finalisasiBatasRevisi() || null,
        catatanSidang: finalisasiCatatan().trim() || null,
      });
      showToast('Hasil sidang proposal berhasil difinalisasi!', 'success');
      await loadSidangData(sidangTa()!.id);
      refetch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal finalisasi hasil sidang', 'error');
    } finally {
      setIsSubmittingFinalisasi(false);
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
                        {(() => {
                          const actionItems = (): DropdownMenuItem[] => {
                            const items: DropdownMenuItem[] = [];

                            // 1. Detail Tugas Akhir (Selalu ada)
                            items.push({
                              label: 'Detail Tugas Akhir',
                              icon: '📄',
                              onClick: () => {
                                setSelectedTa(item);
                                setShowDetailModal(true);
                              },
                            });

                            // 2. Ruang Bimbingan & Logbook (Jika sudah disetujui/bimbingan/dst)
                            if (
                              [
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
                              ].includes(item.status)
                            ) {
                              items.push({
                                label: 'Ruang Bimbingan',
                                icon: '💬',
                                onClick: () => openBimbinganModal(item),
                              });
                            }

                            // 3. Sidang Proposal (Sempro)
                            if (
                              [
                                'bimbingan',
                                'sempro_diajukan',
                                'sempro_dijadwalkan',
                                'sempro_selesai',
                                'sidang_diajukan',
                                'sidang_dijadwalkan',
                                'sidang_selesai',
                                'revisi',
                                'lulus',
                              ].includes(item.status)
                            ) {
                              items.push({
                                label: 'Sidang Sempro',
                                icon: '🎓',
                                onClick: () => openSidangModal(item),
                              });
                            }

                            // 4. Edit (Mahasiswa pembuat atau Staf/Admin)
                            if (canEdit(item)) {
                              items.push({
                                label: 'Edit Tugas Akhir',
                                icon: '✏️',
                                onClick: () => openEditModal(item),
                              });
                            }

                            // 5. Review & Disposisi Pembimbing (Staf/Kaprodi/Admin)
                            if (isStaff()) {
                              items.push({
                                label: 'Review & Pembimbing',
                                icon: '📝',
                                onClick: () => openReviewModal(item),
                              });
                            }

                            // 6. Administrative Override (LPPM / Super Admin / Admin)
                            if (isLppmOrAdmin()) {
                              items.push({
                                label: 'Override Status',
                                icon: '⚡',
                                onClick: () => openOverrideModal(item),
                              });
                            }

                            // 7. Hapus Tugas Akhir (Danger)
                            if (canDelete(item)) {
                              items.push({ separator: true });
                              items.push({
                                label: 'Hapus Tugas Akhir',
                                icon: '🗑️',
                                danger: true,
                                onClick: () => openDeleteModal(item),
                              });
                            }

                            return items;
                          };

                          return (
                            <DropdownMenu
                              triggerAriaLabel={`Aksi tugas akhir ${item.kodeTa}`}
                              position="right"
                              trigger={
                                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-pearl dark:bg-canvas-dark border border-hairline dark:border-hairline-dark hover:bg-secondary-100 dark:hover:bg-secondary-800 text-ink dark:text-pearl transition-all shadow-2xs">
                                  <span>Aksi</span>
                                  <svg
                                    class="w-3.5 h-3.5 text-secondary-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </div>
                              }
                              items={actionItems()}
                            />
                          );
                        })()}
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

      {/* MODAL SIDANG PROPOSAL (PENDAFTARAN, JADWAL, PENILAIAN, FINALISASI) */}
      <Show when={showSidangModal() && sidangTa()}>
        <Modal
          title={`Sidang Proposal: ${sidangTa()?.kodeTa}`}
          isOpen={showSidangModal()}
          onClose={() => setShowSidangModal(false)}
          maxWidth="xl"
        >
          <div class="space-y-6 max-h-[82vh] overflow-y-auto px-1">
            {/* Header Ringkasan Tugas Akhir */}
            <div class="p-4 bg-pearl dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark space-y-2">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <span class="text-caption font-bold text-action uppercase tracking-wide">
                    {sidangTa()?.kodeTa} • {sidangTa()?.tipe === 'kelompok' ? 'Kelompok' : 'Individu'}
                  </span>
                  <h3 class="text-table font-bold text-ink dark:text-pearl mt-0.5 leading-snug">{sidangTa()?.judul}</h3>
                </div>
                <Badge variant={STATUS_META[sidangTa()!.status]?.variant || 'default'}>
                  {STATUS_META[sidangTa()!.status]?.label || sidangTa()!.status}
                </Badge>
              </div>

              {/* Status ACC Pembimbing Check */}
              <div class="pt-2 border-t border-hairline dark:border-hairline-dark flex items-center justify-between text-fine">
                <span class="font-semibold text-secondary-500">Prasyarat ACC Pembimbing:</span>
                <div class="flex items-center gap-2">
                  <For each={sidangTa()?.pembimbing}>
                    {(p) => (
                      <Badge variant={p.accSidangProposal ? 'success' : 'default'} size="sm">
                        {p.peran === 'pembimbing_1' ? 'P1' : 'P2'}: {p.accSidangProposal ? 'ACC ✓' : 'Belum ACC'}
                      </Badge>
                    )}
                  </For>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div class="flex border-b border-hairline dark:border-hairline-dark gap-2">
              <button
                type="button"
                onClick={() => setSidangActiveTab('daftar')}
                class={`pb-2.5 px-3 text-caption font-semibold transition-colors border-b-2 ${
                  sidangActiveTab() === 'daftar'
                    ? 'border-action text-action'
                    : 'border-transparent text-secondary-500 hover:text-ink dark:hover:text-pearl'
                }`}
              >
                1. Pendaftaran Sempro
              </button>
              <button
                type="button"
                onClick={() => setSidangActiveTab('jadwal')}
                class={`pb-2.5 px-3 text-caption font-semibold transition-colors border-b-2 ${
                  sidangActiveTab() === 'jadwal'
                    ? 'border-action text-action'
                    : 'border-transparent text-secondary-500 hover:text-ink dark:hover:text-pearl'
                }`}
              >
                2. Jadwal & Tim Penguji
              </button>
              <button
                type="button"
                onClick={() => setSidangActiveTab('nilai')}
                class={`pb-2.5 px-3 text-caption font-semibold transition-colors border-b-2 ${
                  sidangActiveTab() === 'nilai'
                    ? 'border-action text-action'
                    : 'border-transparent text-secondary-500 hover:text-ink dark:hover:text-pearl'
                }`}
              >
                3. Ruang Penilaian Penguji
              </button>
              <button
                type="button"
                onClick={() => setSidangActiveTab('hasil')}
                class={`pb-2.5 px-3 text-caption font-semibold transition-colors border-b-2 ${
                  sidangActiveTab() === 'hasil'
                    ? 'border-action text-action'
                    : 'border-transparent text-secondary-500 hover:text-ink dark:hover:text-pearl'
                }`}
              >
                4. Hasil & Kelulusan
              </button>
            </div>

            {/* TAB 1: PENDAFTARAN SIDANG */}
            <Show when={sidangActiveTab() === 'daftar'}>
              <div class="space-y-4">
                {/* Daftar Sesi Sidang yang Sudah Diajukan */}
                <Show when={sidangList().length > 0}>
                  <div class="space-y-3">
                    <span class="text-caption font-bold text-ink dark:text-pearl block">
                      Riwayat Pendaftaran Sidang
                    </span>
                    <For each={sidangList()}>
                      {(s) => (
                        <div class="p-4 bg-white dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark space-y-2">
                          <div class="flex items-center justify-between">
                            <span class="text-caption font-bold text-ink dark:text-pearl">
                              {s.jenisSidang === 'proposal' ? 'Sidang Proposal (Sempro)' : 'Sidang Akhir (Pendadaran)'}
                            </span>
                            <Badge
                              variant={
                                s.statusSidang === 'selesai'
                                  ? 'success'
                                  : s.statusSidang === 'dijadwalkan'
                                    ? 'warning'
                                    : 'info'
                              }
                              size="sm"
                            >
                              {(s.statusSidang || 'diajukan').toUpperCase()}
                            </Badge>
                          </div>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-fine">
                            <div>
                              <span class="text-secondary-400 block">Berkas Naskah:</span>
                              {s.berkasProposalUrl ? (
                                <a
                                  href={s.berkasProposalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  class="text-action hover:underline truncate block"
                                >
                                  Lihat Naskah ↗
                                </a>
                              ) : (
                                '-'
                              )}
                            </div>
                            <div>
                              <span class="text-secondary-400 block">Bukti Plagiasi / Turnitin:</span>
                              {s.buktiPlagiasiUrl ? (
                                <a
                                  href={s.buktiPlagiasiUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  class="text-action hover:underline truncate block"
                                >
                                  Lihat Bukti Plagiasi ↗
                                </a>
                              ) : (
                                '-'
                              )}
                            </div>
                          </div>
                          <Show when={s.catatanMahasiswa}>
                            <div class="text-fine text-secondary-500 bg-secondary-50 dark:bg-secondary-900/30 p-2.5 rounded-lg">
                              <span class="font-semibold">Catatan:</span> {s.catatanMahasiswa}
                            </div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Form Pendaftaran Sidang Baru (Proposal / Akhir) */}
                <form
                  onSubmit={handleDaftarSidangSubmit}
                  class="p-4 bg-pearl dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark space-y-4"
                >
                  <div class="flex items-center justify-between border-b border-hairline dark:border-hairline-dark pb-2">
                    <span class="text-caption font-bold text-ink dark:text-pearl">
                      Formulir Pendaftaran Sidang Baru
                    </span>
                    <div class="flex items-center gap-2">
                      <label class="text-fine font-semibold text-secondary-500">Jenis Sidang:</label>
                      <select
                        value={daftarJenisSidang()}
                        onChange={(e) => setDaftarJenisSidang(e.currentTarget.value as 'proposal' | 'akhir')}
                        class="border border-hairline dark:border-hairline-dark rounded-xl px-2.5 py-1 text-fine bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                      >
                        <option value="proposal">Sidang Proposal</option>
                        <option value="akhir">Sidang Akhir (Pendadaran)</option>
                      </select>
                    </div>
                  </div>

                  <div class="p-3 bg-action/5 rounded-xl border border-action/20 text-fine text-action">
                    Pastikan seluruh pembimbing telah memberikan ACC{' '}
                    {daftarJenisSidang() === 'proposal' ? 'Sidang Proposal' : 'Sidang Akhir'} sebelum mengajukan
                    pendaftaran.
                  </div>

                  <div>
                    <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                      Link Berkas Naskah {daftarJenisSidang() === 'proposal' ? 'Proposal' : 'Laporan Akhir'} (Cloud /
                      Drive) *
                    </label>
                    <Input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={daftarBerkasProposalUrl()}
                      onInput={(e) => setDaftarBerkasProposalUrl(e.currentTarget.value)}
                    />
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                        Link Bukti Bebas Kompensasi {daftarJenisSidang() === 'akhir' ? '*' : '(Opsional)'}
                      </label>
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={daftarBuktiKompensasiUrl()}
                        onInput={(e) => setDaftarBuktiKompensasiUrl(e.currentTarget.value)}
                      />
                    </div>
                    <div>
                      <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                        Link Bukti Cek Plagiasi (Turnitin) {daftarJenisSidang() === 'akhir' ? '*' : '(Opsional)'}
                      </label>
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={daftarBuktiPlagiasiUrl()}
                        onInput={(e) => setDaftarBuktiPlagiasiUrl(e.currentTarget.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                      Catatan Tambahan Mahasiswa
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Catatan atau pengantar untuk prodi..."
                      value={daftarCatatanMhs()}
                      onInput={(e) => setDaftarCatatanMhs(e.currentTarget.value)}
                      class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                    />
                  </div>

                  <div class="flex justify-end pt-1">
                    <Button type="submit" variant="primary" disabled={isSubmittingDaftarSidang()}>
                      {isSubmittingDaftarSidang()
                        ? 'Mendaftarkan...'
                        : daftarJenisSidang() === 'proposal'
                          ? 'Daftarkan Sidang Proposal'
                          : 'Daftarkan Sidang Akhir'}
                    </Button>
                  </div>
                </form>
              </div>
            </Show>

            {/* TAB 2: JADWAL & PLOTTING PENGUJI */}
            <Show when={sidangActiveTab() === 'jadwal'}>
              <div class="space-y-4">
                <Show
                  when={isStaff()}
                  fallback={
                    <div class="p-4 bg-white dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark space-y-3">
                      <h4 class="text-table font-bold text-ink dark:text-pearl">Jadwal & Dewan Penguji</h4>
                      {selectedSidangForJadwal()?.tanggalSidang ? (
                        <div class="space-y-2 text-fine">
                          <p>
                            <span class="font-semibold">Waktu:</span> {selectedSidangForJadwal()?.tanggalSidang},{' '}
                            {selectedSidangForJadwal()?.jamMulai} - {selectedSidangForJadwal()?.jamSelesai} WITA
                          </p>
                          <p>
                            <span class="font-semibold">Ruangan:</span> {selectedSidangForJadwal()?.ruangan}
                          </p>
                          <div class="pt-2 border-t border-hairline dark:border-hairline-dark">
                            <span class="font-semibold block mb-1">Dewan Penguji:</span>
                            <For each={selectedSidangForJadwal()?.penguji}>
                              {(p) => (
                                <div class="flex items-center justify-between py-1">
                                  <span>{p.dosenNama}</span>
                                  <Badge variant="default" size="sm">
                                    {p.peranPenguji.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      ) : (
                        <p class="text-caption text-secondary-500">
                          Sidang belum dijadwalkan oleh Program Studi. Silakan tunggu informasi jadwal resmi.
                        </p>
                      )}
                    </div>
                  }
                >
                  {/* Form Penjadwalan oleh Prodi/Staf */}
                  <form onSubmit={handleJadwalkanSidangSubmit} class="space-y-4">
                    <div class="p-3 bg-action/5 rounded-xl border border-action/20 text-fine text-action">
                      Atur tanggal, jam, ruangan, dan plot dewan penguji (Penguji 1 & 2, Ketua, dan Sekretaris).
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                          Tanggal Sidang *
                        </label>
                        <Input
                          type="date"
                          value={jadwalTanggal()}
                          onInput={(e) => setJadwalTanggal(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                          Jam Mulai *
                        </label>
                        <Input
                          type="time"
                          value={jadwalJamMulai()}
                          onInput={(e) => setJadwalJamMulai(e.currentTarget.value)}
                        />
                      </div>
                      <div>
                        <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                          Jam Selesai *
                        </label>
                        <Input
                          type="time"
                          value={jadwalJamSelesai()}
                          onInput={(e) => setJadwalJamSelesai(e.currentTarget.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                        Ruangan / Tempat Sidang *
                      </label>
                      <Input
                        type="text"
                        placeholder="Contoh: Lab Komputer 2 / Ruang Sidang A"
                        value={jadwalRuangan()}
                        onInput={(e) => setJadwalRuangan(e.currentTarget.value)}
                      />
                    </div>

                    <div class="pt-2 border-t border-hairline dark:border-hairline-dark">
                      <span class="text-caption font-bold text-ink dark:text-pearl block mb-2">
                        Susunan Dewan Penguji
                      </span>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label class="block text-fine font-semibold text-secondary-600 dark:text-secondary-400 mb-1">
                            Ketua Penguji
                          </label>
                          <SearchableSelect
                            options={dosenList() || []}
                            value={jadwalKetuaPenguji()}
                            onChange={(val) => setJadwalKetuaPenguji(val ? Number(val) : null)}
                            placeholder="Pilih Ketua Penguji..."
                          />
                        </div>
                        <div>
                          <label class="block text-fine font-semibold text-secondary-600 dark:text-secondary-400 mb-1">
                            Sekretaris Sidang
                          </label>
                          <SearchableSelect
                            options={dosenList() || []}
                            value={jadwalSekretaris()}
                            onChange={(val) => setJadwalSekretaris(val ? Number(val) : null)}
                            placeholder="Pilih Sekretaris..."
                          />
                        </div>
                        <div>
                          <label class="block text-fine font-semibold text-secondary-600 dark:text-secondary-400 mb-1">
                            Dosen Penguji 1 *
                          </label>
                          <SearchableSelect
                            options={dosenList() || []}
                            value={jadwalPenguji1()}
                            onChange={(val) => setJadwalPenguji1(val ? Number(val) : null)}
                            placeholder="Pilih Dosen Penguji 1..."
                          />
                        </div>
                        <div>
                          <label class="block text-fine font-semibold text-secondary-600 dark:text-secondary-400 mb-1">
                            Dosen Penguji 2
                          </label>
                          <SearchableSelect
                            options={dosenList() || []}
                            value={jadwalPenguji2()}
                            onChange={(val) => setJadwalPenguji2(val ? Number(val) : null)}
                            placeholder="Pilih Dosen Penguji 2..."
                          />
                        </div>
                      </div>
                    </div>

                    <div class="flex justify-end pt-2">
                      <Button type="submit" variant="primary" disabled={isSubmittingJadwal()}>
                        {isSubmittingJadwal() ? 'Menyimpan Jadwal...' : 'Tetapkan Jadwal & Tim Penguji'}
                      </Button>
                    </div>
                  </form>
                </Show>
              </div>
            </Show>

            {/* TAB 3: RUANG PENILAIAN PENGUJI */}
            <Show when={sidangActiveTab() === 'nilai'}>
              <div class="space-y-4">
                <Show
                  when={rubrikKriteria().length > 0}
                  fallback={
                    <div class="text-center py-6 text-secondary-500">
                      Rubrik penilaian belum dikonfigurasi oleh sistem.
                    </div>
                  }
                >
                  <form onSubmit={handleInputNilaiSubmit} class="space-y-5">
                    {/* Header Panduan Skala 0 - 10 */}
                    <div class="p-3.5 bg-action/5 rounded-2xl border border-action/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div class="text-caption font-bold text-action flex items-center gap-2">
                          <span>Formulir Penilaian Tugas Akhir Resmi Skala 0 – 10 (Standar BPA)</span>
                          <Badge variant="accent" size="sm">
                            Skala 0.0 - 10.0
                          </Badge>
                        </div>
                        <p class="text-fine text-secondary-600 dark:text-secondary-400 mt-0.5">
                          Rumus Nilai Akhir = <strong>30% Total A</strong> (Pembimbingan) + <strong>35% Total B</strong>{' '}
                          (Alat/Mesin) + <strong>35% Total C</strong> (Laporan).
                        </p>
                      </div>
                      <div class="text-right text-fine font-semibold text-secondary-500 hidden sm:block">
                        Batas Kelulusan: <span class="text-success-600 font-bold">5.10 (C)</span>
                      </div>
                    </div>

                    {/* Matriks Tabel Penilaian Komponen */}
                    <div class="overflow-x-auto rounded-2xl border border-hairline dark:border-hairline-dark bg-white dark:bg-canvas-dark shadow-xs">
                      <table class="w-full text-left text-table border-collapse">
                        <thead>
                          <tr class="bg-pearl dark:bg-canvas-dark border-b border-hairline dark:border-hairline-dark">
                            <th class="py-3 px-4 font-bold text-ink dark:text-pearl w-16">Kode</th>
                            <th class="py-3 px-4 font-bold text-ink dark:text-pearl min-w-[260px]">
                              Komponen Kriteria Penilaian
                            </th>
                            <th class="py-3 px-4 font-bold text-ink dark:text-pearl text-center w-24">Bobot</th>
                            <For each={sidangTa()?.anggota}>
                              {(ang, idx) => (
                                <th class="py-3 px-4 font-bold text-action text-center min-w-[140px] border-l border-hairline dark:border-hairline-dark">
                                  <div class="text-fine font-bold text-ink dark:text-pearl truncate max-w-[150px]">
                                    {ang.mahasiswaNama}
                                  </div>
                                  <div class="text-fine text-secondary-500 font-normal">
                                    {ang.mahasiswaNim} {ang.peran === 'ketua' ? '(Ketua)' : `(MHS-${idx() + 1})`}
                                  </div>
                                </th>
                              )}
                            </For>
                          </tr>
                        </thead>

                        <tbody class="divide-y divide-hairline dark:divide-hairline-dark">
                          {/* JIKA MEMILIKI KATEGORI A, B, C LENGKAP */}
                          <Show
                            when={rubrikKriteria().some((k) => k.kategori === 'pembimbingan')}
                            fallback={
                              /* Tampilan fallback untuk jenis sidang tanpa kategori terpisah (misal sempro umum) */
                              <For each={rubrikKriteria()}>
                                {(crit) => (
                                  <tr class="hover:bg-pearl/50 dark:hover:bg-canvas-dark/50">
                                    <td class="py-2.5 px-4 font-mono text-fine text-secondary-500">
                                      {crit.kode || `K.${crit.id}`}
                                    </td>
                                    <td class="py-2.5 px-4 text-ink dark:text-pearl">
                                      {crit.nama || crit.namaKriteria}
                                    </td>
                                    <td class="py-2.5 px-4 text-center font-semibold text-secondary-600">
                                      {crit.bobot || crit.bobotPersen}%
                                    </td>
                                    <For each={sidangTa()?.anggota}>
                                      {(ang) => {
                                        const key = `${crit.id}_${ang.mahasiswaId}`;
                                        return (
                                          <td class="py-2 px-3 text-center border-l border-hairline dark:border-hairline-dark">
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0"
                                              max="10"
                                              placeholder="0-10"
                                              value={nilaiMap()[key] ?? ''}
                                              onInput={(e) => {
                                                const val = parseFloat(e.currentTarget.value);
                                                setNilaiMap((prev) => ({
                                                  ...prev,
                                                  [key]: isNaN(val) ? 0 : val,
                                                }));
                                              }}
                                              class="w-24 text-center border border-hairline dark:border-hairline-dark rounded-xl px-2.5 py-1.5 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl focus:border-action outline-none"
                                            />
                                          </td>
                                        );
                                      }}
                                    </For>
                                  </tr>
                                )}
                              </For>
                            }
                          >
                            {/* ================= BLOK A: PENILAIAN PEMBIMBINGAN (30%) ================= */}
                            <tr class="bg-secondary-50/70 dark:bg-secondary-900/30">
                              <td colspan={3 + (sidangTa()?.anggota?.length || 1)} class="py-2.5 px-4">
                                <div class="flex items-center justify-between">
                                  <span class="text-caption font-black text-ink dark:text-pearl uppercase tracking-wider">
                                    Kategori A — Penilaian Pembimbingan (Bersifat Individu)
                                  </span>
                                  <Badge variant="accent" size="sm">
                                    Kontribusi Nilai Akhir: 30%
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                            <For each={rubrikKriteria().filter((k) => k.kategori === 'pembimbingan')}>
                              {(crit) => (
                                <tr class="hover:bg-pearl/50 dark:hover:bg-canvas-dark/50">
                                  <td class="py-2.5 px-4 font-mono text-fine text-secondary-500 font-semibold">
                                    {crit.kode || `A.${crit.id}`}
                                  </td>
                                  <td class="py-2.5 px-4 text-ink dark:text-pearl">{crit.nama || crit.namaKriteria}</td>
                                  <td class="py-2.5 px-4 text-center font-semibold text-secondary-600">
                                    {crit.bobot || crit.bobotPersen}%
                                  </td>
                                  <For each={sidangTa()?.anggota}>
                                    {(ang) => {
                                      const key = `${crit.id}_${ang.mahasiswaId}`;
                                      return (
                                        <td class="py-2 px-3 text-center border-l border-hairline dark:border-hairline-dark">
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="10"
                                            placeholder="0 - 10"
                                            value={nilaiMap()[key] ?? ''}
                                            onInput={(e) => {
                                              const val = parseFloat(e.currentTarget.value);
                                              setNilaiMap((prev) => ({
                                                ...prev,
                                                [key]: isNaN(val) ? 0 : val,
                                              }));
                                            }}
                                            class="w-24 text-center border border-hairline dark:border-hairline-dark rounded-xl px-2.5 py-1.5 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl focus:border-action outline-none"
                                          />
                                        </td>
                                      );
                                    }}
                                  </For>
                                </tr>
                              )}
                            </For>
                            {/* Baris Total A */}
                            <tr class="bg-action/5 font-bold border-t-2 border-hairline dark:border-hairline-dark">
                              <td colspan={3} class="py-2.5 px-4 text-right text-action">
                                Nilai Total Kategori A (Skala 0 – 10):
                              </td>
                              <For each={sidangTa()?.anggota}>
                                {(ang) => {
                                  const listA = rubrikKriteria().filter((k) => k.kategori === 'pembimbingan');
                                  let totA = 0;
                                  let bobotA = 0;
                                  for (const c of listA) {
                                    const val = Number(nilaiMap()[`${c.id}_${ang.mahasiswaId}`]) || 0;
                                    const w = Number(c.bobot || c.bobotPersen) || 0;
                                    totA += (val * w) / 100;
                                    bobotA += w;
                                  }
                                  const normA = bobotA > 0 ? (totA / bobotA) * 100 : 0;
                                  return (
                                    <td class="py-2.5 px-3 text-center font-mono text-action font-black text-table border-l border-hairline dark:border-hairline-dark">
                                      {normA.toFixed(2)}
                                    </td>
                                  );
                                }}
                              </For>
                            </tr>

                            {/* ================= BLOK B: PENILAIAN ALAT / MESIN (35%) ================= */}
                            <tr class="bg-secondary-50/70 dark:bg-secondary-900/30">
                              <td colspan={3 + (sidangTa()?.anggota?.length || 1)} class="py-2.5 px-4">
                                <div class="flex items-center justify-between">
                                  <span class="text-caption font-black text-ink dark:text-pearl uppercase tracking-wider">
                                    Kategori B — Penilaian Alat / Mesin (Bersifat Kelompok)
                                  </span>
                                  <Badge variant="accent" size="sm">
                                    Kontribusi Nilai Akhir: 35%
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                            <For each={rubrikKriteria().filter((k) => k.kategori === 'alat_mesin')}>
                              {(crit) => (
                                <tr class="hover:bg-pearl/50 dark:hover:bg-canvas-dark/50">
                                  <td class="py-2.5 px-4 font-mono text-fine text-secondary-500 font-semibold">
                                    {crit.kode || `B.${crit.id}`}
                                  </td>
                                  <td class="py-2.5 px-4 text-ink dark:text-pearl">{crit.nama || crit.namaKriteria}</td>
                                  <td class="py-2.5 px-4 text-center font-semibold text-secondary-600">
                                    {crit.bobot || crit.bobotPersen}%
                                  </td>
                                  <For each={sidangTa()?.anggota}>
                                    {(ang) => {
                                      const key = `${crit.id}_${ang.mahasiswaId}`;
                                      return (
                                        <td class="py-2 px-3 text-center border-l border-hairline dark:border-hairline-dark">
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="10"
                                            placeholder="0 - 10"
                                            value={nilaiMap()[key] ?? ''}
                                            onInput={(e) => {
                                              const val = parseFloat(e.currentTarget.value);
                                              const updatedVal = isNaN(val) ? 0 : val;
                                              // Nilai kelompok: sinkronkan ke seluruh anggota tim
                                              const newMap = { ...nilaiMap() };
                                              sidangTa()?.anggota?.forEach((a) => {
                                                newMap[`${crit.id}_${a.mahasiswaId}`] = updatedVal;
                                              });
                                              setNilaiMap(newMap);
                                            }}
                                            class="w-24 text-center border border-hairline dark:border-hairline-dark rounded-xl px-2.5 py-1.5 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl focus:border-action outline-none"
                                          />
                                        </td>
                                      );
                                    }}
                                  </For>
                                </tr>
                              )}
                            </For>
                            {/* Baris Total B */}
                            <tr class="bg-action/5 font-bold border-t-2 border-hairline dark:border-hairline-dark">
                              <td colspan={3} class="py-2.5 px-4 text-right text-action">
                                Nilai Total Kategori B (Skala 0 – 10):
                              </td>
                              <For each={sidangTa()?.anggota}>
                                {(ang) => {
                                  const listB = rubrikKriteria().filter((k) => k.kategori === 'alat_mesin');
                                  let totB = 0;
                                  let bobotB = 0;
                                  for (const c of listB) {
                                    const val = Number(nilaiMap()[`${c.id}_${ang.mahasiswaId}`]) || 0;
                                    const w = Number(c.bobot || c.bobotPersen) || 0;
                                    totB += (val * w) / 100;
                                    bobotB += w;
                                  }
                                  const normB = bobotB > 0 ? (totB / bobotB) * 100 : 0;
                                  return (
                                    <td class="py-2.5 px-3 text-center font-mono text-action font-black text-table border-l border-hairline dark:border-hairline-dark">
                                      {normB.toFixed(2)}
                                    </td>
                                  );
                                }}
                              </For>
                            </tr>

                            {/* ================= BLOK C: PENILAIAN LAPORAN TUGAS AKHIR (35%) ================= */}
                            <tr class="bg-secondary-50/70 dark:bg-secondary-900/30">
                              <td colspan={3 + (sidangTa()?.anggota?.length || 1)} class="py-2.5 px-4">
                                <div class="flex items-center justify-between">
                                  <span class="text-caption font-black text-ink dark:text-pearl uppercase tracking-wider">
                                    Kategori C — Penilaian Laporan Tugas Akhir (Bersifat Kelompok)
                                  </span>
                                  <Badge variant="accent" size="sm">
                                    Kontribusi Nilai Akhir: 35%
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                            <For each={rubrikKriteria().filter((k) => k.kategori === 'laporan')}>
                              {(crit) => (
                                <tr class="hover:bg-pearl/50 dark:hover:bg-canvas-dark/50">
                                  <td class="py-2.5 px-4 font-mono text-fine text-secondary-500 font-semibold">
                                    {crit.kode || `C.${crit.id}`}
                                  </td>
                                  <td class="py-2.5 px-4 text-ink dark:text-pearl">{crit.nama || crit.namaKriteria}</td>
                                  <td class="py-2.5 px-4 text-center font-semibold text-secondary-600">
                                    {crit.bobot || crit.bobotPersen}%
                                  </td>
                                  <For each={sidangTa()?.anggota}>
                                    {(ang) => {
                                      const key = `${crit.id}_${ang.mahasiswaId}`;
                                      return (
                                        <td class="py-2 px-3 text-center border-l border-hairline dark:border-hairline-dark">
                                          <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="10"
                                            placeholder="0 - 10"
                                            value={nilaiMap()[key] ?? ''}
                                            onInput={(e) => {
                                              const val = parseFloat(e.currentTarget.value);
                                              const updatedVal = isNaN(val) ? 0 : val;
                                              // Nilai kelompok: sinkronkan ke seluruh anggota tim
                                              const newMap = { ...nilaiMap() };
                                              sidangTa()?.anggota?.forEach((a) => {
                                                newMap[`${crit.id}_${a.mahasiswaId}`] = updatedVal;
                                              });
                                              setNilaiMap(newMap);
                                            }}
                                            class="w-24 text-center border border-hairline dark:border-hairline-dark rounded-xl px-2.5 py-1.5 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl focus:border-action outline-none"
                                          />
                                        </td>
                                      );
                                    }}
                                  </For>
                                </tr>
                              )}
                            </For>
                            {/* Baris Total C */}
                            <tr class="bg-action/5 font-bold border-t-2 border-hairline dark:border-hairline-dark">
                              <td colspan={3} class="py-2.5 px-4 text-right text-action">
                                Nilai Total Kategori C (Skala 0 – 10):
                              </td>
                              <For each={sidangTa()?.anggota}>
                                {(ang) => {
                                  const listC = rubrikKriteria().filter((k) => k.kategori === 'laporan');
                                  let totC = 0;
                                  let bobotC = 0;
                                  for (const c of listC) {
                                    const val = Number(nilaiMap()[`${c.id}_${ang.mahasiswaId}`]) || 0;
                                    const w = Number(c.bobot || c.bobotPersen) || 0;
                                    totC += (val * w) / 100;
                                    bobotC += w;
                                  }
                                  const normC = bobotC > 0 ? (totC / bobotC) * 100 : 0;
                                  return (
                                    <td class="py-2.5 px-3 text-center font-mono text-action font-black text-table border-l border-hairline dark:border-hairline-dark">
                                      {normC.toFixed(2)}
                                    </td>
                                  );
                                }}
                              </For>
                            </tr>

                            {/* ================= REKAPITULASI NILAI AKHIR & HURUF MUTU BPA ================= */}
                            <tr class="bg-action/10 font-bold border-t-4 border-hairline dark:border-hairline-dark">
                              <td colspan={3} class="py-3.5 px-4 text-right">
                                <span class="text-caption font-black text-action block uppercase tracking-wider">
                                  NILAI AKHIR = 30% A + 35% B + 35% C:
                                </span>
                                <span class="text-fine text-secondary-500 font-normal">
                                  Konversi Huruf Mutu Standar BPA Politeknik Sorowako
                                </span>
                              </td>
                              <For each={sidangTa()?.anggota}>
                                {(ang) => {
                                  // Hitung A
                                  const listA = rubrikKriteria().filter((k) => k.kategori === 'pembimbingan');
                                  let totA = 0;
                                  let bobotA = 0;
                                  for (const c of listA) {
                                    totA +=
                                      ((Number(nilaiMap()[`${c.id}_${ang.mahasiswaId}`]) || 0) *
                                        (Number(c.bobot || c.bobotPersen) || 0)) /
                                      100;
                                    bobotA += Number(c.bobot || c.bobotPersen) || 0;
                                  }
                                  const normA = bobotA > 0 ? (totA / bobotA) * 100 : 0;

                                  // Hitung B
                                  const listB = rubrikKriteria().filter((k) => k.kategori === 'alat_mesin');
                                  let totB = 0;
                                  let bobotB = 0;
                                  for (const c of listB) {
                                    totB +=
                                      ((Number(nilaiMap()[`${c.id}_${ang.mahasiswaId}`]) || 0) *
                                        (Number(c.bobot || c.bobotPersen) || 0)) /
                                      100;
                                    bobotB += Number(c.bobot || c.bobotPersen) || 0;
                                  }
                                  const normB = bobotB > 0 ? (totB / bobotB) * 100 : 0;

                                  // Hitung C
                                  const listC = rubrikKriteria().filter((k) => k.kategori === 'laporan');
                                  let totC = 0;
                                  let bobotC = 0;
                                  for (const c of listC) {
                                    totC +=
                                      ((Number(nilaiMap()[`${c.id}_${ang.mahasiswaId}`]) || 0) *
                                        (Number(c.bobot || c.bobotPersen) || 0)) /
                                      100;
                                    bobotC += Number(c.bobot || c.bobotPersen) || 0;
                                  }
                                  const normC = bobotC > 0 ? (totC / bobotC) * 100 : 0;

                                  let finalCalc = 0;
                                  if (bobotA > 0 && (bobotB > 0 || bobotC > 0)) {
                                    finalCalc = 0.3 * normA + 0.35 * normB + 0.35 * normC;
                                  } else if (bobotB > 0 || bobotC > 0) {
                                    const sumW = (bobotB > 0 ? 0.35 : 0) + (bobotC > 0 ? 0.35 : 0);
                                    finalCalc = sumW > 0 ? (0.35 * normB + 0.35 * normC) / sumW : 0;
                                  } else {
                                    finalCalc = normA;
                                  }

                                  const mutu = konversiBpaFrontend(finalCalc);

                                  return (
                                    <td class="py-3 px-3 text-center border-l border-hairline dark:border-hairline-dark">
                                      <div class="text-title font-black text-action leading-tight">
                                        {finalCalc.toFixed(2)}
                                      </div>
                                      <div class="mt-1 flex justify-center">
                                        <Badge
                                          variant={
                                            mutu.huruf.startsWith('A')
                                              ? 'success'
                                              : mutu.huruf.startsWith('B')
                                                ? 'accent'
                                                : mutu.huruf.startsWith('C')
                                                  ? 'warning'
                                                  : 'danger'
                                          }
                                          size="sm"
                                        >
                                          {mutu.huruf} ({mutu.indeks})
                                        </Badge>
                                      </div>
                                      <div class="text-fine text-secondary-500 mt-0.5 truncate max-w-[120px] mx-auto">
                                        {mutu.predikat}
                                      </div>
                                    </td>
                                  );
                                }}
                              </For>
                            </tr>
                          </Show>
                        </tbody>
                      </table>
                    </div>

                    {/* Catatan Revisi & Saran Penguji */}
                    <div>
                      <label class="block text-caption font-semibold text-ink dark:text-pearl mb-1">
                        Catatan Revisi & Masukan Penguji / Pembimbing
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Rincian perbaikan naskah, perhitungan bahan, atau perbaikan fungsional alat yang harus diselesaikan..."
                        value={nilaiCatatanRevisi()}
                        onInput={(e) => setNilaiCatatanRevisi(e.currentTarget.value)}
                        class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                      />
                    </div>

                    <div class="flex justify-end pt-2">
                      <Button type="submit" variant="primary" disabled={isSubmittingNilai()}>
                        {isSubmittingNilai() ? 'Menyimpan Penilaian...' : 'Simpan Lembar Penilaian Resmi (Skala 0–10)'}
                      </Button>
                    </div>
                  </form>
                </Show>
              </div>
            </Show>

            {/* TAB 4: HASIL & KELULUSAN */}
            <Show when={sidangActiveTab() === 'hasil'}>
              <div class="space-y-4">
                <Show when={selectedSidangForJadwal()}>
                  {(sidang) => (
                    <div class="p-4 bg-white dark:bg-canvas-dark rounded-2xl border border-hairline dark:border-hairline-dark space-y-4">
                      {/* Action Bar Ekspor Nilai Sidang */}
                      <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-action/5 dark:bg-action/10 rounded-2xl border border-action/20">
                        <div>
                          <span class="text-caption font-bold text-ink dark:text-pearl block">
                            Ekspor Nilai & Rekap Berita Acara
                          </span>
                          <span class="text-fine text-secondary-500">
                            Unduh nilai untuk arsip prodi atau diimpor langsung ke menu /input-nilai
                          </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={isExportingNilai()}
                            onClick={() => handleExportNilaiExcel(sidang().id)}
                          >
                            📊 Ekspor Excel (.xlsx)
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={isExportingNilai()}
                            onClick={() => handleExportNilaiCsv(sidang().id)}
                          >
                            📥 Ekspor CSV (/input-nilai)
                          </Button>
                        </div>
                      </div>

                      <div class="flex items-center justify-between">
                        <div>
                          <span class="text-caption font-bold text-secondary-500 uppercase">Status Kelulusan:</span>
                          <h4 class="text-table font-bold text-ink dark:text-pearl">
                            {sidang().statusHasil
                              ? sidang().statusHasil.replace(/_/g, ' ').toUpperCase()
                              : 'BELUM DITENTUKAN'}
                          </h4>
                        </div>
                        <div class="text-right">
                          <span class="text-fine text-secondary-400 block">Nilai Akhir:</span>
                          <span class="text-title font-black text-action">
                            {sidang().nilaiAkhirAngka ? Number(sidang().nilaiAkhirAngka).toFixed(2) : '-'} (
                            {sidang().nilaiAkhirHuruf || '-'})
                          </span>
                        </div>
                      </div>

                      <Show when={sidang().batasWaktuRevisi}>
                        <div class="p-3 bg-warning-50/70 dark:bg-warning-900/20 text-warning-800 dark:text-warning-200 rounded-xl text-fine border border-warning-200 dark:border-warning-800/40">
                          <span class="font-bold">Batas Waktu Revisi: </span>
                          {sidang().batasWaktuRevisi}
                        </div>
                      </Show>

                      <Show when={sidang().catatanSidang}>
                        <div class="p-3 bg-secondary-50 dark:bg-secondary-900/30 rounded-xl text-fine">
                          <span class="font-bold text-ink dark:text-pearl block mb-1">Catatan Berita Acara:</span>
                          {sidang().catatanSidang}
                        </div>
                      </Show>

                      {/* PANEL PELACAKAN & PERSETUJUAN REVISI PASCA SIDANG */}
                      <div class="pt-4 border-t border-hairline dark:border-hairline-dark space-y-3">
                        <div class="flex items-center justify-between">
                          <span class="text-caption font-bold text-ink dark:text-pearl">
                            Pelacakan & Persetujuan Revisi Naskah Pasca Sidang
                          </span>
                          <Badge
                            variant={
                              sidang().statusRevisi === 'tuntas'
                                ? 'success'
                                : sidang().statusRevisi === 'diverifikasi_penguji'
                                  ? 'info'
                                  : 'warning'
                            }
                            size="sm"
                          >
                            {sidang().statusRevisi === 'tuntas'
                              ? 'REVISI TUNTAS (ACC LENGKAP)'
                              : sidang().statusRevisi === 'diverifikasi_penguji'
                                ? 'DALAM REVIEW PENGUJI'
                                : 'MENUNGGU REVISI MAHASISWA'}
                          </Badge>
                        </div>

                        {/* Info Berkas Revisi Jika Sudah Diunggah */}
                        <Show when={(sidang().berkasSyarat as Record<string, unknown> | null)?.fileRevisiUrl}>
                          <div class="p-3 bg-secondary-50 dark:bg-secondary-900/30 rounded-xl text-fine space-y-1 border border-hairline dark:border-hairline-dark">
                            <div class="flex items-center justify-between">
                              <span class="font-semibold text-ink dark:text-pearl">Naskah Perbaikan Mahasiswa:</span>
                              <a
                                href={String((sidang().berkasSyarat as Record<string, unknown>)?.fileRevisiUrl)}
                                target="_blank"
                                rel="noreferrer"
                                class="text-action font-semibold hover:underline"
                              >
                                Buka Naskah Revisi ↗
                              </a>
                            </div>
                            <Show when={(sidang().berkasSyarat as Record<string, unknown>)?.catatanRevisiMahasiswa}>
                              <p class="text-secondary-600 dark:text-secondary-400">
                                <span class="font-semibold">Catatan Perbaikan:</span>{' '}
                                {String((sidang().berkasSyarat as Record<string, unknown>)?.catatanRevisiMahasiswa)}
                              </p>
                            </Show>
                          </div>
                        </Show>

                        {/* Form Unggah Revisi untuk Mahasiswa */}
                        <Show
                          when={
                            isMahasiswa() &&
                            sidang().statusHasil === 'lulus_dengan_revisi' &&
                            sidang().statusRevisi !== 'tuntas'
                          }
                        >
                          <form
                            onSubmit={handleSubmitRevisi}
                            class="p-3 bg-warning-50/50 dark:bg-warning-950/20 border border-warning-200 dark:border-warning-900/40 rounded-xl space-y-2.5"
                          >
                            <span class="text-fine font-bold text-ink dark:text-pearl block">
                              Unggah Naskah Revisi Terbaru
                            </span>
                            <div>
                              <label class="block text-fine font-semibold text-ink dark:text-pearl mb-1">
                                Link Naskah Revisi (Google Drive / Cloud) *
                              </label>
                              <Input
                                type="url"
                                placeholder="https://drive.google.com/..."
                                value={revisiNaskahUrl()}
                                onInput={(e) => setRevisiNaskahUrl(e.currentTarget.value)}
                              />
                            </div>
                            <div>
                              <label class="block text-fine font-semibold text-ink dark:text-pearl mb-1">
                                Catatan Matriks Perbaikan (Opsional)
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Jelaskan bagian bab/halaman yang telah diperbaiki sesuai masukan penguji..."
                                value={revisiCatatanMhs()}
                                onInput={(e) => setRevisiCatatanMhs(e.currentTarget.value)}
                                class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-2.5 text-fine bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                              />
                            </div>
                            <div class="flex justify-end">
                              <Button type="submit" variant="primary" size="sm" disabled={isSubmittingRevisi()}>
                                {isSubmittingRevisi() ? 'Mengirim...' : 'Kirim Naskah Revisi'}
                              </Button>
                            </div>
                          </form>
                        </Show>

                        {/* Checklist Persetujuan Dosen Penguji */}
                        <div class="space-y-2">
                          <span class="text-fine font-semibold text-secondary-500 block">
                            Daftar Persetujuan Dewan Penguji:
                          </span>
                          <div class="divide-y divide-hairline dark:divide-hairline-dark border border-hairline dark:border-hairline-dark rounded-xl overflow-hidden bg-pearl dark:bg-canvas-dark">
                            <For each={sidang().timPenguji || sidang().penguji || []}>
                              {(p) => (
                                <div class="p-3 flex items-center justify-between text-fine gap-3">
                                  <div>
                                    <span class="font-bold text-ink dark:text-pearl block">
                                      {p.dosenNama || 'Dosen Penguji'}
                                    </span>
                                    <span class="text-caption text-secondary-500">
                                      {p.peranPenguji.replace(/_/g, ' ').toUpperCase()} • NIP: {p.dosenNip || '-'}
                                    </span>
                                    <Show when={p.catatanRevisi}>
                                      <p class="text-caption text-secondary-600 dark:text-secondary-400 mt-0.5 italic">
                                        "{p.catatanRevisi}"
                                      </p>
                                    </Show>
                                  </div>
                                  <div class="flex items-center gap-2">
                                    <Show
                                      when={p.statusAccRevisi}
                                      fallback={
                                        <Show
                                          when={hasRole(['dosen', 'kaprodi', 'prodi', 'admin', 'super_admin'])}
                                          fallback={
                                            <Badge variant="warning" size="sm">
                                              Belum ACC
                                            </Badge>
                                          }
                                        >
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            disabled={isAccingRevisi()}
                                            onClick={() => handleAccRevisiPenguji(p.id)}
                                          >
                                            {isAccingRevisi() ? 'Memproses...' : '✓ Setujui Revisi (ACC)'}
                                          </Button>
                                        </Show>
                                      }
                                    >
                                      <Badge variant="success" size="sm">
                                        ✓ Disetujui
                                      </Badge>
                                    </Show>
                                  </div>
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                      </div>

                      {/* Form Finalisasi untuk Staf/Kaprodi */}
                      <Show when={isStaff()}>
                        <form
                          onSubmit={handleFinalisasiSidangSubmit}
                          class="pt-4 border-t border-hairline dark:border-hairline-dark space-y-3"
                        >
                          <span class="text-caption font-bold text-ink dark:text-pearl block">
                            Finalisasi Berita Acara & Kelulusan (Kaprodi / Pengelola)
                          </span>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label class="block text-fine font-semibold text-ink dark:text-pearl mb-1">
                                Status Keputusan *
                              </label>
                              <select
                                value={finalisasiStatusHasil()}
                                onChange={(e) =>
                                  setFinalisasiStatusHasil(
                                    e.currentTarget.value as
                                      | 'lulus_tanpa_revisi'
                                      | 'lulus_dengan_revisi'
                                      | 'sidang_ulang'
                                      | 'tidak_lulus',
                                  )
                                }
                                class="w-full border border-hairline dark:border-hairline-dark rounded-xl px-3 py-2 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                              >
                                <option value="lulus_tanpa_revisi">Lulus Tanpa Revisi</option>
                                <option value="lulus_dengan_revisi">Lulus Dengan Revisi</option>
                                <option value="sidang_ulang">Sidang Ulang</option>
                                <option value="tidak_lulus">Tidak Lulus</option>
                              </select>
                            </div>
                            <div>
                              <label class="block text-fine font-semibold text-ink dark:text-pearl mb-1">
                                Batas Akhir Revisi
                              </label>
                              <Input
                                type="date"
                                value={finalisasiBatasRevisi()}
                                onInput={(e) => setFinalisasiBatasRevisi(e.currentTarget.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <label class="block text-fine font-semibold text-ink dark:text-pearl mb-1">
                              Catatan Keputusan Sidang
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Keterangan berita acara kelulusan proposal..."
                              value={finalisasiCatatan()}
                              onInput={(e) => setFinalisasiCatatan(e.currentTarget.value)}
                              class="w-full border border-hairline dark:border-hairline-dark rounded-xl p-3 text-table bg-white dark:bg-canvas-dark text-ink dark:text-pearl"
                            />
                          </div>
                          <div class="flex justify-end pt-1">
                            <Button type="submit" variant="primary" disabled={isSubmittingFinalisasi()}>
                              {isSubmittingFinalisasi() ? 'Menyimpan...' : 'Finalisasi Hasil Sidang'}
                            </Button>
                          </div>
                        </form>
                      </Show>
                    </div>
                  )}
                </Show>
              </div>
            </Show>

            <div class="flex justify-end pt-4 border-t border-hairline dark:border-hairline-dark">
              <Button type="button" variant="ghost" onClick={() => setShowSidangModal(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      </Show>
    </MainLayout>
  );
}
