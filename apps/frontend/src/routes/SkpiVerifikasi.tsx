import { createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect, type SelectOption } from '../components/ui/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { prodiController } from '../controllers/prodiController';
import { type SkpiKegiatan, type SkpiStatus, skpiController } from '../controllers/skpiController';
import { usePagination } from '../hooks/usePagination';
import { fmtTanggal } from '../utils/format';

const STATUS_LABEL: Record<SkpiStatus, string> = {
  pending: 'Menunggu Verifikasi',
  diverifikasi: 'Terverifikasi',
  ditolak: 'Ditolak',
};

const STATUS_VARIANT: Record<SkpiStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  diverifikasi: 'success',
  ditolak: 'danger',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Menunggu Verifikasi' },
  { value: 'diverifikasi', label: 'Terverifikasi' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: '', label: 'Semua Status' },
];

export default function SkpiVerifikasi() {
  const toast = useToast();

  const pagination = usePagination(10);
  const [statusFilter, setStatusFilter] = createSignal('pending');
  const [kategoriFilter, setKategoriFilter] = createSignal(0);
  const [prodiFilter, setProdiFilter] = createSignal(0);
  const [mahasiswaFilter, setMahasiswaFilter] = createSignal<number | null>(null);
  const [mhsOptions, setMhsOptions] = createSignal<SelectOption[]>([]);
  const [mhsSearching, setMhsSearching] = createSignal(false);
  let mhsTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(mhsTimer));

  const searchMahasiswa = (q: string) => {
    clearTimeout(mhsTimer);
    setMhsSearching(true);
    mhsTimer = setTimeout(async () => {
      try {
        const res = await mahasiswaController.getAll(q || undefined, 1, 25, undefined, { allStudents: true });
        setMhsOptions(
          res.data.map((m) => ({
            value: m.id,
            label: `${m.nim} — ${m.nama}${m.programStudi?.nama ? ` (${m.programStudi.nama})` : ''}`,
          })),
        );
      } catch {
        setMhsOptions([]);
      } finally {
        setMhsSearching(false);
      }
    }, 300);
  };

  const [kategoriList] = createResource(() => skpiController.getKategori());
  // Daftar prodi untuk filter; hanya ditampilkan bila >1 (staf satu prodi tidak terganggu).
  const [prodiList] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [list, { refetch }] = createResource(
    () => ({
      page: pagination.page(),
      limit: pagination.limit(),
      status: statusFilter(),
      kategoriId: kategoriFilter(),
      prodiId: prodiFilter(),
      mahasiswaId: mahasiswaFilter(),
      search: pagination.search(),
    }),
    (p) =>
      skpiController.getAll({
        page: p.page,
        limit: p.limit,
        status: p.status || undefined,
        kategoriId: p.kategoriId || undefined,
        prodiId: p.prodiId || undefined,
        mahasiswaId: p.mahasiswaId ?? undefined,
        search: p.search || undefined,
      }),
  );

  const kategoriOptions = () => [
    { value: 0, label: 'Semua Kategori' },
    ...(kategoriList()?.data ?? []).map((k) => ({ value: k.id, label: k.nama })),
  ];

  // ── Modal detail rekaman ──────────────────────────────────────────────────
  const [detail, setDetail] = createSignal<SkpiKegiatan | null>(null);

  const openDetail = async (row: SkpiKegiatan) => {
    try {
      const full = await skpiController.getById(row.id);
      setDetail(full);
    } catch {
      setDetail(row);
    }
  };

  const handleOpenLampiran = async (row: SkpiKegiatan) => {
    const lampiran = row.lampiran?.[0];
    if (!lampiran) return;
    try {
      await skpiController.openLampiran(row.id, lampiran.id);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal membuka lampiran.', 'error');
    }
  };

  // ── Modal aksi approve / reject ───────────────────────────────────────────
  const [actionTarget, setActionTarget] = createSignal<SkpiKegiatan | null>(null);
  const [actionType, setActionType] = createSignal<'approve' | 'reject'>('approve');
  const [catatan, setCatatan] = createSignal('');
  const [poinOverride, setPoinOverride] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [actionError, setActionError] = createSignal('');

  const openAction = (row: SkpiKegiatan, type: 'approve' | 'reject') => {
    setActionTarget(row);
    setActionType(type);
    setCatatan('');
    setPoinOverride(String(row.poin));
    setActionError('');
  };

  const closeAction = () => {
    setActionTarget(null);
    setCatatan('');
    setActionError('');
  };

  const handleVerify = async (e: Event) => {
    e.preventDefault();
    const row = actionTarget();
    if (!row) return;

    const trimmed = catatan().trim();
    if (actionType() === 'reject' && !trimmed) {
      setActionError('Catatan wajib diisi saat menolak rekaman.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');
    try {
      await skpiController.verify(row.id, {
        action: actionType(),
        catatan: trimmed || undefined,
        poin: actionType() === 'approve' && poinOverride() ? Number(poinOverride()) : undefined,
      });
      toast.showToast(
        actionType() === 'approve' ? 'Rekaman kegiatan disetujui' : 'Rekaman kegiatan ditolak',
        actionType() === 'approve' ? 'success' : 'info',
      );
      closeAction();
      setDetail(null);
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Gagal memverifikasi rekaman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">Verifikasi SKPI</h1>
          <p class="text-sm text-secondary-500">
            Setujui atau tolak rekaman pencapaian kegiatan mahasiswa. Rekaman yang disetujui menjadi isi dokumen SKPI
            yang dapat dicetak dan ditandatangani.
          </p>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="relative flex-1 w-full">
              <span class="absolute left-3.5 top-2.5 text-secondary-400">🔍</span>
              <input
                type="text"
                placeholder="Cari nama kegiatan / penyelenggara / NIM / nama mahasiswa..."
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={pagination.search()}
                onInput={(e) => {
                  pagination.setSearch(e.currentTarget.value);
                  pagination.resetPage();
                }}
              />
            </div>
            <select
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value);
                pagination.resetPage();
              }}
              class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
            >
              <For each={STATUS_OPTIONS}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
            </select>
            <select
              value={kategoriFilter()}
              onChange={(e) => {
                setKategoriFilter(Number(e.currentTarget.value));
                pagination.resetPage();
              }}
              class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
            >
              <For each={kategoriOptions()}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
            </select>
          </div>

          {/* Filter per mahasiswa & prodi — backend memvalidasi lingkup per peran. */}
          <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div class="sm:w-80">
              <SearchableSelect
                label="Mahasiswa"
                placeholder="Ketik NIM / nama untuk mencari..."
                options={mhsOptions()}
                value={mahasiswaFilter()}
                onSearch={searchMahasiswa}
                isLoading={mhsSearching()}
                onChange={(v) => {
                  setMahasiswaFilter(Number(v));
                  pagination.resetPage();
                }}
              />
            </div>
            <Show when={(prodiList()?.data?.length ?? 0) > 1}>
              <select
                value={prodiFilter()}
                onChange={(e) => {
                  setProdiFilter(Number(e.currentTarget.value));
                  pagination.resetPage();
                }}
                class="rounded-xl border border-secondary-200 bg-white px-3 py-2.5 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
              >
                <option value={0}>Semua Prodi</option>
                <For each={prodiList()?.data ?? []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </Show>
            <Show when={mahasiswaFilter() || prodiFilter()}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMahasiswaFilter(null);
                  setProdiFilter(0);
                  pagination.resetPage();
                }}
              >
                Reset Filter
              </Button>
            </Show>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                  <th class="p-3">Mahasiswa</th>
                  <th class="p-3">Kegiatan</th>
                  <th class="p-3">Tanggal</th>
                  <th class="p-3 text-center">Poin</th>
                  <th class="p-3">Status</th>
                  <th class="p-3">Lampiran</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                <Show
                  when={!list.loading}
                  fallback={
                    <tr>
                      <td colspan={7} class="p-8 text-center text-secondary-400">
                        Memuat data...
                      </td>
                    </tr>
                  }
                >
                  <For
                    each={list()?.data ?? []}
                    fallback={
                      <tr>
                        <td colspan={7} class="p-8 text-center text-secondary-400">
                          Tidak ada rekaman untuk difilter.
                        </td>
                      </tr>
                    }
                  >
                    {(row) => (
                      <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                        <td class="p-3">
                          <p class="font-bold text-secondary-800 dark:text-white">{row.mahasiswa?.nama ?? '-'}</p>
                          <p class="text-[11px] text-secondary-400">
                            {row.mahasiswa?.nim ?? '-'}
                            <Show when={row.mahasiswa?.programStudi?.nama}>{(p) => <> • {p()}</>}</Show>
                          </p>
                        </td>
                        <td class="p-3 max-w-[240px]">
                          <p class="font-bold text-secondary-800 dark:text-white">{row.namaKegiatan}</p>
                          <p class="text-[11px] text-secondary-400">{row.kategori?.nama ?? '-'}</p>
                        </td>
                        <td class="p-3">
                          {fmtTanggal(row.tanggalMulai)}
                          <Show when={row.tanggalSelesai}>
                            {(s) => <span class="text-secondary-400"> – {fmtTanggal(s())}</span>}
                          </Show>
                        </td>
                        <td class="p-3 text-center font-bold">{row.poin}</td>
                        <td class="p-3">
                          <Badge variant={STATUS_VARIANT[row.status]} size="sm">
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        </td>
                        <td class="p-3">
                          <Show when={row.lampiran?.length} fallback={<span class="text-secondary-300">—</span>}>
                            <button
                              type="button"
                              onClick={() => handleOpenLampiran(row)}
                              class="text-brand-600 hover:underline font-medium"
                            >
                              Lihat
                            </button>
                          </Show>
                        </td>
                        <td class="p-3">
                          <div class="flex items-center justify-center gap-1.5">
                            <Button variant="secondary" size="sm" onClick={() => openDetail(row)}>
                              Detail
                            </Button>
                            <Show when={row.status === 'pending'}>
                              <Button variant="success" size="sm" onClick={() => openAction(row, 'approve')}>
                                Setujui
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => openAction(row, 'reject')}>
                                Tolak
                              </Button>
                            </Show>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>

          <Show when={list()}>
            {(page) => (
              <Pagination
                currentPage={page().meta.page}
                totalPages={page().meta.totalPages}
                total={page().meta.total}
                limit={page().meta.limit}
                onPageChange={pagination.setPage}
                onLimitChange={pagination.setLimit}
              />
            )}
          </Show>
        </div>
      </div>

      {/* Modal detail */}
      <Modal show={detail() !== null} onClose={() => setDetail(null)} title="Detail Rekaman Kegiatan" maxWidth="lg">
        <Show when={detail()}>
          {(row) => (
            <div class="flex flex-col gap-4 text-sm">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-secondary-400 uppercase tracking-wider font-bold">Mahasiswa</p>
                  <p class="font-bold text-secondary-800 dark:text-white">{row().mahasiswa?.nama ?? '-'}</p>
                  <p class="text-secondary-500">
                    {row().mahasiswa?.nim ?? '-'}
                    <Show when={row().mahasiswa?.programStudi?.nama}>{(p) => <> • {p()}</>}</Show>
                  </p>
                </div>
                <div>
                  <p class="text-secondary-400 uppercase tracking-wider font-bold">Status</p>
                  <Badge variant={STATUS_VARIANT[row().status]}>{STATUS_LABEL[row().status]}</Badge>
                  <Show when={row().verifiedBy?.nama}>
                    {(v) => <p class="mt-1 text-secondary-500">Diverifikasi: {v()}</p>}
                  </Show>
                </div>
              </div>

              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60 text-xs space-y-2">
                <p>
                  <span class="text-secondary-400">Kegiatan: </span>
                  <span class="font-bold text-secondary-800 dark:text-white">{row().namaKegiatan}</span>
                </p>
                <p>
                  <span class="text-secondary-400">Kategori: </span>
                  {row().kategori?.nama ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Penyelenggara: </span>
                  {row().penyelenggara ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Tanggal: </span>
                  {fmtTanggal(row().tanggalMulai)}
                  <Show when={row().tanggalSelesai}>{(s) => <> – {fmtTanggal(s())}</>}</Show>
                </p>
                <p>
                  <span class="text-secondary-400">Lokasi: </span>
                  {row().lokasi ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Nomor Sertifikat: </span>
                  {row().nomorSertifikat ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Poin: </span>
                  <span class="font-bold">{row().poin}</span>
                </p>
                <Show when={row().deskripsi}>
                  {(d) => (
                    <p>
                      <span class="text-secondary-400">Deskripsi: </span>
                      {d()}
                    </p>
                  )}
                </Show>
              </div>

              <Show when={row().catatanVerifikator}>
                {(c) => (
                  <div class="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700 dark:bg-danger-950/30 dark:border-danger-900 dark:text-danger-300">
                    <p class="font-bold">Catatan Verifikator:</p>
                    <p class="mt-1">{c()}</p>
                  </div>
                )}
              </Show>

              <div class="rounded-xl border border-secondary-200 p-4 dark:border-secondary-700">
                <p class="text-xs font-bold text-secondary-700 dark:text-secondary-300">Lampiran Sertifikat</p>
                <Show
                  when={row().lampiran?.length}
                  fallback={<p class="mt-2 text-xs text-secondary-400">Belum ada lampiran.</p>}
                >
                  <For each={row().lampiran ?? []}>
                    {(lampiran) => (
                      <div class="mt-2 flex items-center justify-between rounded-lg bg-secondary-50 p-2.5 dark:bg-secondary-800/60">
                        <div class="overflow-hidden">
                          <p class="text-xs font-medium text-secondary-800 dark:text-white truncate">
                            {lampiran.fileName}
                          </p>
                          <p class="text-[11px] text-secondary-400">{formatBytes(lampiran.fileSize)}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleOpenLampiran(row())}>
                          Buka
                        </Button>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Modal>

      {/* Modal approve / reject */}
      <Modal
        show={actionTarget() !== null}
        onClose={closeAction}
        title={actionType() === 'approve' ? 'Setujui Rekaman Kegiatan' : 'Tolak Rekaman Kegiatan'}
      >
        <form onSubmit={handleVerify} class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            {actionType() === 'approve'
              ? 'Rekaman yang disetujui menjadi bagian dari dokumen SKPI mahasiswa dan tidak dapat diubah lagi.'
              : 'Rekaman ditolak dan dikembalikan ke mahasiswa untuk diperbaiki. Catatan wajib diisi.'}
            <br />
            <b>{actionTarget()?.namaKegiatan}</b> — {actionTarget()?.mahasiswa?.nama} ({actionTarget()?.mahasiswa?.nim})
          </p>

          <Show when={actionType() === 'approve'}>
            <Input
              label="Poin Kegiatan"
              type="number"
              min={0}
              value={poinOverride()}
              onInput={(e) => setPoinOverride(e.currentTarget.value)}
            />
          </Show>

          <div class="flex flex-col gap-1">
            <label class="text-caption font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
              Catatan {actionType() === 'reject' ? '(wajib)' : '(opsional)'}
            </label>
            <textarea
              rows="3"
              placeholder={
                actionType() === 'reject'
                  ? 'Alasan penolakan — misal: bukti sertifikat tidak terbaca.'
                  : 'Catatan persetujuan (opsional)...'
              }
              value={catatan()}
              onInput={(e) => setCatatan(e.currentTarget.value)}
              class="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-table text-secondary-800 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 resize-none dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
            />
          </div>

          <Show when={actionError()}>
            {(err) => (
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {err()}
              </div>
            )}
          </Show>

          <div class="flex justify-end gap-3 border-t pt-4 mt-2">
            <Button type="button" variant="secondary" onClick={closeAction} disabled={isSubmitting()}>
              Batal
            </Button>
            <Button type="submit" variant={actionType() === 'approve' ? 'success' : 'danger'} disabled={isSubmitting()}>
              {isSubmitting() ? 'Memproses...' : actionType() === 'approve' ? 'Setujui Rekaman' : 'Tolak Rekaman'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
