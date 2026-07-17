import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { Kurikulum as IKurikulum, kurikulumController } from '../controllers/kurikulumController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';
import { API_URL, fetchApi } from '../utils/api';

export default function Kurikulum() {
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  const [kurikulums, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit(), prodiId: prodiFilter() }),
    ({ search, page, limit, prodiId }) => kurikulumController.getAll(search, page, limit, prodiId),
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));
  const [periodes] = createResource(() => periodeAkademikController.getAll());

  // Form State for CRUD
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [semesterMulai, setSemesterMulai] = createSignal('');
  const [jumlahSksLulus, setJumlahSksLulus] = createSignal(144);
  const [jumlahSksWajib, setJumlahSksWajib] = createSignal(120);
  const [jumlahSksPilihan, setJumlahSksPilihan] = createSignal(24);
  const [isAktif, setIsAktif] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  // State for Manage MK Modal
  const [showManageModal, setShowManageModal] = createSignal(false);
  const [manageKurikulumId, setManageKurikulumId] = createSignal<number | null>(null);
  const [kurikulumDetail, { refetch: refetchDetail }] = createResource(
    () => manageKurikulumId(),
    (id) => (id ? kurikulumController.getById(id) : null),
  );

  // Form for adding MK to kurikulum
  const [addMkMataKuliahId, setAddMkMataKuliahId] = createSignal<number>(0);
  const [addMkSemester, setAddMkSemester] = createSignal(1);
  const [addMkSks, setAddMkSks] = createSignal(3);
  const [addMkTatapMuka, setAddMkTatapMuka] = createSignal(2);
  const [addMkPraktek, setAddMkPraktek] = createSignal(1);
  const [addMkIsWajib, setAddMkIsWajib] = createSignal(true);
  const [addMkError, setAddMkError] = createSignal('');
  // Copy from kurikulum state
  const [sourceKurikulumId, setSourceKurikulumId] = createSignal<number>(0);
  const [copyResult, setCopyResult] = createSignal<{
    copied: number;
    skipped: number;
    sourceKode: string;
    sourceNama: string;
  } | null>(null);
  const [copyLoading, setCopyLoading] = createSignal(false);

  const handleCopyFromKurikulum = async () => {
    const targetId = manageKurikulumId();
    if (!targetId || !sourceKurikulumId()) return;
    if (
      !confirm(
        `Salin semua mata kuliah dari kurikulum sumber ke "${kurikulumDetail()?.nama}"? MK yang sudah ada akan dilewati.`,
      )
    )
      return;
    setCopyLoading(true);
    setCopyResult(null);
    try {
      const result = await kurikulumController.copyFromKurikulum(targetId, sourceKurikulumId());
      setCopyResult(result);
      refetchDetail();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menyalin');
    } finally {
      setCopyLoading(false);
    }
  };

  // Duplicate state
  const [showDuplicateModal, setShowDuplicateModal] = createSignal(false);
  const [dupId, setDupId] = createSignal<number | null>(null);
  const [dupKode, setDupKode] = createSignal('');
  const [dupNama, setDupNama] = createSignal('');
  const [dupError, setDupError] = createSignal('');

  const openDuplicateModal = (item: IKurikulum) => {
    setDupId(item.id);
    setDupKode(`${item.kode}-DUP`);
    setDupNama(`Duplikat ${item.nama}`);
    setDupError('');
    setShowDuplicateModal(true);
  };

  const handleDuplicate = async (e: Event) => {
    e.preventDefault();
    setDupError('');
    if (!dupId()) return;
    try {
      await kurikulumController.duplicate(dupId()!, dupKode(), dupNama());
      setShowDuplicateModal(false);
      refetch();
    } catch (e: unknown) {
      setDupError((e as Error).message || 'Gagal menduplikasi');
    }
  };

  // Import CSV state
  const [csvImportResult, setCsvImportResult] = createSignal<{
    imported: number;
    skipped: number;
    errors: { baris: number; pesan: string }[];
  } | null>(null);
  const [csvImportLoading, setCsvImportLoading] = createSignal(false);

  const handleImportCsv = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !manageKurikulumId()) return;
    setCsvImportLoading(true);
    setCsvImportResult(null);
    try {
      const result = await kurikulumController.importMkCsv(manageKurikulumId()!, file);
      setCsvImportResult(result);
      refetchDetail();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal impor CSV');
    } finally {
      setCsvImportLoading(false);
      input.value = '';
    }
  };

  const [allMatkuls] = createResource(
    () => manageKurikulumId(),
    () => mataKuliahController.getAll('', 1, 500),
  );

  const openManageModal = async (id: number) => {
    setManageKurikulumId(id);
    setAddMkMataKuliahId(0);
    setAddMkSemester(1);
    setAddMkSks(3);
    setAddMkTatapMuka(2);
    setAddMkPraktek(1);
    setAddMkIsWajib(true);
    setAddMkError('');
    setShowManageModal(true);
  };

  const handleAddMk = async (e: Event) => {
    e.preventDefault();
    setAddMkError('');
    const kurId = manageKurikulumId();
    if (!kurId || !addMkMataKuliahId()) {
      setAddMkError('Pilih mata kuliah');
      return;
    }
    try {
      await kurikulumController.addMataKuliah(kurId, {
        mataKuliahId: addMkMataKuliahId(),
        semester: addMkSemester(),
        sksMataKuliah: addMkSks(),
        sksTatapMuka: addMkTatapMuka(),
        sksPraktek: addMkPraktek(),
        isWajib: addMkIsWajib(),
      });
      setAddMkMataKuliahId(0);
      refetchDetail();
    } catch (e: unknown) {
      setAddMkError((e as Error).message || 'Gagal menambahkan mata kuliah');
    }
  };

  const handleRemoveMk = async (mkId: number) => {
    const kurId = manageKurikulumId();
    if (!kurId) return;
    if (!confirm('Hapus mata kuliah ini dari kurikulum?')) return;
    try {
      await kurikulumController.removeMataKuliah(kurId, mkId);
      refetchDetail();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus');
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setKode('');
    setNama('');
    const firstProdi = prodis()?.data?.[0]?.id || 0;
    setProdiId(firstProdi);
    const firstPeriode = periodes()?.data?.[0]?.id || '';
    setSemesterMulai(firstPeriode);
    setJumlahSksLulus(144);
    setJumlahSksWajib(120);
    setJumlahSksPilihan(24);
    setIsAktif(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IKurikulum) => {
    setEditId(item.id);
    setKode(item.kode);
    setNama(item.nama);
    setProdiId(item.programStudiId);
    setSemesterMulai(item.semesterMulai);
    setJumlahSksLulus(item.jumlahSksLulus);
    setJumlahSksWajib(item.jumlahSksWajib);
    setJumlahSksPilihan(item.jumlahSksPilihan);
    setIsAktif(item.isAktif);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    if (!semesterMulai()) {
      setErrorMsg('Semester mulai berlaku harus dipilih');
      return;
    }
    try {
      const payload = {
        kode: kode(),
        nama: nama(),
        programStudiId: Number(prodiId()),
        semesterMulai: semesterMulai(),
        jumlahSksLulus: Number(jumlahSksLulus()),
        jumlahSksWajib: Number(jumlahSksWajib()),
        jumlahSksPilihan: Number(jumlahSksPilihan()),
        isAktif: isAktif(),
      };
      if (editId()) {
        await kurikulumController.update(editId()!, payload);
      } else {
        await kurikulumController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Kurikulum ini?')) return;
    try {
      await kurikulumController.delete(id);
      refetch();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus data');
    }
  };

  // Group MK by semester (memoized)
  const mkBySemester = createMemo(() => {
    const mks = kurikulumDetail()?.kurikulumMataKuliah || [];
    const groups: { [sem: number]: Record<string, unknown>[] } = {};
    for (const mk of mks) {
      if (!groups[mk.semester]) groups[mk.semester] = [];
      groups[mk.semester].push(mk);
    }
    return Object.entries(groups)
      .map(([sem, items]) => ({ semester: parseInt(sem), items }))
      .sort((a, b) => a.semester - b.semester);
  });

  // Fetch BK mappings for all MK in this kurikulum
  const [bkMappings, { refetch: refetchBkMappings }] = createResource(
    () => manageKurikulumId(),
    async (kurikulumId) => {
      if (!kurikulumId) return {};
      const detail = await kurikulumController.getById(kurikulumId);
      const mkIds = detail.kurikulumMataKuliah.map((kmk) => kmk.mataKuliahId);
      const mappings: { [mkId: number]: Record<string, unknown>[] } = {};
      for (const mkId of mkIds) {
        try {
          const bkList = await fetchApi<Record<string, unknown>[]>(`/mata-kuliah/${mkId}/bahan-kajian`);
          mappings[mkId] = bkList;
        } catch {
          mappings[mkId] = [];
        }
      }
      return mappings;
    },
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Kelola Kurikulum</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Penyusunan kurikulum per program studi sesuai dengan standar PDDIKTI
            </p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Kurikulum</Button>
        </div>

        {/* Filter and Search */}
        <div class="flex flex-wrap gap-4 bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800">
          <div class="flex-1 min-w-[250px]">
            <Input
              type="text"
              placeholder="Cari kode atau nama kurikulum..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
          <div class="w-[200px]">
            <select
              class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              onChange={(e) => setProdiFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data}>{(prodi) => <option value={prodi.id}>{prodi.nama}</option>}</For>
            </select>
          </div>
        </div>

        {/* Kurikulum Table */}
        <Table headers={['Kode', 'Nama Kurikulum', 'Program Studi', 'Mulai Berlaku', 'SKS (L/W/P)', 'Status', 'Aksi']}>
          <Show when={kurikulums.loading}>
            <tr>
              <td colspan="7" class="p-8 text-center text-secondary-500">
                Memuat data...
              </td>
            </tr>
          </Show>
          <Show when={!kurikulums.loading && (kurikulums()?.data?.length ?? 0) === 0}>
            <tr>
              <td colspan="7" class="p-8 text-center text-secondary-500">
                Belum ada data kurikulum.
              </td>
            </tr>
          </Show>
          <For each={kurikulums()?.data ?? []}>
            {(item) => (
              <tr class="hover:bg-secondary-50 dark:hover:bg-secondary-800/50">
                <td class="px-6 py-4 text-sm font-medium text-secondary-900 dark:text-white">{item.kode}</td>
                <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">{item.nama}</td>
                <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">
                  {item.programStudi?.nama || '-'}
                </td>
                <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">{item.semesterMulai}</td>
                <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">
                  {item.jumlahSksLulus} / {item.jumlahSksWajib} / {item.jumlahSksPilihan}
                </td>
                <td class="px-6 py-4 text-sm">
                  <span
                    class={`px-2 py-1 rounded-full text-xs font-semibold ${item.isAktif ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200'}`}
                  >
                    {item.isAktif ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm space-x-2">
                  <Button variant="primary" onClick={() => openManageModal(item.id)}>
                    MK
                  </Button>
                  <Button variant="secondary" onClick={() => openEditModal(item)}>
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => openDuplicateModal(item)}>
                    Duplikasi
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(item.id)}>
                    Hapus
                  </Button>
                </td>
              </tr>
            )}
          </For>
        </Table>

        {/* Pagination */}
        <Show when={kurikulums() && kurikulums()!.meta.totalPages > 1}>
          <div class="flex justify-between items-center mt-4">
            <span class="text-xs text-secondary-500">
              Menampilkan halaman {page()} dari {kurikulums()?.meta.totalPages} ({kurikulums()?.meta.total} total data)
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
                disabled={page() >= kurikulums()!.meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, kurikulums()!.meta.totalPages))}
                class="!py-1 !px-3"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </Show>

        {/* Modal CRUD Kurikulum */}
        <Modal
          show={showModal()}
          onClose={() => setShowModal(false)}
          title={editId() ? 'Edit Kurikulum' : 'Tambah Kurikulum'}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Kode Kurikulum</label>
              <Input type="text" value={kode()} onInput={(e) => setKode(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Nama Kurikulum</label>
              <Input type="text" value={nama()} onInput={(e) => setNama(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Program Studi</label>
              <select
                class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={prodiId()}
                onChange={(e) => setProdiId(Number(e.currentTarget.value))}
              >
                <For each={prodis()?.data}>{(prodi) => <option value={prodi.id}>{prodi.nama}</option>}</For>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Semester Mulai Berlaku
              </label>
              <Show
                when={periodes.loading}
                fallback={
                  <select
                    class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={semesterMulai()}
                    onChange={(e) => setSemesterMulai(e.currentTarget.value)}
                  >
                    <option value="">Pilih Semester</option>
                    <For each={periodes()?.data}>{(periode) => <option value={periode.id}>{periode.nama}</option>}</For>
                  </select>
                }
              >
                <div class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 flex items-center text-sm text-secondary-500">
                  Memuat data periode...
                </div>
              </Show>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">SKS Lulus</label>
                <Input
                  type="number"
                  value={jumlahSksLulus()}
                  onInput={(e) => setJumlahSksLulus(Number(e.currentTarget.value))}
                  required
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">SKS Wajib</label>
                <Input
                  type="number"
                  value={jumlahSksWajib()}
                  onInput={(e) => setJumlahSksWajib(Number(e.currentTarget.value))}
                  required
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">SKS Pilihan</label>
                <Input
                  type="number"
                  value={jumlahSksPilihan()}
                  onInput={(e) => setJumlahSksPilihan(Number(e.currentTarget.value))}
                  required
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAktif"
                checked={isAktif()}
                onChange={(e) => setIsAktif(e.currentTarget.checked)}
              />
              <label for="isAktif" class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Aktifkan Kurikulum ini
              </label>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={periodes.loading || !semesterMulai()}>
                Simpan
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Kelola MK dalam Kurikulum */}
        <Modal
          show={showManageModal()}
          onClose={() => setShowManageModal(false)}
          title={`MK: ${kurikulumDetail()?.nama || ''}`}
          maxWidth="xl"
        >
          <Show when={kurikulumDetail()}>
            <div class="flex flex-col gap-6">
              {/* Info */}
              <div class="p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg text-sm grid grid-cols-3 gap-3">
                <div>
                  <span class="font-semibold">Kode:</span> {kurikulumDetail()?.kode}
                </div>
                <div>
                  <span class="font-semibold">Prodi:</span> {kurikulumDetail()?.programStudi?.nama}
                </div>
                <div>
                  <span class="font-semibold">Mulai:</span> {kurikulumDetail()?.semesterMulai}
                </div>
              </div>

              {/* Daftar MK per Semester */}
              <div class="space-y-4">
                <h3 class="text-sm font-bold text-secondary-700 dark:text-secondary-200">Daftar Mata Kuliah</h3>
                <For each={mkBySemester()}>
                  {(group) => (
                    <div class="border border-secondary-100 dark:border-secondary-800 rounded-lg">
                      <div class="px-4 py-2 bg-brand-50 dark:bg-brand-900/30 font-semibold text-sm text-brand-700 dark:text-white">
                        Semester {group.semester}
                      </div>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="border-b border-secondary-100 dark:border-secondary-800">
                            <th class="px-4 py-2 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-200">
                              Kode
                            </th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-secondary-500 dark:text-secondary-200">
                              Nama
                            </th>
                            <th class="px-4 py-2 text-center text-xs font-semibold text-secondary-500 dark:text-secondary-200">
                              SKS
                            </th>
                            <th class="px-4 py-2 text-center text-xs font-semibold text-secondary-500 dark:text-secondary-200">
                              Wajib
                            </th>
                            <th class="px-4 py-2 text-center text-xs font-semibold text-secondary-500 dark:text-secondary-200">
                              BK
                            </th>
                            <th class="px-4 py-2 text-center text-xs font-semibold text-secondary-500 dark:text-secondary-200">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={group.items}>
                            {(item) => (
                              <tr class="border-b border-secondary-50 dark:border-secondary-800/50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                                <td class="px-4 py-2 font-mono text-secondary-600">{item.mataKuliah?.kode}</td>
                                <td class="px-4 py-2 text-secondary-800 dark:text-secondary-200">
                                  {item.mataKuliah?.nama}
                                </td>
                                <td class="px-4 py-2 text-center text-secondary-700">{item.sksMataKuliah}</td>
                                <td class="px-4 py-2 text-center">
                                  <span
                                    class={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.isWajib ? 'bg-green-50 text-green-700' : 'bg-secondary-100 text-secondary-600'}`}
                                  >
                                    {item.isWajib ? 'Ya' : 'Tidak'}
                                  </span>
                                </td>
                                <td class="px-4 py-2 text-center">
                                  <Show when={bkMappings() && bkMappings()![item.mataKuliahId]}>
                                    <Badge variant="info">{bkMappings()![item.mataKuliahId]?.length || 0} BK</Badge>
                                  </Show>
                                </td>
                                <td class="px-4 py-2 text-center">
                                  <button
                                    onClick={() => handleRemoveMk(item.mataKuliahId)}
                                    class="text-xs text-red-600 hover:text-red-800 font-semibold"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  )}
                </For>
                <Show when={mkBySemester().length === 0}>
                  <p class="text-center text-sm text-secondary-400 py-6">Belum ada mata kuliah dalam kurikulum ini.</p>
                </Show>
              </div>

              {/* Import dari Kurikulum Lain */}
              <div class="border-t border-secondary-100 dark:border-secondary-800 pt-4">
                <details class="group">
                  <summary class="flex items-center gap-2 cursor-pointer list-none text-sm font-bold text-secondary-700 dark:text-secondary-200">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Impor dari Kurikulum Lain
                  </summary>
                  <div class="mt-3 flex flex-wrap items-end gap-3">
                    <div class="flex-1 min-w-[200px]">
                      <label class="text-xs font-semibold text-secondary-500 block mb-1">Kurikulum Sumber</label>
                      <select
                        class="w-full h-9 px-2 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={sourceKurikulumId()}
                        onChange={(e) => setSourceKurikulumId(Number(e.currentTarget.value))}
                      >
                        <option value={0}>Pilih Kurikulum Sumber</option>
                        <For each={(kurikulums()?.data ?? []).filter((k) => k.id !== manageKurikulumId())}>
                          {(k) => (
                            <option value={k.id}>
                              {k.nama} ({k.kode})
                            </option>
                          )}
                        </For>
                      </select>
                    </div>
                    <Button onClick={handleCopyFromKurikulum} disabled={!sourceKurikulumId() || copyLoading()}>
                      {copyLoading() ? 'Menyalin...' : 'Impor'}
                    </Button>
                  </div>
                  <Show when={copyResult()}>
                    <div class="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400">
                      ✅ {copyResult()?.copied} MK berhasil disalin dari {copyResult()?.sourceNama}
                      <Show when={copyResult()?.skipped}> ({copyResult()?.skipped} dilewati karena sudah ada)</Show>
                    </div>
                  </Show>
                </details>
              </div>

              {/* Import CSV */}
              <div class="border-t border-secondary-100 dark:border-secondary-800 pt-4">
                <details class="group">
                  <summary class="flex items-center gap-2 cursor-pointer list-none text-sm font-bold text-secondary-700 dark:text-secondary-200">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Impor CSV Mata Kuliah
                  </summary>
                  <div class="mt-3 flex flex-wrap items-end gap-3">
                    <div class="flex-1">
                      <label class="text-xs font-semibold text-secondary-500 block mb-1">
                        File CSV (kode_mata_kuliah, semester, sks, is_wajib)
                      </label>
                      <div class="flex items-center gap-3">
                        <a
                          href={`${API_URL}/kurikulum/template-import-mk`}
                          download
                          class="text-xs text-brand-600 hover:text-brand-800 font-semibold underline"
                        >
                          Download Template CSV
                        </a>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleImportCsv}
                          class="w-full text-sm text-secondary-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                        />
                      </div>
                    </div>
                  </div>
                  <Show when={csvImportLoading()}>
                    <p class="mt-2 text-xs text-secondary-500">Memproses...</p>
                  </Show>
                  <Show when={csvImportResult()}>
                    <div class="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-400">
                      ✅ {csvImportResult()?.imported} MK berhasil diimpor
                      <Show when={csvImportResult()?.skipped}> ({csvImportResult()?.skipped} dilewati)</Show>
                    </div>
                    <Show when={csvImportResult()?.errors.length}>
                      <div class="mt-1 space-y-0.5">
                        <For each={csvImportResult()?.errors}>
                          {(err) => (
                            <p class="text-xs text-red-600">
                              Baris {err.baris}: {err.pesan}
                            </p>
                          )}
                        </For>
                      </div>
                    </Show>
                  </Show>
                </details>
              </div>

              {/* Form Tambah MK */}
              <div class="border-t border-secondary-100 dark:border-secondary-800 pt-4">
                <h4 class="text-sm font-bold text-secondary-700 dark:text-secondary-200 mb-3">Tambah Mata Kuliah</h4>
                <form onSubmit={handleAddMk} class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Show when={addMkError()}>
                    <div class="col-span-full p-2 bg-red-50 text-red-700 rounded text-xs">{addMkError()}</div>
                  </Show>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold text-secondary-500">Mata Kuliah</label>
                    <select
                      class="h-9 px-2 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={addMkMataKuliahId()}
                      onChange={(e) => {
                        const id = Number(e.currentTarget.value);
                        setAddMkMataKuliahId(id);
                        const mk = allMatkuls()?.data.find((m) => m.id === id);
                        if (mk) {
                          setAddMkSks(mk.sksTotal);
                          setAddMkTatapMuka(mk.sksTatapMuka || 0);
                          setAddMkPraktek(mk.sksPraktek || 0);
                        }
                      }}
                    >
                      <option value={0}>Pilih MK</option>
                      <For each={allMatkuls()?.data}>
                        {(mk) => (
                          <option value={mk.id}>
                            {mk.kode} - {mk.nama}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold text-secondary-500">Semester</label>
                    <select
                      class="h-9 px-2 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={addMkSemester()}
                      onChange={(e) => setAddMkSemester(Number(e.currentTarget.value))}
                    >
                      <For each={[1, 2, 3, 4, 5, 6, 7, 8]}>{(s) => <option value={s}>Semester {s}</option>}</For>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-semibold text-secondary-500">SKS</label>
                    <input
                      type="number"
                      class="h-9 px-2 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={addMkSks()}
                      onInput={(e) => setAddMkSks(Number(e.currentTarget.value))}
                    />
                  </div>
                  <div class="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="addMkWajib"
                      checked={addMkIsWajib()}
                      onChange={(e) => setAddMkIsWajib(e.currentTarget.checked)}
                    />
                    <label for="addMkWajib" class="text-xs font-semibold text-secondary-600">
                      Wajib
                    </label>
                    <Button type="submit" class="!py-1.5 !px-3 !text-xs ml-auto">
                      Tambah
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </Show>
        </Modal>
        {/* Modal Duplikasi */}
        <Modal show={showDuplicateModal()} onClose={() => setShowDuplicateModal(false)} title="Duplikasi Kurikulum">
          <form onSubmit={handleDuplicate} class="flex flex-col gap-4">
            <Show when={dupError()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{dupError()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Kode Baru</label>
              <Input type="text" value={dupKode()} onInput={(e) => setDupKode(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Nama Baru</label>
              <Input type="text" value={dupNama()} onInput={(e) => setDupNama(e.currentTarget.value)} required />
            </div>
            <p class="text-xs text-secondary-500">
              Semua mata kuliah dari kurikulum sumber akan disalin ke kurikulum baru.
            </p>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowDuplicateModal(false)}>
                Batal
              </Button>
              <Button type="submit">Duplikasi</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
