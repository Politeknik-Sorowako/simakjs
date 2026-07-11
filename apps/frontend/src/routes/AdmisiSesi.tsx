import { createResource, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiSesi() {
  const navigate = useNavigate();
  const [sessions] = createResource(() => admisiController.getActiveSessions());
  const [apps] = createResource(() => admisiController.getMyApplications());
  const [prodiCache, setProdiCache] = createResource<any, Map<number, any[]>>(
    () => ({}),
    async () => new Map(),
  );

  const registeredSessions = () => new Set((apps()?.data || []).map((a: any) => a.sessionId));

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-4xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">Sesi Admisi Aktif</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-400">
            Pilih sesi penerimaan mahasiswa baru yang sedang dibuka
          </p>
        </div>

        <Show when={sessions.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat sesi...</div>
        </Show>

        <Show when={sessions() && sessions()!.data.length === 0}>
          <div class="text-center py-12 bg-white dark:bg-secondary-800/40 border border-dashed border-secondary-300 dark:border-secondary-600 rounded-xl">
            <div class="text-4xl mb-3">📅</div>
            <h3 class="text-lg font-semibold mb-1">Belum ada sesi dibuka</h3>
            <p class="text-sm text-secondary-500">Saat ini belum ada sesi penerimaan yang aktif.</p>
          </div>
        </Show>

        <div class="grid gap-4">
          <For each={sessions()?.data || []}>
            {(session: any) => {
              const alreadyRegistered = registeredSessions().has(session.id);
              return (
                <div class={`bg-white dark:bg-secondary-800/40 border-2 rounded-xl p-5 transition-colors ${
                  alreadyRegistered
                    ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-secondary-200 dark:border-secondary-700'
                }`}>
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="font-semibold text-lg">{session.nama}</h3>
                        {alreadyRegistered && (
                          <span class="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-semibold">
                            Sudah Daftar
                          </span>
                        )}
                      </div>
                      <Show when={session.deskripsi}>
                        <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{session.deskripsi}</p>
                      </Show>
                      <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                        <div>
                          <span class="font-semibold text-secondary-700 dark:text-secondary-200">Mulai</span>
                          <p>{new Date(session.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <span class="font-semibold text-secondary-700 dark:text-secondary-200">Tutup</span>
                          <p>{new Date(session.tanggalTutup).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <Show when={session.tanggalUjian}>
                          <div>
                            <span class="font-semibold text-secondary-700 dark:text-secondary-200">Ujian</span>
                            <p>{new Date(session.tanggalUjian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                        </Show>
                        <Show when={session.tanggalPengumuman}>
                          <div>
                            <span class="font-semibold text-secondary-700 dark:text-secondary-200">Pengumuman</span>
                            <p>{new Date(session.tanggalPengumuman).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                        </Show>
                      </div>
                      <Show when={session.kuota}>
                        <div class="mt-2 text-xs text-secondary-400">
                          Kuota: {session.kuota} pendaftar
                        </div>
                      </Show>
                    </div>

                    <div class="ml-4 flex-shrink-0">
                      <Button
                        onClick={() => {
                          if (alreadyRegistered) {
                            navigate('/admisi/dashboard');
                          } else {
                            navigate('/admisi/pendaftaran/baru');
                          }
                        }}
                        variant={alreadyRegistered ? 'secondary' : 'primary'}
                      >
                        {alreadyRegistered ? 'Lihat Pendaftaran' : 'Daftar'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </MainLayout>
  );
}
