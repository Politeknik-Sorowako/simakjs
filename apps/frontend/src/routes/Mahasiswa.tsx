import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { ExportButtonGroup } from '../components/reports/ExportButton';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { dosenController } from '../controllers/dosenController';
import { Mahasiswa as IMahasiswa, mahasiswaController } from '../controllers/mahasiswaController';
import { prodiController } from '../controllers/prodiController';
import { userController } from '../controllers/userController';
import { usePagination } from '../hooks/usePagination';
import { ExportColumn } from '../utils/export';

export default function Mahasiswa() {
  const toast = useToast();
  const { page, limit, setPage, setLimit, resetPage } = usePagination();
  const [search, setSearch] = createSignal('');
  const [showImportModal, setShowImportModal] = createSignal(false);
  const [showImportPaModal, setShowImportPaModal] = createSignal(false);
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [bulkLoading, setBulkLoading] = createSignal(false);

  const exportColumns: ExportColumn[] = [
    { header: 'NIM', accessor: 'nim' },
    { header: 'Nama Mahasiswa', accessor: 'nama' },
    { header: 'Email', accessor: 'email' },
    { header: 'Program Studi', accessor: 'programStudi.nama' },
    { header: 'Dosen PA', accessor: 'dosenPa.nama' },
    { header: 'Angkatan', accessor: 'angkatan' },
    { header: 'Status', accessor: 'status' },
  ];

  const auth = useAuth();
  const workspace = useWorkspace();

  // Column Filters
  const [filterNim, setFilterNim] = createSignal('');
  const [filterNama, setFilterNama] = createSignal('');
  const [filterEmail, setFilterEmail] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal('');

  // Input fields state (for UI immediate update)
  const [inputNim, setInputNim] = createSignal('');
  const [inputNama, setInputNama] = createSignal('');
  const [inputEmail, setInputEmail] = createSignal('');

  let debounceTimer: ReturnType<typeof setTimeout>;
  const handleDebouncedFilter = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setFilterNim(inputNim());
      setFilterNama(inputNama());
      setFilterEmail(inputEmail());
      resetPage();
    }, 500);
  };

  // Sorting state
  const [sortBy, setSortBy] = createSignal('nim');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  // Fetch Mahasiswa Data
  const [mahasiswas, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      prodiId: workspace.activeProdiId(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
      filterNim: filterNim(),
      filterNama: filterNama(),
      filterEmail: filterEmail(),
      filterStatus: filterStatus(),
    }),
    ({ search, page, limit, prodiId, sortBy, sortOrder, filterNim, filterNama, filterEmail, filterStatus }) =>
      mahasiswaController.getAll(search, page, limit, prodiId || undefined, {
        sortBy,
        sortOrder,
        filterNim,
        filterNama,
        filterEmail,
        filterStatus,
      }),
  );

  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => mahasiswas()?.data || [];

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
  const [tempatLahir, setTempatLahir] = createSignal('');
  const [idAgama, setIdAgama] = createSignal<number | null>(null);
  const [jalan, setJalan] = createSignal('');
  const [rt, setRt] = createSignal('');
  const [rw, setRw] = createSignal('');
  const [kodePos, setKodePos] = createSignal('');
  const [kewarganegaraan, setKewarganegaraan] = createSignal('ID');
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
    setTempatLahir('');
    setIdAgama(null);
    setJalan('');
    setRt('');
    setRw('');
    setKodePos('');
    setKewarganegaraan('ID');
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
    setTempatLahir(item.tempatLahir || '');
    setIdAgama(item.idAgama || null);
    setJalan(item.jalan || '');
    setRt(item.rt || '');
    setRw(item.rw || '');
    setKodePos(item.kodePos || '');
    setKewarganegaraan(item.kewarganegaraan || 'ID');
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
        namaIbuKandung: namaIbu() || null,
        nik: nik() || null,
        jenisKelamin: gender(),
        tanggalLahir: birthdate(),
        tempatLahir: tempatLahir() || null,
        idAgama: idAgama() ? Number(idAgama()) : null,
        jalan: jalan() || null,
        rt: rt() || null,
        rw: rw() || null,
        kodePos: kodePos() || null,
        kewarganegaraan: kewarganegaraan() || 'ID',
      };

      if (editId()) {
        await mahasiswaController.update(editId()!, payload);
      } else {
        await mahasiswaController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan data');
    }
  };

  const toggleSelectAll = () => {
    const list = mahasiswas()?.data || [];
    if (selectedIds().length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((item) => item.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds().includes(id)) {
      setSelectedIds(selectedIds().filter((x) => x !== id));
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
    if (!confirm(`Apakah Anda yakin ingin membuatkan akun secara massal untuk ${ids.length} mahasiswa terpilih?`))
      return;

    setBulkLoading(true);
    try {
      const res = await userController.generateAccounts('mahasiswa', ids);
      if (res.errors && res.errors.length > 0) {
        toast.showToast(`Berhasil membuat ${res.successCount} akun. Beberapa gagal: ${res.errors.join(', ')}`, 'info');
      } else {
        toast.showToast(`Berhasil membuat ${res.successCount} akun mahasiswa.`, 'success');
      }
      setSelectedIds([]);
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membuat akun secara massal.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Mahasiswa ini?')) return;
    try {
      await mahasiswaController.delete(id);
      refetch();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus data');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Mahasiswa</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Kelola informasi data mahasiswa aktif dan administrasi akademik.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <Show when={selectedIds().length > 0}>
              <Button variant="success" disabled={bulkLoading()} onClick={handleBulkCreateAccount}>
                {bulkLoading() ? 'Memproses...' : `🔑 Buat Akun (${selectedIds().length})`}
              </Button>
            </Show>
            <ExportButtonGroup
              onFetchAll={async () => {
                const res = await mahasiswaController.getAll(
                  search(),
                  1,
                  10000,
                  workspace.activeProdiId() || undefined,
                  {
                    sortBy: sortBy(),
                    sortOrder: sortOrder(),
                    filterNim: filterNim(),
                    filterNama: filterNama(),
                    filterEmail: filterEmail(),
                    filterStatus: filterStatus(),
                  },
                );
                return res.data;
              }}
              columns={exportColumns}
              filename={`Mahasiswa_${new Date().toISOString().split('T')[0]}`}
              title="Daftar Mahasiswa"
              subtitle="Data Mahasiswa SIMAK Vokasi"
            />
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              📥 Impor Mahasiswa
            </Button>
            <Button variant="secondary" onClick={() => setShowImportPaModal(true)}>
              📥 Impor Relasi PA
            </Button>
            <Button onClick={openAddModal}>+ Tambah Mahasiswa</Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/mahasiswa/import"
          templateHeaders={[
            'nim',
            'nama',
            'email',
            'programStudiKode',
            'status',
            'namaIbuKandung',
            'nik',
            'jenisKelamin',
            'tanggalLahir',
            'tempatLahir',
            'idAgama',
            'jalan',
            'rt',
            'rw',
            'kodePos',
            'kewarganegaraan',
          ]}
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
              resetPage();
            }}
          />
        </div>

        <Show
          when={!mahasiswas.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Table
            headers={[
              <input
                type="checkbox"
                checked={isAllSelected()}
                onChange={toggleSelectAll}
                class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 dark:border-secondary-700"
              />,
              <div class="flex flex-col gap-2 w-full">
                <SortableHeader field="nim" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  NIM
                </SortableHeader>
                <input
                  type="text"
                  placeholder="Filter NIM..."
                  class="px-2 py-1 text-xs font-normal border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-brand-500 w-24"
                  value={inputNim()}
                  onInput={(e) => {
                    setInputNim(e.currentTarget.value);
                    handleDebouncedFilter();
                  }}
                />
              </div>,
              <div class="flex flex-col gap-2 w-full">
                <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Nama
                </SortableHeader>
                <input
                  type="text"
                  placeholder="Filter Nama..."
                  class="px-2 py-1 text-xs font-normal border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-brand-500 w-32"
                  value={inputNama()}
                  onInput={(e) => {
                    setInputNama(e.currentTarget.value);
                    handleDebouncedFilter();
                  }}
                />
              </div>,
              <div class="flex flex-col gap-2 w-full">
                <SortableHeader field="email" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Email
                </SortableHeader>
                <input
                  type="text"
                  placeholder="Filter Email..."
                  class="px-2 py-1 text-xs font-normal border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-brand-500 w-32"
                  value={inputEmail()}
                  onInput={(e) => {
                    setInputEmail(e.currentTarget.value);
                    handleDebouncedFilter();
                  }}
                />
              </div>,
              'Program Studi',
              'Dosen Wali (PA)',
              <div class="flex flex-col gap-2 w-full">
                <SortableHeader field="status" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Status
                </SortableHeader>
                <select
                  class="px-2 py-1 text-xs font-normal border rounded-md border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-brand-500 w-24"
                  value={filterStatus()}
                  onChange={(e) => {
                    setFilterStatus(e.currentTarget.value);
                    resetPage();
                  }}
                >
                  <option value="">Semua</option>
                  <option value="aktif">Aktif</option>
                  <option value="cuti">Cuti</option>
                  <option value="lulus">Lulus</option>
                  <option value="drop_out">Drop Out</option>
                  <option value="keluar">Keluar</option>
                </select>
              </div>,
              'Aksi',
            ]}
          >
            <For each={sortedData()}>
              {(item) => (
                <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                  <td class="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds().includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 dark:border-secondary-700"
                    />
                  </td>
                  <td class="px-6 py-4 font-mono text-secondary-600 font-semibold dark:text-secondary-200">
                    {item.nim}
                  </td>
                  <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.nama}</td>
                  <td class="px-6 py-4 text-secondary-500 dark:text-secondary-200">{item.email}</td>
                  <td class="px-6 py-4 text-secondary-600 dark:text-secondary-200">{item.programStudi?.nama || '-'}</td>
                  <td class="px-6 py-4 text-secondary-600 dark:text-secondary-200">{item.dosenPa?.nama || '-'}</td>
                  <td class="px-6 py-4">
                    <span
                      class={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'aktif'
                          ? 'bg-accent-50 text-accent-700 border border-accent-100'
                          : 'bg-accent-50 text-accent-700 border border-accent-100'
                      }`}
                    >
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
                <td colspan="7" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                  Tidak ada data mahasiswa ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={mahasiswas() && mahasiswas()!.meta.totalPages > 0}>
            <Pagination
              currentPage={page()}
              totalPages={mahasiswas()!.meta.totalPages}
              total={mahasiswas()!.meta.total}
              limit={limit()}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </Show>
        </Show>

        <Modal
          show={showModal()}
          title={editId() ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 dark:bg-red-900/30 dark:text-red-400">
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
                selectOptions={prodis()?.data.map((p) => ({ label: `${p.jenjang} - ${p.nama}`, value: p.id })) || []}
              />
              <Input
                label="NIK (16 Digit)"
                value={nik()}
                onInput={(e) => setNik(e.currentTarget.value)}
                placeholder="16 digit nomor induk kependudukan (opsional)"
              />
              <Input
                label="Nama Ibu Kandung"
                value={namaIbu()}
                onInput={(e) => setNamaIbu(e.currentTarget.value)}
                placeholder="Nama lengkap ibu kandung (opsional)"
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
                label="Tempat Lahir"
                value={tempatLahir()}
                onInput={(e) => setTempatLahir(e.currentTarget.value)}
                placeholder="Kota/Kabupaten kelahiran"
              />
              <Input
                isSelect
                label="Agama"
                value={idAgama() !== null ? String(idAgama()) : ''}
                onChange={(e) => setIdAgama(e.currentTarget.value ? Number(e.currentTarget.value) : null)}
                selectOptions={[
                  { label: '-- Pilih Agama --', value: '' },
                  { label: 'Islam', value: '1' },
                  { label: 'Kristen / Protestan', value: '2' },
                  { label: 'Katolik', value: '3' },
                  { label: 'Hindu', value: '4' },
                  { label: 'Buddha', value: '5' },
                  { label: 'Khonghucu', value: '6' },
                ]}
              />
              <Input
                label="Alamat / Jalan"
                value={jalan()}
                onInput={(e) => setJalan(e.currentTarget.value)}
                placeholder="Nama jalan / nomor rumah"
              />
              <div class="grid grid-cols-2 gap-2">
                <Input label="RT" value={rt()} onInput={(e) => setRt(e.currentTarget.value)} placeholder="001" />
                <Input label="RW" value={rw()} onInput={(e) => setRw(e.currentTarget.value)} placeholder="002" />
              </div>
              <Input
                label="Kode Pos"
                value={kodePos()}
                onInput={(e) => setKodePos(e.currentTarget.value)}
                placeholder="92984"
              />
              <Input
                label="Kewarganegaraan"
                value={kewarganegaraan()}
                onInput={(e) => setKewarganegaraan(e.currentTarget.value)}
                placeholder="ID"
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
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
