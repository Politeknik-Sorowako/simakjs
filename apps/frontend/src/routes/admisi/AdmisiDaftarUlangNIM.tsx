import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiDaftarUlangNIM() {
  const toast = useToast();
  const [sessionId, setSessionId] = createSignal('');
  const [prodiId, setProdiId] = createSignal('');
  const [nimResults, setNimResults] = createSignal<{ applicationId: number; nama: string; nim: string }[]>([]);
  const [generating, setGenerating] = createSignal(false);
  const [editingNIM, setEditingNIM] = createSignal<Record<number, string>>({});

  const [payments] = createResource(() => admisiAdminController.getPayments());

  const handleGenerate = async () => {
    if (!sessionId() || !prodiId()) {
      toast.showToast('Pilih sesi dan prodi', 'error');
      return;
    }
    setGenerating(true);
    try {
      const res = await admisiAdminController.generateNIMBulk(Number(sessionId()), Number(prodiId()));
      setNimResults(res.data);
      const edits: Record<number, string> = {};
      res.data.forEach((r: { applicationId: number; nama: string; nim: string }) => {
        edits[r.applicationId] = r.nim;
      });
      setEditingNIM(edits);
      toast.showToast('NIM berhasil digenerate', 'success');
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditNIM = async (applicationId: number) => {
    const nim = editingNIM()[applicationId];
    if (!nim) return;
    try {
      await admisiAdminController.editNIM(applicationId, nim);
      toast.showToast('NIM diupdate', 'success');
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const handleIssueNIM = async (applicationId: number) => {
    const nim = editingNIM()[applicationId];
    if (!nim) return;
    try {
      const res = await admisiAdminController.issueNIM(applicationId, nim);
      toast.showToast(`NIM ${res.nim} diterbitkan!`, 'success');
      setNimResults((prev) => prev.filter((r) => r.applicationId !== applicationId));
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const handleIssueAll = async () => {
    for (const r of nimResults()) {
      try {
        await admisiAdminController.issueNIM(r.applicationId, editingNIM()[r.applicationId] || r.nim);
      } catch (err: unknown) {
        toast.showToast(`Gagal untuk ${r.nama}: ${(err as Error).message}`, 'error');
      }
    }
    toast.showToast('Semua NIM diterbitkan!', 'success');
    setNimResults([]);
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Daftar Ulang & Penerbitan NIM</h1>
        <p class="text-sm text-secondary-500 mb-6">Verifikasi pembayaran dan terbitkan NIM</p>

        {/* Payments */}
        <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
          <h2 class="font-semibold mb-3">Pembayaran Daftar Ulang</h2>
          <Show when={payments()?.data?.length === 0}>
            <p class="text-sm text-secondary-400">Belum ada pembayaran.</p>
          </Show>
          <For each={payments()?.data || []}>
            {(p: { id: number; nominal: number; isVerified: boolean }) => (
              <div class="flex items-center justify-between py-2 border-b border-secondary-100 last:border-0">
                <div class="text-sm">
                  Payment #{p.id} — Rp {p.nominal?.toLocaleString('id-ID')}
                  <span
                    class={`ml-2 text-xs px-2 py-0.5 rounded-full ${p.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                  >
                    {p.isVerified ? 'Terverifikasi' : 'Menunggu'}
                  </span>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Generate NIM */}
        <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
          <h2 class="font-semibold mb-3">Generate NIM</h2>
          <div class="flex gap-3 mb-4">
            <input
              type="number"
              placeholder="Sesi ID"
              value={sessionId()}
              onInput={(e) => setSessionId(e.currentTarget.value)}
              class="px-3 py-2 border border-secondary-300 rounded-lg text-sm w-40"
            />
            <input
              type="number"
              placeholder="Prodi ID"
              value={prodiId()}
              onInput={(e) => setProdiId(e.currentTarget.value)}
              class="px-3 py-2 border border-secondary-300 rounded-lg text-sm w-40"
            />
            <Button onClick={handleGenerate} disabled={generating()}>
              {generating() ? 'Memproses...' : 'Generate NIM'}
            </Button>
          </div>

          <Show when={nimResults().length > 0}>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-secondary-200 dark:border-secondary-700">
                    <th class="text-left py-2 px-2">No</th>
                    <th class="text-left py-2 px-2">Nama</th>
                    <th class="text-left py-2 px-2">NIM</th>
                    <th class="text-left py-2 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={nimResults()}>
                    {(r, i) => (
                      <tr class="border-b border-secondary-100 dark:border-secondary-800">
                        <td class="py-2 px-2">{i() + 1}</td>
                        <td class="py-2 px-2">{r.nama}</td>
                        <td class="py-2 px-2">
                          <input
                            value={editingNIM()[r.applicationId] || r.nim}
                            onInput={(e) =>
                              setEditingNIM((prev) => ({ ...prev, [r.applicationId]: e.currentTarget.value }))
                            }
                            class="px-2 py-1 border border-secondary-300 rounded text-sm font-mono w-32"
                          />
                        </td>
                        <td class="py-2 px-2 flex gap-2">
                          <Button size="sm" onClick={() => handleIssueNIM(r.applicationId)}>
                            Terbitkan
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleEditNIM(r.applicationId)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <div class="mt-4">
              <Button onClick={handleIssueAll}>Terbitkan Semua NIM</Button>
            </div>
          </Show>
        </div>
      </div>
    </MainLayout>
  );
}
