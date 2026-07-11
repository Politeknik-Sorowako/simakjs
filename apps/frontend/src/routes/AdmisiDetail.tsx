import { createResource, createSignal, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  documents_verified: 'bg-teal-100 text-teal-700',
  documents_rejected: 'bg-red-100 text-red-700',
  returned: 'bg-amber-100 text-amber-700',
  exam_scheduled: 'bg-purple-100 text-purple-700',
  exam_completed: 'bg-indigo-100 text-indigo-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  re_registration: 'bg-yellow-100 text-yellow-700',
  nim_issued: 'bg-green-100 text-green-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Terkirim',
  documents_verified: 'Dokumen Terverifikasi',
  documents_rejected: 'Dokumen Ditolak',
  returned: 'Dikembalikan',
  exam_scheduled: 'Jadwal Ujian',
  exam_completed: 'Ujian Selesai',
  passed: 'Lulus',
  failed: 'Tidak Lulus',
  re_registration: 'Daftar Ulang',
  nim_issued: 'NIM Diterbitkan',
};

export default function AdmisiDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [submitting, setSubmitting] = createSignal(false);

  const [app] = createResource(() => Number(params.id), (id) =>
    admisiController.getApplicationDetail(id).then((r) => r.data),
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await admisiController.submitApplication(Number(params.id));
      toast.showToast('Pendaftaran berhasil dikirim!', 'success');
      window.location.reload();
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal mengirim', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/admisi/dashboard')} class="text-sm text-brand-600 hover:text-brand-700 mb-4">
          ← Kembali ke Dashboard
        </button>

        <Show when={app.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat data...</div>
        </Show>

        <Show when={app()}>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold">Detail Pendaftaran</h1>
              <p class="text-sm text-secondary-500 font-mono">{app()?.noPendaftar}</p>
            </div>
            <span class={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[app()?.status] || ''}`}>
              {statusLabels[app()?.status] || app()?.status}
            </span>
          </div>

          {/* Info Section */}
          <div class="grid md:grid-cols-2 gap-4 mb-6">
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5">
              <h2 class="font-semibold mb-3">Informasi Pribadi</h2>
              <Show when={app()?.namaLengkap}>
                <div class="text-sm mb-1"><span class="text-secondary-400">Nama:</span> {app()?.namaLengkap}</div>
              </Show>
              <Show when={app()?.nik}>
                <div class="text-sm mb-1"><span class="text-secondary-400">NIK:</span> {app()?.nik}</div>
              </Show>
              <Show when={app()?.tanggalLahir}>
                <div class="text-sm mb-1"><span class="text-secondary-400">Tgl Lahir:</span> {new Date(app()?.tanggalLahir).toLocaleDateString('id-ID')}</div>
              </Show>
              <Show when={app()?.jenisKelamin}>
                <div class="text-sm mb-1"><span class="text-secondary-400">JK:</span> {app()?.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
              </Show>
              <Show when={app()?.asalSekolah}>
                <div class="text-sm mb-1"><span class="text-secondary-400">Asal Sekolah:</span> {app()?.asalSekolah}</div>
              </Show>
            </div>

            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5">
              <h2 class="font-semibold mb-3">Pilihan Prodi</h2>
              <div class="text-sm mb-1">
                <span class="text-secondary-400">Pilihan 1:</span> Prodi #{app()?.prodiPilihan1}
              </div>
              <Show when={app()?.prodiPilihan2}>
                <div class="text-sm mb-1">
                  <span class="text-secondary-400">Pilihan 2:</span> Prodi #{app()?.prodiPilihan2}
                </div>
              </Show>
              <Show when={app()?.finalScore}>
                <div class="text-sm mt-2">
                  <span class="text-secondary-400">Nilai Akhir:</span> {app()?.finalScore}
                </div>
              </Show>
            </div>
          </div>

          {/* Dokumen Section */}
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-semibold">Dokumen</h2>
              <Show when={app()?.status === 'draft' || app()?.status === 'documents_rejected' || app()?.status === 'returned'}>
                <Button onClick={() => navigate(`/admisi/pendaftaran/${params.id}/dokumen`)} size="sm">
                  Kelola Dokumen
                </Button>
              </Show>
            </div>
            <Show when={app()?.documents?.length === 0}>
              <p class="text-sm text-secondary-400">Belum ada dokumen diupload.</p>
            </Show>
            <For each={app()?.documents || []}>
              {(doc: any) => (
                <div class="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 last:border-0">
                  <div class="flex items-center gap-3 min-w-0">
                    {doc.fileLink ? (
                      <a href={doc.fileLink} target="_blank" rel="noopener noreferrer" class="text-sm text-brand-600 hover:underline truncate">
                        🔗 {doc.originalName || 'Link Google Drive'}
                      </a>
                    ) : doc.filePath ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admisi/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm text-brand-600 hover:underline truncate"
                      >
                        📄 {doc.originalName || 'Lihat File'}
                      </a>
                    ) : (
                      <span class="text-sm">{doc.originalName || 'Dokumen'}</span>
                    )}
                    <span class={`text-xs px-2 py-0.5 rounded-full ${doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {doc.isVerified ? 'Terverifikasi' : 'Menunggu'}
                    </span>
                  </div>
                  <Show when={doc.rejectionNote}>
                    <span class="text-xs text-red-500 ml-2">{doc.rejectionNote}</span>
                  </Show>
                </div>
              )}
            </For>
          </div>

          {/* Timeline Log */}
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
            <h2 class="font-semibold mb-3">Riwayat Status</h2>
            <For each={app()?.logs || []}>
              {(log: any) => (
                <div class="flex items-start gap-3 py-2 border-b border-secondary-100 dark:border-secondary-700 last:border-0">
                  <div class="w-2 h-2 mt-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                  <div>
                    <div class="text-sm">{log.message}</div>
                    <div class="text-xs text-secondary-400">{new Date(log.createdAt).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Actions */}
          <Show when={app()?.status === 'draft' || app()?.status === 'documents_rejected' || app()?.status === 'returned'}>
            <div class="flex gap-3">
              <Button onClick={() => navigate(`/admisi/pendaftaran/${params.id}/edit`)} variant="secondary">
                Edit Biodata
              </Button>
              <Button onClick={() => navigate(`/admisi/pendaftaran/${params.id}/dokumen`)} variant="secondary">
                Kelola Dokumen
              </Button>
              <Show when={app()?.status === 'draft' || app()?.status === 'returned'}>
                <Button onClick={handleSubmit} disabled={submitting()}>
                  {submitting() ? 'Mengirim...' : 'Submit Pendaftaran'}
                </Button>
              </Show>
            </div>
          </Show>

          <Show when={app()?.status === 'passed'}>
            <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
              <h2 class="font-semibold text-green-700 dark:text-green-400 mb-2">Selamat! Anda Lulus</h2>
              <p class="text-sm mb-3">Silakan lanjutkan ke tahap daftar ulang.</p>
              <Button onClick={() => navigate(`/admisi/pendaftaran/${params.id}/daftar-ulang`)}>
                Lanjut Daftar Ulang
              </Button>
            </div>
          </Show>

          <Show when={app()?.status === 'nim_issued' && app()?.nimDiterbitkan}>
            <div class="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-5 text-center">
              <div class="text-3xl mb-2">🎉</div>
              <h2 class="font-semibold text-brand-700 dark:text-brand-400 mb-1">NIM Telah Diterbitkan</h2>
              <p class="text-lg font-bold font-mono">{app()?.nimDiterbitkan}</p>
              <p class="text-xs text-secondary-400 mt-1">Anda resmi menjadi mahasiswa Politeknik Sorowako</p>
            </div>
          </Show>
        </Show>
      </div>
    </MainLayout>
  );
}
