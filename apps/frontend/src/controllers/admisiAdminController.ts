import { fetchApi } from '../utils/api';

export const admisiAdminController = {
  // Sesi
  getSessions() {
    return fetchApi<{ data: any[] }>('/admisi/admin/sessions');
  },

  getSessionDetail(id: number) {
    return fetchApi<{ data: any }>(`/admisi/admin/sessions/${id}`);
  },

  createSession(data: any) {
    return fetchApi<{ message: string; sessionId: number }>('/admisi/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSession(id: number, data: any) {
    return fetchApi<any>(`/admisi/admin/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Sesi Prodi
  addProdiToSession(sessionId: number, data: { prodiId: number; kuota?: number; passingGrade?: number; biayaDaftar?: number }) {
    return fetchApi<any>(`/admisi/admin/sessions/${sessionId}/prodis`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  removeProdiFromSession(sessionId: number, prodiId: number) {
    return fetchApi<any>(`/admisi/admin/sessions/${sessionId}/prodis/${prodiId}`, {
      method: 'DELETE',
    });
  },

  toggleProdiActive(sessionId: number, prodiId: number) {
    return fetchApi<{ message: string; isActive: boolean }>(`/admisi/admin/sessions/${sessionId}/prodis/${prodiId}/toggle`, {
      method: 'PUT',
    });
  },

  // Dokumen Requirements
  createDocumentRequirement(data: any) {
    return fetchApi<{ message: string; requirementId: number }>('/admisi/admin/document-requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDocumentRequirement(id: number, data: any) {
    return fetchApi<any>(`/admisi/admin/document-requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteDocumentRequirement(id: number) {
    return fetchApi<any>(`/admisi/admin/document-requirements/${id}`, { method: 'DELETE' });
  },

  // Aplikasi
  getApplications(params?: { sessionId?: number; prodiId?: number; status?: string; search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.sessionId) query.set('sessionId', String(params.sessionId));
    if (params?.prodiId) query.set('prodiId', String(params.prodiId));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return fetchApi<{ data: any[]; meta: any }>(`/admisi/admin/applications${qs ? `?${qs}` : ''}`);
  },

  // Verifikasi
  verifyDocument(documentId: number, isVerified: boolean, rejectionNote?: string) {
    return fetchApi<any>('/admisi/admin/documents/verify', {
      method: 'PUT',
      body: JSON.stringify({ documentId, isVerified, rejectionNote }),
    });
  },

  updateApplicationStatus(id: number, status: string, notes?: string) {
    return fetchApi<any>(`/admisi/admin/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  verifyAllDocuments(applicationId: number) {
    return fetchApi<{ message: string; verifiedCount: number }>(`/admisi/admin/applications/${applicationId}/verify-all-docs`, {
      method: 'POST',
    });
  },

  reopenApplication(id: number) {
    return fetchApi<any>(`/admisi/admin/applications/${id}/reopen`, { method: 'POST' });
  },

  // Komponen Penilaian
  getSelectionComponents(sessionId: number) {
    return fetchApi<{ data: any[] }>(`/admisi/admin/sessions/${sessionId}/components`);
  },

  createSelectionComponent(data: any) {
    return fetchApi<{ message: string; componentId: number }>('/admisi/admin/components', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteSelectionComponent(id: number) {
    return fetchApi<any>(`/admisi/admin/components/${id}`, { method: 'DELETE' });
  },

  // Nilai
  inputScore(data: { applicationId: number; componentId: number; score: number; notes?: string }) {
    return fetchApi<any>('/admisi/admin/scores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Jadwal
  getExamSchedules(sessionId: number) {
    return fetchApi<{ data: any[] }>(`/admisi/admin/sessions/${sessionId}/exam-schedules`);
  },

  createExamSchedule(data: any) {
    return fetchApi<{ message: string; scheduleId: number }>('/admisi/admin/exam-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Pembayaran
  getPayments() {
    return fetchApi<{ data: any[] }>('/admisi/admin/payments');
  },

  verifyPayment(paymentId: number, isVerified: boolean, rejectionNote?: string) {
    return fetchApi<any>('/admisi/admin/payments/verify', {
      method: 'PUT',
      body: JSON.stringify({ paymentId, isVerified, rejectionNote }),
    });
  },

  // NIM
  generateNIMBulk(sessionId: number, prodiId: number) {
    return fetchApi<{ data: any[] }>(`/admisi/admin/sessions/${sessionId}/prodis/${prodiId}/generate-nim`);
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
    return fetchApi<any>(`/admisi/admin/applications/${applicationId}/edit-nim`, {
      method: 'PUT',
      body: JSON.stringify({ nim }),
    });
  },

  // Pengumuman
  getPassedCandidates(sessionId: number) {
    return fetchApi<{ passed: any[]; failed: any[] }>(`/admisi/admin/sessions/${sessionId}/candidates`);
  },

  announceResults(sessionId: number) {
    return fetchApi<{ message: string }>(`/admisi/admin/sessions/${sessionId}/announce`, {
      method: 'POST',
    });
  },

  // Stats & Export
  getStats() {
    return fetchApi<any>('/admisi/admin/stats');
  },

  exportApplications(params?: { sessionId?: number; prodiId?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.sessionId) query.set('sessionId', String(params.sessionId));
    if (params?.prodiId) query.set('prodiId', String(params.prodiId));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return fetchApi<{ data: any[] }>(`/admisi/admin/export${qs ? `?${qs}` : ''}`);
  },

  // All Prodi
  getAllProdi() {
    return fetchApi<{ data: any[] }>('/admisi/admin/prodis');
  },

  // Announcements
  getAnnouncements(sessionId?: number) {
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return fetchApi<{ data: any[] }>(`/admisi/admin/announcements${qs}`);
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
    return fetchApi<any>(`/admisi/admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateAnnouncementForm(id: number, formData: FormData) {
    return fetchApi<any>(`/admisi/admin/announcements/${id}`, {
      method: 'PUT',
      body: formData,
    });
  },

  deleteAnnouncement(id: number) {
    return fetchApi<any>(`/admisi/admin/announcements/${id}`, { method: 'DELETE' });
  },
};
