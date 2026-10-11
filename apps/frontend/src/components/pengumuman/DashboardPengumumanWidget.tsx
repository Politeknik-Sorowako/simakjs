import { A } from '@solidjs/router';
import { createResource, For, Show } from 'solid-js';
import { PengumumanItem, pengumumanController } from '../../controllers/pengumumanController';

interface DashboardPengumumanWidgetProps {
  onSelect?: (item: PengumumanItem) => void;
}

export function DashboardPengumumanWidget(props: DashboardPengumumanWidgetProps) {
  const [feed] = createResource(() => pengumumanController.getFeed('', 1, 5));

  const items = () => feed()?.data || [];

  return (
    <Show when={items().length > 0}>
      <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-2xl p-5 shadow-xs transition-colors">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-secondary-100 dark:border-secondary-800">
          <div class="flex items-center gap-2">
            <span class="text-base">📢</span>
            <h2 class="text-sm font-bold uppercase tracking-wider text-secondary-800 dark:text-white">
              Pengumuman Terbaru
            </h2>
          </div>
          <A href="/pengumuman" class="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff] hover:underline">
            Lihat Semua →
          </A>
        </div>

        <div class="divide-y divide-secondary-100 dark:divide-secondary-800/60">
          <For each={items()}>
            {(p: PengumumanItem) => (
              <A href="/pengumuman" class="py-3 flex items-start justify-between gap-3 group transition-colors block">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <Show when={p.isPinned}>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        📌 PIN
                      </span>
                    </Show>
                    <Show when={p.isRead === false}>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white">BARU</span>
                    </Show>
                    <span class="text-[11px] text-secondary-400">
                      {new Date(p.publishedAt || p.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <h4 class="text-sm font-semibold text-secondary-900 dark:text-white truncate group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]">
                    {p.judul}
                  </h4>
                  <p class="text-xs text-secondary-500 dark:text-secondary-400 truncate mt-0.5">
                    {p.ringkasan || p.konten.slice(0, 100).replace(/[#*`_~]/g, '')}
                  </p>
                </div>
                <span class="text-secondary-300 group-hover:translate-x-1 transition-transform text-sm pt-1">›</span>
              </A>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
