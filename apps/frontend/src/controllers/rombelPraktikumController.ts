import { fetchApi } from '../utils/api';
import { Mahasiswa } from './mahasiswaController';

export interface RombelPraktikum {
  id: number;
  kelasKuliahId: number;
  namaGroup: string;
  instrukturId?: number | null;
  keterangan?: string | null;
  enrollmentToken?: string | null;
  enrollmentEnabled?: boolean;
  enrollmentMaxStudents?: number | null;
  enrollmentExpiresAt?: string | null;
  instruktur?: { id: number; nama: string; nip: string } | null;
  mahasiswaList?: { id: number; mahasiswaId: number; mahasiswa?: Mahasiswa }[];
}

export interface BapPraktikum {
  id: number;
  rombelPraktikumId: number;
  tanggal: string;
  sesiKe: number;
  tema?: string | null;
  materi: string;
  catatan?: string | null;
  durasiMenit: number;
  instrukturId?: number | null;
  instruktur?: { id: number; nama: string } | null;
}

export interface PresensiPraktikumItem {
  id: number;
  bapPraktikumId: number;
  mahasiswaId: number;
  status: string;
  durasiMangkir: number;
  keterangan?: string | null;
  mahasiswa?: Mahasiswa;
}

export const rombelPraktikumController = {
  async getByKelas(kelasKuliahId: number): Promise<RombelPraktikum[]> {
    return fetchApi<RombelPraktikum[]>(`/rombel-praktikum/kelas/${kelasKuliahId}`);
  },

  async createRombel(payload: {
    kelasKuliahId: number;
    namaGroup: string;
    instrukturId?: number | null;
    keterangan?: string | null;
  }): Promise<RombelPraktikum> {
    return fetchApi<RombelPraktikum>('/rombel-praktikum', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateRombel(
    id: number,
    payload: Partial<{
      namaGroup: string;
      instrukturId?: number | null;
      keterangan?: string | null;
    }>,
  ): Promise<RombelPraktikum> {
    return fetchApi<RombelPraktikum>(`/rombel-praktikum/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteRombel(id: number): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/rombel-praktikum/${id}`, {
      method: 'DELETE',
    });
  },

  async assignMahasiswa(id: number, mahasiswaIds: number[]): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/rombel-praktikum/${id}/mahasiswa`, {
      method: 'POST',
      body: JSON.stringify({ mahasiswaIds }),
    });
  },

  async getBapByRombel(rombelId: number): Promise<BapPraktikum[]> {
    return fetchApi<BapPraktikum[]>(`/rombel-praktikum/${rombelId}/bap`);
  },

  async createBap(payload: {
    rombelPraktikumId: number;
    tanggal: string;
    sesiKe: number;
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    instrukturId?: number | null;
    sesiIds?: number[];
  }): Promise<BapPraktikum> {
    return fetchApi<BapPraktikum>('/rombel-praktikum/bap', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateBap(
    id: number,
    payload: Partial<{
      tanggal: string;
      sesiKe: number;
      tema?: string | null;
      materi: string;
      catatan?: string | null;
      durasiMenit: number;
      instrukturId?: number | null;
    }>,
  ): Promise<BapPraktikum> {
    return fetchApi<BapPraktikum>(`/rombel-praktikum/bap/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateBapBulk(payload: {
    bapPraktikumId: number;
    tanggal: string;
    sesiIds: number[];
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    instrukturId?: number | null;
  }): Promise<BapPraktikum[]> {
    return fetchApi<BapPraktikum[]>('/rombel-praktikum/bap/bulk', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async savePresensiBulk(payload: {
    bapPraktikumId: number;
    presensiList: {
      mahasiswaId: number;
      status: string;
      durasiMangkir?: number;
      keterangan?: string;
    }[];
  }): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>('/rombel-praktikum/presensi', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPresensiByBap(bapPraktikumId: number): Promise<PresensiPraktikumItem[]> {
    return fetchApi<PresensiPraktikumItem[]>(`/rombel-praktikum/bap/${bapPraktikumId}/presensi`);
  },

  async syncPresensiToKelas(rombelId: number, bapPraktikumId: number): Promise<SyncResult> {
    return fetchApi<SyncResult>(`/rombel-praktikum/${rombelId}/sync-presensi`, {
      method: 'POST',
      body: JSON.stringify({ bapPraktikumId }),
    });
  },

  async syncNilaiToKelas(rombelId: number): Promise<SyncResult> {
    return fetchApi<SyncResult>(`/rombel-praktikum/${rombelId}/sync-nilai`, {
      method: 'POST',
    });
  },

  async generateEnrollmentToken(id: number): Promise<{ token: string; enrollmentEnabled: boolean }> {
    return fetchApi<{ token: string; enrollmentEnabled: boolean }>(`/rombel-praktikum/${id}/generate-token`, {
      method: 'POST',
    });
  },

  async toggleEnrollment(id: number, enabled: boolean): Promise<RombelPraktikum> {
    return fetchApi<RombelPraktikum>(`/rombel-praktikum/${id}/toggle-enrollment`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  async getEnrollmentLog(id: number): Promise<EnrollmentLogItem[]> {
    return fetchApi<EnrollmentLogItem[]>(`/rombel-praktikum/${id}/enrollment-log`);
  },

  async getPublicRombel(token: string): Promise<PublicRombelInfo> {
    return fetchApi<PublicRombelInfo>(`/rombel-praktikum/public/${token}`, { requireAuth: false });
  },

  async enrollByToken(token: string): Promise<{ member: EnrollmentMember; rombelNama: string }> {
    return fetchApi<{ member: EnrollmentMember; rombelNama: string }>(`/rombel-praktikum/public/enroll/${token}`, {
      method: 'POST',
    });
  },
};

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  bapTeoriId?: number;
}

export interface EnrollmentMember {
  id: number;
  rombelPraktikumId: number;
  mahasiswaId: number;
}

export interface EnrollmentLogItem {
  id: number;
  rombelPraktikumId: number;
  mahasiswaId: number;
  enrolledAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  mahasiswa?: Mahasiswa;
}

export interface PublicRombelInfo {
  id: number;
  namaGroup: string;
  keterangan?: string | null;
  enrollmentEnabled: boolean;
  enrollmentMaxStudents?: number | null;
  enrollmentExpiresAt?: string | null;
  enrolledCount: number;
  instruktur?: { id: number; nama: string; nip: string } | null;
  mataKuliah?: { id: number; kode: string; nama: string } | null;
}
