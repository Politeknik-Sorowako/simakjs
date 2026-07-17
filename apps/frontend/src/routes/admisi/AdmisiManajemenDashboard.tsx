import { createResource, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { admisiAdminController } from '../../controllers/admisiAdminController';

function StatCard(props: { title: string; value: number | string; color?: string }) {
  return (
    <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
      <div class="text-xs text-secondary-500 uppercase tracking-wider">{props.title}</div>
      <div class={`text-2xl font-bold mt-1 ${props.color || 'text-brand-600'}`}>{props.value}</div>
    </div>
  );
}

export default function AdmisiManajemenDashboard() {
  const [stats] = createResource(() => admisiAdminController.getStats());

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Dashboard PMB</h1>
        <p class="text-sm text-secondary-500 mb-6">Overview penerimaan mahasiswa baru</p>

        <Show when={stats.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show when={stats()}>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Pendaftar" value={stats()?.totalPendaftar || 0} />
            <StatCard title="Hari Ini" value={stats()?.todayPendaftar || 0} color="text-green-600" />
            <For each={stats()?.statusCounts || []}>
              {(s: { status: string; count: number }) => <StatCard title={`Status: ${s.status}`} value={s.count} />}
            </For>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
