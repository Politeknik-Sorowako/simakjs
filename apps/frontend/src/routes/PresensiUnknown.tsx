import { createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { PresensiUnknownItem, presensiController } from '../controllers/presensiController';
import { PresensiPraktikumUnknownItem, rombelPraktikumController } from '../controllers/rombelPraktikumController';
import { fmtWaktu } from '../utils/format';

export default function PresensiUnknown() {
  const toast = useToast();
  const workspace = useWorkspace();

  const [tab, setTab] = createSignal<'perkuliahan' | 'praktikum'>('perkuliahan');

  const [page, setPage] = createSignal(1);
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<'belum' | 'sudah' | ''>('');
  const [submitting, setSubmitting] = createSignal(false);
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(searchDebounceTimer));

  const [resolveModal, setResolveModal] = createSignal<PresensiUnknownItem | PresensiPraktikumUnknownItem | null>(null);
  const [resolveStatus, setResolveStatus] = createSignal<'sakit' | 'izin' | 'alpa'>('alpa');
  const [resolveNote, setResolveNote] = createSignal('');
  const [resolveDurasi, setResolveDurasi] = createSignal(0);
  const [isAnulir, setIsAnulir] = createSignal(false);

  const [previewItem, setPreviewItem] = createSignal<PresensiUnknownItem | null>(null);
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [previewFileType, setPreviewFileType] = createSignal('image/*');

  const openPreview = async (item: PresensiUnknownItem) => {
    if (!item.lampiranEvidens) return;
    setPreviewItem(item);
    setPreviewUrl(null);
    setPreviewLoading(true);
    setPreviewFileType(/\.pdf$/i.test(item.lampiranEvidens) ? 'application/pdf' : 'image/*');
    try {
      const url = await presensiController.getLampiranBlobUrl(item.lampiranEvidens);
      setPreviewUrl(url);
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal memuat berkas surat', 'error');
      setPreviewItem(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    const url = previewUrl();
    if (url) URL.revokeObjectURL(url);
    setPreviewUrl(null);
    setPreviewItem(null);
  };

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      search: debouncedSearch(),
      prodiId: workspace.selectedProdiId(),
      statusFilter: statusFilter(),
      tab: tab(),
    }),
    async (params) => {
      if (params.tab === 'praktikum') {
        return rombelPraktikumController.getUnknownList(
          params.page,
          20,
          params.search || undefined,
          params.prodiId ?? undefined,
          params.statusFilter || undefined,
        );
      }
      return presensiController.getUnknownList(
        params.page,
        20,
        params.search || undefined,
        params.prodiId ?? undefined,
        params.statusFilter || undefined,
      );
    },
  );

  const openResolve = (item: PresensiUnknownItem | PresensiPraktikumUnknownItem) => {
    setResolveModal(item);
    setResolveStatus(item.status === 'unknown' ? 'alpa' : (item.status as 'sakit' | 'izin' | 'alpa'));
    setResolveNote(item.keteranganAdmin || '');
    setResolveDurasi(item.durasiMangkir || 0);
    setIsAnulir(item.durasiMangkir === 0);
  };

  const isResolved = (item: PresensiUnknownItem | PresensiPraktikumUnknownItem) => !!item.resolvedAt;

  const statusWord = (st: string) => (st === 'sakit' ? 'Sakit' : st === 'izin' ? 'Izin' : st === 'alpa' ? 'Alpa' : st);

  const konfirmasiBadge = (item: PresensiUnknownItem | PresensiPraktikumUnknownItem) => {
    if (isResolved(item)) {
      return (
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          ✓ Dikonfirmasi · {statusWord(item.status)}
        </span>
      );
    }
    return (
      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        ⏳ Belum ditindaklanjuti
      </span>
    );
  };

  const handleResolve = async () => {
    const item = resolveModal();
    if (!item) return;
    if (!resolveStatus()) {
      toast.showToast('Pilih status konfirmasi terlebih dahulu', 'error');
      return;
    }
    if (isAnulir() && !resolveNote().trim()) {
      toast.showToast('Alasan/keterangan wajib diisi saat menganulir', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await presensiController.verifikasiUnknown({
        sumber: tab() === 'praktikum' ? 'PRAKTIKUM' : 'BAP',
        sumberId: item.id,
        statusKonfirmasi: resolveStatus().toUpperCase() as 'SAKIT' | 'IZIN' | 'ALPA',
        durasiMenit: isAnulir() ? 0 : resolveDurasi(),
        keterangan: resolveNote() || undefined,
      });
      toast.showToast(
        isAnulir()
          ? `Presensi ${item.nama} berhasil dianulir (durasi 0)`
          : `Status ${item.nama} berhasil dikonfirmasi menjadi ${resolveStatus()}`,
        'success',
      );
      setResolveModal(null);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengonfirmasi status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Konfirmasi Presensi Unknown</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Kelola presensi berstatus <strong>Unknown</strong> dari perkuliahan (BAP) maupun praktikum. Status
            konfirmasi ditampilkan untuk mengidentifikasi presensi yang belum ditindaklanjuti (⏳ Belum) vs yang sudah
            dikonfirmasi (✓). Status unknown tidak diperhitungkan ke dalam rekap kompensasi sampai dikonfirmasi menjadi
            Sakit / Izin / Alpa.
          </p>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setTab('perkuliahan');
              setPage(1);
            }}
            class={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab() === 'perkuliahan'
                ? 'bg-brand-600 text-white'
                : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-300'
            }`}
          >
            Perkuliahan
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('praktikum');
              setPage(1);
            }}
            class={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab() === 'praktikum'
                ? 'bg-brand-600 text-white'
                : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-300'
            }`}
          >
            Praktikum
          </button>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-wrap gap-4 items-center mb-4">
            <input
              type="text"
              placeholder="Cari NIM / Nama mahasiswa..."
              class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={search()}
              onInput={(e) => {
                const q = e.currentTarget.value;
                setSearch(q);
                setPage(1);
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => setDebouncedSearch(q), 350);
              }}
            />
            <select
              class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value as 'belum' | 'sudah' | '');
                setPage(1);
                refetch();
              }}
            >
              <option value="">Semua Status</option>
              <option value="belum">Belum ditindaklanjuti</option>
              <option value="sudah">Sudah dikonfirmasi</option>
            </select>
            <span class="text-xs text-secondary-500 dark:text-secondary-300 ml-auto">
              Total: <strong>{data()?.meta.total || 0}</strong> data
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold">
                  <th class="py-3 px-4">No</th>
                  <th class="py-3 px-4">Mahasiswa</th>
                  <th class="py-3 px-4">Prodi</th>
                  <th class="py-3 px-4">Mata Kuliah (Kelas)</th>
                  <th class="py-3 px-4">Dosen Pengampu</th>
                  <th class="py-3 px-4">Pertemuan & Tanggal</th>
                  <th class="py-3 px-4">Waktu Pencatatan</th>
                  <th class="py-3 px-4">Materi</th>
                  <th class="py-3 px-4 text-center">Surat Bukti</th>
                  <th class="py-3 px-4">Status Konfirmasi</th>
                  <th class="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                <For each={(data()?.data || []) as Array<PresensiUnknownItem & Partial<PresensiPraktikumUnknownItem>>}>
                  {(item, idx) => (
                    <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                      <td class="py-3 px-4">{idx() + 1}</td>
                      <td class="py-3 px-4">
                        <div class="font-bold text-secondary-800 dark:text-white">{item.nama}</div>
                        <div class="text-xs text-secondary-400 dark:text-secondary-200 font-mono">{item.nim}</div>
                      </td>
                      <td class="py-3 px-4 text-xs">{item.prodiNama || '-'}</td>
                      <td class="py-3 px-4 text-xs">
                        <div class="font-semibold text-secondary-700 dark:text-secondary-100">
                          {item.mataKuliahNama || '-'}
                        </div>
                        <div class="text-xs text-secondary-400">
                          {item.mataKuliahKode || ''} · Kelas {item.namaKelas}
                        </div>
                        <Show when={tab() === 'praktikum' && item.namaGroup}>
                          <div class="text-[11px] text-secondary-400">Rombel: {item.namaGroup}</div>
                        </Show>
                      </td>
                      <td class="py-3 px-4 text-xs">{item.dosenNama || '-'}</td>
                      <td class="py-3 px-4 text-xs">
                        <Show
                          when={tab() === 'perkuliahan'}
                          fallback={
                            <div>
                              <div>Sesi {item.bapPrakSesiKe ?? '-'}</div>
                              <div class="text-secondary-400 dark:text-secondary-200">{item.bapPrakTanggal}</div>
                            </div>
                          }
                        >
                          <div>Pertemuan {item.bapPertemuan}</div>
                          <div class="text-secondary-400 dark:text-secondary-200">{item.bapTanggal}</div>
                        </Show>
                      </td>
                      <td class="py-3 px-4 text-xs">{fmtWaktu(item.createdAt)}</td>
                      <td class="py-3 px-4 text-xs max-w-xs truncate" title={item.bapPrakMateri || item.bapMateri}>
                        {tab() === 'praktikum' ? item.bapPrakMateri : item.bapMateri}
                      </td>
                      <td class="py-3 px-4 text-center">
                        <Show
                          when={tab() === 'perkuliahan' && item.lampiranEvidens}
                          fallback={<span class="text-xs text-secondary-300">-</span>}
                        >
                          <Button variant="secondary" size="sm" onClick={() => openPreview(item)}>
                            Lihat Surat
                          </Button>
                        </Show>
                      </td>
                      <td class="py-3 px-4">
                        {konfirmasiBadge(item)}
                        <Show when={isResolved(item)}>
                          <div class="text-[11px] text-secondary-400 dark:text-secondary-200 mt-0.5">
                            oleh {item.resolvedByName || `User #${item.resolvedBy || ''}`}
                          </div>
                        </Show>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <Button
                          variant={isResolved(item) ? 'secondary' : 'accent'}
                          class="py-1 px-3 text-xs"
                          onClick={() => openResolve(item)}
                        >
                          {isResolved(item) ? 'Koreksi' : 'Konfirmasi'}
                        </Button>
                      </td>
                    </tr>
                  )}
                </For>
                <Show when={(data()?.data || []).length === 0}>
                  <tr>
                    <td colspan="11" class="py-10 text-center text-secondary-400 text-sm">
                      Tidak ada data presensi unknown.
                    </td>
                  </tr>
                </Show>
              </tbody>
            </table>
          </div>

          <Show when={data()?.meta && data()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-sm text-secondary-500">Total: {data()?.meta.total} data</span>
              <div class="flex gap-2 items-center">
                <button
                  class="px-3 py-1 border rounded-xl text-sm disabled:opacity-50 text-secondary-700 dark:text-secondary-200"
                  disabled={page() <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <span class="px-3 py-1 text-sm text-secondary-600 dark:text-secondary-200">
                  {page()} / {data()?.meta.totalPages}
                </span>
                <button
                  class="px-3 py-1 border rounded-xl text-sm disabled:opacity-50 text-secondary-700 dark:text-secondary-200"
                  disabled={page() >= (data()?.meta.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!resolveModal()}
        onClose={() => setResolveModal(null)}
        title={`Konfirmasi Status - ${resolveModal()?.nama || ''}`}
      >
        <Show when={resolveModal()}>
          {(raw) => {
            const item = () => raw() as PresensiUnknownItem & Partial<PresensiPraktikumUnknownItem>;
            return (
              <div class="flex flex-col gap-4">
                <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800 p-3 text-xs text-secondary-600 dark:text-secondary-200 flex flex-col gap-1">
                  <Show
                    when={tab() === 'perkuliahan'}
                    fallback={
                      <>
                        <span>
                          <strong>Mata kuliah:</strong> {item().mataKuliahNama || '-'} (Kelas {item().namaKelas})
                        </span>
                        <span>
                          <strong>Sesi:</strong> {item().bapPrakSesiKe ?? '-'} · {item().bapPrakTanggal}
                        </span>
                        <span>
                          <strong>Rombel:</strong> {item().namaGroup || '-'}
                        </span>
                        <span>
                          <strong>Materi:</strong> {item().bapPrakMateri}
                        </span>
                      </>
                    }
                  >
                    <span>
                      <strong>Mata kuliah:</strong> {item().mataKuliahNama || '-'} (Kelas {item().namaKelas})
                    </span>
                    <span>
                      <strong>Pertemuan:</strong> {item().bapPertemuan} · {item().bapTanggal}
                    </span>
                    <span>
                      <strong>Dosen pengampu:</strong> {item().dosenNama || '-'}
                    </span>
                    <span>
                      <strong>Materi:</strong> {item().bapMateri}
                    </span>
                  </Show>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                    Ubah status menjadi
                  </label>
                  <select
                    class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={resolveStatus()}
                    onChange={(e) => setResolveStatus(e.currentTarget.value as 'sakit' | 'izin' | 'alpa')}
                  >
                    <option value="alpa">Alpa (Tanpa Keterangan)</option>
                    <option value="sakit">Sakit</option>
                    <option value="izin">Izin</option>
                  </select>
                </div>

                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anulir-checkbox"
                    class="h-4 w-4 accent-rose-600"
                    checked={isAnulir()}
                    onChange={(e) => setIsAnulir(e.currentTarget.checked)}
                  />
                  <label for="anulir-checkbox" class="text-sm font-medium text-rose-600 dark:text-rose-400">
                    Anulir (Durasi = 0)
                  </label>
                </div>
                <Show when={isAnulir()}>
                  <p class="text-xs text-secondary-500 dark:text-secondary-300">
                    Ketidakhadiran dikonfirmasi sebagai <strong>{statusWord(resolveStatus())}</strong> dengan durasi 0
                    menit sehingga tidak masuk dalam rekap kompensasi.
                  </p>
                </Show>

                <Show when={!isAnulir()}>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                      Durasi Ketidakhadiran (menit)
                    </label>
                    <input
                      type="number"
                      min={0}
                      class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={resolveDurasi()}
                      onInput={(e) => setResolveDurasi(Number(e.currentTarget.value) || 0)}
                    />
                  </div>
                </Show>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                    {isAnulir() ? 'Alasan/Keterangan (wajib)' : 'Catatan Konfirmasi (opsional)'}
                  </label>
                  <textarea
                    rows={3}
                    class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Misal: Surat Keterangan Dokter / Penjelasan dari Admin..."
                    value={resolveNote()}
                    onInput={(e) => setResolveNote(e.currentTarget.value)}
                  />
                </div>

                <div class="flex justify-end gap-2 mt-2">
                  <Button variant="secondary" onClick={() => setResolveModal(null)}>
                    Batal
                  </Button>
                  <Button variant={isAnulir() ? 'danger' : 'primary'} onClick={handleResolve} disabled={submitting()}>
                    {submitting()
                      ? 'Menyimpan...'
                      : isAnulir()
                        ? `Anulir Presensi (${statusWord(resolveStatus())})`
                        : `Simpan sebagai ${statusWord(resolveStatus())}`}
                  </Button>
                </div>
              </div>
            );
          }}
        </Show>
      </Modal>

      {/* Preview Surat Bukti Modal */}
      <Modal
        isOpen={!!previewItem()}
        onClose={closePreview}
        title={`Surat Bukti - ${previewItem()?.nama || ''}`}
        maxWidth="xl"
      >
        <div class="flex flex-col gap-3">
          <Show when={previewItem()}>
            {(raw) => {
              const item = () => raw();
              return (
                <div class="text-xs text-secondary-500 dark:text-secondary-200 flex items-center justify-between gap-2">
                  <span>
                    {item().mataKuliahNama || '-'} · Pertemuan {item().bapPertemuan} · {item().bapTanggal}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const url = previewUrl();
                      if (url) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = item().lampiranEvidens || 'surat';
                        a.click();
                      }
                    }}
                  >
                    Download
                  </Button>
                </div>
              );
            }}
          </Show>
          <Show when={previewLoading()}>
            <div class="flex items-center justify-center py-16 text-secondary-400">
              <div class="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
              <span class="text-sm">Memuat berkas...</span>
            </div>
          </Show>
          <Show when={previewUrl() && !previewLoading()}>
            <Show
              when={previewFileType() === 'application/pdf'}
              fallback={
                <img
                  src={previewUrl()!}
                  alt="Surat bukti"
                  class="w-full max-h-[70vh] object-contain rounded-lg border border-secondary-200 dark:border-secondary-700"
                />
              }
            >
              <iframe
                src={previewUrl()!}
                title="Surat bukti"
                class="w-full h-[70vh] rounded-lg border border-secondary-200 dark:border-secondary-700"
              />
            </Show>
          </Show>
        </div>
      </Modal>
    </MainLayout>
  );
}
