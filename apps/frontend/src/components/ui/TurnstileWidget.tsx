import { createEffect, createUniqueId, onCleanup, onMount, Show } from 'solid-js';

declare global {
  interface Window {
    turnstile?: {
      render: (el: string | HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  theme?: 'light' | 'dark' | 'auto';
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  resetCounter: number;
}

/**
 * Widget Cloudflare Turnstile (tanpa dependensi npm — embed script official).
 * Situs key dibaca dari env build `VITE_TURNSTILE_SITE_KEY` oleh pemanggil.
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  const containerId = `turnstile-${createUniqueId()}`;
  let widgetId: string | undefined;

  const loadScript = () =>
    new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && window.turnstile) return resolve();
      const existing = document.getElementById('cf-turnstile-script') as HTMLScriptElement | null;
      if (existing) {
        if (window.turnstile) resolve();
        else existing.addEventListener('load', () => resolve(), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.addEventListener('load', () => resolve(), { once: true });
      s.addEventListener('error', () => resolve(), { once: true });
      document.head.appendChild(s);
    });

  onMount(async () => {
    if (!props.siteKey) return;
    await loadScript();
    const el = document.getElementById(containerId);
    if (!el || !window.turnstile) return;
    widgetId = window.turnstile.render(el, {
      sitekey: props.siteKey,
      theme: props.theme || 'auto',
      callback: (token: string) => props.onVerify(token),
      'expired-callback': () => props.onExpire(),
      'error-callback': () => props.onError(),
    });
  });

  // Reset widget setiap kali parent menaikkan resetCounter (mis. setelah submit).
  createEffect(() => {
    if (props.resetCounter > 0 && widgetId) {
      window.turnstile?.reset(widgetId);
    }
  });

  onCleanup(() => {
    if (widgetId) window.turnstile?.remove(widgetId);
  });

  return (
    <Show when={props.siteKey}>
      <div id={containerId} />
    </Show>
  );
}
