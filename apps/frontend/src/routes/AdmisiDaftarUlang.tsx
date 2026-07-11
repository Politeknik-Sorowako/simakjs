import { createResource, createSignal, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiDaftarUlang() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [nominal, setNominal] = createSignal('');
  const [bankAsal, setBankAsal] = createSignal('');
  const [namaPengirim, setNamaPengirim] = createSignal('');
  const [ukuranJas, setUkuranJas] = createSignal('M');
  const [saving, setSaving] = createSignal(false);

  const [app] = createResource(() => Number(params.id), (id) =>
    admisiController.getApplicationDetail(id).then((r) => r.data),
  );

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!nominal() || Number(nominal()) <= 0) {
      toast.showToast('Masukkan nominal pembayaran', 'error');
      return;
    }
    setSaving(true);
    try {
      await admisiController.submitPayment(Number(params.id), {
        nominal: Number(nominal()),
        bankAsal: bankAsal() || undefined,
        namaPengirim: namaPengirim() || undefined,
      });
      await admisiController.updateApplication(Number(params.id), { ukuranJas: ukuranJas() });
      toast.showToast('Bukti pembayaran berhasil dikirim!', 'success');
      navigate(`/admisi/pendaftaran/${params.id}`);
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-2xl mx-auto">
        <button onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)} class="text-sm text-brand-600 hover:text-brand-700 mb-4">
          ← Kembali
        </button>

        <h1 class="text-2xl font-bold mb-2">Daftar Ulang</h1>
        <p class="text-sm text-secondary-500 mb-6">Lengkapi data daftar ulang untuk mendapatkan NIM.</p>

        <Show when={app() && app()!.status !== 'passed' && app()!.status !== 're_registration' && app()!.status !== 'nim_issued'}>
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center text-amber-700 dark:text-amber-400">
            Status pendaftaran belum memungkinkan untuk daftar ulang.
          </div>
        </Show>

        <Show when={app() && (app()!.status === 'passed' || app()!.status === 're_registration' || app()!.status === 'nim_issued')}>
          <form onSubmit={handleSubmit} class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 space-y-4">
            <Show when={app()!.status === 'nim_issued' && app()!.nimDiterbitkan}>
              <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <div class="text-lg font-bold text-green-700 dark:text-green-400 font-mono">
                  NIM: {app()!.nimDiterbitkan}
                </div>
                <div class="text-xs text-green-600 dark:text-green-500 mt-1">
                  Selamat! Anda resmi menjadi mahasiswa.
                </div>
              </div>
            </Show>

            <Show when={app()!.status !== 'nim_issued'}>
              <Input
                label="Nominal Pembayaran (Rp)"
                type="number"
                required
                value={nominal()}
                onInput={(e) => setNominal(e.currentTarget.value)}
              />
              <Input
                label="Bank Asal"
                value={bankAsal()}
                onInput={(e) => setBankAsal(e.currentTarget.value)}
              />
              <Input
                label="Nama Pengirim"
                value={namaPengirim()}
                onInput={(e) => setNamaPengirim(e.currentTarget.value)}
              />

              <div>
                <label class="text-sm font-medium text-secondary-700 dark:text-secondary-300 block mb-1">Ukuran Jas Almamater</label>
                <select
                  value={ukuranJas()}
                  onChange={(e) => setUkuranJas(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
                >
                  <option value="S">S (Small)</option>
                  <option value="M">M (Medium)</option>
                  <option value="L">L (Large)</option>
                  <option value="XL">XL (Extra Large)</option>
                </select>
              </div>

              <Button type="submit" disabled={saving()} class="w-full">
                {saving() ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
              </Button>
            </Show>
          </form>
        </Show>
      </div>
    </MainLayout>
  );
}
