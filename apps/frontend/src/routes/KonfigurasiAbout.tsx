import { createResource, For } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { type HealthStatus, systemController, type VersionInfo } from '../controllers/systemController';

function HealthRow(props: { label: string; value: string }) {
  const ok = () => props.value === 'connected' || props.value === 'ok';
  return (
    <div class="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0 dark:border-secondary-800">
      <span class="text-sm text-secondary-600 dark:text-secondary-400">{props.label}</span>
      <Badge variant={ok() ? 'success' : 'danger'}>{props.value}</Badge>
    </div>
  );
}

export default function KonfigurasiAbout() {
  const [version] = createResource<VersionInfo>(() => systemController.getVersion());
  const [health] = createResource<HealthStatus>(() => systemController.getHealth());

  const items = () => [
    { label: 'Versi Aplikasi', value: `v${version()?.version || '-'}` },
    { label: 'Nomor Build', value: version()?.buildNumber || '-' },
    { label: 'Commit Hash', value: version()?.gitCommitHash || '-' },
    { label: 'Environment', value: version()?.environment || '-' },
    { label: 'Terakhir Diperbarui', value: version()?.lastUpdated || '-' },
  ];

  return (
    <MainLayout>
      <div class="max-w-4xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-secondary-100">About & Versioning</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-400">
            Informasi versi aplikasi, build, dan status kesehatan sistem SIMAK Vokasi.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div class="mb-4">
              <h2 class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Versi Aplikasi</h2>
              <p class="text-xs text-secondary-500">Dibaca otomatis dari package.json</p>
            </div>
            <For each={items()}>
              {(it) => (
                <div class="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0 dark:border-secondary-800">
                  <span class="text-sm text-secondary-600 dark:text-secondary-400">{it.label}</span>
                  <span class="text-sm font-semibold text-secondary-800 dark:text-secondary-100">{it.value}</span>
                </div>
              )}
            </For>
          </Card>

          <Card>
            <div class="mb-4">
              <h2 class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">System Health</h2>
              <p class="text-xs text-secondary-500">Status koneksi database dan layanan</p>
            </div>
            <HealthRow label="Status" value={health()?.status || 'loading'} />
            <HealthRow label="Database" value={health()?.database || 'loading'} />
            <HealthRow label="Cache" value={health()?.cache || 'loading'} />
          </Card>
        </div>

        <Card class="mt-4">
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Changelog</h2>
            <p class="text-xs text-secondary-500">Riwayat pembaruan sistem per versi</p>
          </div>
          <div class="text-sm text-secondary-600 dark:text-secondary-400 space-y-2">
            <div>
              <span class="font-semibold text-secondary-800 dark:text-secondary-100">[1.0.0] — 2026-08-07</span>
              <p class="mt-1">
                Modul <strong>Konfigurasi</strong> menggantikan menu <strong>Integrasi Data</strong>: Manajemen User,
                Pemberian Akses per Role Group (matriks RBAC), Scope Program Studi, Parameter Kompensasi & Akademik,
                Usulan & Evaluasi Sistem, serta About & Versioning.
              </p>
              <p class="mt-1 text-xs text-secondary-400">
                Detail lengkap tersedia pada berkas <code>CHANGELOG.md</code> di repositori.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
