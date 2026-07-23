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

interface AdmisiSessionDetail extends AdmisiSession {
  prodis: AdmisiSessionProdi[];
  requirements: AdmisiDocumentRequirement[];
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

interface AdmisiSelectionComponent {
  id: number;
  sessionId: number;
  prodiId?: number | null;
  namaKomponen: string;
  bobot: number;
  tipePenilai: string;
  deskripsi?: string;
  urutan?: number;
  createdAt?: string;
}

interface AdmisiScore {
  id: number;
  applicationId: number;
  componentId: number;
  score: number;
  notes?: string;
  createdAt?: string;
}

interface AdmisiExamSchedule {
  id: number;
  sessionId: number;
  applicationId: number;
  tipeUjian: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai?: string;
  lokasiType: string;
  lokasiDetail?: string;
  isCompleted: boolean;
  createdAt?: string;
}

interface AdmisiPayment {
  id: number;
  applicationId: number;
  bankId?: number;
  nominal: number;
  status: string;
  isVerified: boolean;
  buktiLink?: string;
  createdAt?: string;
}

interface AdmisiBank {
  id: number;
  kode: string;
  nama: string;
  isMidtrans: boolean;
  isActive: boolean;
}

interface AdmisiNIM {
  nim: string;
  applicationId: number;
  mahasiswaId: number;
  noPendaftar: string;
  nama: string;
  createdAt?: string;
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

interface AdmisiStats {
  totalPendaftar: number;
  todayPendaftar: number;
  statusCounts: { status: string; count: number }[];
  perSession: { sessionId: number; nama: string; count: number }[];
  perProdi: { prodiId: number; nama: string; count: number }[];
}

interface PaginatedData<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const admisiAdminController = {
  // Sesi
  getSessions() {
    return fetchApi<{ data: AdmisiSession[] }>('/admisi/admin/sessions');
  },

  getSessionDetail(id: number) {
    return fetchApi<{ data: AdmisiSessionDetail }>(`/admisi/admin/sessions/${id}`);
  },

  createSession(data: {
    kode?: string;
    nama: string;
    deskripsi?: string;
    tanggalMulai: string;
    tanggalTutup: string;
    tanggalAkhir: string;
    tanggalVerif?: string;
    tanggalUjian?: string;
    tanggalPengumuman?: string;
    kuota?: number;
  }) {
    return fetchApi<{ message: string; sessionId: number }>('/admisi/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSession(id: number, data: { nama?: string; tanggalMulai?: string; tanggalAkhir?: string; isActive?: boolean }) {
    return fetchApi<{ message: string }>(`/admisi/admin/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Sesi Prodi
  addProdiToSession(
    sessionId: number,
    data: { prodiId: number; kuota?: number; passingGrade?: number; biayaDaftar?: number },
  ) {
    return fetchApi<{ message: string; sesiProdiId: number }>(`/admisi/admin/sessions/${sessionId}/prodis`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSesiProdi(
    sessionId: number,
    prodiId: number,
    data: { kuota?: number; passingGrade?: number; biayaDaftar?: number; isActive?: boolean },
  ) {
    return fetchApi<{ message: string }>(`/admisi/admin/sessions/${sessionId}/prodis/${prodiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  removeProdiFromSession(sessionId: number, prodiId: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/sessions/${sessionId}/prodis/${prodiId}`, {
      method: 'DELETE',
    });
  },

  toggleProdiActive(sessionId: number, prodiId: number) {
    return fetchApi<{ message: string; isActive: boolean }>(
      `/admisi/admin/sessions/${sessionId}/prodis/${prodiId}/toggle`,
      {
        method: 'PUT',
      },
    );
  },

  // Dokumen Requirements
  createDocumentRequirement(data: {
    sessionId: number;
    namaDokumen: string;
    isWajib?: boolean;
    formatFile?: string;
    maxSizeKb?: number;
    deskripsi?: string;
    urutan?: number;
  }) {
    return fetchApi<{ message: string; requirementId: number }>('/admisi/admin/document-requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDocumentRequirement(
    id: number,
    data: { namaDokumen?: string; isWajib?: boolean; formatFile?: string; maxSizeKb?: number; deskripsi?: string },
  ) {
    return fetchApi<{ message: string }>(`/admisi/admin/document-requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDocumentRequirement(id: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/document-requirements/${id}`, { method: 'DELETE' });
  },

  // Aplikasi
  getApplications(params?: {
    sessionId?: number;
    prodiId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.sessionId) query.set('sessionId', String(params.sessionId));
    if (params?.prodiId) query.set('prodiId', String(params.prodiId));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return fetchApi<PaginatedData<AdmisiApplication>>(`/admisi/admin/applications${qs ? `?${qs}` : ''}`);
  },

  // Verifikasi
  verifyDocument(documentId: number, isVerified: boolean, rejectionNote?: string) {
    return fetchApi<{ message: string }>('/admisi/admin/documents/verify', {
      method: 'PUT',
      body: JSON.stringify({ documentId, isVerified, rejectionNote }),
    });
  },

  updateAppBiodata(id: number, data: Record<string, unknown>) {
    return fetchApi<{ message: string }>(`/admisi/admin/applications/${id}/biodata`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateAppProdi(id: number, prodiPilihan1: number, prodiPilihan2?: number | null) {
    return fetchApi<{ message: string }>(`/admisi/admin/applications/${id}/update-prodi`, {
      method: 'PUT',
      body: JSON.stringify({ prodiPilihan1, prodiPilihan2 }),
    });
  },

  updateApplicationStatus(id: number, status: string, notes?: string) {
    return fetchApi<{ message: string }>(`/admisi/admin/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  verifyAllDocuments(applicationId: number) {
    return fetchApi<{ message: string; verifiedCount: number }>(
      `/admisi/admin/applications/${applicationId}/verify-all-docs`,
      {
        method: 'POST',
      },
    );
  },

  markDocsVerified(applicationId: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/applications/${applicationId}/mark-verified`, {
      method: 'POST',
    });
  },

  adminUploadDocument(applicationId: number, formData: FormData) {
    return fetchApi<{ message: string; documentId: number }>(
      `/admisi/admin/applications/${applicationId}/upload-document`,
      {
        method: 'POST',
        body: formData,
      },
    );
  },

  reopenApplication(id: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/applications/${id}/reopen`, { method: 'POST' });
  },

  // Komponen Penilaian
  getSelectionComponents(sessionId: number) {
    return fetchApi<{ data: AdmisiSelectionComponent[] }>(`/admisi/admin/sessions/${sessionId}/components`);
  },

  createSelectionComponent(data: {
    sessionId: number;
    namaKomponen: string;
    bobot: number;
    tipePenilai?: string;
    deskripsi?: string;
    urutan?: number;
  }) {
    return fetchApi<{ message: string; componentId: number }>('/admisi/admin/components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteSelectionComponent(id: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/components/${id}`, { method: 'DELETE' });
  },

  // Nilai
  inputScore(data: { applicationId: number; componentId: number; score: number; notes?: string }) {
    return fetchApi<{ message: string; scoreId: number }>('/admisi/admin/scores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Jadwal
  getExamSchedules(sessionId: number) {
    return fetchApi<{ data: AdmisiExamSchedule[] }>(`/admisi/admin/sessions/${sessionId}/exam-schedules`);
  },

  createExamSchedule(data: {
    applicationId?: number;
    sessionId: number;
    tipeUjian: string;
    tanggal: string;
    waktuMulai: string;
    waktuSelesai?: string;
    lokasiType: string;
    lokasiDetail?: string;
    reviewerId?: number;
  }) {
    return fetchApi<{ message: string; scheduleId: number }>('/admisi/admin/exam-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Pembayaran
  getPayments() {
    return fetchApi<{ data: AdmisiPayment[] }>('/admisi/admin/payments');
  },

  verifyPayment(paymentId: number, isVerified: boolean, rejectionNote?: string) {
    return fetchApi<{ message: string }>('/admisi/admin/payments/verify', {
      method: 'PUT',
      body: JSON.stringify({ paymentId, isVerified, rejectionNote }),
    });
  },

  // NIM
  generateNIMBulk(sessionId: number, prodiId: number) {
    return fetchApi<{ data: AdmisiNIM[] }>(`/admisi/admin/sessions/${sessionId}/prodis/${prodiId}/generate-nim`);
  },

  validateNIM(nim: string) {
    return fetchApi<{ available: boolean }>(`/admisi/admin/validate-nim?nim=${encodeURIComponent(nim)}`);
  },

  issueNIM(applicationId: number, nim: string) {
    return fetchApi<{ message: string; nim: string }>(`/admisi/admin/applications/${applicationId}/issue-nim`, {
      method: 'POST',
      body: JSON.stringify({ nim }),
    });
  },

  editNIM(applicationId: number, nim: string) {
    return fetchApi<{ message: string; nim: string }>(`/admisi/admin/applications/${applicationId}/edit-nim`, {
      method: 'PUT',
      body: JSON.stringify({ nim }),
    });
  },

  // Pengumuman
  getPassedCandidates(sessionId: number) {
    return fetchApi<{ passed: AdmisiApplication[]; failed: AdmisiApplication[] }>(
      `/admisi/admin/sessions/${sessionId}/candidates`,
    );
  },

  announceResults(sessionId: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/sessions/${sessionId}/announce`, {
      method: 'POST',
    });
  },

  // Stats & Export
  getStats() {
    return fetchApi<AdmisiStats>('/admisi/admin/stats');
  },

  exportApplications(params?: { sessionId?: number; prodiId?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.sessionId) query.set('sessionId', String(params.sessionId));
    if (params?.prodiId) query.set('prodiId', String(params.prodiId));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return fetchApi<{ data: AdmisiApplication[] }>(`/admisi/admin/export${qs ? `?${qs}` : ''}`);
  },

  // All Prodi
  getAllProdi() {
    return fetchApi<{ data: { id: number; nama: string; jenjang: string }[] }>('/admisi/admin/prodis');
  },

  // VA Banks
  getAllVABanks() {
    return fetchApi<{ data: AdmisiBank[] }>('/admisi/admin/va-banks');
  },

  createVABank(data: { kode: string; nama: string; isMidtrans?: boolean }) {
    return fetchApi<{ message: string; bankId: number }>('/admisi/admin/va-banks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateVABank(id: number, data: { kode?: string; nama?: string; isMidtrans?: boolean; isActive?: boolean }) {
    return fetchApi<{ message: string }>(`/admisi/admin/va-banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteVABank(id: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/va-banks/${id}`, { method: 'DELETE' });
  },

  getPendingPayments() {
    return fetchApi<{ data: AdmisiPayment[] }>('/admisi/admin/pending-payments');
  },

  verifyPaymentVA(vaId: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/payments/${vaId}/verify`, { method: 'POST' });
  },

  // Announcements
  getAnnouncements(sessionId?: number) {
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return fetchApi<{ data: AdmisiAnnouncement[] }>(`/admisi/admin/announcements${qs}`);
  },

  createAnnouncement(data: { judul: string; isi: string; sessionId?: number }) {
    return fetchApi<{ message: string; announcementId: number }>('/admisi/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createAnnouncementForm(formData: FormData) {
    return fetchApi<{ message: string; announcementId: number }>('/admisi/admin/announcements', {
      method: 'POST',
      body: formData,
    });
  },

  updateAnnouncement(id: number, data: { judul?: string; isi?: string; isPinned?: boolean }) {
    return fetchApi<{ message: string }>(`/admisi/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateAnnouncementForm(id: number, formData: FormData) {
    return fetchApi<{ message: string }>(`/admisi/admin/announcements/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  deleteAnnouncement(id: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/announcements/${id}`, { method: 'DELETE' });
  },
};
