import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { feedbackController, SystemFeedback } from '../controllers/feedbackController';

export default function EvaluasiSistem() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  const [showModal, setShowModal] = createSignal(false);
  const [kategori, setKategori] = createSignal('usul_pengembangan');
  const [judul, setJudul] = createSignal('');
  const [pesan, setPesan] = createSignal('');
  const [rating, setRating] = createSignal(5);

  const [feedbacks, { refetch }] = createResource(() => feedbackController.getAll());

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!judul() || !pesan()) {
      toast.showToast('Judul dan pesan wajib diisi', 'error');
      return;
    }

    try {
      await feedbackController.create({
        kategori: kategori(),
        judul: judul(),
        pesan: pesan(),
        rating: rating(),
      });
      toast.showToast('Evaluasi / Usulan berhasil dikirim. Terima kasih!', 'success');
      setShowModal(false);
      setJudul('');
      setPesan('');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengirim masukan', 'error');
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await feedbackController.updateStatus(id, newStatus);
      toast.showToast('Status masukan diperbarui', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui status', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Evaluasi & Usul Pengembangan Sistem</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Sampaikan masukan, laporan kendala, atau ide fitur baru untuk pengembangan SIMAK Vokasi
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} variant="primary">
            + Berikan Masukan / Usulan
          </Button>
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-6 shadow-sm">
          <Show
            when={!feedbacks.loading}
            fallback={<p class="text-center text-xs text-secondary-400 py-8">Memuat data masukan...</p>}
          >
            <Show
              when={(feedbacks() || []).length > 0}
              fallback={
                <div class="text-center py-12 text-secondary-400">
                  Belum ada evaluasi atau usulan yang dikirim. Klik tombol di atas untuk mengirimkan masukan pertama
                  Anda.
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 font-semibold">
                      <th class="pb-3">Tanggal</th>
                      <th class="pb-3">Pengirim</th>
                      <th class="pb-3">Kategori</th>
                      <th class="pb-3">Judul & Pesan</th>
                      <th class="pb-3">Rating</th>
                      <th class="pb-3">Status</th>
                      <Show when={user()?.role === 'admin' || user()?.role === 'super_admin'}>
                        <th class="pb-3">Aksi Admin</th>
                      </Show>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={feedbacks()}>
                      {(item: SystemFeedback) => (
                        <tr class="border-b border-secondary-50 dark:border-secondary-800/50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                          <td class="py-3 text-secondary-500 font-mono">
                            {new Date(item.createdAt).toLocaleDateString('id-ID')}
                          </td>
                          <td class="py-3 font-semibold text-secondary-800 dark:text-white">
                            {item.user?.nama || user()?.nama || 'User'}
                            <span class="block text-[10px] text-secondary-400 uppercase">{item.user?.role}</span>
                          </td>
                          <td class="py-3">
                            <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                              {item.kategori === 'usul_pengembangan'
                                ? 'Usul Fitur'
                                : item.kategori === 'bug_report'
                                  ? 'Laporan Bug'
                                  : item.kategori === 'evaluasi'
                                    ? 'Evaluasi'
                                    : 'Lainnya'}
                            </span>
                          </td>
                          <td class="py-3 max-w-xs">
                            <div class="font-bold text-secondary-800 dark:text-white">{item.judul}</div>
                            <div class="text-secondary-500 line-clamp-2 mt-0.5">{item.pesan}</div>
                          </td>
                          <td class="py-3">
                            <span class="text-amber-500 font-bold">★ {item.rating || 5}/5</span>
                          </td>
                          <td class="py-3">
                            <span
                              class={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'implemented'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'in_review'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {item.status === 'implemented'
                                ? 'Diterapkan'
                                : item.status === 'in_review'
                                  ? 'Ditinjau'
                                  : 'Pending'}
                            </span>
                          </td>
                          <Show when={user()?.role === 'admin' || user()?.role === 'super_admin'}>
                            <td class="py-3">
                              <select
                                class="text-[10px] bg-secondary-50 border border-secondary-200 rounded px-2 py-1 dark:bg-secondary-800 dark:text-white"
                                value={item.status}
                                onChange={(e) => handleUpdateStatus(item.id, e.currentTarget.value)}
                              >
                                <option value="pending">Pending</option>
                                <option value="in_review">Ditinjau</option>
                                <option value="implemented">Diterapkan</option>
                                <option value="closed">Ditutup</option>
                              </select>
                            </td>
                          </Show>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      {/* Modal Form Masukan */}
      <Modal isOpen={showModal()} onClose={() => setShowModal(false)} title="Form Evaluasi & Usul Pengembangan">
        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Kategori Masukan</label>
            <select
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={kategori()}
              onChange={(e) => setKategori(e.currentTarget.value)}
            >
              <option value="usul_pengembangan">Usulan Fitur Baru / Pengembangan</option>
              <option value="evaluasi">Evaluasi Pengalaman Penggunaan</option>
              <option value="bug_report">Laporan Kendala / Bug</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          <Input
            type="text"
            label="Judul Masukan / Usulan"
            placeholder="Contoh: Fitur cetak kartu ujian otomatis"
            value={judul()}
            onInput={(e) => setJudul(e.currentTarget.value)}
            required
          />

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
              Pesan Detail / Penjelasan
            </label>
            <textarea
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              rows="4"
              placeholder="Jelaskan secara rinci usulan atau evaluasi Anda untuk sistem..."
              value={pesan()}
              onInput={(e) => setPesan(e.currentTarget.value)}
              required
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
              Penilaian Kepuasan (Rating)
            </label>
            <div class="flex gap-2 items-center">
              <For each={[1, 2, 3, 4, 5]}>
                {(star) => (
                  <button
                    type="button"
                    class={`text-xl transition-transform ${star <= rating() ? 'text-amber-500 scale-110' : 'text-secondary-300'}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                )}
              </For>
              <span class="text-xs text-secondary-500 ml-2">({rating()} / 5 Bintang)</span>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Kirim Masukan
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
