import { createSignal, onCleanup, onMount, Show } from 'solid-js';

const DISMISS_KEY = 'simak_pwa_install_dismissed';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = createSignal(false);
  const [dismissed, setDismissed] = createSignal(false);

  const checkStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || Boolean(navigator.standalone);
  };

  const isIosDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosUa = /iphone|ipad|ipod/.test(ua);
    const isIpadOs =
      ua.includes('macintosh') && Boolean(window.navigator.maxTouchPoints && window.navigator.maxTouchPoints > 1);
    return (isIosUa || isIpadOs) && !('MSStream' in window);
  };

  const checkDismissed = (): boolean => {
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (!stored) return false;
      const timestamp = parseInt(stored, 10);
      // Dismiss for 7 days
      if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
        return true;
      }
      localStorage.removeItem(DISMISS_KEY);
      return false;
    } catch {
      return false;
    }
  };

  onMount(() => {
    if (checkStandalone()) {
      return;
    }

    if (checkDismissed()) {
      setDismissed(true);
    }

    // Check if event was captured early in index.html
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePwaReady = () => {
      if (window.deferredPwaPrompt) {
        setDeferredPrompt(window.deferredPwaPrompt);
      }
    };

    const handleTriggerManual = () => {
      setDismissed(false);
      if (isIosDevice()) {
        setShowIosGuide(true);
      } else if (deferredPrompt()) {
        handleInstall();
      } else if (window.deferredPwaPrompt) {
        setDeferredPrompt(window.deferredPwaPrompt);
        handleInstall();
      } else {
        // Fallback info if prompt is unavailable
        alert('Fitur instalasi PWA tidak didukung atau aplikasi sudah terpasang.');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePwaReady);
    window.addEventListener('trigger-pwa-install', handleTriggerManual);

    if (isIosDevice() && !checkDismissed()) {
      setShowIosGuide(true);
    }

    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePwaReady);
      window.removeEventListener('trigger-pwa-install', handleTriggerManual);
    });
  });

  const handleInstall = async () => {
    const promptEvent = deferredPrompt() || window.deferredPwaPrompt;
    if (!promptEvent) return;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        window.deferredPwaPrompt = null;
      }
    } catch (e: unknown) {
      console.error('Failed to trigger PWA prompt', e);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  };

  return (
    <>
      {/* Android & Chromium Banner */}
      <Show when={deferredPrompt() && !dismissed() && !showIosGuide() && !checkStandalone()}>
        <div
          id="pwa-install-prompt"
          class="fixed bottom-5 left-5 z-50 flex max-w-sm items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all dark:border-slate-800/80 dark:bg-slate-900/95"
        >
          <img src="/pwa-192x192.png" alt="SIMAK Icon" class="h-11 w-11 rounded-xl object-cover shadow-sm" />
          <div class="flex-1 text-xs">
            <p class="font-semibold text-slate-900 dark:text-slate-100">Pasang SIMAK Vokasi</p>
            <p class="text-slate-500 dark:text-slate-400">
              Akses lebih cepat langsung dari layar utama perangkat Anda.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              class="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-700 active:scale-95 focus:outline-none"
            >
              Pasang
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </Show>

      {/* iOS Safari Banner Guide */}
      <Show when={showIosGuide() && !dismissed() && !checkStandalone()}>
        <div
          id="pwa-ios-prompt"
          class="fixed bottom-5 left-5 right-5 z-50 max-w-sm rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all sm:left-5 sm:right-auto dark:border-slate-800/80 dark:bg-slate-900/95"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <img src="/pwa-192x192.png" alt="SIMAK Icon" class="h-10 w-10 rounded-xl object-cover shadow-sm" />
              <div>
                <p class="text-xs font-semibold text-slate-900 dark:text-slate-100">Pasang SIMAK Vokasi di iOS</p>
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Tambahkan ke Layar Utama iPhone/iPad Anda</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="mt-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <div class="flex items-center gap-1.5">
              <span>1. Ketuk tombol</span>
              <span class="inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                Bagikan
                <svg class="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </span>
            </div>
            <div class="mt-1 flex items-center gap-1.5">
              <span>2. Pilih</span>
              <span class="font-semibold text-slate-800 dark:text-slate-100">"Tambah ke Layar Utama"</span>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
