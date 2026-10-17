import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  type AktivitasMbkm,
  aktivitasMbkmController,
  type StatusAktivitasMbkm,
} from '../controllers/aktivitasMbkmController';
import { dosenController } from '../controllers/dosenController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { prodiController } from '../controllers/prodiController';
import { usePagination } from '../hooks/usePagination';

const STATUS_META: Record<
  StatusAktivitasMbkm,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  diajukan: { label: 'Diajukan', variant: 'info' },
  disetujui: { label: 'Disetujui', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  selesai: { label: 'Selesai', variant: 'warning' },
};

/**
 * Halaman Aktivitas MBKM (Magang & Kuliah Kerja Praktik).
 * Sumber data Vik PDDIKTI: entitas `aktivitas_mahasiswa` beserta anggota,
 * pembimbing, dan konversi SKS — bukan atribut/flag pada mata kuliah.
 *
 * Saat aktivitas disetujui, sistem otomatis menaut baris bimbingan kategori
 * MAGANG sehingga sesi bimbingan PKL tercatat dan ter-kredit BKD lewat alur
 * bimbingan yang sudah ada.
 */
export default function AktivitasMbkm() {
  const auth = useAuth();
  const toast = useToast();
  const { page, setPage, limit, setLimit, resetPage } = usePagination(20);

  const isManager = () => auth.hasRole(['admin', 'super_admin', 'prodi', 'kaprodi', 'kemahasiswaan']);

  const [statusFilter, setStatusFilter] = createSignal<StatusAktivitasMbkm | ''>('');
  const [prodiFilter, setProdiFilter] = createSignal('');
  const [search, setSearch] = createSignal('');
  const [nonce, setNonce] = createSignal(0);

  const [prodiList] = createResource(async () => (await prodiController.getAll('', 1, 200)).data);
  const [jenisList] = createResource(async () => await aktivitasMbkmController.listJenis());
  const [dosenList] = createResource(async () =>
    (await dosenController.getAll('', 1, 200)).data.map((d) => ({ id: d.id, nama: d.nama, nip: d.nip })),
  );
  const [mhsList] = createResource(async () =>
    (await mahasiswaController.getAll('', 1, 200)).data.map((m) => ({ id: m.id, nim: m.nim, nama: m.nama })),
  );

  const [list, { refetch: refetchList }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      status: statusFilter(),
      prodi: prodiFilter(),
      search: search(),
      nonce: nonce(),
    }),
    async (f) =>
      await aktivitasMbkmController.list({
        page: f.page,
        limit: f.limit,
        status: f.status || undefined,
        programStudiId: f.prodi ? Number(f.prodi) : undefined,
        search: f.search || undefined,
      }),
  );

  const reload = () => {
    setNonce((n) => n + 1);
    void refetchList();
  };

  // ── Modal detail ───────────────────────────────────────────────────────────
  const [detailId, setDetailId] = createSignal<number | null>(null);
  const [detail, { refetch: refetchDetail }] = createResource(detailId, async (id) =>
    id ? await aktivitasMbkmController.getById(id) : null,
  );
  const [newAnggotaId, setNewAnggotaId] = createSignal('');
  const [newPembimbingId, setNewPembimbingId] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  const refreshDetail = () => {
    void refetchDetail();
    reload();
  };

  const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    try {
      await fn();
      toast.showToast(successMessage, 'success');
      refreshDetail();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Terjadi kesalahan.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ── Modal buat aktivitas ───────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = createSignal(false);
  const [form, setForm] = createSignal({
    judul: '',
    jenisId: '',
    programStudiId: '',
    lokasi: '',
    institusi: '',
    tanggalMulai: '',
    tanggalSelesai: '',
    sks: '20',
    deskripsi: '',
  });
  const [createError, setCreateError] = createSignal('');

  const submitCreate = async () => {
    const f = form();
    if (!f.judul.trim()) {
      setCreateError('Judul aktivitas wajib diisi.');
      return;
    }
    if (!f.jenisId) {
      setCreateError('Jenis aktivitas wajib dipilih.');
      return;
    }
    setBusy(true);
    setCreateError('');
    try {
      const res = await aktivitasMbkmController.create({
        judul: f.judul.trim(),
        jenisId: Number(f.jenisId),
        programStudiId: f.programStudiId ? Number(f.programStudiId) : null,
        lokasi: f.lokasi || null,
        institusi: f.institusi || null,
        tanggalMulai: f.tanggalMulai || null,
        tanggalSelesai: f.tanggalSelesai || null,
        sks: Number(f.sks) || 0,
        deskripsi: f.deskripsi || null,
      });
      toast.showToast('Aktivitas dibuat sebagai draft', 'success');
      setCreateOpen(false);
      setForm({
        judul: '',
        jenisId: '',
        programStudiId: '',
        lokasi: '',
        institusi: '',
        tanggalMulai: '',
        tanggalSelesai: '',
        sks: '20',
        deskripsi: '',
      });
      reload();
      setDetailId(res.data.id);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Gagal membuat aktivitas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Aktivitas MBKM</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Magang, praktik kerja lapangan, dan kuliah kerja. Data mengikuti entitas aktivitas Vik PDDIKTI — anggota,
              pembimbing, serta rekognisi SKS ke mata kuliah.
            </p>
          </div>
          <Show when={isManager()}>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Buat Aktivitas
            </Button>
          </Show>
        </div>

        <div class="grid grid-cols-1 gap-3 rounded-2xl border border-secondary-200/80 bg-white p-4 md:grid-cols-3 dark:border-secondary-800 dark:bg-secondary-900">
          <Input
            label="Cari judul"
            value={search()}
            placeholder="Judul aktivitas…"
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
          />
          <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
            Status
            <select
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value as StatusAktivitasMbkm | '');
                resetPage();
              }}
              class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
            >
              <option value="">Semua status</option>
              <For each={Object.keys(STATUS_META) as StatusAktivitasMbkm[]}>
                {(s) => <option value={s}>{STATUS_META[s].label}</option>}
              </For>
            </select>
          </label>
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
        </div>

        <Show when={!list.loading} fallback={<p class="text-sm text-secondary-500">Memuat data…</p>}>
          <Table headers={['Judul', 'Jenis', 'SKS', 'Anggota', 'Pembimbing', 'Status', 'Aksi']}>
            <tbody>
              <For
                each={list()?.data ?? []}
                fallback={
                  <tr>
                    <td colspan={7} class="px-6 py-6 text-center text-sm text-secondary-500">
                      Belum ada aktivitas pada filter ini.
                    </td>
                  </tr>
                }
              >
                {(row) => (
                  <tr class="border-b border-secondary-100 last:border-0 dark:border-secondary-800">
                    <td class="px-6 py-3 text-table font-medium text-secondary-800 dark:text-white">
                      {row.judul}
                      <Show when={row.prodiNama}>
                        <span class="block text-fine text-secondary-500">{row.prodiNama}</span>
                      </Show>
                    </td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                      {row.jenisNama ?? '-'}
                    </td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">{row.sks}</td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                      {row.anggota.length} mahasiswa
                    </td>
                    <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                      {row.pembimbing.length} dosen
                    </td>
                    <td class="px-6 py-3">
                      <Badge variant={STATUS_META[row.status].variant} size="sm">
                        {STATUS_META[row.status].label}
                      </Badge>
                    </td>
                    <td class="px-6 py-3">
                      <button
                        type="button"
                        class="text-fine font-semibold text-primary-600 hover:underline dark:text-primary-400"
                        onClick={() => setDetailId(row.id)}
                      >
                        Kelola
                      </button>
                    </td>
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

        {/* Detail */}
        <Modal
          isOpen={detailId() !== null}
          onClose={() => setDetailId(null)}
          title={detail()?.judul ?? 'Detail Aktivitas'}
          maxWidth="lg"
        >
          <Show when={detail()}>
            {(d) => (
              <div class="flex flex-col gap-4 text-sm">
                <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <p class="text-fine text-secondary-500">Jenis</p>
                    <p>{d().jenisNama ?? '-'}</p>
                  </div>
                  <div>
                    <p class="text-fine text-secondary-500">SKS</p>
                    <p>{d().sks}</p>
                  </div>
                  <div>
                    <p class="text-fine text-secondary-500">Periode</p>
                    <p>{d().periodeId ?? 'Belum ditetapkan'}</p>
                  </div>
                  <div>
                    <p class="text-fine text-secondary-500">Status</p>
                    <Badge variant={STATUS_META[d().status].variant} size="sm">
                      {STATUS_META[d().status].label}
                    </Badge>
                  </div>
                  <Show when={d().institusi}>
                    <div>
                      <p class="text-fine text-secondary-500">Instansi</p>
                      <p>{d().institusi}</p>
                    </div>
                  </Show>
                  <Show when={d().tanggalMulai}>
                    <div>
                      <p class="text-fine text-secondary-500">Mulai</p>
                      <p>{d().tanggalMulai}</p>
                    </div>
                  </Show>
                  <Show when={d().tanggalSelesai}>
                    <div>
                      <p class="text-fine text-secondary-500">Selesai</p>
                      <p>{d().tanggalSelesai}</p>
                    </div>
                  </Show>
                  <Show when={d().idPddikti}>
                    <div>
                      <p class="text-fine text-secondary-500">ID Vik PDDIKTI</p>
                      <p class="font-mono text-fine">{d().idPddikti}</p>
                    </div>
                  </Show>
                </div>

                {/* Anggota */}
                <div>
                  <p class="mb-1 font-semibold text-secondary-700 dark:text-secondary-200">
                    Anggota ({d().anggota.length})
                  </p>
                  <For each={d().anggota}>
                    {(a) => (
                      <div class="flex items-center justify-between border-b border-secondary-100 py-1 text-caption dark:border-secondary-800">
                        <span>
                          {a.nama} ({a.nim}) {a.peran === 'ketua' ? '· Ketua' : ''}
                        </span>
                        <Show when={isManager() && d().status === 'draft'}>
                          <button
                            type="button"
                            class="text-danger-600 hover:underline dark:text-danger-400"
                            onClick={() =>
                              void runAction(
                                () => aktivitasMbkmController.removeAnggota(d().id, a.id),
                                'Anggota dihapus',
                              )
                            }
                          >
                            Hapus
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={isManager() && d().status === 'draft'}>
                    <div class="mt-2 flex gap-2">
                      <select
                        value={newAnggotaId()}
                        onChange={(e) => setNewAnggotaId(e.currentTarget.value)}
                        class="flex-1 rounded-lg border border-secondary-200 bg-white px-3 py-2 text-caption dark:border-secondary-700 dark:bg-secondary-800"
                      >
                        <option value="">— Pilih mahasiswa —</option>
                        <For each={mhsList() ?? []}>
                          {(m) => (
                            <option value={String(m.id)}>
                              {m.nim} — {m.nama}
                            </option>
                          )}
                        </For>
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!newAnggotaId()}
                        onClick={() =>
                          void runAction(
                            () => aktivitasMbkmController.addAnggota(d().id, Number(newAnggotaId())),
                            'Anggota ditambahkan',
                          ).then(() => setNewAnggotaId(''))
                        }
                      >
                        Tambah
                      </Button>
                    </div>
                  </Show>
                </div>

                {/* Pembimbing */}
                <div>
                  <p class="mb-1 font-semibold text-secondary-700 dark:text-secondary-200">
                    Pembimbing ({d().pembimbing.length})
                  </p>
                  <For each={d().pembimbing}>
                    {(p) => (
                      <div class="flex items-center justify-between border-b border-secondary-100 py-1 text-caption dark:border-secondary-800">
                        <span>
                          {p.dosenNama} ({p.dosenNip}) {p.kategori === 'pendamping' ? '· Pendamping' : ''}
                        </span>
                        <Show when={isManager() && d().status === 'draft'}>
                          <button
                            type="button"
                            class="text-danger-600 hover:underline dark:text-danger-400"
                            onClick={() =>
                              void runAction(
                                () => aktivitasMbkmController.removePembimbing(d().id, p.id),
                                'Pembimbing dihapus',
                              )
                            }
                          >
                            Hapus
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={isManager() && d().status === 'draft'}>
                    <div class="mt-2 flex gap-2">
                      <select
                        value={newPembimbingId()}
                        onChange={(e) => setNewPembimbingId(e.currentTarget.value)}
                        class="flex-1 rounded-lg border border-secondary-200 bg-white px-3 py-2 text-caption dark:border-secondary-700 dark:bg-secondary-800"
                      >
                        <option value="">— Pilih dosen —</option>
                        <For each={dosenList() ?? []}>
                          {(x) => (
                            <option value={String(x.id)}>
                              {x.nama} ({x.nip})
                            </option>
                          )}
                        </For>
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!newPembimbingId()}
                        onClick={() =>
                          void runAction(
                            () => aktivitasMbkmController.addPembimbing(d().id, Number(newPembimbingId())),
                            'Pembimbing ditambahkan',
                          ).then(() => setNewPembimbingId(''))
                        }
                      >
                        Tambah
                      </Button>
                    </div>
                  </Show>
                </div>

                {/* Rekognisi SKS */}
                <div>
                  <p class="mb-1 font-semibold text-secondary-700 dark:text-secondary-200">
                    Rekognisi SKS ({d().konversi.length} dari {d().sks} SKS)
                  </p>
                  <For each={d().konversi}>
                    {(k) => (
                      <div class="flex items-center justify-between border-b border-secondary-100 py-1 text-caption dark:border-secondary-800">
                        <span>
                          {k.mataKuliahKode} — {k.mataKuliahNama}: {k.sksDiakui} SKS
                        </span>
                        <Show when={isManager() && (d().status === 'disetujui' || d().status === 'selesai')}>
                          <button
                            type="button"
                            class="text-danger-600 hover:underline dark:text-danger-400"
                            onClick={() =>
                              void runAction(
                                () => aktivitasMbkmController.removeKonversi(d().id, k.id),
                                'Rekognisi SKS dihapus',
                              )
                            }
                          >
                            Hapus
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={!d().konversi.length}>
                    <p class="text-caption text-secondary-500">
                      Belum ada rekognisi SKS. Total SKS diakui tidak boleh melebihi SKS aktivitas.
                    </p>
                  </Show>
                </div>

                {/* Workflow */}
                <Show when={isManager()}>
                  <div class="flex flex-wrap items-center gap-2 border-t border-secondary-100 pt-3 dark:border-secondary-800">
                    <Show when={d().status === 'draft'}>
                      <Button
                        size="sm"
                        loading={busy()}
                        onClick={() =>
                          void runAction(() => aktivitasMbkmController.ajukan(d().id), 'Aktivitas diajukan')
                        }
                      >
                        Ajukan Verifikasi
                      </Button>
                    </Show>
                    <Show when={d().status === 'diajukan'}>
                      <Button
                        size="sm"
                        loading={busy()}
                        onClick={() =>
                          void runAction(() => aktivitasMbkmController.setujui(d().id), 'Aktivitas disetujui')
                        }
                      >
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy()}
                        onClick={() => void runAction(() => aktivitasMbkmController.tolak(d().id), 'Aktivitas ditolak')}
                      >
                        Tolak
                      </Button>
                    </Show>
                    <Show when={d().status === 'disetujui'}>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy()}
                        onClick={() =>
                          void runAction(() => aktivitasMbkmController.setSelesai(d().id), 'Aktivitas ditandai selesai')
                        }
                      >
                        Tandai Selesai
                      </Button>
                    </Show>
                    <Show when={d().status === 'selesai'}>
                      <Badge variant="success" size="sm">
                        {d().bimbinganTertaut.length} bimbingan PKL tertaut
                      </Badge>
                    </Show>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </Modal>

        {/* Buat aktivitas */}
        <Modal isOpen={createOpen()} onClose={() => setCreateOpen(false)} title="Buat Aktivitas MBKM" maxWidth="md">
          <div class="flex flex-col gap-3">
            <Input
              label="Judul aktivitas"
              value={form().judul}
              onInput={(e) => setForm({ ...form(), judul: e.currentTarget.value })}
            />
            <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
              Jenis aktivitas
              <select
                value={form().jenisId}
                onChange={(e) => setForm({ ...form(), jenisId: e.currentTarget.value })}
                class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
              >
                <option value="">— Pilih jenis —</option>
                <For each={jenisList() ?? []}>{(j) => <option value={String(j.id)}>{j.nama}</option>}</For>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
              Program Studi
              <select
                value={form().programStudiId}
                onChange={(e) => setForm({ ...form(), programStudiId: e.currentTarget.value })}
                class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
              >
                <option value="">— Pilih prodi —</option>
                <For each={prodiList() ?? []}>{(p) => <option value={String(p.id)}>{p.nama}</option>}</For>
              </select>
            </label>
            <Input
              label="Instansi / Perusahaan"
              value={form().institusi}
              onInput={(e) => setForm({ ...form(), instansi: e.currentTarget.value })}
            />
            <div class="grid grid-cols-2 gap-3">
              <Input
                label="Tanggal mulai"
                type="date"
                value={form().tanggalMulai}
                onInput={(e) => setForm({ ...form(), tanggalMulai: e.currentTarget.value })}
              />
              <Input
                label="Tanggal selesai"
                type="date"
                value={form().tanggalSelesai}
                onInput={(e) => setForm({ ...form(), tanggalSelesai: e.currentTarget.value })}
              />
            </div>
            <Input
              label="SKS"
              type="number"
              value={form().sks}
              onInput={(e) => setForm({ ...form(), sks: e.currentTarget.value })}
            />

            <Show when={createError()}>
              <p class="text-caption text-danger-600 dark:text-danger-400">{createError()}</p>
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button size="sm" loading={busy()} onClick={() => void submitCreate()}>
                Simpan Draft
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
