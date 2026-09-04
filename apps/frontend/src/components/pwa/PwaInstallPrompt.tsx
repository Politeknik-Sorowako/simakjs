import { createSignal, onCleanup, onMount, Show } from 'solid-js';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = createSignal(false);

  onMount(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    });
  });

  const handleInstall = async () => {
    const promptEvent = deferredPrompt();
    if (!promptEvent) return;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <Show when={deferredPrompt() && !dismissed()}>
      <div
        id="pwa-install-prompt"
        class="fixed bottom-4 left-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        <img src="/pwa-192x192.png" alt="SIMAK Icon" class="h-10 w-10 rounded-lg object-cover" />
        <div class="flex-1 text-xs">
          <p class="font-semibold text-slate-800 dark:text-slate-100">Pasang SIMAK Vokasi</p>
          <p class="text-slate-500 dark:text-slate-400">Akses lebih cepat langsung dari layar utama.</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleInstall}
            class="rounded bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700 focus:outline-none"
          >
            Pasang
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            class="rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      </div>
    </Show>
  );
}
