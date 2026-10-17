import { A } from '@solidjs/router';
import { createResource, For, Show } from 'solid-js';
import { PengumumanItem, pengumumanController } from '../../controllers/pengumumanController';

interface DashboardPengumumanWidgetProps {
  onSelect?: (item: PengumumanItem) => void;
}

export function DashboardPengumumanWidget(props: DashboardPengumumanWidgetProps) {
  const [feed] = createResource(() => pengumumanController.getFeed('', 1, 5));

  const items = () => (feed()?.data || []).slice(0, 5);

  const formatShortDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-secondary-100 dark:border-secondary-800">
          <div class="flex items-center gap-2">
            <span class="text-base">📢</span>
            <h3 class="text-base font-bold text-secondary-800 dark:text-white">Pengumuman Terbaru</h3>
          </div>
          <A href="/pengumuman" class="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff] hover:underline">
            Lihat Semua →
          </A>
        </div>

        <Show
          when={!feed.loading}
          fallback={
            <p class="text-caption text-secondary-400 dark:text-secondary-300 text-center py-8">Memuat pengumuman...</p>
          }
        >
          <Show
            when={items().length > 0}
            fallback={
              <p class="text-caption text-secondary-400 dark:text-secondary-300 text-center py-8">
                Belum ada pengumuman
              </p>
            }
          >
            <div class="divide-y divide-secondary-100 dark:divide-secondary-800/60">
              <For each={items()}>
                {(p: PengumumanItem) => (
                  <A
                    href={`/pengumuman/${p.id}`}
                    class="py-2.5 px-2 -mx-2 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-800/60 flex items-center justify-between gap-3 text-xs transition-colors group block"
                  >
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="text-secondary-400 dark:text-secondary-500 font-mono shrink-0 text-[11px]">
                        [{formatShortDate(p.publishedAt || p.createdAt)}]
                      </span>
                      <Show when={p.isPinned}>
                        <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                          📌 PIN
                        </span>
                      </Show>
                      <Show when={p.isRead === false}>
                        <span class="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-500 text-white shrink-0">
                          BARU
                        </span>
                      </Show>
                      <span
                        class="font-medium text-secondary-800 dark:text-secondary-100 truncate group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]"
                        title={p.judul}
                      >
                        {p.judul}
                      </span>
                    </div>
                    <span class="text-secondary-300 dark:text-secondary-600 group-hover:translate-x-0.5 transition-transform shrink-0 text-sm">
                      ›
                    </span>
                  </A>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      <div class="mt-3 pt-2 text-center border-t border-secondary-100/60 dark:border-secondary-800/40">
        <A href="/pengumuman" class="text-caption font-bold text-action hover:text-action underline">
          Buka Papan Pengumuman →
        </A>
      </div>
    </div>
  );
}
