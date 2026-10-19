import { fetchApi } from '../utils/api';

export type TugasAkhirTipe = 'individu' | 'kelompok';
export type TugasAkhirStatus =
  | 'draft'
  | 'diajukan'
  | 'revisi_proposal_topik'
  | 'disetujui'
  | 'bimbingan'
  | 'sempro_diajukan'
  | 'sempro_dijadwalkan'
  | 'sempro_selesai'
  | 'sidang_diajukan'
  | 'sidang_dijadwalkan'
  | 'sidang_selesai'
  | 'revisi'
  | 'lulus'
  | 'tidak_lulus';

export type TugasAkhirJenisKarya = 'skripsi' | 'prototipe' | 'proyek_rekayasa' | 'rancang_bangun';

export interface TugasAkhirAnggota {
  id: number;
  tugasAkhirId: number;
  mahasiswaId: number;
  peran: 'ketua' | 'anggota';
  statusKonfirmasi: 'menunggu' | 'diterima' | 'ditolak';
  bagianPengerjaan: string | null;
  mahasiswaNama?: string;
  mahasiswaNim?: string;
  prodiNama?: string;
}

export interface TugasAkhirPembimbing {
  id: number;
  tugasAkhirId: number;
  peran: 'pembimbing_1' | 'pembimbing_2';
  dosenId: number | null;
  namaEksternal: string | null;
  instansiEksternal: string | null;
  catatan: string | null;
  accSidangProposal?: boolean;
  accSidangProposalAt?: string | null;
  accSidangAkhir?: boolean;
  accSidangAkhirAt?: string | null;
  dosenNama?: string;
  dosenNip?: string;
}

export interface TugasAkhirStatusLog {
  id: number;
  tugasAkhirId: number;
  dariStatus: string | null;
  keStatus: string;
  alasan: string | null;
  olehUserId: number;
  createdAt: string;
  userNama?: string;
}

export interface TugasAkhir {
  id: number;
  kodeTa: string;
  tipe: TugasAkhirTipe;
  jenisKarya: TugasAkhirJenisKarya;
  judul: string;
  judulInggris: string | null;
  bidangKajian: string | null;
  latarBelakang: string | null;
  rumusanMasalah: string | null;
  tujuan: string | null;
  metodologi: string | null;
  mitraIndustri: string | null;
  programStudiId: number;
  periodeId: string | null;
  status: TugasAkhirStatus;
  createdById: number;
  catatanProdi: string | null;
  tanggalPengajuan: string;
  tanggalDisetujui: string | null;
  tanggalSelesai: string | null;
  fileProposalTopikUrl: string | null;
  fileLaporanAkhirUrl: string | null;
  createdAt: string;
  updatedAt: string;
  prodiNama?: string;
  prodiKode?: string;
  periodeNama?: string;
  creatorNama?: string;
  anggota?: TugasAkhirAnggota[];
  pembimbing?: TugasAkhirPembimbing[];
  logs?: TugasAkhirStatusLog[];
}

export interface TugasAkhirFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  programStudiId?: number;
  periodeId?: string;
  tipe?: string;
  dosenId?: number;
}

export interface CreateTugasAkhirPayload {
  judul: string;
  judulInggris?: string;
  tipe: TugasAkhirTipe;
  jenisKarya: TugasAkhirJenisKarya;
  bidangKajian?: string;
  latarBelakang?: string;
  rumusanMasalah?: string;
  tujuan?: string;
  metodologi?: string;
  mitraIndustri?: string;
  programStudiId?: number;
  periodeId?: string;
  fileProposalTopikUrl?: string;
  mahasiswaId?: number;
  anggotaMahasiswaIds?: number[];
  usulanPembimbing?: {
    peran: 'pembimbing_1' | 'pembimbing_2';
    dosenId?: number;
    namaEksternal?: string;
    instansiEksternal?: string;
    catatan?: string;
  }[];
}

export interface UpdateTugasAkhirPayload {
  judul?: string;
  judulInggris?: string;
  tipe?: TugasAkhirTipe;
  jenisKarya?: TugasAkhirJenisKarya;
  bidangKajian?: string;
  latarBelakang?: string;
  rumusanMasalah?: string;
  tujuan?: string;
  metodologi?: string;
  mitraIndustri?: string;
  fileProposalTopikUrl?: string;
  mahasiswaId?: number;
  anggotaMahasiswaIds?: number[];
  programStudiId?: number;
  usulanPembimbing?: {
    peran: 'pembimbing_1' | 'pembimbing_2';
    dosenId?: number;
    namaEksternal?: string;
    instansiEksternal?: string;
    catatan?: string;
  }[];
}

export interface ReviewTopikPayload {
  status: 'disetujui' | 'ditolak' | 'revisi_proposal_topik';
  catatanProdi?: string;
  pembimbing?: {
    peran: 'pembimbing_1' | 'pembimbing_2';
    dosenId?: number;
    namaEksternal?: string;
    instansiEksternal?: string;
    catatan?: string;
  }[];
}

export interface OverrideStatusPayload {
  keStatus: TugasAkhirStatus;
  alasan: string;
}

export const tugasAkhirController = {
  async getAll(params?: TugasAkhirFilter): Promise<{ data: TugasAkhir[]; total: number; page: number; limit: number }> {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.programStudiId) q.append('programStudiId', String(params.programStudiId));
    if (params?.periodeId) q.append('periodeId', params.periodeId);
    if (params?.tipe) q.append('tipe', params.tipe);
    if (params?.dosenId) q.append('dosenId', String(params.dosenId));

    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetchApi<{
      data: TugasAkhir[];
      total?: number;
      page?: number;
      limit?: number;
      meta?: { total: number; page: number; limit: number };
    }>(`/tugas-akhir${qs}`);

    const total = res.total ?? res.meta?.total ?? (res.data ? res.data.length : 0);
    const page = res.page ?? res.meta?.page ?? (params?.page || 1);
    const limit = res.limit ?? res.meta?.limit ?? (params?.limit || 10);

    return {
      data: res.data || [],
      total,
      page,
      limit,
    };
  },

  async getById(id: number): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir }>(`/tugas-akhir/${id}`);
    return res.data;
  },

  async create(payload: CreateTugasAkhirPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>('/tugas-akhir', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async update(id: number, payload: UpdateTugasAkhirPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>(`/tugas-akhir/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const res = await fetchApi<{ message: string }>(`/tugas-akhir/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  async reviewTopik(id: number, payload: ReviewTopikPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>(`/tugas-akhir/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async overrideStatus(id: number, payload: OverrideStatusPayload): Promise<TugasAkhir> {
    const res = await fetchApi<{ data: TugasAkhir; message: string }>(`/tugas-akhir/${id}/override-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async responUndangan(id: number, statusKonfirmasi: 'diterima' | 'ditolak'): Promise<void> {
    await fetchApi<{ message: string }>(`/tugas-akhir/${id}/respon-undangan`, {
      method: 'POST',
      body: JSON.stringify({ statusKonfirmasi }),
    });
  },

  // Milestone 2: Ruang Bimbingan & Logbook TA
  async getLogbooks(id: number): Promise<TugasAkhirLogbook[]> {
    const res = await fetchApi<{ data: TugasAkhirLogbook[] }>(`/tugas-akhir/${id}/logbooks`);
    return res.data || [];
  },

  async createLogbook(id: number, payload: CreateLogbookPayload): Promise<TugasAkhirLogbook> {
    const res = await fetchApi<{ data: TugasAkhirLogbook; message: string }>(`/tugas-akhir/${id}/logbooks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateLogbook(id: number, logbookId: number, payload: UpdateLogbookPayload): Promise<TugasAkhirLogbook> {
    const res = await fetchApi<{ data: TugasAkhirLogbook; message: string }>(
      `/tugas-akhir/${id}/logbooks/${logbookId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
    return res.data;
  },

  async deleteLogbook(id: number, logbookId: number): Promise<{ message: string }> {
    const res = await fetchApi<{ message: string }>(`/tugas-akhir/${id}/logbooks/${logbookId}`, {
      method: 'DELETE',
    });
    return res;
  },

  async reviewLogbook(id: number, logbookId: number, payload: ReviewLogbookPayload): Promise<TugasAkhirLogbook> {
    const res = await fetchApi<{ data: TugasAkhirLogbook; message: string }>(
      `/tugas-akhir/${id}/logbooks/${logbookId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return res.data;
  },

  async accSidang(id: number, payload: AccSidangPayload): Promise<{ message: string }> {
    const res = await fetchApi<{ message: string }>(`/tugas-akhir/${id}/acc-sidang`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  // Milestone 3: Pendaftaran & Penjadwalan Sidang Proposal
  async getSidangList(id: number): Promise<TugasAkhirSidang[]> {
    const res = await fetchApi<{ data: TugasAkhirSidang[] }>(`/tugas-akhir/${id}/sidang`);
    return res.data || [];
  },

  async daftarSidang(id: number, payload: DaftarSidangPayload): Promise<TugasAkhirSidang> {
    const res = await fetchApi<{ data: TugasAkhirSidang; message: string }>(`/tugas-akhir/${id}/sidang/daftar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async jadwalkanSidang(id: number, sidangId: number, payload: JadwalSidangPayload): Promise<TugasAkhirSidang> {
    const res = await fetchApi<{ data: TugasAkhirSidang; message: string }>(
      `/tugas-akhir/${id}/sidang/${sidangId}/jadwal`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return res.data;
  },

  async getRubrikKriteria(id: number, jenisSidang?: string): Promise<RubrikKriteriaItem[]> {
    const qs = jenisSidang ? `?jenis=${jenisSidang}` : '';
    const res = await fetchApi<{ data: RubrikKriteriaItem[] }>(`/tugas-akhir/${id}/sidang/rubrik${qs}`);
    return res.data || [];
  },

  async inputNilaiSidang(id: number, sidangId: number, payload: InputNilaiSidangPayload): Promise<{ message: string }> {
    const res = await fetchApi<{ message: string }>(`/tugas-akhir/${id}/sidang/${sidangId}/nilai`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async finalisasiSidang(id: number, sidangId: number, payload: FinalisasiSidangPayload): Promise<TugasAkhirSidang> {
    const res = await fetchApi<{ data: TugasAkhirSidang; message: string }>(
      `/tugas-akhir/${id}/sidang/${sidangId}/finalisasi`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return res.data;
  },

  async getRekapNilaiSidang(
    id: number,
    sidangId: number,
  ): Promise<{
    tugasAkhir: TugasAkhir;
    sidang: TugasAkhirSidang;
    timPenguji: TugasAkhirPenguji[];
    anggotaList: { id: number; mahasiswaId: number; nim: string; nama: string; peran: string }[];
    exportRows: {
      no: number;
      nim: string;
      nama: string;
      peran: string;
      judulTa: string;
      programStudi: string;
      jenisSidang: string;
      tanggalSidang: string;
      ruangan: string;
      nilaiAkhir: string;
      nilaiAkhirSkala100: string;
      hurufMutu: string;
      indeksMutu: string;
      statusHasil: string;
      statusRevisi: string;
      catatanSidang: string;
    }[];
  }> {
    const res = await fetchApi<{
      data: {
        tugasAkhir: TugasAkhir;
        sidang: TugasAkhirSidang;
        timPenguji: TugasAkhirPenguji[];
        anggotaList: { id: number; mahasiswaId: number; nim: string; nama: string; peran: string }[];
        exportRows: {
          no: number;
          nim: string;
          nama: string;
          peran: string;
          judulTa: string;
          programStudi: string;
          jenisSidang: string;
          tanggalSidang: string;
          ruangan: string;
          nilaiAkhir: string;
          nilaiAkhirSkala100: string;
          hurufMutu: string;
          indeksMutu: string;
          statusHasil: string;
          statusRevisi: string;
          catatanSidang: string;
        }[];
      };
    }>(`/tugas-akhir/${id}/sidang/${sidangId}/rekap-nilai`);
    return res.data;
  },

  async getRekapKolektifSidang(params?: {
    periodeId?: string;
    programStudiId?: number;
    jenisSidang?: string;
    statusHasil?: string;
  }): Promise<{
    totalSidang: number;
    totalMahasiswa: number;
    exportRows: {
      no: number;
      nim: string;
      nama: string;
      peran: string;
      kodeTa: string;
      judulTa: string;
      programStudi: string;
      periodeId: string;
      jenisSidang: string;
      tanggalSidang: string;
      ruangan: string;
      pembimbing1: string;
      pembimbing2: string;
      dewanPenguji: string;
      nilaiAkhir: string;
      nilaiAkhirSkala100: string;
      hurufMutu: string;
      indeksMutu: string;
      statusHasil: string;
      statusRevisi: string;
      catatanSidang: string;
    }[];
  }> {
    const q = new URLSearchParams();
    if (params?.periodeId) q.append('periodeId', params.periodeId);
    if (params?.programStudiId) q.append('programStudiId', String(params.programStudiId));
    if (params?.jenisSidang) q.append('jenisSidang', params.jenisSidang);
    if (params?.statusHasil) q.append('statusHasil', params.statusHasil);

    const qs = q.toString();
    const url = `/tugas-akhir/sidang/rekap-kolektif${qs ? `?${qs}` : ''}`;
    const res = await fetchApi<{
      data: {
        totalSidang: number;
        totalMahasiswa: number;
        exportRows: {
          no: number;
          nim: string;
          nama: string;
          peran: string;
          kodeTa: string;
          judulTa: string;
          programStudi: string;
          periodeId: string;
          jenisSidang: string;
          tanggalSidang: string;
          ruangan: string;
          pembimbing1: string;
          pembimbing2: string;
          dewanPenguji: string;
          nilaiAkhir: string;
          nilaiAkhirSkala100: string;
          hurufMutu: string;
          indeksMutu: string;
          statusHasil: string;
          statusRevisi: string;
          catatanSidang: string;
        }[];
      };
    }>(url);
    return res.data;
  },

  async submitRevisiSidang(
    id: number,
    sidangId: number,
    payload: { fileRevisiUrl: string; catatanMahasiswa?: string | null },
  ): Promise<{ message: string; statusRevisi: string }> {
    const res = await fetchApi<{ message: string; statusRevisi: string }>(
      `/tugas-akhir/${id}/sidang/${sidangId}/revisi`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return res;
  },

  async accRevisiPenguji(
    id: number,
    sidangId: number,
    pengujiId: number,
  ): Promise<{ message: string; statusAccRevisi: boolean; isAllAcc: boolean; statusRevisi: string }> {
    const res = await fetchApi<{
      message: string;
      statusAccRevisi: boolean;
      isAllAcc: boolean;
      statusRevisi: string;
    }>(`/tugas-akhir/${id}/sidang/${sidangId}/penguji/${pengujiId}/acc-revisi`, {
      method: 'POST',
    });
    return res;
  },
};

export interface TugasAkhirLogbook {
  id: number;
  tugasAkhirId: number;
  mahasiswaId: number;
  dosenId: number | null;
  pertemuanKe: number;
  tanggalBimbingan: string;
  topik: string;
  deskripsiKemajuan: string;
  kendala: string | null;
  catatanDosen: string | null;
  statusBimbingan: 'menunggu' | 'disetujui' | 'perlu_revisi';
  fileDraftUrl: string | null;
  fileRevisiUrl: string | null;
  statusBkd: boolean;
  createdAt: string;
  updatedAt: string;
  mahasiswaNama?: string | null;
  mahasiswaNim?: string | null;
  dosenNama?: string | null;
  dosenNip?: string | null;
}

export interface CreateLogbookPayload {
  dosenId?: number | null;
  pertemuanKe: number;
  tanggalBimbingan: string;
  topik: string;
  deskripsiKemajuan: string;
  kendala?: string | null;
  fileDraftUrl?: string | null;
}

export interface UpdateLogbookPayload {
  dosenId?: number | null;
  pertemuanKe?: number;
  tanggalBimbingan?: string;
  topik?: string;
  deskripsiKemajuan?: string;
  kendala?: string | null;
  fileDraftUrl?: string | null;
}

export interface ReviewLogbookPayload {
  statusBimbingan: 'disetujui' | 'perlu_revisi' | 'menunggu';
  catatanDosen?: string | null;
  fileRevisiUrl?: string | null;
}

export interface AccSidangPayload {
  jenisSidang: 'proposal' | 'akhir';
  statusAcc: boolean;
  catatan?: string | null;
}

export interface TugasAkhirPenguji {
  id: number;
  sidangId: number;
  dosenId: number;
  peranPenguji: 'ketua_penguji' | 'sekretaris' | 'penguji_1' | 'penguji_2' | 'pembimbing_1' | 'pembimbing_2';
  kehadiran: 'hadir' | 'izin' | 'digantikan' | 'belum_konfirmasi' | boolean;
  nilaiTotal: string | number | null;
  catatanRevisi: string | null;
  statusAccRevisi?: boolean;
  accRevisiAt?: string | null;
  dosenNama?: string;
  dosenNip?: string;
}

export interface TugasAkhirSidang {
  id: number;
  tugasAkhirId: number;
  jenisSidang: 'proposal' | 'kemajuan' | 'akhir';
  statusSidang?: 'mendaftar' | 'dijadwalkan' | 'berlangsung' | 'selesai' | 'dibatalkan';
  status?: string;
  tanggalSidang: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  ruangan: string | null;
  berkasProposalUrl?: string | null;
  buktiBebasKompensasiUrl?: string | null;
  buktiPlagiasiUrl?: string | null;
  catatanMahasiswa?: string | null;
  berkasSyarat?: Record<string, unknown> | null;
  nilaiAkhirAngka: string | number | null;
  nilaiAkhirHuruf: string | null;
  statusHasil: 'lulus_tanpa_revisi' | 'lulus_dengan_revisi' | 'sidang_ulang' | 'tidak_lulus' | 'belum_ditentukan';
  batasWaktuRevisi: string | null;
  statusRevisi?: 'belum_selesai' | 'diverifikasi_penguji' | 'tuntas' | string;
  catatanSidang: string | null;
  createdAt: string;
  updatedAt?: string;
  penguji?: TugasAkhirPenguji[];
  timPenguji?: TugasAkhirPenguji[];
}

export interface DaftarSidangPayload {
  jenisSidang?: 'proposal' | 'kemajuan' | 'akhir';
  berkasProposalUrl?: string | null;
  buktiBebasKompensasiUrl?: string | null;
  buktiPlagiasiUrl?: string | null;
  catatanMahasiswa?: string | null;
}

export interface JadwalSidangPayload {
  tanggalSidang: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
  timPenguji: {
    dosenId: number;
    peranPenguji: 'ketua_penguji' | 'sekretaris' | 'penguji_1' | 'penguji_2' | 'pembimbing_1' | 'pembimbing_2';
  }[];
}

export interface RubrikKriteriaItem {
  id: number;
  kode?: string;
  nama?: string;
  namaKriteria?: string;
  kategori?: 'pembimbingan' | 'alat_mesin' | 'laporan' | 'umum';
  deskripsi: string | null;
  bobot?: number;
  bobotPersen?: number;
  isIndividu?: boolean;
  urutan: number;
}

export interface InputNilaiSidangPayload {
  nilaiList: {
    kriteriaId: number;
    mahasiswaId: number;
    nilai: number;
  }[];
  catatanRevisi?: string | null;
}

export interface FinalisasiSidangPayload {
  statusHasil: 'lulus_tanpa_revisi' | 'lulus_dengan_revisi' | 'sidang_ulang' | 'tidak_lulus';
  batasWaktuRevisi?: string | null;
  catatanSidang?: string | null;
}
