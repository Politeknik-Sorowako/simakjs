import { createSignal, onCleanup, onMount, Show } from 'solid-js';

const DISMISS_KEY = 'simak_pwa_install_dismissed';

type BrowserKind = 'chrome' | 'samsung' | 'firefox' | 'ios' | 'other';

function detectBrowser(): BrowserKind {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && window.navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/samsung/.test(ua) && /android/.test(ua)) return 'samsung';
  if (/firefox/.test(ua)) return 'firefox';
  if (/edg/.test(ua) || /chrome/.test(ua) || /crios/.test(ua)) return 'chrome';
  return 'other';
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = createSignal(false);
  const [showManualGuide, setShowManualGuide] = createSignal(false);
  const [dismissed, setDismissed] = createSignal(false);
  const [installed, setInstalled] = createSignal(false);

  const checkStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || Boolean(navigator.standalone);
  };

  const isIosDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return detectBrowser() === 'ios';
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

  const handleStandaloneChange = (e: MediaQueryListEvent) => {
    setInstalled(e.matches);
  };

  const handleAppInstalled = () => {
    setInstalled(true);
    setDeferredPrompt(null);
    window.deferredPwaPrompt = null;
  };

  const showManual = () => {
    setDismissed(false);
    if (isIosDevice()) {
      setShowIosGuide(true);
    } else {
      setShowManualGuide(true);
    }
  };

  onMount(() => {
    if (checkStandalone()) {
      setInstalled(true);
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
      } else if (deferredPrompt() || window.deferredPwaPrompt) {
        const promptEvent = deferredPrompt() || window.deferredPwaPrompt;
        if (!promptEvent) return;
        setDeferredPrompt(promptEvent);
        void handleInstall();
      } else {
        // No install prompt available: guide user manually per browser
        showManual();
      }
    };

    const mql = window.matchMedia('(display-mode: standalone)');
    setInstalled(mql.matches);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePwaReady);
    window.addEventListener('trigger-pwa-install', handleTriggerManual);
    window.addEventListener('appinstalled', handleAppInstalled);
    mql.addEventListener('change', handleStandaloneChange);

    if (isIosDevice() && !checkDismissed()) {
      setShowIosGuide(true);
    }

    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePwaReady);
      window.removeEventListener('trigger-pwa-install', handleTriggerManual);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mql.removeEventListener('change', handleStandaloneChange);
    });
  });

  const handleInstall = async () => {
    const promptEvent = deferredPrompt() || window.deferredPwaPrompt;
    if (!promptEvent) return;

    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (e: unknown) {
      console.error('Failed to trigger PWA prompt', e);
    } finally {
      // Prompt can only be used once — always clear regardless of outcome
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIosGuide(false);
    setShowManualGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  };

  return (
    <>
      {/* Android & Chromium Banner */}
      <Show when={deferredPrompt() && !dismissed() && !showIosGuide() && !showManualGuide() && !installed()}>
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
      <Show when={showIosGuide() && !dismissed() && !installed()}>
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

      {/* Manual Guide Modal for browsers without beforeinstallprompt */}
      <Show when={showManualGuide() && !installed()}>
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowManualGuide(false)} />
          <div
            id="pwa-manual-guide"
            role="dialog"
            aria-modal="true"
            aria-label="Panduan memasang aplikasi"
            class="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <img src="/pwa-192x192.png" alt="SIMAK Icon" class="h-11 w-11 rounded-xl object-cover shadow-sm" />
                <div>
                  <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Pasang SIMAK Vokasi</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">
                    Browser Anda tidak menyediakan tombol pasang otomatis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                class="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Tutup"
              >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <Show when={detectBrowser() === 'samsung'}>
                <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p class="font-semibold text-slate-800 dark:text-slate-100">Samsung Internet</p>
                  <p class="mt-1">
                    1. Ketuk ikon <span class="font-mono">⋮</span> (Menu) di kanan bawah.
                    <br />
                    2. Pilih <span class="font-semibold">"Tambahkan ke layar utama"</span>.
                  </p>
                </div>
              </Show>
              <Show when={detectBrowser() === 'firefox'}>
                <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p class="font-semibold text-slate-800 dark:text-slate-100">Firefox</p>
                  <p class="mt-1">
                    Instalasi PWA belum didukung penuh di Firefox desktop. Gunakan Chrome, Edge, atau Opera untuk
                    memasang aplikasi, atau gunakan menu <span class="font-mono">☰</span> pada Firefox Android dan pilih{' '}
                    <span class="font-semibold">"Instal"</span> /{' '}
                    <span class="font-semibold">"Add to Home screen"</span>.
                  </p>
                </div>
              </Show>
              <Show when={detectBrowser() === 'chrome' || detectBrowser() === 'other'}>
                <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                  <p class="font-semibold text-slate-800 dark:text-slate-100">Chrome / Edge / Lainnya</p>
                  <p class="mt-1">
                    1. Buka menu <span class="font-mono">⋮</span> atau <span class="font-mono">⋯</span> di pojok kanan
                    atas.
                    <br />
                    2. Pilih <span class="font-semibold">"Pasang / Install SIMAK Vokasi"</span> (atau{' '}
                    <span class="font-semibold">"Save and share → Install"</span>).
                  </p>
                </div>
              </Show>
            </div>

            <div class="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualGuide(false)}
                class="flex-1 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                class="flex-1 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-sky-700 active:scale-95 focus:outline-none"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
