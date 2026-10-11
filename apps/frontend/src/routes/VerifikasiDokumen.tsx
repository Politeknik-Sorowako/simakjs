import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createSignal, For, type JSX, Match, Show, Switch } from 'solid-js';
import { Button } from '../components/ui/Button';
import { TurnstileWidget } from '../components/ui/TurnstileWidget';
import { useAuth } from '../contexts/AuthContext';
import { documentSignatureController, type SignatureInfo } from '../controllers/documentSignatureController';

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

function extractKode(raw: string): string {
  const m = raw.trim().match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return m ? m[0] : raw.trim();
}

export default function VerifikasiDokumen() {
  const params = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [input, setInput] = createSignal('');
  const [currentUuid, setCurrentUuid] = createSignal(params.uuid ?? '');
  const [result, setResult] = createSignal<SignatureInfo | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [formError, setFormError] = createSignal('');
  const [turnstileToken, setTurnstileToken] = createSignal('');
  const [turnstileReset, setTurnstileReset] = createSignal(0);
  const [attemptedUuid, setAttemptedUuid] = createSignal('');

  // Token Turnstile sekali pakai → reset widget setelah setiap request agar
  // verifikasi berikutnya (kode berbeda) memperoleh token baru (pola forgot-password).
  const resetCaptcha = () => {
    if (!TURNSTILE_SITE_KEY) return;
    setTurnstileToken('');
    setTurnstileReset((c) => c + 1);
  };

  const runVerify = async (code: string, token: string) => {
    if (!code || loading()) return;
    setLoading(true);
    setFormError('');
    try {
      const res = await documentSignatureController
        .verifyPublic(code, token)
        .catch((): SignatureInfo => ({ status: 'NOT_FOUND' }));
      // Kegagalan antibot / rate limit (bukan hasil verifikasi dokumen) → tampilkan pesannya.
      if (res.error) {
        setFormError(res.error);
        setResult(null);
        return;
      }
      setResult(res);
    } finally {
      setLoading(false);
      resetCaptcha();
    }
  };

  // Verifikasi dijalankan saat target UUID jelas dan captcha (bila dikonfigurasi)
  // sudah selesai — mencegah pemanggilan mesin tanpa token Turnstile.
  const maybeVerify = () => {
    const code = currentUuid();
    const token = turnstileToken();
    if (!code || loading()) return;
    if (TURNSTILE_SITE_KEY && !token) return;
    if (attemptedUuid() === code) return;
    setAttemptedUuid(code);
    void runVerify(code, token);
  };
  createEffect(maybeVerify);

  const submit = () => {
    const code = extractKode(input());
    if (!code) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken()) {
      setFormError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }
    setFormError('');
    setCurrentUuid(code);
    // Paksa verifikasi ulang walau kode sama dengan yang terakhir diuji.
    setAttemptedUuid('');
    // Navigasi ke route yang sama (prefix saat ini) agar tidak remount & mengulang captcha.
    const base = window.location.pathname.startsWith('/v/') ? '/v' : '/verifikasi';
    navigate(`${base}/${code}`, { replace: true });
  };

  return (
    <div class="min-h-screen flex items-center justify-center p-4 bg-secondary-50 dark:bg-secondary-950">
      <div class="w-full max-w-lg bg-white dark:bg-secondary-900 rounded-2xl shadow-xl border border-secondary-200/80 dark:border-secondary-800 p-8">
        <div class="text-center mb-6">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400">
            <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 class="text-xl font-heading font-bold text-secondary-900 dark:text-white">Verifikasi Dokumen</h1>
          <p class="mt-1 text-sm text-secondary-500 dark:text-secondary-300">
            Memeriksa keaslian tanda tangan digital dokumen resmi Politeknik Sorowako.
          </p>
        </div>

        {/* Antibot Turnstile — sebelum hasil di-fetch (pola /forgot-password) */}
        <Show when={TURNSTILE_SITE_KEY}>
          <div class="mb-1 flex flex-col items-center">
            <TurnstileWidget
              siteKey={TURNSTILE_SITE_KEY}
              theme={auth.theme() === 'dark' ? 'dark' : 'light'}
              onVerify={(token) => {
                setTurnstileToken(token);
                setFormError('');
              }}
              onExpire={() => setTurnstileToken('')}
              onError={() => setTurnstileToken('')}
              resetCounter={turnstileReset()}
            />
            <Show when={!turnstileToken()}>
              <span class="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                Selesaikan verifikasi keamanan sebelum memeriksa dokumen.
              </span>
            </Show>
          </div>
        </Show>

        <Show when={formError()}>
          <p class="mb-2 text-center text-xs font-semibold text-danger-600 dark:text-danger-400">{formError()}</p>
        </Show>

        {/* Input manual kode / URL */}
        <form
          class="mb-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            placeholder="Tempel kode atau tautan verifikasi…"
            class="w-full rounded-xl border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-800 placeholder:text-secondary-400 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-100"
          />
          <Button type="submit" variant="primary">
            Verifikasi
          </Button>
        </form>

        <Show
          when={!loading() && result()}
          fallback={
            <Show
              when={loading()}
              fallback={
                <div class="flex flex-col items-center justify-center py-8 text-center text-secondary-500 dark:text-secondary-300">
                  <svg
                    class="mb-2 h-6 w-6 text-secondary-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p class="text-sm">
                    {currentUuid()
                      ? 'Selesaikan verifikasi keamanan untuk memeriksa keaslian dokumen.'
                      : 'Masukkan kode atau tautan verifikasi dari dokumen untuk memulai pemeriksaan.'}
                  </p>
                </div>
              }
            >
              <div class="flex flex-col items-center justify-center py-10 text-secondary-500 dark:text-secondary-300">
                <div class="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                <p class="text-sm">Memeriksa keaslian dokumen…</p>
              </div>
            </Show>
          }
        >
          <Switch fallback={null}>
            <Match when={result()?.status === 'VALID' ? result() : undefined}>
              {(res) => (
                <ResultCard
                  type="success"
                  icon={
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  }
                  title="Dokumen Valid & Asli"
                  subtitle="Tanda tangan digital dokumen ini terverifikasi dan diterbitkan oleh Politeknik Sorowako."
                  data={() => ({
                    'Jenis Dokumen': res().docType || '-',
                    Nama: res().namaMask || '-',
                    NIM: res().nimMask || '-',
                    'Program Studi': res().prodi || '-',
                    Periode: res().periodeNama || '-',
                    Ditandatangani: res().signerNama
                      ? `${res().signerNama}${res().signerJabatan ? ` • ${res().signerJabatan}` : ''}`
                      : '-',
                    'Waktu TTE': res().signedAtWITA ? `${res().signedAtWITA} (WITA)` : '-',
                    'Fingerprint (Hash)': res().docHashShort || '-',
                  })}
                />
              )}
            </Match>
            <Match when={result()?.status === 'REVOKED'}>
              <ResultCard
                type="danger"
                icon={
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 16l-4-4m0 0l-4-4m4 4l-4 4m4-4l4-4m-9 9H3a2 2 0 01-2-2v-8a2 2 0 012-2h18a2 2 0 012 2v8a2 2 0 01-2 2h-5"
                  />
                }
                title="Dokumen DICABUT"
                subtitle="Tanda tangan digital dokumen ini telah dicabut oleh penerbit. Dokumen tidak lagi berlaku."
              />
            </Match>
            <Match when={result()?.status === 'TAMPERED' || result()?.status === 'NOT_FOUND'}>
              <ResultCard
                type="danger"
                icon={
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                }
                title="Dokumen Tidak Valid"
                subtitle="Kode verifikasi tidak dikenali atau dokumen tidak dapat diverifikasi. Pastikan QR/kode yang dipindai benar."
              />
            </Match>
          </Switch>
        </Show>

        <div class="mt-6 text-center">
          <a href="/" class="text-sm font-semibold text-primary-600 underline hover:text-primary-700">
            Kembali ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}

interface ResultCardProps {
  type: 'success' | 'danger';
  title: string;
  subtitle: string;
  icon: JSX.Element;
  data?: () => Record<string, string>;
}

function ResultCard(props: ResultCardProps) {
  const isSuccess = () => props.type === 'success';
  return (
    <div class="text-center">
      <div
        class={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
          isSuccess()
            ? 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400'
            : 'bg-danger-50 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
        }`}
      >
        <svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          {props.icon}
        </svg>
      </div>
      <h2
        class={`text-lg font-heading font-bold ${
          isSuccess() ? 'text-success-700 dark:text-success-400' : 'text-danger-700 dark:text-danger-400'
        }`}
      >
        {props.title}
      </h2>
      <p class="mt-1 text-sm text-secondary-600 dark:text-secondary-400">{props.subtitle}</p>

      <Show when={props.data}>
        <dl class="mt-5 space-y-2 rounded-xl bg-secondary-50 dark:bg-secondary-800 p-4 text-left">
          <For each={Object.entries(props.data!())}>
            {([label, value]) => (
              <div class="flex items-start justify-between gap-3 text-sm">
                <dt class="text-secondary-500 dark:text-secondary-300">{label}</dt>
                <dd class="font-semibold text-secondary-800 dark:text-secondary-100 break-all text-right">
                  {label.includes('Hash') ? <span class="font-mono">{value}</span> : value}
                </dd>
              </div>
            )}
          </For>
        </dl>
      </Show>
    </div>
  );
}
