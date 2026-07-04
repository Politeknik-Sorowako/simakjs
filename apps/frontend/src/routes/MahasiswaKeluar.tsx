import { createSignal, createResource, Show, For } from 'solid-js';
import { mahasiswaKeluarController } from '../controllers/mahasiswaKeluarController';
import { mahasiswaController, Mahasiswa } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';

export default function MahasiswaKeluarPage() {
  const toast = useToast();
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [searchFilter, setSearchFilter] = createSignal('');
  const [periodeFilter, setPeriodeFilter] = createSignal('');

  // Fetch Deactivated Students
  const [records, { refetch: refetchRecords }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: searchFilter(),
      periodeId: periodeFilter()
    }),
    ({ page, limit, search, periodeId }) => mahasiswaKeluarController.getAll(search, page, limit, periodeId || undefined)
  );

  // Fetch Periods
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 50));

  // Search Mahasiswa for form selection
  const [searchMhsInput, setSearchMhsInput] = createSignal('');
  const [activeMahasiswas] = createResource(
    () => searchMhsInput(),
    async (search) => {
      if (!search || search.length < 2) return { data: [] };
      return await mahasiswaController.getAll(search, 1, 10);
    }
  );

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

  const openFormModal = () => {
    setSelectedMhs(null);
    setSearchMhsInput('');
    const active = periodes()?.data?.find(p => p.aktif);
    setPeriodeId(active?.id || periodes()?.data?.[0]?.id || '');
    setStatusBaru('keluar');
    setTanggalKeluar(new Date().toISOString().split('T')[0]);
    setAlasanKeluar('');
    setNoSk('');
    setTanggalSk('');
    setIpk('');
    setNomorIjazah('');
    setErrorMsg('');
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
        nomorIjazah: nomorIjazah() || undefined
      });
      toast.showToast('Status mahasiswa berhasil diubah ke non-aktif.', 'success');
      setShowModal(false);
      refetchRecords();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal mengubah status mahasiswa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan status keluar mahasiswa ini dan menjadikannya aktif kembali?')) return;
    try {
      await mahasiswaKeluarController.delete(id);
      toast.showToast('Status mahasiswa kembali AKTIF.', 'success');
      refetchRecords();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal membatalkan status keluar.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'keluar':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Keluar (Resign)</span>;
      case 'drop_out':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Drop Out</span>;
      case 'pindah':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Pindah</span>;
      case 'wafat':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Wafat</span>;
      case 'non_aktif':
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Non-Aktif</span>;
      default:
        return <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">Pencatatan Mahasiswa Keluar</h1>
            <p class="text-sm text-gray-500">Kelola dan catat riwayat mahasiswa yang keluar, mutasi/pindah, drop out, atau wafat.</p>
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
                setPage(1);
              }}
            />
          </div>
          <div class="w-48">
            <select
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={periodeFilter()}
              onChange={(e) => {
                setPeriodeFilter(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">Semua Periode</option>
              <For each={periodes()?.data}>
                {(p) => <option value={p.id}>{p.nama}</option>}
              </For>
            </select>
          </div>
        </div>

        <Show when={!records.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
          <Table headers={['NIM', 'Nama Mahasiswa', 'Status Baru', 'Periode', 'Tanggal Keluar', 'Nomor SK', 'Ijazah / IPK', 'Aksi']}>
            <For each={records()?.data} fallback={
              <tr>
                <td colspan="8" class="text-center py-10 text-gray-400">Tidak ada riwayat mahasiswa keluar yang ditemukan.</td>
              </tr>
            }>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-sm font-semibold text-gray-600">{item.mahasiswa?.nim}</td>
                  <td class="px-6 py-4 font-medium text-gray-800">{item.mahasiswa?.nama}</td>
                  <td class="px-6 py-4">{getStatusBadge(item.statusBaru)}</td>
                  <td class="px-6 py-4 text-gray-700">{item.periodeAkademik?.nama || item.periodeId}</td>
                  <td class="px-6 py-4 text-sm text-gray-500">{item.tanggalKeluar}</td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    <Show when={item.noSk} fallback={<span class="text-gray-300">-</span>}>
                      <div>No SK: {item.noSk}</div>
                      <div class="text-xs text-gray-400">Tgl SK: {item.tanggalSk}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    <div>IPK: {item.ipk || 'N/A'}</div>
                    <Show when={item.nomorIjazah}>
                      <div class="text-xs text-gray-400">Ijazah: {item.nomorIjazah}</div>
                    </Show>
                  </td>
                  <td class="px-6 py-4">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Batal Keluar</Button>
                  </td>
                </tr>
              )}
            </For>
          </Table>
        </Show>
      </div>

      <Modal show={showModal()} onClose={() => setShowModal(false)} title="Pencatatan Mahasiswa Keluar/Non-Aktif">
        <form onSubmit={handleSave} class="flex flex-col gap-4">
          <Show when={errorMsg()}>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{errorMsg()}</div>
          </Show>

          {/* Search Mahasiswa Section */}
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Cari Mahasiswa Aktif</label>
            <Show when={!selectedMhs()} fallback={
              <div class="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <div class="font-semibold text-blue-900">{selectedMhs()?.nama}</div>
                  <div class="text-xs text-blue-700">NIM: {selectedMhs()?.nim} | Status: {selectedMhs()?.status}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSelectedMhs(null)}>Ganti</Button>
              </div>
            }>
              <Input
                placeholder="Ketik minimal 2 karakter NIM atau nama..."
                value={searchMhsInput()}
                onInput={(e) => setSearchMhsInput(e.currentTarget.value)}
              />
              <Show when={searchMhsInput().length >= 2}>
                <div class="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm flex flex-col divide-y divide-gray-100">
                  <For each={activeMahasiswas()?.data} fallback={<div class="p-3 text-center text-xs text-gray-400">Mahasiswa tidak ditemukan</div>}>
                    {(mhs) => (
                      <div class="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                        <div>
                          <div class="text-sm font-medium text-gray-800">{mhs.nama}</div>
                          <div class="text-xs text-gray-500">NIM: {mhs.nim} | Status: {mhs.status}</div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => {
                          setSelectedMhs(mhs);
                          setSearchMhsInput('');
                        }}>Pilih</Button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-gray-700">Status Baru</label>
              <select
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label class="text-sm font-semibold text-gray-700">Periode Keluar</label>
              <select
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={periodeId()}
                onChange={(e) => setPeriodeId(e.currentTarget.value)}
              >
                <option value="">-- Pilih Periode --</option>
                <For each={periodes()?.data}>
                  {(p) => <option value={p.id}>{p.nama}</option>}
                </For>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-gray-700">Tanggal Keluar</label>
              <Input
                type="date"
                value={tanggalKeluar()}
                onInput={(e) => setTanggalKeluar(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-gray-700">IPK Terakhir</label>
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
              <label class="text-sm font-semibold text-gray-700">Nomor SK Yudisium/Keluar</label>
              <Input
                placeholder="Nomor SK"
                value={noSk()}
                onInput={(e) => setNoSk(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-gray-700">Tanggal SK</label>
              <Input
                type="date"
                value={tanggalSk()}
                onInput={(e) => setTanggalSk(e.currentTarget.value)}
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Nomor Ijazah (jika lulus/lulus gelar)</label>
            <Input
              placeholder="Nomor Ijazah"
              value={nomorIjazah()}
              onInput={(e) => setNomorIjazah(e.currentTarget.value)}
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-gray-700">Alasan Keluar/Catatan</label>
            <textarea
              rows={2}
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Tambahkan alasan mengapa mahasiswa ini dinonaktifkan..."
              value={alasanKeluar()}
              onInput={(e) => setAlasanKeluar(e.currentTarget.value)}
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={submitting()}>{submitting() ? 'Menyimpan...' : 'Simpan Data'}</Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
