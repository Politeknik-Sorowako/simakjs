import { fetchApi } from '../utils/api';

export const admisiController = {
  // Calon Mahasiswa - Auth
  register(email: string, password: string, nama: string) {
    return fetchApi<any>('/admisi/register', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password, nama }),
    });
  },

  // Sesi
  getActiveSessions() {
    return fetchApi<{ data: any[] }>('/admisi/sessions', { requireAuth: false });
  },

  getSessionProdis(sessionId: number) {
    return fetchApi<{ data: any[] }>(`/admisi/sessions/${sessionId}/prodis`, { requireAuth: false });
  },

  // Aplikasi
  createApplication(data: { sessionId: number; prodiPilihan1: number; prodiPilihan2?: number }) {
    return fetchApi<{ message: string; applicationId: number; noPendaftar: string }>('/admisi/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMyApplications() {
    return fetchApi<{ data: any[] }>('/admisi/applications');
  },

  getApplicationDetail(id: number) {
    return fetchApi<{ data: any }>(`/admisi/applications/${id}`);
  },

  updateApplication(id: number, data: Record<string, any>) {
    return fetchApi<any>(`/admisi/applications/${id}`, {
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
    return fetchApi<{ data: any[] }>(`/admisi/applications/${applicationId}/documents`);
  },

  uploadDocument(applicationId: number, formData: FormData) {
    return fetchApi<any>(`/admisi/applications/${applicationId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  submitDocumentLink(applicationId: number, data: { requirementId: number; fileLink: string }) {
    return fetchApi<any>(`/admisi/applications/${applicationId}/documents/link`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteDocument(documentId: number) {
    return fetchApi<any>(`/admisi/documents/${documentId}`, { method: 'DELETE' });
  },

  getDocumentRequirements(sessionId?: number) {
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return fetchApi<{ data: any[] }>(`/admisi/document-requirements${qs}`);
  },

  // Daftar Ulang
  submitPayment(applicationId: number, data: { nominal: number; bankAsal?: string; namaPengirim?: string }) {
    return fetchApi<any>(`/admisi/applications/${applicationId}/re-registration/payment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
