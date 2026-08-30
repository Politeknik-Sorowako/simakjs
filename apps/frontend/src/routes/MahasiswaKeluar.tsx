import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import { Mahasiswa, mahasiswaController } from '../controllers/mahasiswaController';
import { mahasiswaKeluarController } from '../controllers/mahasiswaKeluarController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { usePagination } from '../hooks/usePagination';
import { getTodayString } from '../utils/format';

export default function MahasiswaKeluarPage() {
  const toast = useToast();
  const { page, limit, setPage, setLimit, resetPage } = usePagination();
  const [searchFilter, setSearchFilter] = createSignal('');
  const [periodeFilter, setPeriodeFilter] = createSignal('');

  // Fetch Deactivated Students
  const [records, { refetch: refetchRecords }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: searchFilter(),
      periodeId: periodeFilter(),
    }),
    ({ page, limit, search, periodeId }) =>
      mahasiswaKeluarController.getAll(search, page, limit, periodeId || undefined),
  );

  // Fetch Periods
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 50));

  const [sortBy, setSortBy] = createSignal('nim');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => {
    const data = records()?.data || [];
    return [...data].sort((a, b) => {
      const field = sortBy();
      let aVal: string;
      let bVal: string;
      if (field === 'nim') {
        aVal = a.mahasiswa?.nim ?? '';
        bVal = b.mahasiswa?.nim ?? '';
      } else if (field === 'namaMahasiswa') {
        aVal = a.mahasiswa?.nama ?? '';
        bVal = b.mahasiswa?.nama ?? '';
      } else {
        aVal = String((a as unknown as Record<string, unknown>)[field] ?? '');
        bVal = String((b as unknown as Record<string, unknown>)[field] ?? '');
      }
      const cmp = aVal.localeCompare(bVal, 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

  const [mhsList, setMhsList] = createSignal<Mahasiswa[]>([]);

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [selectedMhs, setSelectedMhs] = createSignal<Mahasiswa | null>(null);
  const [periodeId, setPeriodeId] = createSignal('');
  const [statusBaru, setStatusBaru] = createSignal('keluar');
  const [tanggalKeluar, setTanggalKeluar] = createSignal('');
  const [alasanKeluar, setAlasanKeluar] = createSignal('');
  const [noSk, setNoSk] = createSignal('');
  const [tanggalSk, setTanggalSk] = createSignal('');
  const [ipk, setIpk] = createSignal('');
  const [nomorIjazah, setNomorIjazah] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);

  const openFormModal = async () => {
    setSelectedMhs(null);
    const active = periodes()?.data?.find((p) => p.aktif);
    setPeriodeId(active?.id || periodes()?.data?.[0]?.id || '');
    setStatusBaru('keluar');
    setTanggalKeluar(getTodayString());
    setAlasanKeluar('');
    setNoSk('');
    setTanggalSk('');
    setIpk('');
    setNomorIjazah('');
    setErrorMsg('');
    try {
      const result = await mahasiswaController.getAll('', 1, 500);
      setMhsList(result.data || []);
    } catch {
      setMhsList([]);
    }
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    const mhs = selectedMhs();
    if (!mhs) {
      setErrorMsg('Pilih mahasiswa terlebih dahulu.');
      return;
    }
    if (!periodeId()) {
      setErrorMsg('Pilih periode akademik.');
      return;
    }
    if (!tanggalKeluar()) {
      setErrorMsg('Pilih tanggal keluar/non-aktif.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await mahasiswaKeluarController.create({
        mahasiswaId: mhs.id,
        periodeId: periodeId(),
        statusBaru: statusBaru(),
        tanggalKeluar: tanggalKeluar(),
        alasanKeluar: alasanKeluar() || undefined,
        noSk: noSk() || undefined,
        tanggalSk: tanggalSk() || undefined,
        ipk: ipk() ? Number(ipk()) : undefined,
        nomorIjazah: nomorIjazah() || undefined,
      });
      toast.showToast('Status mahasiswa berhasil diubah ke non-aktif.', 'success');
      setShowModal(false);
      refetchRecords();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal mengubah status mahasiswa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan status keluar mahasiswa ini dan menjadikannya aktif kembali?'))
      return;
    try {
      await mahasiswaKeluarController.delete(id);
      toast.showToast('Status mahasiswa kembali AKTIF.', 'success');
      refetchRecords();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membatalkan status keluar.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'keluar':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Keluar (Resign)
          </span>
        );
      case 'drop_out':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Drop Out</span>
        );
      case 'pindah':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
            Pindah
          </span>
        );
      case 'wafat':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary-100 text-secondary-800 dark:text-white">
            Wafat
          </span>
        );
      case 'non_aktif':
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Non-Aktif
          </span>
        );
      default:
        return (
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary-100 text-secondary-800 dark:text-white">
            {status}
          </span>
        );
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Pencatatan Mahasiswa Keluar</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Kelola dan catat riwayat mahasiswa yang keluar, mutasi/pindah, drop out, atau wafat.
            </p>
          </div>
          <Button onClick={openFormModal}>+ Catat Keluar/DO</Button>
        </div>

        <div class="flex gap-4 items-center">
          <div class="max-w-xs flex-1">
            <Input
              placeholder="Cari NIM atau nama..."
              value={searchFilter()}
              onInput={(e) => {
                setSearchFilter(e.currentTarget.value);
                resetPage();
              }}
            />
          </div>
          <div class="w-48">
            <select
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              value={periodeFilter()}
              onChange={(e) => {
                setPeriodeFilter(e.currentTarget.value);
                resetPage();
              }}
            >
              <option value="">Semua Periode</option>
              <For each={periodes()?.data}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
        </div>

        <Show
          when={!records.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Table
            headers={[
              <SortableHeader field="nim" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                NIM
              </SortableHeader>,
              <SortableHeader field="namaMahasiswa" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Nama Mahasiswa
              </SortableHeader>,
              'Status Baru',
              'Periode',
              'Tanggal Keluar',
              'Nomor SK',
              'Ijazah / IPK',
              'Aksi',
            ]}
          >
            <For
              each={sortedData()}
              fallback={
                <tr>
                  <td colspan="8" class="text-center py-10 text-secondary-400 dark:text-secondary-200">
                    Tidak ada riwayat mahasiswa keluar yang ditemukan.
                  </td>
                </tr>
              }
            >
              {(item) => (
                <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                  <td class="px-6 py-4 font-mono text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                    {item.mahasiswa?.nim}
                  </td>
                  <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.mahasiswa?.nama}</td>
                  <td class="px-6 py-4">{getStatusBadge(item.statusBaru)}</td>
                  <td class="px-6 py-4 text-secondary-700 dark:text-secondary-200">
                    {item.periodeAkademik?.nama || item.periodeId}
                  </td>
                  <td class="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-200">{item.tanggalKeluar}</td>
                  <td class="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-200">
                    <Show
                      when={item.noSk}
                      fallback={<span class="text-secondary-300 dark:border-secondary-700">-</span>}
                    >
                      <div>No SK: {item.noSk}</div>
                      <div class="text-xs text-secondary-400 dark:text-secondary-200">Tgl SK: {item.tanggalSk}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-200">
                    <div>IPK: {item.ipk || 'N/A'}</div>
                    <Show when={item.nomorIjazah}>
                      <div class="text-xs text-secondary-400 dark:text-secondary-200">Ijazah: {item.nomorIjazah}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                      Batal Keluar
                    </Button>
                  </td>
                </tr>
              )}
            </For>
          </Table>
        </Show>
        <Pagination
          currentPage={page()}
          totalPages={records()?.meta?.totalPages ?? 1}
          total={records()?.meta?.total ?? 0}
          limit={limit()}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      <Modal show={showModal()} onClose={() => setShowModal(false)} title="Pencatatan Mahasiswa Keluar/Non-Aktif">
        <form onSubmit={handleSave} class="flex flex-col gap-4">
          <Show when={errorMsg()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 dark:bg-red-900/30 dark:text-red-400">
              {errorMsg()}
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Cari Mahasiswa Aktif</label>
            <Show
              when={!selectedMhs()}
              fallback={
                <div class="flex justify-between items-center p-3 bg-brand-50 border border-brand-200 rounded-lg">
                  <div>
                    <div class="font-semibold text-brand-900">{selectedMhs()?.nama}</div>
                    <div class="text-xs text-brand-700 dark:text-brand-400">
                      NIM: {selectedMhs()?.nim} | Status: {selectedMhs()?.status}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedMhs(null)}>
                    Ganti
                  </Button>
                </div>
              }
            >
              <SearchableSelect
                placeholder="Ketik NIM atau nama mahasiswa..."
                options={mhsList().map((m) => ({ label: `${m.nama} (${m.nim})`, value: m.id }))}
                value={null}
                onChange={(val) => {
                  const mhs = mhsList().find((m) => m.id === val);
                  if (mhs) setSelectedMhs(mhs);
                }}
              />
            </Show>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Status Baru</label>
              <select
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                value={statusBaru()}
                onChange={(e) => setStatusBaru(e.currentTarget.value)}
              >
                <option value="keluar">Keluar (Mengundurkan Diri)</option>
                <option value="drop_out">Drop Out (Dikeluarkan)</option>
                <option value="pindah">Pindah</option>
                <option value="wafat">Wafat</option>
                <option value="non_aktif">Non-Aktif</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Periode Keluar</label>
              <select
                class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                value={periodeId()}
                onChange={(e) => setPeriodeId(e.currentTarget.value)}
              >
                <option value="">-- Pilih Periode --</option>
                <For each={periodes()?.data}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Tanggal Keluar</label>
              <Input type="date" value={tanggalKeluar()} onInput={(e) => setTanggalKeluar(e.currentTarget.value)} />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">IPK Terakhir</label>
              <Input
                type="number"
                step="0.01"
                placeholder="misal: 3.45"
                value={ipk()}
                onInput={(e) => setIpk(e.currentTarget.value)}
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Nomor SK Yudisium/Keluar
              </label>
              <Input placeholder="Nomor SK" value={noSk()} onInput={(e) => setNoSk(e.currentTarget.value)} />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Tanggal SK</label>
              <Input type="date" value={tanggalSk()} onInput={(e) => setTanggalSk(e.currentTarget.value)} />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
              Nomor Ijazah (jika lulus/lulus gelar)
            </label>
            <Input
              placeholder="Nomor Ijazah"
              value={nomorIjazah()}
              onInput={(e) => setNomorIjazah(e.currentTarget.value)}
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
              Alasan Keluar/Catatan
            </label>
            <textarea
              rows={2}
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              placeholder="Tambahkan alasan mengapa mahasiswa ini dinonaktifkan..."
              value={alasanKeluar()}
              onInput={(e) => setAlasanKeluar(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
              Batal
            </Button>
            <Button type="submit" disabled={submitting()}>
              {submitting() ? 'Menyimpan...' : 'Simpan Data'}
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
