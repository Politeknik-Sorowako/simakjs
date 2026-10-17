import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import { dosenController } from '../controllers/dosenController';
import { type PembimbingItem, type PembimbingJenis, pembimbingController } from '../controllers/pembimbingController';
import { prodiController } from '../controllers/prodiController';
import { usePagination } from '../hooks/usePagination';

interface SlotMeta {
  key: PembimbingJenis;
  label: string;
  hint: string;
}

const SLOTS: SlotMeta[] = [
  { key: 'PKL', label: 'Pembimbing PKL / Magang', hint: 'Dosen kampus atau pembimbing lapangan (industri).' },
  { key: 'TA_UTAMA', label: 'Pembimbing 1 Tugas Akhir', hint: 'Pembimbing utama proposal hingga ujian akhir.' },
  {
    key: 'TA_PENDAMPING',
    label: 'Pembimbing 2 Tugas Akhir',
    hint: 'Pembimbing pendamping; wajib berbeda dari Pembimbing 1.',
  },
];

interface DosenOpsi {
  id: number;
  nama: string;
  nip: string;
}

/** Ringkas identitas pembimbing aktif menjadi satu label untuk tabel. */
function describePembimbing(item: PembimbingItem, slot: PembimbingJenis): string {
  const row = item.pembimbing[slot];
  if (!row) return '-';
  if (row.dosenNama) return `${row.dosenNama}${row.dosenNip ? ` (${row.dosenNip})` : ''}`;
  return `${row.namaEksternal ?? '-'} — ${row.instansiEksternal ?? 'Tanpa instansi'}`;
}

/**
 * Halaman Penetapan Pembimbing.
 * - Dosen PA ditampilkan read-only (dikelola pada Data Mahasiswa).
 * - PKL / TA-1 / TA-2 dikelola di sini; pembimbing lapangan eksternal dicatat
 *   terstruktur (nama + instansi) tanpa perlu baris pada tabel dosen.
 */
export default function PenetapanPembimbing() {
  const toast = useToast();
  const { page, setPage, limit, setLimit, resetPage } = usePagination(20);

  const [prodiFilter, setProdiFilter] = createSignal('');
  const [angkatanFilter, setAngkatanFilter] = createSignal('');
  const [belumFilter, setBelumFilter] = createSignal<PembimbingJenis | ''>('');
  const [search, setSearch] = createSignal('');
  const [nonce, setNonce] = createSignal(0);

  const [prodiList] = createResource(async () => {
    const res = await prodiController.getAll('', 1, 200);
    return res.data;
  });

  const [dosenList] = createResource(async () => {
    const res = await dosenController.getAll('', 1, 200);
    return res.data.map<DosenOpsi>((d) => ({ id: d.id, nama: d.nama, nip: d.nip }));
  });

  const angkatanOpsi = (): string[] => {
    const now = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => String(now - i));
  };

  const [list, { refetch: refetchList }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      prodi: prodiFilter(),
      angkatan: angkatanFilter(),
      belum: belumFilter(),
      search: search(),
      nonce: nonce(),
    }),
    async (f) =>
      await pembimbingController.list({
        page: f.page,
        limit: f.limit,
        programStudiId: f.prodi ? Number(f.prodi) : undefined,
        angkatan: f.angkatan || undefined,
        jenis: f.belum || undefined,
        belumDitetapkan: Boolean(f.belum),
        search: f.search || undefined,
      }),
  );

  const reload = () => {
    setNonce((n) => n + 1);
    void refetchList();
  };

  // ── Modal tetapkan satu pembimbing ────────────────────────────────────────
  const [modalItem, setModalItem] = createSignal<PembimbingItem | null>(null);
  const [modalSlot, setModalSlot] = createSignal<PembimbingJenis>('PKL');
  const [internal, setInternal] = createSignal(true);
  const [dosenId, setDosenId] = createSignal('');
  const [namaEksternal, setNamaEksternal] = createSignal('');
  const [instansiEksternal, setInstansiEksternal] = createSignal('');
  const [catatan, setCatatan] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [formError, setFormError] = createSignal('');

  const openModal = (item: PembimbingItem, slot: PembimbingJenis) => {
    const existing = item.pembimbing[slot];
    setModalItem(item);
    setModalSlot(slot);
    setInternal(existing ? !existing.namaEksternal : true);
    setDosenId(existing?.dosenId ? String(existing.dosenId) : '');
    setNamaEksternal(existing?.namaEksternal ?? '');
    setInstansiEksternal(existing?.instansiEksternal ?? '');
    setCatatan(existing?.catatan ?? '');
    setFormError('');
  };

  const submitModal = async () => {
    const item = modalItem();
    if (!item) return;
    setSaving(true);
    setFormError('');
    try {
      await pembimbingController.set({
        mahasiswaId: item.mahasiswaId,
        jenis: modalSlot(),
        dosenId: internal() ? (dosenId() ? Number(dosenId()) : null) : null,
        namaEksternal: internal() ? null : namaEksternal() || null,
        instansiEksternal: internal() ? null : instansiEksternal() || null,
        catatan: catatan() || null,
      });
      toast.showToast('Pembimbing berhasil ditetapkan', 'success');
      setModalItem(null);
      reload();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Gagal menetapkan pembimbing.');
    } finally {
      setSaving(false);
    }
  };

  // ── Cabut penetapan ───────────────────────────────────────────────────────
  const [cabutTarget, setCabutTarget] = createSignal<{ id: number; label: string } | null>(null);
  const [cabutBusy, setCabutBusy] = createSignal(false);

  const konfirmasiCabut = async () => {
    const target = cabutTarget();
    if (!target) return;
    setCabutBusy(true);
    try {
      await pembimbingController.nonaktifkan(target.id);
      toast.showToast('Penetapan pembimbing dicabut', 'success');
      setCabutTarget(null);
      reload();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mencabut penetapan.', 'error');
    } finally {
      setCabutBusy(false);
    }
  };

  // ── Bulk set & impor CSV (jenis dipilih di toolbar) ───────────────────────
  const [bulkSlot, setBulkSlot] = createSignal<PembimbingJenis | ''>('');
  const [bulkInternal, setBulkInternal] = createSignal(true);
  const [bulkDosenId, setBulkDosenId] = createSignal('');
  const [bulkNama, setBulkNama] = createSignal('');
  const [bulkInstansi, setBulkInstansi] = createSignal('');
  const [bulkOpen, setBulkOpen] = createSignal(false);
  const [bulkSaving, setBulkSaving] = createSignal(false);

  const submitBulk = async () => {
    const slot = bulkSlot();
    if (!slot) return;
    const ids = (list()?.data ?? []).map((row) => row.mahasiswaId);
    if (ids.length === 0) {
      toast.showToast('Tidak ada mahasiswa pada halaman ini untuk ditetapkan.', 'error');
      return;
    }
    setBulkSaving(true);
    try {
      const res = await pembimbingController.bulkSet({
        mahasiswaIds: ids,
        jenis: slot,
        dosenId: bulkInternal() ? (bulkDosenId() ? Number(bulkDosenId()) : null) : null,
        namaEksternal: bulkInternal() ? null : bulkNama() || null,
        instansiEksternal: bulkInternal() ? null : bulkInstansi() || null,
      });
      toast.showToast(
        `${res.data.updated} mahasiswa ditetapkan${res.data.errors.length > 0 ? `, ${res.data.errors.length} gagal` : ''}`,
        res.data.errors.length > 0 ? 'info' : 'success',
      );
      setBulkOpen(false);
      reload();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal menetapkan pembimbing massal.', 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const csvRef = (el: HTMLInputElement) => {
    el.addEventListener('change', () => {
      const file = el.files?.[0];
      if (!file) return;
      void (async () => {
        try {
          const res = await pembimbingController.importCsv(file, bulkSlot() || undefined);
          toast.showToast(res.message, res.data.errors.length > 0 ? 'info' : 'success');
          reload();
        } catch (e: unknown) {
          toast.showToast(e instanceof Error ? e.message : 'Gagal mengimpor CSV.', 'error');
        } finally {
          el.value = '';
        }
      })();
    });
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Penetapan Pembimbing</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Tetapkan pembimbing PKL/magang serta pembimbing Tugas Akhir 1 &amp; 2. Dosen PA tetap dikelola pada Data
              Mahasiswa. Pergantian pembimbing menyimpan riwayat — penetapan lama dicabut (nonaktif), bukan dihapus.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              aria-label="Jenis untuk bulk & impor"
              value={bulkSlot()}
              onChange={(e) => setBulkSlot(e.currentTarget.value as PembimbingJenis | '')}
              class="rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm dark:border-secondary-700 dark:bg-secondary-800"
            >
              <option value="">Jenis untuk bulk/CSV…</option>
              <For each={SLOTS}>{(s) => <option value={s.key}>{s.label}</option>}</For>
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={!bulkSlot()}
              onClick={() => {
                setBulkInternal(true);
                setBulkDosenId('');
                setBulkNama('');
                setBulkInstansi('');
                setBulkOpen(true);
              }}
            >
              Tetapkan Massal
            </Button>
            <label
              class="cursor-pointer rounded-lg border border-secondary-200 bg-secondary-100 px-3 py-1.5 text-caption font-medium text-secondary-800 transition-colors hover:bg-secondary-200 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-100"
              for="input-impor-pembimbing"
            >
              Impor CSV
            </label>
            <input
              id="input-impor-pembimbing"
              type="file"
              accept=".csv,text/csv"
              class="hidden"
              ref={csvRef}
              disabled={!bulkSlot()}
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 rounded-2xl border border-secondary-200/80 bg-white p-4 md:grid-cols-4 dark:border-secondary-800 dark:bg-secondary-900">
          <Input
            label="Cari NIM / Nama"
            value={search()}
            placeholder="Ketik NIM atau nama…"
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
          />
          <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
            Program Studi
            <select
              value={prodiFilter()}
              onChange={(e) => {
                setProdiFilter(e.currentTarget.value);
                resetPage();
              }}
              class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
            >
              <option value="">Semua Prodi</option>
              <For each={prodiList() ?? []}>{(p) => <option value={String(p.id)}>{p.nama}</option>}</For>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
            Angkatan
            <select
              value={angkatanFilter()}
              onChange={(e) => {
                setAngkatanFilter(e.currentTarget.value);
                resetPage();
              }}
              class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
            >
              <option value="">Semua Angkatan</option>
              <For each={angkatanOpsi()}>{(a) => <option value={a}>{a}</option>}</For>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
            Belum Ditetapkan
            <select
              value={belumFilter()}
              onChange={(e) => {
                setBelumFilter(e.currentTarget.value as PembimbingJenis | '');
                resetPage();
              }}
              class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
            >
              <option value="">Tampilkan semua</option>
              <For each={SLOTS}>{(s) => <option value={s.key}>Belum ada: {s.label}</option>}</For>
            </select>
          </label>
        </div>

        <Show when={!list.loading} fallback={<p class="text-sm text-secondary-500">Memuat data…</p>}>
          <Table headers={['NIM', 'Mahasiswa', 'Angkatan', 'Prodi', 'Dosen PA', ...SLOTS.map((s) => s.label)]}>
            <tbody>
              <For
                each={list()?.data ?? []}
                fallback={
                  <tr>
                    <td colspan={5 + SLOTS.length} class="px-6 py-6 text-center text-sm text-secondary-500">
                      Tidak ada data mahasiswa pada filter ini.
                    </td>
                  </tr>
                }
              >
                {(item) => (
                  <tr class="border-b border-secondary-100 last:border-0 dark:border-secondary-800">
                    <td class="px-6 py-3 font-mono text-caption text-secondary-600 dark:text-secondary-300">
                      {item.nim}
                    </td>
                    <td class="px-6 py-3 text-table font-medium text-secondary-800 dark:text-white">
                      {item.namaMahasiswa}
                    </td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                      {item.angkatan ?? '-'}
                    </td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                      {item.prodiNama ?? '-'}
                    </td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                      {item.dosenPaNama ?? 'Belum ada PA'}
                    </td>
                    <For each={SLOTS}>
                      {(slot) => {
                        const detail = () => item.pembimbing[slot.key];
                        return (
                          <td class="px-6 py-3">
                            <div class="flex flex-col items-start gap-1">
                              <span class="text-caption text-secondary-700 dark:text-secondary-200">
                                {describePembimbing(item, slot.key)}
                              </span>
                              <Show
                                when={detail()}
                                fallback={
                                  <button
                                    type="button"
                                    class="w-fit text-fine font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                    onClick={() => openModal(item, slot.key)}
                                  >
                                    Tetapkan
                                  </button>
                                }
                              >
                                {(d) => (
                                  <div class="flex items-center gap-2">
                                    <Badge variant={d().dosenId ? 'info' : 'warning'} size="sm">
                                      {d().dosenId ? 'Dosen' : 'Eksternal'}
                                    </Badge>
                                    <button
                                      type="button"
                                      class="text-fine font-semibold text-primary-600 hover:underline dark:text-primary-400"
                                      onClick={() => openModal(item, slot.key)}
                                    >
                                      Ubah
                                    </button>
                                    <button
                                      type="button"
                                      class="text-fine text-danger-600 hover:underline dark:text-danger-400"
                                      onClick={() =>
                                        setCabutTarget({ id: d().id, label: `${item.namaMahasiswa} — ${slot.label}` })
                                      }
                                    >
                                      Cabut
                                    </button>
                                  </div>
                                )}
                              </Show>
                            </div>
                          </td>
                        );
                      }}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>

          <Pagination
            currentPage={page()}
            totalPages={list()?.totalPages ?? 1}
            total={list()?.total ?? 0}
            limit={limit()}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </Show>

        <Modal
          isOpen={modalItem() !== null}
          onClose={() => setModalItem(null)}
          title={`Tetapkan Pembimbing — ${modalItem()?.namaMahasiswa ?? ''}`}
          maxWidth="md"
        >
          <div class="flex flex-col gap-3">
            <p class="text-caption text-secondary-500">{SLOTS.find((s) => s.key === modalSlot())?.hint}</p>

            <div class="flex gap-2">
              <Button variant={internal() ? 'primary' : 'secondary'} size="sm" onClick={() => setInternal(true)}>
                Dosen Kampus
              </Button>
              <Button variant={internal() ? 'secondary' : 'primary'} size="sm" onClick={() => setInternal(false)}>
                Pembimbing Lapangan
              </Button>
            </div>

            <Show when={internal()}>
              <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
                Dosen
                <select
                  value={dosenId()}
                  onChange={(e) => setDosenId(e.currentTarget.value)}
                  class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
                >
                  <option value="">— Pilih Dosen —</option>
                  <For each={dosenList() ?? []}>
                    {(d) => (
                      <option value={String(d.id)}>
                        {d.nama} ({d.nip})
                      </option>
                    )}
                  </For>
                </select>
              </label>
            </Show>

            <Show when={!internal()}>
              <Input
                label="Nama Pembimbing Lapangan"
                value={namaEksternal()}
                onInput={(e) => setNamaEksternal(e.currentTarget.value)}
              />
              <Input
                label="Instansi / Perusahaan"
                value={instansiEksternal()}
                onInput={(e) => setInstansiEksternal(e.currentTarget.value)}
              />
            </Show>

            <Input label="Catatan (opsional)" value={catatan()} onInput={(e) => setCatatan(e.currentTarget.value)} />

            <Show when={formError()}>
              <p class="text-caption text-danger-600 dark:text-danger-400">{formError()}</p>
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModalItem(null)}>
                Batal
              </Button>
              <Button size="sm" loading={saving()} onClick={() => void submitModal()}>
                Simpan
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={bulkOpen()} onClose={() => setBulkOpen(false)} title="Tetapkan Pembimbing Massal" maxWidth="md">
          <div class="flex flex-col gap-3">
            <p class="text-caption text-secondary-500">
              Menetapkan <strong>{SLOTS.find((s) => s.key === bulkSlot())?.label}</strong> ke seluruh mahasiswa pada
              halaman ini ({list()?.total ?? 0} mahasiswa terlihat di halaman ini).
            </p>
            <div class="flex gap-2">
              <Button
                variant={bulkInternal() ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setBulkInternal(true)}
              >
                Dosen Kampus
              </Button>
              <Button
                variant={bulkInternal() ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setBulkInternal(false)}
              >
                Pembimbing Lapangan
              </Button>
            </div>

            <Show when={bulkInternal()}>
              <select
                value={bulkDosenId()}
                onChange={(e) => setBulkDosenId(e.currentTarget.value)}
                class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
              >
                <option value="">— Pilih Dosen —</option>
                <For each={dosenList() ?? []}>
                  {(d) => (
                    <option value={String(d.id)}>
                      {d.nama} ({d.nip})
                    </option>
                  )}
                </For>
              </select>
            </Show>

            <Show when={!bulkInternal()}>
              <Input
                label="Nama Pembimbing Lapangan"
                value={bulkNama()}
                onInput={(e) => setBulkNama(e.currentTarget.value)}
              />
              <Input
                label="Instansi / Perusahaan"
                value={bulkInstansi()}
                onInput={(e) => setBulkInstansi(e.currentTarget.value)}
              />
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkOpen(false)}>
                Batal
              </Button>
              <Button size="sm" loading={bulkSaving()} onClick={() => void submitBulk()}>
                Terapkan
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={cabutTarget() !== null}
          onClose={() => setCabutTarget(null)}
          title="Cabut Penetapan?"
          maxWidth="sm"
        >
          <div class="flex flex-col gap-4">
            <p class="text-sm text-secondary-600 dark:text-secondary-300">
              Cabut penetapan pembimbing untuk <strong>{cabutTarget()?.label}</strong>? Riwayat tetap tersimpan dan
              dosen pembimbing dapat ditetapkan kembali kapan saja.
            </p>
            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCabutTarget(null)}>
                Batal
              </Button>
              <Button variant="danger" size="sm" loading={cabutBusy()} onClick={() => void konfirmasiCabut()}>
                Cabut Penetapan
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
