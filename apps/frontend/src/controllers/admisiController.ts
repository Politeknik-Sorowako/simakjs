import { User } from '../contexts/AuthContext';
import { fetchApi } from '../utils/api';

interface AdmisiSession {
  id: number;
  nama: string;
  kode: string;
  tahun: string;
  tanggalMulai: string;
  tanggalTutup: string;
  tanggalVerif?: string;
  tanggalUjian?: string;
  tanggalPengumuman?: string;
  kuota?: number;
  deskripsi?: string;
  isActive: boolean;
  createdAt?: string;
}

interface AdmisiSessionProdi {
  id: number;
  sessionId: number;
  prodiId: number;
  kuota: number | null;
  passingGrade: number | null;
  biayaDaftar: number | null;
  isActive: boolean;
  namaProdi: string;
  jenjang: string;
  kodeProdi?: string;
}

interface AdmisiApplication {
  id: number;
  noPendaftar: string;
  sessionId: number;
  userId: number;
  prodiPilihan1: number;
  prodiPilihan2?: number | null;
  status: string;
  namaLengkap?: string;
  nik?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisKelamin?: string;
  asalSekolah?: string;
  telepon?: string;
  namaIbuKandung?: string;
  jurusanSekolah?: string;
  tahunLulus?: string;
  jalan?: string;
  rt?: string;
  rw?: string;
  kodePos?: string;
  createdAt?: string;
}

interface AdmisiApplicationDetail extends AdmisiApplication {
  session: {
    nama: string;
    kode: string;
    tanggalMulai: string;
    tanggalTutup: string;
    tanggalVerif?: string;
    tanggalUjian?: string;
    tanggalPengumuman?: string;
  } | null;
  prodiPilihan1Data: { nama: string; jenjang?: string } | null;
  prodiPilihan2Data: { nama: string; jenjang?: string } | null;
  isFree: boolean;
  documents: AdmisiDocument[];
  finalScore?: number;
  nimDiterbitkan?: string;
}

interface AdmisiDocument {
  id: number;
  applicationId: number;
  requirementId: number;
  fileLink?: string;
  filePath?: string;
  originalName?: string;
  isVerified: boolean;
  rejectionNote?: string;
  createdAt?: string;
}

interface AdmisiDocumentRequirement {
  id: number;
  sessionId: number;
  prodiId?: number | null;
  namaDokumen: string;
  deskripsi?: string;
  isWajib: boolean;
  formatFile?: string;
  maxSizeKb: number;
  urutan?: number;
  createdAt?: string;
}

interface AdmisiBank {
  id: number;
  kode: string;
  nama: string;
  isMidtrans: boolean;
}

interface AdmisiPayment {
  id: number;
  applicationId: number;
  bankId?: number;
  nominal: number;
  status: string;
  isPaid?: boolean;
  vaNumber?: string;
  nama?: string;
  vaBankId?: number;
  buktiLink?: string;
  createdAt?: string;
}

interface AdmisiVAResponse {
  isPaid: boolean;
  vaNumber: string;
  nama?: string;
  vaBankId: number;
  nominal: number;
}

interface AdmisiAnnouncement {
  id: number;
  sessionId: number;
  judul: string;
  isi: string;
  fileName?: string;
  isPinned: boolean;
  createdAt: string;
}

export const admisiController = {
  // Calon Mahasiswa - Auth
  register(email: string, password: string, nama: string) {
    return fetchApi<User>('/admisi/register', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password, nama }),
    });
  },

  // Sesi
  getActiveSessions() {
    return fetchApi<{ data: AdmisiSession[] }>('/admisi/sessions', { requireAuth: false });
  },

  getSessionProdis(sessionId: number) {
    return fetchApi<{ data: AdmisiSessionProdi[] }>(`/admisi/sessions/${sessionId}/prodis`, { requireAuth: false });
  },

  // Aplikasi
  createApplication(data: { sessionId: number; prodiPilihan1: number; prodiPilihan2?: number }) {
    return fetchApi<{ message: string; applicationId: number; noPendaftar: string }>('/admisi/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyApplications() {
    return fetchApi<{ data: AdmisiApplication[] }>('/admisi/applications');
  },

  getApplicationDetail(id: number) {
    return fetchApi<{ data: AdmisiApplicationDetail }>(`/admisi/applications/${id}`);
  },

  updateApplication(id: number, data: Record<string, unknown>) {
    return fetchApi<{ message: string }>(`/admisi/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  submitApplication(id: number) {
    return fetchApi<{ message: string; status: string }>(`/admisi/applications/${id}/submit`, {
      method: 'POST',
    });
  },

  // Dokumen
  getDocuments(applicationId: number) {
    return fetchApi<{ data: AdmisiDocument[] }>(`/admisi/applications/${applicationId}/documents`);
  },

  uploadDocument(applicationId: number, formData: FormData) {
    return fetchApi<{ message: string; documentId: number }>(`/admisi/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  submitDocumentLink(applicationId: number, data: { requirementId: number; fileLink: string }) {
    return fetchApi<{ message: string; documentId: number }>(`/admisi/applications/${applicationId}/documents/link`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteDocument(documentId: number) {
    return fetchApi<{ message: string }>(`/admisi/documents/${documentId}`, { method: 'DELETE' });
  },

  getDocumentRequirements(sessionId?: number) {
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return fetchApi<{ data: AdmisiDocumentRequirement[] }>(`/admisi/document-requirements${qs}`);
  },

  // Daftar Ulang
  submitPayment(applicationId: number, data: { nominal: number; bankAsal?: string; namaPengirim?: string }) {
    return fetchApi<{ message: string; paymentId: number }>(
      `/admisi/applications/${applicationId}/re-registration/payment`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  },

  getAnnouncements(sessionId?: number) {
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return fetchApi<{ data: AdmisiAnnouncement[] }>(`/admisi/announcements${qs}`);
  },

  getActiveBanks() {
    return fetchApi<{ data: AdmisiBank[] }>('/admisi/payment/banks');
  },

  generateVA(applicationId: number, vaBankId: number) {
    return fetchApi<{ message: string; data: AdmisiVAResponse }>(
      `/admisi/applications/${applicationId}/payment/generate-va`,
      {
        method: 'POST',
        body: JSON.stringify({ vaBankId }),
      },
    );
  },

  getPaymentStatus(applicationId: number) {
    return fetchApi<{ data: AdmisiPayment[] }>(`/admisi/applications/${applicationId}/payment/status`);
  },
};
