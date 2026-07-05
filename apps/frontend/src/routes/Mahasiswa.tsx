import { createSignal, createResource, Show, For } from 'solid-js';
import { mahasiswaController, Mahasiswa as IMahasiswa } from '../controllers/mahasiswaController';
import { prodiController } from '../controllers/prodiController';
import { dosenController } from '../controllers/dosenController';
import { userController } from '../controllers/userController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export default function Mahasiswa() {
  const toast = useToast();
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [showImportModal, setShowImportModal] = createSignal(false);
  const [showImportPaModal, setShowImportPaModal] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [bulkLoading, setBulkLoading] = createSignal(false);

  const auth = useAuth();
  const workspace = useWorkspace();
  const isGlobalFilterActive = () => auth.user()?.role === 'admin';

  // Fetch Mahasiswa Data
  const [mahasiswas, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      prodiId: isGlobalFilterActive() ? workspace.selectedProdiId() : null
    }),
    ({ search, page, limit, prodiId }) => mahasiswaController.getAll(search, page, limit, prodiId || undefined)
  );

  // Fetch Program Studi for Dropdowns
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Fetch Dosen list for PA dropdown selector
  const [dosens] = createResource(() => dosenController.getAll(undefined, 1, 1000));

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [nim, setNim] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [dosenPaId, setDosenPaId] = createSignal<number | null>(null);
  const [status, setStatus] = createSignal('aktif');
  const [namaIbu, setNamaIbu] = createSignal('');
  const [nik, setNik] = createSignal('');
  const [gender, setGender] = createSignal<'L' | 'P'>('L');
  const [birthdate, setBirthdate] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setNim('');
    setNama('');
    setEmail('');
    const firstProdi = prodis()?.data?.[0]?.id || 0;
    setProdiId(firstProdi);
    setDosenPaId(null);
    setStatus('aktif');
    setNamaIbu('');
    setNik('');
    setGender('L');
    setBirthdate('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IMahasiswa) => {
    setEditId(item.id);
    setNim(item.nim);
    setNama(item.nama);
    setEmail(item.email);
    setProdiId(item.programStudiId || 0);
    setDosenPaId(item.dosenPaId || null);
    setStatus(item.status);
    setNamaIbu(item.namaIbuKandung || '');
    setNik(item.nik || '');
    setGender(item.jenisKelamin);
    setBirthdate(item.tanggalLahir ? String(item.tanggalLahir).split('T')[0] : '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        nim: nim(),
        nama: nama(),
        email: email(),
        programStudiId: Number(prodiId()),
        dosenPaId: dosenPaId() ? Number(dosenPaId()) : null,
        status: status(),
        namaIbuKandung: namaIbu(),
        nik: nik(),
        jenisKelamin: gender(),
        tanggalLahir: birthdate(),
      };

      if (editId()) {
        await mahasiswaController.update(editId()!, payload);
      } else {
        await mahasiswaController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const toggleSelectAll = () => {
    const list = mahasiswas()?.data || [];
    if (selectedIds().length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map(item => item.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds().includes(id)) {
      setSelectedIds(selectedIds().filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds(), id]);
    }
  };

  const isAllSelected = () => {
    const list = mahasiswas()?.data || [];
    return list.length > 0 && selectedIds().length === list.length;
  };

  const handleBulkCreateAccount = async () => {
    const ids = selectedIds();
    if (ids.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin membuatkan akun secara massal untuk ${ids.length} mahasiswa terpilih?`)) return;

    setBulkLoading(true);
    try {
      const res = await userController.generateAccounts('mahasiswa', ids);
      if (res.errors && res.errors.length > 0) {
        toast.showToast(`Berhasil membuat ${res.successCount} akun. Beberapa gagal: ${res.errors.join(', ')}`, 'warning');
      } else {
        toast.showToast(`Berhasil membuat ${res.successCount} akun mahasiswa.`, 'success');
      }
      setSelectedIds([]);
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal membuat akun secara massal.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Mahasiswa ini?')) return;
    try {
      await mahasiswaController.delete(id);
      refetch();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus data');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-brand-gray-800">Mahasiswa</h1>
            <p class="text-sm text-brand-gray-500">Kelola informasi data mahasiswa aktif dan administrasi akademik.</p>
          </div>
          <div class="flex gap-2">
            <Show when={selectedIds().length > 0}>
              <Button variant="success" disabled={bulkLoading()} onClick={handleBulkCreateAccount}>
                {bulkLoading() ? 'Memproses...' : `🔑 Buat Akun (${selectedIds().length})`}
              </Button>
            </Show>
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>📥 Impor Mahasiswa</Button>
            <Button variant="secondary" onClick={() => setShowImportPaModal(true)}>📥 Impor Relasi PA</Button>
            <Button onClick={openAddModal}>+ Tambah Mahasiswa</Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/mahasiswa/import"
          templateHeaders={['nim', 'nama', 'email', 'programStudiKode', 'status', 'namaIbuKandung', 'nik', 'jenisKelamin', 'tanggalLahir', 'tempatLahir', 'idAgama', 'jalan', 'rt', 'rw', 'kodePos', 'kewarganegaraan']}
          title="Mahasiswa"
          onSuccess={() => refetch()}
        />

        <ImportCsvModal
          show={showImportPaModal()}
          onClose={() => setShowImportPaModal(false)}
          importUrl="/mahasiswa/import-pa"
          templateHeaders={['nim', 'nip_dosen_pa']}
          title="Relasi Pembimbing Akademik"
          onSuccess={() => refetch()}
        />

        <div class="max-w-xs">
          <Input
            placeholder="Cari NIM atau nama..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show when={!mahasiswas.loading} fallback={<div class="text-center py-10 text-brand-gray-400">Loading data...</div>}>
          <Table headers={[
            <input
              type="checkbox"
              checked={isAllSelected()}
              onChange={toggleSelectAll}
              class="rounded border-brand-gray-300 text-brand-800 focus:ring-brand-700"
            />,
            'NIM', 'Nama', 'Email', 'Program Studi', 'Dosen Wali (PA)', 'Status', 'Aksi'
          ]}>
          <For each={mahasiswas()?.data}>
            {(item) => (
              <tr class="hover:bg-brand-50/50 transition-colors">
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds().includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    class="rounded border-brand-gray-300 text-brand-800 focus:ring-brand-700"
                  />
                </td>
                <td class="px-6 py-4 font-mono text-brand-gray-600 font-semibold">{item.nim}</td>
                <td class="px-6 py-4 font-medium text-brand-gray-800">{item.nama}</td>
                <td class="px-6 py-4 text-brand-gray-500">{item.email}</td>
                <td class="px-6 py-4 text-brand-gray-600">{item.programStudi?.nama || '-'}</td>
                <td class="px-6 py-4 text-brand-gray-600">{item.dosenPa?.nama || '-'}</td>
                <td class="px-6 py-4">
                  <span class={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'aktif' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-accent-50 text-accent-700 border border-accent-100'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td class="px-6 py-4 flex gap-2">
                  <Button variant="secondary" onClick={() => openEditModal(item)} class="!py-1 !px-2.5">
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5">
                    Hapus
                  </Button>
                </td>
              </tr>
            )}
          </For>
          <Show when={mahasiswas()?.data.length === 0}>
            <tr>
              <td colspan="7" class="px-6 py-10 text-center text-brand-gray-400">
                Tidak ada data mahasiswa ditemukan.
              </td>
            </tr>
          </Show>
        </Table>

          {/* Pagination */}
          <Show when={mahasiswas() && mahasiswas()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-brand-gray-500">
                Menampilkan halaman {page()} dari {mahasiswas()?.meta.totalPages} ({mahasiswas()?.meta.total} total data)
              </span>
              <div class="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page() === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  class="!py-1 !px-3"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={page() >= mahasiswas()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, mahasiswas()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal show={showModal()} title={editId() ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="NIM"
                required
                value={nim()}
                onInput={(e) => setNim(e.currentTarget.value)}
                placeholder="Contoh: 2004012"
              />
              <Input
                label="Nama Lengkap"
                required
                value={nama()}
                onInput={(e) => setNama(e.currentTarget.value)}
                placeholder="Contoh: Budi Santoso"
              />
              <Input
                type="email"
                label="Email"
                required
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                placeholder="budi@domain.com"
              />
              <Input
                isSelect
                label="Program Studi"
                value={prodiId()}
                onChange={(e) => setProdiId(Number(e.currentTarget.value))}
                selectOptions={
                  prodis()?.data.map((p) => ({ label: `${p.jenjang} - ${p.nama}`, value: p.id })) || []
                }
              />
              <Input
                label="NIK (16 Digit)"
                required
                value={nik()}
                onInput={(e) => setNik(e.currentTarget.value)}
                placeholder="16 digit nomor induk kependudukan"
              />
              <Input
                label="Nama Ibu Kandung"
                required
                value={namaIbu()}
                onInput={(e) => setNamaIbu(e.currentTarget.value)}
                placeholder="Nama lengkap ibu kandung"
              />
              <Input
                isSelect
                label="Jenis Kelamin"
                value={gender()}
                onChange={(e) => setGender(e.currentTarget.value as 'L' | 'P')}
                selectOptions={[
                  { label: 'Laki-laki', value: 'L' },
                  { label: 'Perempuan', value: 'P' },
                ]}
              />
              <Input
                type="date"
                label="Tanggal Lahir"
                required
                value={birthdate()}
                onInput={(e) => setBirthdate(e.currentTarget.value)}
              />
              <Input
                isSelect
                label="Status"
                value={status()}
                onChange={(e) => setStatus(e.currentTarget.value)}
                selectOptions={[
                  { label: 'Aktif', value: 'aktif' },
                  { label: 'Cuti', value: 'cuti' },
                  { label: 'Lulus', value: 'lulus' },
                  { label: 'Drop Out', value: 'drop_out' },
                ]}
              />
              <SearchableSelect
                label="Dosen Wali / PA"
                placeholder="Cari Dosen Wali / PA..."
                options={dosens()?.data.map((d) => ({ label: `${d.nama} (${d.nip})`, value: d.id })) || []}
                value={dosenPaId()}
                onChange={(val) => setDosenPaId(val ? Number(val) : null)}
              />
            </div>
            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
