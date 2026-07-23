import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { KrsMassalModal } from '../components/krs/KrsMassalModal';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { Krs as IKrs, krsController } from '../controllers/krsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { usePagination } from '../hooks/usePagination';

export default function Krs() {
  const auth = useAuth();
  const toast = useToast();
  const workspace = useWorkspace();
  const role = () => auth.user()?.role;
  const userEmail = () => auth.user()?.email;

  const mainPagination = usePagination();

  const [sortBy, setSortBy] = createSignal('mahasiswa');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const [showImportModal, setShowImportModal] = createSignal(false);

  const [activeTab, setActiveTab] = createSignal<'kelola' | 'massal'>('kelola');
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedMhsIds, setSelectedMhsIds] = createSignal<number[]>([]);

  // Mahasiswa picker pagination & sorting
  const pickerPagination = usePagination(20);
  const [pickerSortBy, setPickerSortBy] = createSignal('nim');
  const [pickerSortOrder, setPickerSortOrder] = createSignal<'asc' | 'desc'>('asc');

  const togglePickerSort = (field: string) => {
    if (pickerSortBy() === field) setPickerSortOrder(pickerSortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setPickerSortBy(field);
      setPickerSortOrder('asc');
    }
  };

  // Load all academic periods
  const [periodes] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll(undefined, 1, 100);
      return res.data;
    } catch (e) {
      return [];
    }
  });

  createEffect(() => {
    const wsPeriode = workspace.selectedPeriodeId();
    if (wsPeriode) {
      setSelectedPeriode(wsPeriode);
      return;
    }
    const list = periodes();
    if (list && list.length > 0) {
      const active = list.find((p) => p.aktif);
      if (active) {
        setSelectedPeriode(active.id);
      } else {
        setSelectedPeriode(list[0].id);
      }
    }
  });

  // Fetch pending students for batch approval
  const [pendingStudents, { refetch: refetchPending }] = createResource(
    () => ({
      periodeId: selectedPeriode(),
      tab: activeTab(),
      role: role(),
    }),
    async ({ periodeId, tab, role }) => {
      if (role === 'mahasiswa' || tab !== 'massal' || !periodeId) return [];
      try {
        return await krsController.getPendingStudents(periodeId);
      } catch (e: unknown) {
        toast.showToast((e as Error).message || 'Gagal memuat mahasiswa pending', 'error');
        return [];
      }
    },
  );

  const sortedPendingStudents = createMemo(() => {
    const list = pendingStudents() || [];
    const field = pickerSortBy();
    const order = pickerSortOrder();
    return [...list].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aVal = a[field] ?? '';
      const bVal = b[field] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return order === 'asc' ? cmp : -cmp;
    });
  });

  const paginatedPendingStudents = createMemo(() => {
    const list = sortedPendingStudents();
    const p = pickerPagination.page();
    const l = pickerPagination.limit();
    return list.slice((p - 1) * l, p * l);
  });

  // Load Mahasiswa profile if current user is Mahasiswa
  const [mahasiswaProfile] = createResource(
    () => {
      if (role() === 'mahasiswa') return userEmail();
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Fetch KRS data (filtered dynamically)
  const [krsData, { refetch }] = createResource(
    () => ({
      search: role() === 'mahasiswa' ? mahasiswaProfile()?.nim || '' : mainPagination.search(),
      page: mainPagination.page(),
      limit: mainPagination.limit(),
      mhsLoaded: role() === 'mahasiswa' ? !!mahasiswaProfile() : true,
    }),
    async ({ search, page, limit, mhsLoaded }) => {
      if (!mhsLoaded) return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
      try {
        return await krsController.getAll(search, page, limit);
      } catch (e: unknown) {
        toast.showToast((e as Error).message || 'Gagal memuat data KRS', 'error');
        throw e;
      }
    },
  );

  const sortedKrsData = createMemo(() => {
    const items = krsData()?.data || [];
    const field = sortBy();
    const order = sortOrder();
    if (!items.length) return items;
    return [...items].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (field === 'mahasiswa') {
        aVal = a.mahasiswa?.nama ?? '';
        bVal = b.mahasiswa?.nama ?? '';
      } else if (field === 'kelasKuliah') {
        aVal = a.kelasKuliah?.namaKelas ?? '';
        bVal = b.kelasKuliah?.namaKelas ?? '';
      } else if (field === 'periode') {
        aVal = a.kelasKuliah?.periodeId ?? '';
        bVal = b.kelasKuliah?.periodeId ?? '';
      } else if (field === 'status') {
        aVal = (a as unknown as Record<string, unknown>).isApproved ? 1 : 0;
        bVal = (b as unknown as Record<string, unknown>).isApproved ? 1 : 0;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return order === 'asc' ? cmp : -cmp;
    });
  });

  // Rencana Studi & Validasi
  const [rencanaStudi, { refetch: refetchRencana }] = createResource(
    () => mahasiswaProfile(),
    async (profile) => {
      if (!profile) return null;
      try {
        return await krsController.getRencanaStudi(profile.id);
      } catch {
        return null;
      }
    },
  );
  const [validasiResult, setValidasiResult] = createSignal<{
    isValid: boolean;
    warnings: { type: string; mk: string; semester?: number }[];
    summary: { totalSksDiRencana: string; totalSksDiKrs: string; mkWajibTerpenuhi: number; mkWajibTotal: number };
  } | null>(null);
  const [validasiLoading, setValidasiLoading] = createSignal(false);

  const handleValidasi = async () => {
    if (!mahasiswaProfile()) return;
    setValidasiLoading(true);
    setValidasiResult(null);
    try {
      const result = await krsController.validasiKrs(mahasiswaProfile()!.id, selectedPeriode());
      setValidasiResult(result);
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal validasi KRS', 'error');
    } finally {
      setValidasiLoading(false);
    }
  };

  // Fetch All Kelas & Mahasiswa for Forms
  const [kelasOptions] = createResource(() => kelasKuliahController.getAll(undefined, 1, 100));
  const [mahasiswaOptions] = createResource(() => {
    if (role() !== 'mahasiswa') return mahasiswaController.getAll(undefined, 1, 100);
    return null;
  });

  // Modal Form State
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showMassalModal, setShowMassalModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);

  // Create Form State
  const [mhsId, setMhsId] = createSignal<number>(0);
  const [kelasId, setKelasId] = createSignal<number>(0);

  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setErrorMsg('');
    if (role() === 'mahasiswa') {
      if (!mahasiswaProfile()) {
        alert('Data profile mahasiswa belum dimuat.');
        return;
      }
      if (mahasiswaProfile()?.status !== 'aktif') {
        alert('Status Anda tidak Aktif. Anda tidak dapat melakukan pengisian KRS.');
        return;
      }
      setMhsId(mahasiswaProfile()!.id);
    } else {
      const firstMhs = mahasiswaOptions()?.data?.[0]?.id || 0;
      setMhsId(firstMhs);
    }
    const firstKelas = kelasOptions()?.data?.[0]?.id || 0;
    setKelasId(firstKelas);
    setShowAddModal(true);
  };

  const handleAddKrs = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await krsController.create({
        mahasiswaId: Number(mhsId()),
        kelasKuliahId: Number(kelasId()),
      });
      setShowAddModal(false);
      toast.showToast('KRS berhasil dikontrak', 'success');
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menambahkan KRS');
      toast.showToast((e as Error).message || 'Gagal menambahkan KRS', 'error');
    }
  };

  const handleApproveAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menyetujui seluruh KRS pending untuk semua mahasiswa di periode ini?'))
      return;

    try {
      await krsController.approve(null as unknown as number, selectedPeriode() || '20252');
      toast.showToast('Seluruh KRS pending berhasil disetujui', 'success');
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyetujui KRS', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan/menghapus KRS ini?')) return;
    try {
      await krsController.delete(id);
      toast.showToast('KRS berhasil dihapus/dibatalkan', 'success');
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menghapus KRS', 'error');
    }
  };

  const handleApproveBatch = async () => {
    const ids = selectedMhsIds();
    if (ids.length === 0) {
      toast.showToast('Silakan pilih setidaknya satu mahasiswa.', 'error');
      return;
    }
    const periodeId = selectedPeriode();
    if (!periodeId) {
      toast.showToast('Periode akademik tidak terpilih.', 'error');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menyetujui KRS untuk ${ids.length} mahasiswa terpilih?`)) return;

    try {
      await krsController.approveBatch(ids, periodeId);
      toast.showToast('KRS untuk mahasiswa terpilih berhasil disetujui.', 'success');
      setSelectedMhsIds([]);
      refetchPending();
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyetujui KRS secara massal.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Kartu Rencana Studi (KRS)</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              {role() === 'mahasiswa'
                ? 'Daftar rencana studi semester aktif yang Anda kontrak.'
                : 'Kelola pendaftaran dan persetujuan kontrak rencana studi mahasiswa.'}
            </p>
          </div>
          <div class="flex gap-2">
            <Show when={role() === 'admin' || role() === 'dosen' || role() === 'prodi'}>
              <Button variant="secondary" onClick={() => setShowMassalModal(true)}>
                ⚡ Buat KRS Massal
              </Button>
            </Show>
            <Show when={role() === 'admin'}>
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                📥 Impor KRS
              </Button>
            </Show>
            <Button disabled={role() === 'mahasiswa' && mahasiswaProfile()?.status !== 'aktif'} onClick={openAddModal}>
              + Tambah Kontrak KRS
            </Button>
          </div>
        </div>

        {/* Warning Banner if Mahasiswa is not active */}
        <Show when={role() === 'mahasiswa' && mahasiswaProfile() && mahasiswaProfile()?.status !== 'aktif'}>
          <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold shadow-sm flex items-start gap-3 dark:bg-red-900/30 dark:text-red-400">
            <span class="text-base">⚠️</span>
            <div>
              <p class="font-bold">Status Registrasi: Tidak Aktif (SPP/UKT Belum Lunas)</p>
              <p class="text-xs text-red-500 font-medium mt-1">
                Anda tidak diperbolehkan mengontrak KRS sebelum tagihan SPP dilunasi dan status diaktifkan kembali oleh
                bagian Keuangan.
              </p>
            </div>
          </div>
        </Show>

        {/* Dosen PA Batch Approval Banner */}
        <Show
          when={
            (role() === 'dosen' || role() === 'admin') &&
            krsData()?.data &&
            krsData()!.data.length > 0 &&
            krsData()!.data.some((k) => !k.isApproved)
          }
        >
          <div class="p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h4 class="text-sm font-bold text-yellow-800 dark:text-yellow-400">KRS Mahasiswa Menunggu Persetujuan</h4>
              <p class="text-xs text-yellow-600 font-medium mt-0.5">
                Terdapat beberapa kontrak KRS pending pada periode ini.
              </p>
            </div>
            <Button variant="primary" onClick={handleApproveAll} class="!py-1.5 !px-4 text-xs">
              Setujui Semua KRS
            </Button>
          </div>
        </Show>

        {/* Rencana Studi Panel - Mahasiswa Only */}
        <Show when={role() === 'mahasiswa' && rencanaStudi()}>
          <div class="bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-col gap-3">
            <div class="flex justify-between items-center">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
                📚 Rencana Studi — {rencanaStudi()?.kurikulum.nama}
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-xs text-secondary-500 dark:text-secondary-200">
                  Semester {rencanaStudi()?.currentSemester}
                </span>
                <span class="text-xs font-semibold text-brand-600">SKS Lulus: {rencanaStudi()?.totalSksLulus}</span>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <For each={rencanaStudi()?.rencanaPerSemester}>
                {(sem) => (
                  <div class="border border-secondary-100 dark:border-secondary-800 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-2">
                      <span class="text-xs font-bold text-secondary-600 dark:text-secondary-200 uppercase">
                        Semester {sem.semester}
                      </span>
                      <span class="text-xs text-secondary-500 dark:text-secondary-200">
                        {sem.sksLulus}/{sem.totalSks} SKS
                      </span>
                    </div>
                    <div class="space-y-1">
                      <For each={sem.mataKuliah}>
                        {(mk) => (
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1.5 text-xs">
                              <Show when={mk.status === 'lulus'}>
                                <span class="text-green-600">✓</span>
                              </Show>
                              <Show when={mk.status === 'diambil'}>
                                <span class="text-yellow-600">◐</span>
                              </Show>
                              <Show when={mk.status === 'tersedia'}>
                                <span class="text-secondary-400 dark:text-secondary-200">○</span>
                              </Show>
                              <span
                                class={`${mk.status === 'lulus' ? 'text-green-700 dark:text-green-400' : mk.status === 'diambil' ? 'text-yellow-700 dark:text-yellow-400' : 'text-secondary-600 dark:text-secondary-200'}`}
                              >
                                {mk.nama} ({mk.sks} SKS)
                              </span>
                            </div>
                            <Show when={mk.nilaiHuruf}>
                              <span class="text-xs font-bold text-brand-600 ml-1">{mk.nilaiHuruf}</span>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Validasi button & result */}
            <div class="flex justify-between items-center pt-2 border-t border-secondary-100 dark:border-secondary-800">
              <Button onClick={handleValidasi} disabled={validasiLoading()}>
                {validasiLoading() ? 'Memvalidasi...' : '🔍 Validasi KRS'}
              </Button>
              <Show when={validasiResult()}>
                <div class="text-xs space-y-1">
                  <Show when={validasiResult()?.isValid}>
                    <p class="text-green-600 font-semibold">✅ KRS sesuai dengan rencana kurikulum</p>
                  </Show>
                  <Show when={!validasiResult()?.isValid}>
                    <p class="text-red-600 font-semibold dark:text-red-400">
                      ⚠️ Terdapat {validasiResult()?.warnings.length} peringatan
                    </p>
                  </Show>
                  <For each={validasiResult()?.warnings}>
                    {(w) => (
                      <p class={w.type === 'missing_required' ? 'text-orange-600' : 'text-yellow-600'}>
                        •{' '}
                        {w.type === 'missing_required'
                          ? 'MK wajib belum diambil'
                          : w.type === 'outside_plan'
                            ? 'MK di luar rencana semester'
                            : 'MK tidak ada di kurikulum'}
                        : {w.mk}
                      </p>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Tab Switcher (Only for admin and dosen) */}
        <Show when={role() === 'admin' || role() === 'dosen'}>
          <div class="flex gap-2 border-b border-secondary-100 pb-3 dark:border-secondary-800">
            <button
              onClick={() => setActiveTab('kelola')}
              class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab() === 'kelola'
                  ? 'bg-brand-600 text-white shadow-sm shadow-accent-200'
                  : 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
              }`}
            >
              Kelola KRS
            </button>
            <button
              onClick={() => setActiveTab('massal')}
              class={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab() === 'massal'
                  ? 'bg-brand-600 text-white shadow-sm shadow-accent-200'
                  : 'bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
              }`}
            >
              Persetujuan Massal KRS
            </button>
          </div>
        </Show>

        <Show when={activeTab() === 'kelola' || role() === 'mahasiswa'}>
          {/* Search Filter for Admins / Dosen */}
          <Show when={role() !== 'mahasiswa'}>
            <div class="max-w-xs">
              <Input
                placeholder="Cari NIM atau Nama..."
                value={mainPagination.search()}
                onInput={(e) => {
                  mainPagination.setSearch(e.currentTarget.value);
                  mainPagination.resetPage();
                }}
              />
            </div>
          </Show>

          <Show
            when={!krsData.loading}
            fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
          >
            <Table
              headers={[
                <SortableHeader field="mahasiswa" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Mahasiswa
                </SortableHeader>,
                <SortableHeader field="kelasKuliah" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Kelas Kuliah
                </SortableHeader>,
                <SortableHeader field="periode" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Periode
                </SortableHeader>,
                <SortableHeader field="status" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Status
                </SortableHeader>,
                'Aksi',
              ]}
            >
              <For each={sortedKrsData()}>
                {(item) => (
                  <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                    <td class="px-6 py-4">
                      <div class="font-medium text-secondary-800 dark:text-white">{item.mahasiswa?.nama}</div>
                      <div class="text-xs text-secondary-400 font-mono dark:text-secondary-200">
                        {item.mahasiswa?.nim}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-secondary-700 dark:text-secondary-200">{item.kelasKuliah?.namaKelas}</td>
                    <td class="px-6 py-4 text-secondary-500 font-mono text-xs dark:text-secondary-200">
                      {item.kelasKuliah?.periodeId}
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.isApproved
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}
                      >
                        {item.isApproved ? 'Disetujui' : 'Pending'}
                      </span>
                    </td>
                    <td class="px-6 py-4 flex gap-2">
                      <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5 text-xs">
                        Batal
                      </Button>
                    </td>
                  </tr>
                )}
              </For>
              <Show when={sortedKrsData().length === 0}>
                <tr>
                  <td colspan="5" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                    Tidak ada kontrak KRS ditemukan.
                  </td>
                </tr>
              </Show>
            </Table>

            <Show when={krsData() && krsData()!.meta.totalPages > 1}>
              <Pagination
                currentPage={mainPagination.page()}
                totalPages={krsData()!.meta.totalPages}
                total={krsData()!.meta.total}
                limit={mainPagination.limit()}
                onPageChange={mainPagination.setPage}
                onLimitChange={mainPagination.setLimit}
              />
            </Show>
          </Show>
        </Show>

        <Show when={activeTab() === 'massal' && role() !== 'mahasiswa'}>
          <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-secondary-100 shadow-sm mb-4 dark:bg-secondary-900/60 dark:border-secondary-800">
            <div>
              <h3 class="font-bold text-secondary-800 dark:text-white">Daftar Mahasiswa dengan KRS Pending</h3>
              <p class="text-xs text-secondary-400 mt-0.5 dark:text-secondary-200">
                Pilih satu atau beberapa mahasiswa untuk disetujui KRS-nya sekaligus.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleApproveBatch}
              disabled={selectedMhsIds().length === 0}
              class="shadow-sm shadow-accent-200"
            >
              🔓 Setujui KRS Terpilih ({selectedMhsIds().length})
            </Button>
          </div>

          <Show
            when={!pendingStudents.loading}
            fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
          >
            <Table
              headers={[
                'Pilih',
                <SortableHeader
                  field="nim"
                  sortBy={pickerSortBy()}
                  sortOrder={pickerSortOrder()}
                  onSort={togglePickerSort}
                >
                  NIM
                </SortableHeader>,
                <SortableHeader
                  field="nama"
                  sortBy={pickerSortBy()}
                  sortOrder={pickerSortOrder()}
                  onSort={togglePickerSort}
                >
                  Nama Mahasiswa
                </SortableHeader>,
                <SortableHeader
                  field="email"
                  sortBy={pickerSortBy()}
                  sortOrder={pickerSortOrder()}
                  onSort={togglePickerSort}
                >
                  Email
                </SortableHeader>,
                'Status',
              ]}
            >
              <For
                each={paginatedPendingStudents()}
                fallback={
                  <tr>
                    <td colspan="5" class="px-6 py-10 text-center text-secondary-400 italic dark:text-secondary-200">
                      Tidak ada mahasiswa dengan kontrak KRS pending di periode ini.
                    </td>
                  </tr>
                }
              >
                {(student: any) => {
                  const isChecked = () => selectedMhsIds().includes(student.id);
                  const toggleCheck = () => {
                    if (isChecked()) {
                      setSelectedMhsIds(selectedMhsIds().filter((id) => id !== student.id));
                    } else {
                      setSelectedMhsIds([...selectedMhsIds(), student.id]);
                    }
                  };
                  return (
                    <tr
                      class="hover:bg-secondary-50/50 transition-colors cursor-pointer dark:hover:bg-secondary-800/50"
                      onClick={toggleCheck}
                    >
                      <td class="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked()}
                          onChange={toggleCheck}
                          class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer dark:border-secondary-700"
                        />
                      </td>
                      <td class="px-6 py-4 font-mono text-secondary-700 dark:text-secondary-200">{student.nim}</td>
                      <td class="px-6 py-4 font-bold text-secondary-900 dark:text-white">{student.nama}</td>
                      <td class="px-6 py-4 text-secondary-500 dark:text-secondary-200">{student.email}</td>
                      <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
                          Pending
                        </span>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </Table>

            <Show when={sortedPendingStudents().length > pickerPagination.limit()}>
              <Pagination
                currentPage={pickerPagination.page()}
                totalPages={Math.ceil(sortedPendingStudents().length / pickerPagination.limit())}
                total={sortedPendingStudents().length}
                limit={pickerPagination.limit()}
                onPageChange={pickerPagination.setPage}
                onLimitChange={pickerPagination.setLimit}
              />
            </Show>
          </Show>
        </Show>

        {/* Modal Add KRS */}
        <Modal show={showAddModal()} title="Tambah Kontrak KRS" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddKrs} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 dark:bg-red-900/30 dark:text-red-400">
                {errorMsg()}
              </div>
            </Show>

            <Show
              when={role() === 'mahasiswa'}
              fallback={
                <Input
                  isSelect
                  label="Mahasiswa"
                  value={mhsId()}
                  onChange={(e) => setMhsId(Number(e.currentTarget.value))}
                  selectOptions={
                    mahasiswaOptions()?.data.map((m) => ({ label: `${m.nim} - ${m.nama}`, value: m.id })) || []
                  }
                />
              }
            >
              <div class="flex flex-col gap-1.5 w-full">
                <label class="text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-200">
                  Mahasiswa
                </label>
                <div class="px-4 py-2.5 rounded-lg bg-secondary-50 border border-secondary-200 text-sm font-semibold text-secondary-800 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white">
                  {mahasiswaProfile()?.nim} - {mahasiswaProfile()?.nama}
                </div>
              </div>
            </Show>

            <Input
              isSelect
              label="Kelas Kuliah Pilihan"
              value={kelasId()}
              onChange={(e) => setKelasId(Number(e.currentTarget.value))}
              selectOptions={
                kelasOptions()?.data.map((k) => ({
                  label: `Kelas ${k.namaKelas} (Mata Kuliah: ${k.mataKuliah?.nama || k.mataKuliahId})`,
                  value: k.id,
                })) || []
              }
            />

            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                Batal
              </Button>
              <Button type="submit">Kontrak Kelas</Button>
            </div>
          </form>
        </Modal>

        <KrsMassalModal
          show={showMassalModal()}
          onClose={() => setShowMassalModal(false)}
          onSuccess={() => {
            refetch();
            refetchPending();
          }}
        />

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/krs/import"
          templateHeaders={['nim', 'kode_mata_kuliah', 'nama_kelas', 'periode_id']}
          title="KRS"
          onSuccess={() => {
            refetch();
            refetchPending();
          }}
        />
      </div>
    </MainLayout>
  );
}
