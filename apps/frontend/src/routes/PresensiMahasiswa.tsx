import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { PresensiMahasiswaRiwayatItem, presensiController } from '../controllers/presensiController';
import { fmtTanggal } from '../utils/format';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  hadir: {
    label: 'Hadir',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  sakit: {
    label: 'Sakit',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  izin: {
    label: 'Izin',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  telat: {
    label: 'Terlambat',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  alpa: {
    label: 'Alpa',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  unknown: {
    label: 'Butuh Bukti / Surat',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  },
};

export default function PresensiMahasiswa() {
  const toast = useToast();

  const [periodes] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll(undefined, 1, 100);
      return res.data;
    } catch {
      return [];
    }
  });
  const [periodeFilter, setPeriodeFilter] = createSignal('');

  const [list, { refetch }] = createResource(periodeFilter, (periodeId) =>
    presensiController.getMahasiswaPresensi(periodeId || undefined),
  );

  const summary = () => {
    const rows = list() || [];
    return {
      total: rows.length,
      unknown: rows.filter((r) => r.status === 'unknown').length,
      sakit: rows.filter((r) => r.status === 'sakit').length,
      izin: rows.filter((r) => r.status === 'izin').length,
      denganSurat: rows.filter((r) => r.lampiranEvidens).length,
    };
  };

  // Upload state
  const [uploadTarget, setUploadTarget] = createSignal<PresensiMahasiswaRiwayatItem | null>(null);
  const [uploadJenis, setUploadJenis] = createSignal<'sakit' | 'izin'>('sakit');
  const [uploadKeterangan, setUploadKeterangan] = createSignal('');
  const [uploadFile, setUploadFile] = createSignal<File | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = createSignal(false);
  const [uploadError, setUploadError] = createSignal('');

  // Preview state
  const [previewItem, setPreviewItem] = createSignal<PresensiMahasiswaRiwayatItem | null>(null);
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [previewFileType, setPreviewFileType] = createSignal('image/*');

  const openUpload = (item: PresensiMahasiswaRiwayatItem) => {
    setUploadTarget(item);
    setUploadJenis('sakit');
    setUploadKeterangan(item.keterangan || '');
    setUploadFile(null);
    setUploadError('');
  };

  const handleUpload = async () => {
    const target = uploadTarget();
    if (!target) return;
    const file = uploadFile();
    if (!file) {
      setUploadError('Pilih berkas surat (PDF/JPG/PNG/WebP) terlebih dahulu.');
      return;
    }
    setUploadSubmitting(true);
    setUploadError('');
    try {
      await presensiController.uploadSuratIzin({
        presensiId: target.id,
        jenis: uploadJenis(),
        keterangan: uploadKeterangan(),
        file,
      });
      toast.showToast('Surat berhasil diunggah. Menunggu verifikasi admin.', 'success');
      setUploadTarget(null);
      refetch();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Gagal mengunggah surat');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const openPreview = async (item: PresensiMahasiswaRiwayatItem) => {
    if (!item.lampiranEvidens) return;
    setPreviewItem(item);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const isPdf = /\.pdf$/i.test(item.lampiranEvidens);
    setPreviewFileType(isPdf ? 'application/pdf' : 'image/*');
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

  const statusBadge = (status: string) => {
    const meta = STATUS_META[status] || {
      label: status,
      badge: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-300',
    };
    return (
      <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${meta.badge}`}>
        {meta.label}
      </span>
    );
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Presensi Saya & Pengajuan Izin/Sakit</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Lihat riwayat kehadiran Anda dan unggah bukti surat sakit/izin untuk pertemuan berstatus{' '}
            <strong>Butuh Bukti / Surat</strong>. Surat akan diverifikasi oleh Admin/Prodi.
          </p>
        </div>

        {/* Summary Cards */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-4 shadow-sm">
            <div class="text-xs font-semibold text-secondary-400 uppercase">Total Pertemuan</div>
            <div class="text-2xl font-extrabold text-secondary-800 dark:text-white mt-1">{summary().total}</div>
          </div>
          <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl p-4 shadow-sm">
            <div class="text-xs font-semibold text-orange-500 uppercase">Butuh Bukti / Surat</div>
            <div class="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">{summary().unknown}</div>
          </div>
          <div class="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-2xl p-4 shadow-sm">
            <div class="text-xs font-semibold text-sky-500 uppercase">Sakit</div>
            <div class="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">{summary().sakit}</div>
          </div>
          <div class="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-2xl p-4 shadow-sm">
            <div class="text-xs font-semibold text-violet-500 uppercase">Izin</div>
            <div class="text-2xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">{summary().izin}</div>
          </div>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-wrap gap-4 items-center mb-4">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-secondary-500">Filter Periode</label>
              <select
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={periodeFilter()}
                onChange={(e) => setPeriodeFilter(e.currentTarget.value)}
              >
                <option value="">Semua Periode</option>
                <For each={periodes()}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
            <span class="text-xs text-secondary-500 dark:text-secondary-300 ml-auto">
              Total: <strong>{summary().total}</strong> · Dengan surat: <strong>{summary().denganSurat}</strong>
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold">
                  <th class="py-3 px-4">No</th>
                  <th class="py-3 px-4">Mata Kuliah (Kelas)</th>
                  <th class="py-3 px-4">Pertemuan</th>
                  <th class="py-3 px-4">Materi</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Surat Bukti</th>
                  <th class="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                <For each={list()}>
                  {(item, idx) => (
                    <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                      <td class="py-3 px-4">{idx() + 1}</td>
                      <td class="py-3 px-4">
                        <div class="font-semibold text-secondary-800 dark:text-white">{item.mataKuliahNama || '-'}</div>
                        <div class="text-xs text-secondary-400">
                          {item.mataKuliahKode || ''} · Kelas {item.namaKelas || '-'} · {item.periodeId || '-'}
                        </div>
                        <div class="text-[11px] text-secondary-400">Dosen: {item.dosenNama || '-'}</div>
                      </td>
                      <td class="py-3 px-4 text-xs">
                        <div>Pertemuan {item.bapPertemuan ?? '-'}</div>
                        <div class="text-secondary-400 dark:text-secondary-200">{fmtTanggal(item.bapTanggal)}</div>
                      </td>
                      <td class="py-3 px-4 text-xs max-w-xs truncate" title={item.bapMateri || ''}>
                        {item.bapMateri || '-'}
                      </td>
                      <td class="py-3 px-4">
                        {statusBadge(item.status)}
                        <Show when={item.resolvedByName}>
                          <div class="text-[11px] text-secondary-400 dark:text-secondary-200 mt-0.5">
                            Diverifikasi oleh {item.resolvedByName}
                          </div>
                        </Show>
                        <Show when={item.keteranganAdmin}>
                          <div class="text-[11px] text-secondary-400 dark:text-secondary-200 mt-0.5">
                            {item.keteranganAdmin}
                          </div>
                        </Show>
                      </td>
                      <td class="py-3 px-4">
                        <Show when={item.lampiranEvidens} fallback={<span class="text-xs text-secondary-300">-</span>}>
                          <Button variant="secondary" size="sm" onClick={() => openPreview(item)}>
                            Lihat
                          </Button>
                        </Show>
                      </td>
                      <td class="py-3 px-4 text-center">
                        <Show
                          when={item.status === 'unknown'}
                          fallback={<span class="text-xs text-secondary-300">-</span>}
                        >
                          <Button size="sm" onClick={() => openUpload(item)}>
                            Unggah Surat
                          </Button>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
                <Show when={list.loading}>
                  <tr>
                    <td colspan="7" class="py-10 text-center text-secondary-400 text-sm">
                      Memuat data...
                    </td>
                  </tr>
                </Show>
                <Show when={!list.loading && (list()?.length || 0) === 0}>
                  <tr>
                    <td colspan="7" class="py-10 text-center text-secondary-400 text-sm">
                      Tidak ada data presensi.
                    </td>
                  </tr>
                </Show>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={!!uploadTarget()}
        onClose={() => setUploadTarget(null)}
        title={`Unggah Surat - ${uploadTarget()?.mataKuliahNama || ''}`}
      >
        <Show when={uploadTarget()}>
          {(raw) => {
            const item = () => raw();
            return (
              <div class="flex flex-col gap-4">
                <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800 p-3 text-xs text-secondary-600 dark:text-secondary-200 flex flex-col gap-1">
                  <span>
                    <strong>Pertemuan:</strong> {item().bapPertemuan} · {fmtTanggal(item().bapTanggal)}
                  </span>
                  <span>
                    <strong>Materi:</strong> {item().bapMateri}
                  </span>
                </div>

                <Show when={uploadError()}>
                  <div class="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    {uploadError()}
                  </div>
                </Show>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Jenis Surat</label>
                  <select
                    class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={uploadJenis()}
                    onChange={(e) => setUploadJenis(e.currentTarget.value as 'sakit' | 'izin')}
                  >
                    <option value="sakit">Sakit (Surat Keterangan Dokter)</option>
                    <option value="izin">Izin (Surat Izin Resmi)</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                    Berkas Surat (PDF / JPG / PNG / WebP, maks 5MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    class="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-white file:cursor-pointer"
                    onChange={(e) => setUploadFile(e.currentTarget.files?.[0] || null)}
                  />
                  <Show when={uploadFile()}>
                    <span class="text-xs text-secondary-500">{uploadFile()?.name}</span>
                  </Show>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                    Keterangan (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    class="w-full rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Contoh: Tidak dapat hadir karena demam tinggi, surat terlampir."
                    value={uploadKeterangan()}
                    onInput={(e) => setUploadKeterangan(e.currentTarget.value)}
                  />
                </div>

                <div class="flex justify-end gap-2 mt-2">
                  <Button variant="secondary" onClick={() => setUploadTarget(null)}>
                    Batal
                  </Button>
                  <Button onClick={handleUpload} loading={uploadSubmitting()}>
                    {uploadSubmitting() ? 'Mengunggah...' : 'Unggah Surat'}
                  </Button>
                </div>
              </div>
            );
          }}
        </Show>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewItem()}
        onClose={closePreview}
        title={`Surat Bukti - ${previewItem()?.mataKuliahNama || ''}`}
        maxWidth="xl"
      >
        <div class="flex flex-col gap-3">
          <Show when={previewItem()}>
            {(raw) => {
              const item = () => raw();
              return (
                <div class="text-xs text-secondary-500 dark:text-secondary-200 flex items-center justify-between gap-2">
                  <span>
                    {item().mataKuliahNama} · Pertemuan {item().bapPertemuan} · {fmtTanggal(item().bapTanggal)}
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
