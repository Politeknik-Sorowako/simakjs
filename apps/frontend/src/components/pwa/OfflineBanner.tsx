import { createSignal, onCleanup, onMount, Show } from 'solid-js';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = createSignal(!navigator.onLine);

  onMount(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    onCleanup(() => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  });

  return (
    <Show when={isOffline()}>
      <div
        role="status"
        id="offline-banner"
        class="bg-amber-600 px-4 py-2 text-center text-xs font-medium text-white shadow-md transition-all dark:bg-amber-700"
      >
        <div class="flex items-center justify-center gap-2">
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18.364 5.636a9 9 0 010 12.728m-2.828-2.828a5 5 0 010-7.072m-4.243 4.243a1 1 0 11-1.414-1.414 1 1 0 011.414 1.414zM4.93 4.93l14.14 14.14"
            />
          </svg>
          <span>Anda sedang dalam mode offline. Beberapa fitur yang memerlukan koneksi server mungkin terbatas.</span>
        </div>
      </div>
    </Show>
  );
}
