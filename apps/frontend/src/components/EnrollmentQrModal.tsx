import QRCode from 'qrcode';
import { createEffect, createSignal, Show } from 'solid-js';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { type PublicRombelInfo, rombelPraktikumController } from '../controllers/rombelPraktikumController';

interface EnrollmentQrModalProps {
  isOpen: boolean;
  rombelId: number;
  rombelNama: string;
  onClose: () => void;
}

export default function EnrollmentQrModal(props: EnrollmentQrModalProps) {
  const [token, setToken] = createSignal('');
  const [qrDataUrl, setQrDataUrl] = createSignal('');
  const [info, setInfo] = createSignal<PublicRombelInfo | null>(null);
  const [enabled, setEnabled] = createSignal(false);
  const [publicBaseUrl, setPublicBaseUrl] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');

  const publicUrl = () => {
    const base = publicBaseUrl() || window.location.origin;
    return `${base}/rombel/enroll/${token()}`;
  };

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await rombelPraktikumController.generateEnrollmentToken(props.rombelId);
      setToken(res.token);
      setEnabled(res.enrollmentEnabled);
      const url = publicUrl();
      const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
      setQrDataUrl(dataUrl);
      const fetchedInfo = await rombelPraktikumController.getPublicRombel(res.token);
      setInfo(fetchedInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat token enroll');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    setLoading(true);
    setError('');
    try {
      const next = !enabled();
      const res = await rombelPraktikumController.toggleEnrollment(props.rombelId, next);
      setEnabled(Boolean(res.enrollmentEnabled));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah status enroll');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl());
    } catch {
      // clipboard tidak tersedia; abaikan
    }
  };

  const reset = () => {
    setToken('');
    setQrDataUrl('');
    setInfo(null);
    setEnabled(false);
    setError('');
  };

  createEffect(() => {
    if (props.isOpen) {
      reset();
    }
  });

  return (
    <Modal isOpen={props.isOpen} title={`Enrollment Mahasiswa — ${props.rombelNama}`} onClose={props.onClose}>
      <div class="space-y-5">
        <Show when={error() !== ''}>
          <div class="rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800 p-3 text-sm text-danger-700 dark:text-danger-300">
            {error()}
          </div>
        </Show>

        <Show when={token() === ''}>
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            Hasilkan token satu kali untuk membuat link & kode QR self-enrollment mahasiswa.
          </p>
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="text-xs font-semibold text-secondary-500 dark:text-secondary-400">
                Base URL publik (opsional)
              </label>
              <div class="mt-1">
                <Input
                  placeholder="https://siakad.example.com"
                  value={publicBaseUrl()}
                  onInput={(e) => setPublicBaseUrl(e.currentTarget.value)}
                />
              </div>
            </div>
            <Button onClick={generate} loading={loading()}>
              Generate
            </Button>
          </div>
        </Show>

        <Show when={token() !== ''}>
          <div class="space-y-4">
            <div class="flex items-end gap-2">
              <div class="flex-1">
                <label class="text-xs font-semibold text-secondary-500 dark:text-secondary-400">Link Enroll</label>
                <div class="mt-1 flex gap-2 items-center">
                  <input
                    readonly
                    value={publicUrl()}
                    class="w-full px-3 py-2 text-xs rounded-lg border border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-800 font-mono"
                  />
                  <Button onClick={copyUrl} variant="secondary">
                    Salin
                  </Button>
                </div>
              </div>
              <Button onClick={generate} variant="secondary" loading={loading()}>
                Regenerate
              </Button>
            </div>

            <div class="flex justify-center">
              <Show when={qrDataUrl()} fallback={<div class="h-72" />}>
                <img
                  src={qrDataUrl()}
                  width={280}
                  height={280}
                  alt="QR Code enrollment"
                  class="rounded-xl border border-secondary-200 dark:border-secondary-800 p-3 bg-white"
                />
              </Show>
            </div>

            <Show when={info()}>
              {(i) => (
                <div class="text-sm text-secondary-600 dark:text-secondary-300 space-y-1">
                  <p>
                    Rombel: <span class="font-semibold">{i().namaGroup}</span>
                  </p>
                  <p>
                    Terdaftar: <span class="font-semibold">{i().enrolledCount}</span>
                    <Show when={i().enrollmentMaxStudents}> / {i().enrollmentMaxStudents}</Show>
                  </p>
                  <p>
                    Status:{' '}
                    <span class={`font-semibold ${enabled() ? 'text-success-600' : 'text-danger-600'}`}>
                      {enabled() ? 'Aktif (mahasiswa dapat enrol)' : 'Nonaktif'}
                    </span>
                  </p>
                  <Show when={i().enrollmentExpiresAt}>
                    {(t) => <p>Berlaku s.d: {new Date(t()).toLocaleString()}</p>}
                  </Show>
                </div>
              )}
            </Show>

            <div class="flex justify-end gap-2">
              <Button onClick={toggle} variant={enabled() ? 'danger' : 'success'} loading={loading()}>
                {enabled() ? 'Nonaktifkan Enroll' : 'Aktifkan Enroll'}
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </Modal>
  );
}
