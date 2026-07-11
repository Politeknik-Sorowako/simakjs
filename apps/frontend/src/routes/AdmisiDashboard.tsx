import { createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { admisiController } from '../controllers/admisiController';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  documents_verified: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  documents_rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  returned: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  exam_scheduled: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  exam_completed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  passed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  re_registration: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  nim_issued: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
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

export default function AdmisiDashboard() {
  const auth = useAuth();

  const [apps] = createResource(() => admisiController.getMyApplications());

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Dashboard PMB</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-400">
              Selamat datang, {auth.user()?.nama}
            </p>
          </div>
          <A
            href="/admisi/pendaftaran/baru"
            class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            + Daftar Baru
          </A>
        </div>

        <Show when={apps.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat data...</div>
        </Show>

        <Show when={apps() && apps()!.data.length === 0}>
          <div class="text-center py-12 bg-white dark:bg-secondary-800/40 border border-dashed border-secondary-300 dark:border-secondary-600 rounded-xl">
            <div class="text-4xl mb-3">📋</div>
            <h3 class="text-lg font-semibold mb-1">Belum ada pendaftaran</h3>
            <p class="text-sm text-secondary-500 mb-4">Anda belum membuat pendaftaran apa pun.</p>
            <A
              href="/admisi/pendaftaran/baru"
              class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
            >
              Mulai Daftar Sekarang
            </A>
          </div>
        </Show>

        <div class="grid gap-4">
          <For each={apps()?.data || []}>
            {(app: any) => (
              <A
                href={`/admisi/pendaftaran/${app.id}`}
                class="block bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-xs text-secondary-400 font-mono">{app.noPendaftar || '--'}</span>
                    <h3 class="font-semibold mt-0.5">
                      Sesi #{app.sessionId}
                    </h3>
                  </div>
                  <span class={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[app.status] || app.status}
                  </span>
                </div>
                <div class="mt-2 text-xs text-secondary-400">
                  Dibuat: {new Date(app.createdAt).toLocaleDateString('id-ID')}
                </div>
              </A>
            )}
          </For>
        </div>
      </div>
    </MainLayout>
  );
}
