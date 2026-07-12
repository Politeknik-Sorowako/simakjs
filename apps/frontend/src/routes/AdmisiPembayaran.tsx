import { createResource, createSignal, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiPembayaran() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [selectedBank, setSelectedBank] = createSignal<number | null>(null);
  const [generating, setGenerating] = createSignal(false);
  const [vaResult, setVaResult] = createSignal<any>(null);

  const [app] = createResource(() => Number(params.id), (id) =>
    admisiController.getApplicationDetail(id).then((r) => r.data),
  );
  const [banks] = createResource(() => admisiController.getActiveBanks());
  const [paymentStatus] = createResource(
    () => vaResult() ? null : Number(params.id),
    (id) => admisiController.getPaymentStatus(id).then((r) => r.data),
  );

  const handleGenerate = async () => {
    if (!selectedBank()) return;
    setGenerating(true);
    try {
      const res = await admisiController.generateVA(Number(params.id), selectedBank()!);
      setVaResult(res.data);
      toast.showToast('Virtual Account berhasil digenerate!', 'success');
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const existingVA = () => {
    const ps = paymentStatus();
    if (ps && ps.length > 0) return ps[ps.length - 1];
    return null;
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)} class="text-sm text-brand-600 hover:text-brand-700 mb-4">
          ← Kembali ke Detail
        </button>

        <h1 class="text-2xl font-bold mb-2">Pembayaran Pendaftaran</h1>
        <p class="text-sm text-secondary-500 mb-6">Lakukan pembayaran untuk melanjutkan proses pendaftaran</p>

        <Show when={existingVA()}>
          {(va: any) => (
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-6 mb-6 text-center">
              <div class="text-3xl mb-2">{va.isPaid ? '✅' : '⏳'}</div>
              <h2 class="font-semibold text-lg mb-1">{va.isPaid ? 'Pembayaran Diterima' : 'Menunggu Pembayaran'}</h2>
              <div class="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4 inline-block mt-2">
                <div class="text-xs text-secondary-400">Nomor Virtual Account</div>
                <div class="text-2xl font-bold font-mono tracking-wider text-brand-600">{va.vaNumber}</div>
              </div>
              <div class="mt-3 text-sm text-secondary-500">
                Bank: {va.nama || `ID ${va.vaBankId}`} | Rp {va.nominal?.toLocaleString('id-ID')}
              </div>
              {!va.isPaid && (
                <p class="text-xs text-secondary-400 mt-2">Transfer ke nomor VA di atas. Pembayaran akan diverifikasi oleh admin.</p>
              )}
            </div>
          )}
        </Show>

        <Show when={!existingVA()}>
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
            <h2 class="font-semibold mb-4">Pilih Metode Pembayaran</h2>
            <div class="grid gap-3">
              <For each={banks()?.data || []}>
                {(bank: any) => (
                  <div
                    onClick={() => setSelectedBank(bank.id)}
                    class={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedBank() === bank.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-secondary-200 dark:border-secondary-700 hover:border-brand-300'
                    }`}
                  >
                    <div class="flex items-center gap-3">
                      <div class={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedBank() === bank.id ? 'border-brand-500' : 'border-secondary-300'
                      }`}>
                        {selectedBank() === bank.id && <div class="w-2.5 h-2.5 rounded-full bg-brand-500" />}
                      </div>
                      <div>
                        <span class="font-medium">{bank.nama}</span>
                        {bank.isMidtrans && <span class="text-xs ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">Otomatis</span>}
                      </div>
                    </div>
                    <span class="text-xs text-secondary-400">Kode: {bank.kode}</span>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="flex gap-3">
            <Button variant="secondary" onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}>Batal</Button>
            <Button onClick={handleGenerate} disabled={!selectedBank() || generating()}>
              {generating() ? 'Memproses...' : 'Generate Virtual Account'}
            </Button>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
