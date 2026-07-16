import { useNavigate } from '@solidjs/router';
import { createMemo, createResource, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
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

export default function AdmisiSesi() {
  const navigate = useNavigate();
  const [activeSessions] = createResource(() => admisiController.getActiveSessions());
  const [apps] = createResource(() => admisiController.getMyApplications());

  // Sesi dari riwayat aplikasi (termasuk yang sudah tidak aktif)
  const historySessions = createMemo(() => apps()?.data || []);

  // Sesi aktif yang belum didaftar
  const activeSessionIds = createMemo(() => new Set((activeSessions()?.data || []).map((s: any) => s.id)));
  const newSessions = createMemo(() =>
    (activeSessions()?.data || []).filter((s: any) => !historySessions().some((a: any) => a.sessionId === s.id)),
  );

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-4xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">Riwayat & Sesi Admisi</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-400">
            Daftar sesi penerimaan yang pernah dan sedang tersedia
          </p>
        </div>

        <Show when={apps.loading && activeSessions.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        {/* Sesi yang pernah diapply */}
        <Show when={historySessions().length > 0}>
          <h2 class="text-sm font-semibold text-secondary-500 uppercase tracking-wider mb-3">Riwayat Pendaftaran</h2>
          <div class="grid gap-4 mb-8">
            <For each={historySessions()}>
              {(app: any) => (
                <div class="bg-white dark:bg-secondary-800/40 border-2 border-brand-200 dark:border-brand-800 rounded-xl p-5">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold text-lg">{app.sessionNama || `Sesi #${app.sessionId}`}</h3>
                        <span
                          class={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {statusLabels[app.status] || app.status}
                        </span>
                      </div>
                      <div class="text-xs text-secondary-400 mt-0.5 font-mono">{app.noPendaftar}</div>
                      <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                        <div>
                          <span class="font-semibold text-secondary-700 dark:text-secondary-200">Mulai</span>
                          <p>
                            {app.tanggalMulai
                              ? new Date(app.tanggalMulai).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <span class="font-semibold text-secondary-700 dark:text-secondary-200">Tutup</span>
                          <p>
                            {app.tanggalTutup
                              ? new Date(app.tanggalTutup).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : '-'}
                          </p>
                        </div>
                        <Show when={app.tanggalUjian}>
                          <div>
                            <span class="font-semibold text-secondary-700 dark:text-secondary-200">Ujian</span>
                            <p>
                              {new Date(app.tanggalUjian).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </Show>
                        <Show when={app.tanggalPengumuman}>
                          <div>
                            <span class="font-semibold text-secondary-700 dark:text-secondary-200">Pengumuman</span>
                            <p>
                              {new Date(app.tanggalPengumuman).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </Show>
                      </div>
                    </div>
                    <div class="ml-4 flex-shrink-0">
                      <Button onClick={() => navigate(`/admisi/pendaftaran/${app.id}`)} variant="secondary">
                        Detail
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Sesi aktif baru yang belum didaftar */}
        <Show when={newSessions().length > 0}>
          <h2 class="text-sm font-semibold text-secondary-500 uppercase tracking-wider mb-3">Sesi Aktif Lainnya</h2>
          <div class="grid gap-4">
            <For each={newSessions()}>
              {(session: any) => (
                <div class="bg-white dark:bg-secondary-800/40 border-2 border-secondary-200 dark:border-secondary-700 rounded-xl p-5">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h3 class="font-semibold text-lg">{session.nama}</h3>
                      <Show when={session.deskripsi}>
                        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{session.deskripsi}</p>
                      </Show>
                      <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                        <div>
                          <span class="font-semibold text-secondary-700 dark:text-secondary-200">Mulai</span>
                          <p>
                            {new Date(session.tanggalMulai).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div>
                          <span class="font-semibold text-secondary-700 dark:text-secondary-200">Tutup</span>
                          <p>
                            {new Date(session.tanggalTutup).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Show when={session.tanggalUjian}>
                          <div>
                            <span class="font-semibold text-secondary-700 dark:text-secondary-200">Ujian</span>
                            <p>
                              {new Date(session.tanggalUjian).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </Show>
                        <Show when={session.tanggalPengumuman}>
                          <div>
                            <span class="font-semibold text-secondary-700 dark:text-secondary-200">Pengumuman</span>
                            <p>
                              {new Date(session.tanggalPengumuman).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </Show>
                      </div>
                    </div>
                    <div class="ml-4 flex-shrink-0">
                      <Button onClick={() => navigate('/admisi/pendaftaran/baru')}>Daftar</Button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={!apps.loading && historySessions().length === 0 && newSessions().length === 0}>
          <div class="text-center py-12 bg-white dark:bg-secondary-800/40 border border-dashed border-secondary-300 dark:border-secondary-600 rounded-xl">
            <div class="text-4xl mb-3">📅</div>
            <h3 class="text-lg font-semibold mb-1">Belum ada aktivitas</h3>
            <p class="text-sm text-secondary-500">
              Anda belum mendaftar di sesi manapun, dan tidak ada sesi aktif saat ini.
            </p>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
