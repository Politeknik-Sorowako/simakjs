import { useRegisterSW } from 'virtual:pwa-register/solid';
import { createSignal, onMount, Show } from 'solid-js';

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          60 * 60 * 1000,
        ); // Check for updates hourly
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <Show when={needRefresh() || offlineReady()}>
      <div
        role="alert"
        aria-live="polite"
        class="fixed bottom-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-lg border border-sky-200 bg-white p-4 shadow-xl dark:border-sky-800 dark:bg-slate-800"
      >
        <div class="flex-1 text-sm text-slate-700 dark:text-slate-200">
          <Show when={needRefresh()} fallback={<span>Aplikasi SIMAK Vokasi siap digunakan dalam mode offline.</span>}>
            <span>Versi baru SIMAK Vokasi telah tersedia. Muat ulang untuk memperbarui.</span>
          </Show>
        </div>
        <div class="flex items-center gap-2">
          <Show when={needRefresh()}>
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              class="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Perbarui
            </button>
          </Show>
          <button
            type="button"
            onClick={close}
            class="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </Show>
  );
}
