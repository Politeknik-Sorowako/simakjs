import { createResource, createSignal, For, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { prodiController } from '../../controllers/prodiController';
import { type SkpiPenerbitanItem, skpiController } from '../../controllers/skpiController';
import { systemController } from '../../controllers/systemController';
import { usePagination } from '../../hooks/usePagination';
import { type ExportColumn, exportToExcel, exportToPDF } from '../../utils/export';
import { getTodayString } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';

const STATUS_AKADEMIK_LABEL: Record<string, string> = {
  aktif: 'Aktif',
  cuti: 'Cuti',
  lulus: 'Lulus',
  drop_out: 'Drop Out',
  keluar: 'Keluar',
  lulus_belum_wisuda: 'Lulus Belum Wisuda',
};

function fmtTanggalPanjang(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Tab Penerbitan — daftar mahasiswa dengan ≥1 rekaman kegiatan (status apa
 * pun) beserta hitungan per status, syarat, dan status tanda tangan. Staf dapat
 * menerbitkan / mencabut tanda tangan SKPI satu per satu maupun massal, serta
 * mencetak rekap SKPI per mahasiswa.
 */
export default function TabPenerbitan() {
  const toast = useToast();
  const pagination = usePagination(10);
  const [prodiFilter, setProdiFilter] = createSignal(0);
  const [siapOnly, setSiapOnly] = createSignal(false);
  const [prodiList] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [list, { refetch }] = createResource(
    () => ({
      page: pagination.page(),
      limit: pagination.limit(),
      search: pagination.search(),
      prodiId: prodiFilter(),
      siapTerbit: siapOnly(),
    }),
    (p) =>
      skpiController.getPenerbitan({
        page: p.page,
        limit: p.limit,
        search: p.search || undefined,
        prodiId: p.prodiId || undefined,
        siapTerbit: p.siapTerbit || undefined,
      }),
  );

  // ── Seleksi massal ─────────────────────────────────────────────────────────
  const [selected, setSelected] = createSignal<Set<number>>(new Set());
  const rows = () => list.latest?.data ?? [];
  const toggleSelect = (mhsId: number) => {
    const next = new Set(selected());
    if (next.has(mhsId)) next.delete(mhsId);
    else next.add(mhsId);
    setSelected(next);
  };
  const selectedRows = () => rows().filter((r) => selected().has(r.mahasiswaId));
  const selectedSignable = () => selectedRows().filter((r) => r.syarat.terpenuhi && !r.signature);
  const selectedSigned = () => selectedRows().filter((r) => r.signature);

  // ── Ekspor rekap (US-8) — mengikuti filter aktif, seluruh halaman ─────────
  const [isExporting, setIsExporting] = createSignal(false);

  const exportColumns = (): ExportColumn[] => [
    { header: 'NIM', accessor: 'nim' },
    { header: 'Nama Mahasiswa', accessor: 'nama' },
    { header: 'Program Studi', accessor: 'prodi' },
    {
      header: 'Status Akademik',
      accessor: (r: SkpiPenerbitanItem) => STATUS_AKADEMIK_LABEL[r.statusAkademik] ?? r.statusAkademik,
    },
    { header: 'Terverifikasi', accessor: 'diverifikasi' },
    { header: 'Pending', accessor: 'pending' },
    { header: 'Ditolak', accessor: 'ditolak' },
    { header: 'Total Kegiatan', accessor: 'totalKegiatan' },
    { header: 'Total Poin', accessor: 'totalPoin' },
    {
      header: 'Syarat',
      accessor: (r: SkpiPenerbitanItem) => (r.syarat.terpenuhi ? 'Terpenuhi' : `Belum (${r.syarat.alasan ?? '-'})`),
    },
    {
      header: 'Tanda Tangan',
      accessor: (r: SkpiPenerbitanItem) =>
        r.signature ? `Ditandatangani ${fmtTanggalPanjang(r.signature.signedAt)}` : 'Belum',
    },
  ];

  const fetchAllFiltered = async (): Promise<SkpiPenerbitanItem[]> => {
    const all: SkpiPenerbitanItem[] = [];
    let p = 1;
    const limitP = 100;
    for (;;) {
      const res = await skpiController.getPenerbitan({
        page: p,
        limit: limitP,
        search: pagination.search() || undefined,
        prodiId: prodiFilter() || undefined,
        siapTerbit: siapOnly() || undefined,
      });
      all.push(...res.data);
      if (p * limitP >= res.meta.total) break;
      p += 1;
      // Batas pengaman 50 halaman (5.000 baris) — data lebih besar disarankan ekspor server-side.
      if (p > 50) break;
    }
    return all;
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (isExporting()) return;
    setIsExporting(true);
    try {
      const data = await fetchAllFiltered();
      if (data.length === 0) {
        toast.showToast('Tidak ada data untuk diekspor', 'info');
        return;
      }
      const kopGlobal = await systemController.getKop().catch(() => null);
      const filename = `Rekap_Penerbitan_SKPI_${getTodayString()}`;
      if (format === 'excel') {
        exportToExcel(data, exportColumns(), filename);
        toast.showToast('Rekap penerbitan SKPI berhasil diekspor (.xlsx)', 'success');
      } else {
        exportToPDF(data, exportColumns(), filename, 'Rekap Penerbitan SKPI', 'Sistem Informasi Akademik Vokasi', {
          institusi: kopGlobal?.nama || 'POLITEKNIK SOROWAKO',
          alamat: kopGlobal?.alamat?.[0],
          judulDokumen: 'Rekap Penerbitan SKPI',
          infoLines: [`Diekspor: ${new Date().toLocaleDateString('id-ID')}`, `Jumlah baris: ${data.length}`],
        });
        toast.showToast('Rekap penerbitan SKPI berhasil diekspor (.pdf)', 'success');
      }
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengekspor data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Terbitkan (tunggal / massal) ───────────────────────────────────────────
  const [signTarget, setSignTarget] = createSignal<SkpiPenerbitanItem[]>([]);
  const [signBusy, setSignBusy] = createSignal(false);

  const handleSign = async () => {
    const targets = signTarget();
    if (targets.length === 0) return;
    setSignBusy(true);
    try {
      if (targets.length === 1) {
        await skpiController.signDokumen(targets[0].mahasiswaId);
        toast.showToast(`Tanda tangan SKPI ${targets[0].nama} diterbitkan`, 'success');
      } else {
        const res = await skpiController.signBulk(targets.map((t) => t.mahasiswaId));
        toast.showToast(
          res.failedCount > 0
            ? `${res.signedCount} SKPI diterbitkan, ${res.failedCount} gagal`
            : `${res.signedCount} SKPI diterbitkan`,
          res.failedCount > 0 ? 'info' : 'success',
        );
        if (res.failedCount > 0 && res.failed.length > 0) {
          toast.showToast(res.failed[0].error, 'error');
        }
      }
      setSignTarget([]);
      setSelected(new Set<number>());
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menerbitkan tanda tangan SKPI.', 'error');
    } finally {
      setSignBusy(false);
    }
  };

  // ── Cabut (tunggal / massal) ───────────────────────────────────────────────
  const [revokeTarget, setRevokeTarget] = createSignal<SkpiPenerbitanItem[]>([]);
  const [revokeReason, setRevokeReason] = createSignal('');
  const [revokeBusy, setRevokeBusy] = createSignal(false);
  const [revokeError, setRevokeError] = createSignal('');

  const openRevoke = (targets: SkpiPenerbitanItem[]) => {
    setRevokeTarget(targets);
    setRevokeReason('');
    setRevokeError('');
  };

  const handleRevoke = async (e: Event) => {
    e.preventDefault();
    const targets = revokeTarget();
    const reason = revokeReason().trim();
    if (targets.length === 0) return;
    if (reason.length < 3) {
      setRevokeError('Alasan pencabutan minimal 3 karakter.');
      return;
    }
    setRevokeBusy(true);
    setRevokeError('');
    try {
      if (targets.length === 1) {
        await skpiController.revokeDokumen(targets[0].mahasiswaId, reason);
        toast.showToast(`Tanda tangan SKPI ${targets[0].nama} dicabut`, 'success');
      } else {
        const res = await skpiController.revokeBulk(
          targets.map((t) => t.mahasiswaId),
          reason,
        );
        toast.showToast(
          res.failedCount > 0
            ? `${res.revokedCount} tanda tangan dicabut, ${res.failedCount} gagal`
            : `${res.revokedCount} tanda tangan dicabut`,
          res.failedCount > 0 ? 'info' : 'success',
        );
      }
      setRevokeTarget([]);
      setSelected(new Set<number>());
      refetch();
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : 'Gagal mencabut tanda tangan SKPI.');
    } finally {
      setRevokeBusy(false);
    }
  };

  const openCetak = (mhsId: number) => {
    window.open(`/skpi/cetak/${mhsId}`, '_blank');
  };

  const describeSignTarget = (targets: SkpiPenerbitanItem[]) =>
    targets.length === 1 ? `${targets[0].nama} (${targets[0].nim})` : `${targets.length} mahasiswa terpilih`;

  return (
    <div class="flex flex-col gap-6">
      {/* Aksi massal */}
      <div class="bg-white p-4 rounded-2xl border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-secondary-500">
            <b>{selected().size}</b> mahasiswa dipilih — <b>{selectedSignable().length}</b> siap diterbitkan,{' '}
            <b>{selectedSigned().length}</b> dapat dicabut.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Muat Ulang
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={selectedSignable().length === 0}
              onClick={() => setSignTarget(selectedSignable())}
            >
              Terbitkan Terpilih ({selectedSignable().length})
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={selectedSigned().length === 0}
              onClick={() => openRevoke(selectedSigned())}
            >
              Cabut Terpilih ({selectedSigned().length})
            </Button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div class="bg-white border border-secondary-100 rounded-2xl p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div class="relative flex-1 w-full">
            <span class="absolute left-3.5 top-2.5 text-secondary-400">🔍</span>
            <input
              type="text"
              placeholder="Cari NIM / nama mahasiswa..."
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-action-focus dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={pagination.search()}
              onInput={(e) => {
                pagination.setSearch(e.currentTarget.value);
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
              class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
            >
              <option value={0}>Semua Prodi</option>
              <For each={prodiList()?.data ?? []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </Show>
          <label class="flex items-center gap-2 text-xs font-semibold text-secondary-600 dark:text-secondary-300 whitespace-nowrap">
            <input
              type="checkbox"
              checked={siapOnly()}
              onChange={(e) => {
                setSiapOnly(e.currentTarget.checked);
                pagination.resetPage();
              }}
              class="w-4 h-4 rounded border-secondary-300 text-action focus:ring-action-focus"
            />
            Hanya siap terbit
          </label>
          <div class="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={isExporting()} onClick={() => handleExport('excel')}>
              {isExporting() ? 'Mengunduh...' : 'Ekspor Excel'}
            </Button>
            <Button variant="secondary" size="sm" disabled={isExporting()} onClick={() => handleExport('pdf')}>
              {isExporting() ? '...' : 'Ekspor PDF'}
            </Button>
          </div>
          <Show when={prodiFilter() || pagination.search() || siapOnly()}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setProdiFilter(0);
                setSiapOnly(false);
                pagination.setSearch('');
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
                <th class="p-3 w-10" />
                <th class="p-3">Mahasiswa</th>
                <th class="p-3">Kegiatan (V / P / D)</th>
                <th class="p-3 text-center">Poin</th>
                <th class="p-3">Syarat</th>
                <th class="p-3">Tanda Tangan</th>
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
                  each={rows()}
                  fallback={
                    <tr>
                      <td colspan={7} class="p-8 text-center text-secondary-400">
                        Belum ada mahasiswa dengan rekaman kegiatan.
                      </td>
                    </tr>
                  }
                >
                  {(row) => (
                    <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                      <td class="p-3">
                        <input
                          type="checkbox"
                          checked={selected().has(row.mahasiswaId)}
                          onChange={() => toggleSelect(row.mahasiswaId)}
                          class="w-4 h-4 rounded border-secondary-300 text-action focus:ring-action-focus"
                          aria-label={`Pilih ${row.nama}`}
                        />
                      </td>
                      <td class="p-3">
                        <p class="font-bold text-secondary-800 dark:text-white">{row.nama}</p>
                        <p class="text-[11px] text-secondary-400">
                          {row.nim}
                          <Show when={row.prodi}>{(p) => <span> • {p()}</span>}</Show>
                          <Show when={row.statusAkademik}>
                            {(s) => <span class="capitalize"> • {STATUS_AKADEMIK_LABEL[s()] ?? s()}</span>}
                          </Show>
                        </p>
                      </td>
                      <td class="p-3">
                        <div class="flex flex-wrap items-center gap-1.5">
                          <Badge variant="success" size="sm">
                            V {row.diverifikasi}
                          </Badge>
                          <Badge variant="warning" size="sm">
                            P {row.pending}
                          </Badge>
                          <Badge variant="danger" size="sm">
                            D {row.ditolak}
                          </Badge>
                        </div>
                      </td>
                      <td class="p-3 text-center font-bold">{row.totalPoin}</td>
                      <td class="p-3">
                        <Show
                          when={row.syarat.terpenuhi}
                          fallback={
                            <span
                              class="text-[11px] text-warning-700 dark:text-warning-400"
                              title={row.syarat.alasan ?? ''}
                            >
                              Belum terpenuhi
                            </span>
                          }
                        >
                          <Badge variant="success" size="sm">
                            Terpenuhi
                          </Badge>
                        </Show>
                        <Show when={row.syarat.alasan}>
                          {(a) => <p class="mt-1 text-[11px] text-secondary-400">{a()}</p>}
                        </Show>
                      </td>
                      <td class="p-3">
                        <Show
                          when={row.signature}
                          fallback={
                            <Badge variant="default" size="sm">
                              Belum
                            </Badge>
                          }
                        >
                          {(sig) => (
                            <div>
                              <Badge variant="accent" size="sm">
                                Ditandatangani
                              </Badge>
                              <p class="mt-1 text-[11px] text-secondary-400">{fmtTanggalPanjang(sig().signedAt)}</p>
                            </div>
                          )}
                        </Show>
                      </td>
                      <td class="p-3">
                        <div class="flex items-center justify-center gap-1.5">
                          <Button variant="secondary" size="sm" onClick={() => openCetak(row.mahasiswaId)}>
                            Cetak
                          </Button>
                          <Show when={!row.signature && row.syarat.terpenuhi}>
                            <Button variant="primary" size="sm" onClick={() => setSignTarget([row])}>
                              Terbitkan
                            </Button>
                          </Show>
                          <Show when={row.signature}>
                            <Button variant="danger" size="sm" onClick={() => openRevoke([row])}>
                              Cabut
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

        <Show when={list.latest}>
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

      {/* Modal konfirmasi terbitkan */}
      <Modal
        show={signTarget().length > 0}
        onClose={() => !signBusy() && setSignTarget([])}
        title="Terbitkan Tanda Tangan SKPI"
      >
        <div class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            Tanda tangan elektronik (QR signed-hash) akan diterbitkan untuk <b>{describeSignTarget(signTarget())}</b>.
            Dokumen yang sudah pernah ditandatangani dengan isi sama bersifat idempoten (QR stabil); bila isi SKPI
            berubah, penerbitan ulang mencabut QR lama secara otomatis.
          </p>
          <div class="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setSignTarget([])} disabled={signBusy()}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSign} disabled={signBusy()}>
              {signBusy() ? 'Menerbitkan...' : 'Terbitkan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal cabut tanda tangan */}
      <Modal
        show={revokeTarget().length > 0}
        onClose={() => !revokeBusy() && setRevokeTarget([])}
        title="Cabut Tanda Tangan SKPI"
      >
        <form onSubmit={handleRevoke} class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            Tanda tangan SKPI <b>{describeSignTarget(revokeTarget())}</b> akan <b>dicabut</b> — QR yang sudah tercetak
            menampilkan status DICABUT pada halaman verifikasi publik. Alasan wajib diisi.
          </p>
          <Input
            label="Alasan Pencabutan"
            placeholder="Contoh: Koreksi data kegiatan mahasiswa"
            value={revokeReason()}
            onInput={(e) => setRevokeReason(e.currentTarget.value)}
            required
          />
          <Show when={revokeError()}>
            {(err) => (
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {err()}
              </div>
            )}
          </Show>
          <div class="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="secondary" onClick={() => setRevokeTarget([])} disabled={revokeBusy()}>
              Batal
            </Button>
            <Button type="submit" variant="danger" disabled={revokeBusy()}>
              {revokeBusy() ? 'Mencabut...' : 'Cabut Tanda Tangan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
