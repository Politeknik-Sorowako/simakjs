import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { type FeedbackDetail, feedbackController, type SystemFeedback } from '../controllers/feedbackController';

const KATEGORI_LABEL: Record<string, string> = {
  usul_pengembangan: 'Usul Fitur',
  bug_report: 'Laporan Bug',
  evaluasi: 'Evaluasi',
  lainnya: 'Lainnya',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_review: 'Ditinjau',
  implemented: 'Diterapkan',
  closed: 'Ditutup',
};

const PER_PAGE = 10;

export default function EvaluasiSistem() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const isAdmin = () => auth.hasRole(['admin', 'super_admin']);

  // Create modal state
  const [showModal, setShowModal] = createSignal(false);
  const [kategori, setKategori] = createSignal('usul_pengembangan');
  const [judul, setJudul] = createSignal('');
  const [pesan, setPesan] = createSignal('');
  const [rating, setRating] = createSignal(5);

  // List state (sorting + pagination)
  const [page, setPage] = createSignal(1);
  const [sortBy, setSortBy] = createSignal('');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  // Detail modal state
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const [detailComment, setDetailComment] = createSignal('');

  // Edit modal state
  const [editTarget, setEditTarget] = createSignal<SystemFeedback | null>(null);
  const [editKategori, setEditKategori] = createSignal('usul_pengembangan');
  const [editJudul, setEditJudul] = createSignal('');
  const [editPesan, setEditPesan] = createSignal('');
  const [editRating, setEditRating] = createSignal(5);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = createSignal<SystemFeedback | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  const [feedbacks, { refetch }] = createResource(
    () => ({ page: page(), sortBy: sortBy(), sortOrder: sortOrder() }),
    async ({ page, sortBy, sortOrder }) => {
      return feedbackController.getAll({
        page,
        limit: PER_PAGE,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      });
    },
  );

  const [detail, { refetch: refetchDetail }] = createResource(selectedId, async (id) => {
    if (!id) return null;
    return feedbackController.getById(id);
  });

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
      setKategori('usul_pengembangan');
      setRating(5);
      setPage(1);
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
      if (selectedId() === id) {
        refetchDetail();
      }
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui status', 'error');
    }
  };

  const handleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortBy() !== field) return ' ↕';
    return sortOrder() === 'asc' ? ' ↑' : ' ↓';
  };

  const openDetail = (id: number) => {
    setSelectedId(id);
    setDetailComment('');
  };

  const closeDetail = () => {
    setSelectedId(null);
  };

  const handleToggleLike = async () => {
    const id = selectedId();
    const current = detail();
    if (!id || !current) return;
    try {
      const res = await feedbackController.toggleLike(id);
      toast.showToast(res.liked ? 'Menandai suka' : 'Membatalkan suka', 'info');
      refetchDetail();
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui suka', 'error');
    }
  };

  const handleAddComment = async (e: Event) => {
    e.preventDefault();
    const id = selectedId();
    const text = detailComment().trim();
    if (!id || !text) {
      toast.showToast('Isi komentar terlebih dahulu', 'error');
      return;
    }
    try {
      await feedbackController.addComment(id, text);
      toast.showToast('Komentar berhasil ditambahkan', 'success');
      setDetailComment('');
      refetchDetail();
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal menambahkan komentar', 'error');
    }
  };

  const openEdit = (item: SystemFeedback) => {
    setEditTarget(item);
    setEditKategori(item.kategori);
    setEditJudul(item.judul);
    setEditPesan(item.pesan);
    setEditRating(item.rating || 5);
  };

  const saveEdit = async (e: Event) => {
    e.preventDefault();
    const item = editTarget();
    if (!item) return;
    if (!editJudul() || !editPesan()) {
      toast.showToast('Judul dan pesan wajib diisi', 'error');
      return;
    }
    try {
      await feedbackController.update(item.id, {
        kategori: editKategori(),
        judul: editJudul(),
        pesan: editPesan(),
        rating: editRating(),
      });
      toast.showToast('Masukan berhasil diperbarui', 'success');
      setEditTarget(null);
      refetch();
      if (selectedId() === item.id) {
        refetchDetail();
      }
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui masukan', 'error');
    }
  };

  const openDelete = (item: SystemFeedback) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    const item = deleteTarget();
    if (!item) return;
    setIsDeleting(true);
    try {
      await feedbackController.remove(item.id);
      toast.showToast('Masukan berhasil dihapus', 'success');
      setDeleteTarget(null);
      if (selectedId() === item.id) {
        setSelectedId(null);
      }
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal menghapus masukan', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const canModify = (item: SystemFeedback) => isAdmin() || item.userId === user()?.id;

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
              when={(feedbacks()?.data || []).length > 0}
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
                      <th
                        class="pb-3 cursor-pointer select-none hover:text-brand-600"
                        onClick={() => handleSort('createdAt')}
                      >
                        Tanggal {getSortIcon('createdAt')}
                      </th>
                      <th class="pb-3">Pengirim</th>
                      <th
                        class="pb-3 cursor-pointer select-none hover:text-brand-600"
                        onClick={() => handleSort('kategori')}
                      >
                        Kategori {getSortIcon('kategori')}
                      </th>
                      <th
                        class="pb-3 cursor-pointer select-none hover:text-brand-600"
                        onClick={() => handleSort('judul')}
                      >
                        Judul & Pesan {getSortIcon('judul')}
                      </th>
                      <th
                        class="pb-3 cursor-pointer select-none hover:text-brand-600"
                        onClick={() => handleSort('rating')}
                      >
                        Rating {getSortIcon('rating')}
                      </th>
                      <th
                        class="pb-3 cursor-pointer select-none hover:text-brand-600"
                        onClick={() => handleSort('likeCount')}
                      >
                        Suka {getSortIcon('likeCount')}
                      </th>
                      <th class="pb-3">Komentar</th>
                      <th class="pb-3">Status</th>
                      <Show when={isAdmin()}>
                        <th class="pb-3">Aksi Admin</th>
                      </Show>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={feedbacks()?.data || []}>
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
                              {KATEGORI_LABEL[item.kategori] || item.kategori}
                            </span>
                          </td>
                          <td class="py-3 max-w-xs">
                            <button type="button" onClick={() => openDetail(item.id)} class="text-left group">
                              <div class="font-bold text-secondary-800 dark:text-white group-hover:text-brand-600 group-hover:underline">
                                {item.judul}
                              </div>
                              <div class="text-secondary-500 line-clamp-2 mt-0.5">{item.pesan}</div>
                            </button>
                          </td>
                          <td class="py-3">
                            <span class="text-amber-500 font-bold">★ {item.rating || 5}/5</span>
                          </td>
                          <td class="py-3">
                            <span class="text-secondary-600 dark:text-secondary-300">♥ {item.likeCount ?? 0}</span>
                          </td>
                          <td class="py-3">
                            <span class="text-secondary-600 dark:text-secondary-300">💬 {item.commentCount ?? 0}</span>
                          </td>
                          <td class="py-3">
                            <span
                              class={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'implemented'
                                  ? 'bg-green-100 text-green-700'
                                  : item.status === 'in_review'
                                    ? 'bg-blue-100 text-blue-700'
                                    : item.status === 'closed'
                                      ? 'bg-secondary-100 text-secondary-600'
                                      : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {STATUS_LABEL[item.status] || item.status}
                            </span>
                          </td>
                          <Show when={isAdmin()}>
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

              {/* Pagination */}
              <Show when={(feedbacks()?.meta?.totalPages || 0) > 1}>
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-secondary-100 dark:border-secondary-800">
                  <span class="text-secondary-500">
                    Menampilkan halaman {feedbacks()?.meta?.page} dari {feedbacks()?.meta?.totalPages} (
                    {feedbacks()?.meta?.total} total)
                  </span>
                  <div class="flex items-center gap-2">
                    <Button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page() <= 1}
                      variant="secondary"
                      class="text-xs py-1 px-3"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      onClick={() => setPage((p) => Math.min(feedbacks()?.meta?.totalPages || 1, p + 1))}
                      disabled={page() >= (feedbacks()?.meta?.totalPages || 1)}
                      variant="secondary"
                      class="text-xs py-1 px-3"
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              </Show>
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

      {/* Modal Detail */}
      <Modal
        isOpen={selectedId() !== null}
        onClose={closeDetail}
        title="Detail Evaluasi / Usul Pengembangan"
        maxWidth="lg"
      >
        <Show
          when={!detail.loading && detail()}
          fallback={<div class="p-6 text-center text-secondary-400 dark:text-secondary-200">Memuat detail...</div>}
        >
          {(d) => {
            const item: FeedbackDetail = d();
            return (
              <div class="flex flex-col gap-5 max-h-[80vh] overflow-y-auto pr-1">
                {/* Header */}
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="text-lg font-bold text-secondary-800 dark:text-white">{item.judul}</h3>
                    <div class="flex items-center gap-2 mt-1 text-xs text-secondary-500">
                      <span class="font-semibold text-secondary-700 dark:text-secondary-300">
                        {item.user?.nama || 'User'}
                      </span>
                      <span class="uppercase text-[10px] text-secondary-400">({item.user?.role})</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleLike}
                      class={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        item.isLiked
                          ? 'bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-950/40 dark:text-danger-400 dark:border-danger-800'
                          : 'bg-secondary-50 text-secondary-600 border-secondary-200 dark:bg-secondary-800 dark:text-secondary-300 dark:border-secondary-700'
                      }`}
                    >
                      {item.isLiked ? '♥' : '♡'} {item.likeCount ?? 0}
                    </button>
                  </div>
                </div>

                {/* Meta badges */}
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {KATEGORI_LABEL[item.kategori] || item.kategori}
                  </span>
                  <span class="text-amber-500 font-bold text-xs">★ {item.rating || 5}/5</span>
                  <span
                    class={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'implemented'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'in_review'
                          ? 'bg-blue-100 text-blue-700'
                          : item.status === 'closed'
                            ? 'bg-secondary-100 text-secondary-600'
                            : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {STATUS_LABEL[item.status] || item.status}
                  </span>
                </div>

                {/* Full message */}
                <div class="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4 text-sm text-secondary-700 dark:text-secondary-200 whitespace-pre-wrap leading-relaxed">
                  {item.pesan}
                </div>

                {/* Edit/Delete actions (author or admin) */}
                <Show when={canModify(item)}>
                  <div class="flex items-center gap-2">
                    <Button onClick={() => openEdit(item)} variant="secondary" class="text-xs py-1.5 px-3">
                      Edit
                    </Button>
                    <Button onClick={() => openDelete(item)} variant="danger" class="text-xs py-1.5 px-3">
                      Hapus
                    </Button>
                  </div>
                </Show>

                {/* Comments */}
                <div class="border-t border-secondary-100 dark:border-secondary-800 pt-4">
                  <h4 class="font-bold text-secondary-700 text-sm mb-3 dark:text-secondary-200">
                    Komentar ({item.comments?.length || 0})
                  </h4>
                  <div class="flex flex-col gap-2 mb-4">
                    <For
                      each={item.comments || []}
                      fallback={<p class="text-xs text-secondary-400 italic">Belum ada komentar.</p>}
                    >
                      {(comment) => (
                        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-xl p-3 text-xs">
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-secondary-800 dark:text-white">
                              {comment.user?.nama || 'User'}
                              <span class="text-[10px] text-secondary-400 uppercase ml-1">({comment.user?.role})</span>
                            </span>
                            <span class="text-[10px] text-secondary-400">
                              {new Date(comment.createdAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <p class="mt-1 text-secondary-600 dark:text-secondary-300 whitespace-pre-wrap">
                            {comment.pesan}
                          </p>
                        </div>
                      )}
                    </For>
                  </div>
                  <form onSubmit={handleAddComment} class="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tulis komentar..."
                      value={detailComment()}
                      onInput={(e) => setDetailComment(e.currentTarget.value)}
                      class="flex-1 px-3 py-2 text-xs bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                    />
                    <Button type="submit" variant="primary" class="text-xs py-1.5 px-3">
                      Kirim
                    </Button>
                  </form>
                </div>

                <div class="flex justify-end mt-2 pt-3 border-t border-secondary-100 dark:border-secondary-800">
                  <Button onClick={closeDetail} variant="secondary">
                    Tutup
                  </Button>
                </div>
              </div>
            );
          }}
        </Show>
      </Modal>

      {/* Modal Edit */}
      <Modal
        isOpen={editTarget() !== null}
        onClose={() => setEditTarget(null)}
        title="Edit Evaluasi / Usul Pengembangan"
      >
        <form onSubmit={saveEdit} class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Kategori Masukan</label>
            <select
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={editKategori()}
              onChange={(e) => setEditKategori(e.currentTarget.value)}
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
            value={editJudul()}
            onInput={(e) => setEditJudul(e.currentTarget.value)}
            required
          />

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Pesan Detail</label>
            <textarea
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              rows="4"
              value={editPesan()}
              onInput={(e) => setEditPesan(e.currentTarget.value)}
              required
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Rating</label>
            <div class="flex gap-2 items-center">
              <For each={[1, 2, 3, 4, 5]}>
                {(star) => (
                  <button
                    type="button"
                    class={`text-xl transition-transform ${star <= editRating() ? 'text-amber-500 scale-110' : 'text-secondary-300'}`}
                    onClick={() => setEditRating(star)}
                  >
                    ★
                  </button>
                )}
              </For>
              <span class="text-xs text-secondary-500 ml-2">({editRating()} / 5 Bintang)</span>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Delete Confirmation */}
      <Modal isOpen={deleteTarget() !== null} onClose={() => setDeleteTarget(null)} title="Konfirmasi Hapus">
        <div class="flex flex-col gap-4">
          <p class="text-xs text-secondary-600 dark:text-secondary-300">
            Apakah Anda yakin ingin menghapus masukan{' '}
            <strong class="text-secondary-900 dark:text-white">{deleteTarget()?.judul}</strong>? Komentar dan suka
            terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div class="flex justify-end gap-2 mt-2">
            <Button type="button" onClick={() => setDeleteTarget(null)} variant="secondary">
              Batal
            </Button>
            <Button onClick={confirmDelete} variant="danger" disabled={isDeleting()}>
              {isDeleting() ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
