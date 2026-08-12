import { createResource, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import {
  type ChangelogItem,
  type ChangelogSection,
  type HealthStatus,
  systemController,
  type VersionInfo,
} from '../controllers/systemController';

function HealthRow(props: { label: string; value: string }) {
  const ok = () => props.value === 'connected' || props.value === 'ok';
  return (
    <div class="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0 dark:border-secondary-800">
      <span class="text-sm text-secondary-600 dark:text-secondary-400">{props.label}</span>
      <Badge variant={ok() ? 'success' : 'danger'}>{props.value}</Badge>
    </div>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800 text-brand-700 dark:text-brand-300 text-[11px]">$1</code>',
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-secondary-800 dark:text-secondary-100">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function ChangelogItemView(props: { item: ChangelogItem }) {
  return (
    <>
      <span innerHTML={renderInline(props.item.text)} />
      <Show when={(props.item.children || []).length > 0}>
        <ul class="list-disc pl-5 mt-0.5">
          <For each={props.item.children}>
            {(child) => (
              <li>
                <span innerHTML={renderInline(child)} />
              </li>
            )}
          </For>
        </ul>
      </Show>
    </>
  );
}

function ChangelogSectionView(props: { section: ChangelogSection }) {
  return (
    <div class="border border-secondary-100 dark:border-secondary-800 rounded-xl p-4">
      <h3 class="text-sm font-semibold text-secondary-800 dark:text-secondary-100">
        {props.section.version}
        <Show when={props.section.date}>
          <span class="ml-2 text-xs font-normal text-secondary-400">— {props.section.date}</span>
        </Show>
      </h3>
      <Show
        when={(props.section.groups || []).length > 0}
        fallback={<p class="mt-2 text-xs text-secondary-400">Belum ada catatan untuk versi ini.</p>}
      >
        <div class="mt-2 flex flex-col gap-2">
          <For each={props.section.groups}>
            {(group) => (
              <div>
                <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                  {group.heading}
                </span>
                <ul class="mt-1 list-disc pl-5 text-xs text-secondary-600 dark:text-secondary-400 space-y-0.5">
                  <For each={group.items}>
                    {(item) => (
                      <li>
                        <ChangelogItemView item={item} />
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function KonfigurasiAbout() {
  const [version] = createResource<VersionInfo>(() => systemController.getVersion());
  const [health] = createResource<HealthStatus>(() => systemController.getHealth());
  const [changelog] = createResource<ChangelogSection[]>(() => systemController.getChangelog());

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
            <HealthRow label="Database" value={health()?.database || '-'} />
            <HealthRow label="Uptime" value={health()?.uptime != null ? `${health()?.uptime}s` : '-'} />
          </Card>
        </div>

        <Card class="mt-4">
          <div class="mb-4">
            <h2 class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Changelog</h2>
            <p class="text-xs text-secondary-500">Riwayat pembaruan sistem per versi</p>
          </div>
          <Show
            when={!changelog.loading && (changelog() || []).length > 0}
            fallback={
              <p class="text-sm text-secondary-400">
                {changelog.loading
                  ? 'Memuat changelog...'
                  : changelog.error
                    ? 'Gagal memuat changelog.'
                    : 'Belum ada data changelog.'}
              </p>
            }
          >
            <div class="flex flex-col gap-3">
              <For each={changelog()}>{(section) => <ChangelogSectionView section={section} />}</For>
            </div>
          </Show>
        </Card>
      </div>
    </MainLayout>
  );
}
