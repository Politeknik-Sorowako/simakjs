import { useSearchParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { kurikulumController } from '../controllers/kurikulumController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';
import { RencanaEvaluasi, RpsSource, RpsTopik, rpsController } from '../controllers/rpsController';
import { usePagination } from '../hooks/usePagination';

export default function Rps() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, limit, setPage, setLimit, resetPage } = usePagination();

  // Dropdown options
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));
  const [allPeriodes] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll(undefined, 1, 100);
      return res.data;
    } catch {
      return [];
    }
  });

  // Cascading selections
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal<number | undefined>(undefined);
  const [selectedKurikulum, setSelectedKurikulum] = createSignal<number | undefined>(undefined);
  const [selectedMk, setSelectedMk] = createSignal<number>(0);

  // Auto-select period: URL params take priority, otherwise use active period
  createEffect(() => {
    const periodes = allPeriodes();
    if (!periodes || periodes.length === 0) return;

    const urlMkId = searchParams.mataKuliahId ? parseInt(searchParams.mataKuliahId) : undefined;
    const urlPeriodeId = searchParams.periodeId;

    if (urlMkId && urlPeriodeId) {
      // URL params take priority (from /kelas-kuliah RPS button)
      setSelectedMk(urlMkId);
      setSelectedPeriode(urlPeriodeId);
    } else if (!selectedPeriode()) {
      // If no period selected yet, default to active
      const active = periodes.find((p) => p.aktif);
      setSelectedPeriode(active?.id || periodes[0].id);
    }
  });

  // Filtered dropdowns
  const [kurikulums] = createResource(
    () => selectedProdi(),
    (prodiId) => kurikulumController.getAll('', 1, 100, prodiId),
  );

  const [matkuls] = createResource(
    () => selectedKurikulum(),
    (kurId) => kurikulumController.getById(kurId),
  );

  // Load MK options from the selected curriculum
  const mkOptions = () => matkuls()?.kurikulumMataKuliah || [];

  const selectedMkLabel = () => {
    const mkId = selectedMk();
    if (!mkId) return '';
    const kmk = mkOptions().find((k) => k.mataKuliahId === mkId);
    return kmk ? `${kmk.mataKuliah?.kode} - ${kmk.mataKuliah?.nama}` : `MK #${mkId}`;
  };

  // RPS Data
  const [rps, { refetch: refetchRps }] = createResource(
    () => ({ mkId: selectedMk(), periodeId: selectedPeriode() }),
    ({ mkId, periodeId }) => {
      if (!mkId || !periodeId) return Promise.resolve(null);
      return rpsController.getRps(mkId, periodeId);
    },
  );

  // Sorting state for topik table
  const [sortBy, setSortBy] = createSignal('pertemuanKe');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => {
    const data = rps()?.topik || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };
  const paginatedData = () => {
    const all = sortedData();
    const start = (page() - 1) * limit();
    return all.slice(start, start + limit());
  };
  const totalPages = () => Math.ceil((rps()?.topik?.length || 0) / limit());

  // Rencana Evaluasi
  const [rencanaEvals, { refetch: refetchEvals }] = createResource(
    () => selectedMk(),
    (mkId) => {
      if (!mkId) return Promise.resolve([]);
      return rpsController.getRencanaEvaluasi(mkId);
    },
  );

  // Daftar Kelas untuk MK ini
  const [classes, { refetch: refetchClasses }] = createResource(
    () => ({ mkId: selectedMk(), periodeId: selectedPeriode() }),
    ({ mkId, periodeId }) => {
      if (!mkId || !periodeId) return Promise.resolve([]);
      return kelasKuliahController.getByMk(mkId, periodeId);
    },
  );

  // Form signal for Topik
  const [showTopikModal, setShowTopikModal] = createSignal(false);
  const [editTopikId, setEditTopikId] = createSignal<number | null>(null);
  const [pertemuanKe, setPertemuanKe] = createSignal(1);
  const [topikText, setTopikText] = createSignal('');
  const [subTopik, setSubTopik] = createSignal('');
  const [metode, setMetode] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  // Form signal for RPS Header
  const [showRpsModal, setShowRpsModal] = createSignal(false);
  const [deskripsi, setDeskripsi] = createSignal('');
  const [cplProdi, setCplProdi] = createSignal('');

  // Copy RPS (lintas prodi & periode) state
  const [showCopyModal, setShowCopyModal] = createSignal(false);
  const [sourceSearch, setSourceSearch] = createSignal('');
  const [debouncedSourceSearch, setDebouncedSourceSearch] = createSignal('');
  const [sourceProdiId, setSourceProdiId] = createSignal<number | undefined>(undefined);
  const [sourcePeriode, setSourcePeriode] = createSignal('');
  const [selectedSource, setSelectedSource] = createSignal<RpsSource | null>(null);
  const [copyCpmk, setCopyCpmk] = createSignal(true);
  const [copyRencanaEvaluasi, setCopyRencanaEvaluasi] = createSignal(true);
  const [copyLoading, setCopyLoading] = createSignal(false);
  const [copyError, setCopyError] = createSignal('');
  let copySearchTimer: ReturnType<typeof setTimeout> | undefined;

  const [sources, { refetch: refetchSources }] = createResource(
    () => ({ search: debouncedSourceSearch(), prodiId: sourceProdiId(), periodeId: sourcePeriode() }),
    ({ search, prodiId, periodeId }) =>
      rpsController.getAvailableSources({
        search: search || undefined,
        prodiId,
        periodeId: periodeId || undefined,
      }),
  );

  const openCopyModal = () => {
    setShowCopyModal(true);
    setSelectedSource(null);
    setCopyError('');
    setCopyCpmk(true);
    setCopyRencanaEvaluasi(true);
    setSourceSearch('');
    setDebouncedSourceSearch('');
    setSourceProdiId(undefined);
    setSourcePeriode('');
    refetchSources();
  };

  onCleanup(() => clearTimeout(copySearchTimer));

  const handleCopyRps = async () => {
    if (!selectedSource() || !selectedPeriode() || !selectedMk()) return;
    setCopyLoading(true);
    setCopyError('');
    try {
      await rpsController.copyRps(selectedSource()!.id, selectedPeriode(), selectedMk(), {
        copyCpmk: copyCpmk(),
        copyRencanaEvaluasi: copyRencanaEvaluasi(),
      });
      setShowCopyModal(false);
      refetchRps();
      refetchEvals();
    } catch (e: unknown) {
      setCopyError(e instanceof Error ? e.message : 'Gagal menyalin RPS');
    } finally {
      setCopyLoading(false);
    }
  };

  const handleCreateRps = async () => {
    try {
      await rpsController.createRps({
        mataKuliahId: selectedMk(),
        periodeId: selectedPeriode(),
        deskripsi: '',
        cplProdi: '',
      });
      refetchRps();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal membuat RPS');
    }
  };

  const handleSaveRpsHeader = async (e: Event) => {
    e.preventDefault();
    if (!rps()) return;
    try {
      await rpsController.updateRps(rps()!.id, { deskripsi: deskripsi(), cplProdi: cplProdi() });
      setShowRpsModal(false);
      refetchRps();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal memperbarui RPS');
    }
  };

  const openEditRpsHeader = () => {
    if (!rps()) return;
    setDeskripsi(rps()!.deskripsi || '');
    setCplProdi(rps()!.cplProdi || '');
    setShowRpsModal(true);
  };

  // Topik handlers
  const openAddTopik = () => {
    setEditTopikId(null);
    setPertemuanKe((rps()?.topik?.length || 0) + 1);
    setTopikText('');
    setSubTopik('');
    setMetode('Ceramah & Diskusi');
    setErrorMsg('');
    setShowTopikModal(true);
  };

  const openEditTopik = (topik: RpsTopik) => {
    setEditTopikId(topik.id);
    setPertemuanKe(topik.pertemuanKe);
    setTopikText(topik.topik);
    setSubTopik(topik.subTopik || '');
    setMetode(topik.metode || '');
    setErrorMsg('');
    setShowTopikModal(true);
  };

  const handleSaveTopik = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        pertemuanKe: Number(pertemuanKe()),
        topik: topikText(),
        subTopik: subTopik(),
        metode: metode(),
      };
      if (editTopikId()) {
        await rpsController.updateTopik(editTopikId()!, payload);
      } else {
        await rpsController.addTopik(rps()!.id, payload);
      }
      setShowTopikModal(false);
      refetchRps();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan topik');
    }
  };

  const handleDeleteTopik = async (id: number) => {
    if (!confirm('Hapus topik pertemuan ini?')) return;
    try {
      await rpsController.deleteTopik(id);
      refetchRps();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus topik');
    }
  };

  // Evaluasi handlers
  const [showEvalModal, setShowEvalModal] = createSignal(false);
  const [editEvalId, setEditEvalId] = createSignal<number | null>(null);
  const [namaEvaluasi, setNamaEvaluasi] = createSignal('');
  const [bobotEvaluasi, setBobotEvaluasi] = createSignal(10);
  const [evalDeskripsi, setEvalDeskripsi] = createSignal('');

  const openAddEval = () => {
    setEditEvalId(null);
    setNamaEvaluasi('');
    setBobotEvaluasi(10);
    setEvalDeskripsi('');
    setErrorMsg('');
    setShowEvalModal(true);
  };
  const openEditEval = (item: RencanaEvaluasi) => {
    setEditEvalId(item.id);
    setNamaEvaluasi(item.namaEvaluasi);
    setBobotEvaluasi(Number(item.bobotEvaluasi));
    setEvalDeskripsi(item.deskripsi || '');
    setErrorMsg('');
    setShowEvalModal(true);
  };

  const handleSaveEval = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    const newBobot = Number(bobotEvaluasi());
    const currentTotal = (rencanaEvals() || []).reduce(
      (sum, item) => sum + (item.id === editEvalId() ? 0 : Number(item.bobotEvaluasi)),
      0,
    );
    if (currentTotal + newBobot > 100) {
      setErrorMsg(`Total bobot evaluasi (${currentTotal + newBobot}%) tidak boleh melebihi 100%`);
      return;
    }
    try {
      const payload = {
        mataKuliahId: selectedMk(),
        namaEvaluasi: namaEvaluasi(),
        bobotEvaluasi: newBobot,
        deskripsi: evalDeskripsi(),
      };
      if (editEvalId()) {
        await rpsController.updateRencanaEvaluasi(editEvalId()!, payload);
      } else {
        await rpsController.createRencanaEvaluasi(payload);
      }
      setShowEvalModal(false);
      refetchEvals();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan rencana evaluasi');
    }
  };

  const handleDeleteEval = async (id: number) => {
    if (!confirm('Hapus rencana evaluasi ini?')) return;
    try {
      await rpsController.deleteRencanaEvaluasi(id);
      refetchEvals();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus rencana evaluasi');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">
            Rencana Pembelajaran Semester (RPS)
          </h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Susun rencana ajar mingguan, topik pertemuan, dan metode evaluasi penilaian
          </p>
        </div>

        {/* Cascading Filter Selection */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-secondary-500">Periode Akademik</label>
            <select
              class="h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedPeriode()}
              onChange={(e) => {
                setSelectedPeriode(e.currentTarget.value);
                setSelectedProdi(undefined);
                setSelectedKurikulum(undefined);
                setSelectedMk(0);
              }}
            >
              <option value="">-- Pilih Periode --</option>
              <For each={allPeriodes()}>
                {(p) => (
                  <option value={p.id}>
                    {p.nama}
                    {p.aktif ? ' (Aktif)' : ''}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-secondary-500">Program Studi</label>
            <select
              class="h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedProdi() || ''}
              onChange={(e) => {
                setSelectedProdi(e.currentTarget.value ? Number(e.currentTarget.value) : undefined);
                setSelectedKurikulum(undefined);
                setSelectedMk(0);
              }}
            >
              <option value="">-- Pilih Prodi --</option>
              <For each={prodis()?.data}>
                {(p) => (
                  <option value={p.id}>
                    {p.jenjang} - {p.nama}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-secondary-500">Kurikulum</label>
            <select
              class="h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedKurikulum() || ''}
              onChange={(e) => {
                setSelectedKurikulum(e.currentTarget.value ? Number(e.currentTarget.value) : undefined);
                setSelectedMk(0);
              }}
            >
              <option value="">-- Pilih Kurikulum --</option>
              <For each={kurikulums()?.data}>
                {(k) => (
                  <option value={k.id}>
                    {k.nama} ({k.kode})
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold text-secondary-500">Mata Kuliah</label>
            <select
              class="h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={selectedMk()}
              onChange={(e) => {
                setSelectedMk(Number(e.currentTarget.value));
                setSearchParams({}, { replace: true });
              }}
            >
              <option value={0}>-- Pilih MK --</option>
              <For each={mkOptions()}>
                {(kmk) => (
                  <option value={kmk.mataKuliahId}>
                    {kmk.mataKuliah?.kode} - {kmk.mataKuliah?.nama} (Sem {kmk.semester})
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        {/* Daftar Kelas */}
        <Show when={selectedMk() > 0 && selectedPeriode()}>
          <div class="bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800">
            <h3 class="text-sm font-bold text-secondary-700 dark:text-secondary-200 mb-2">
              Kelas yang mengambil MK ini ({classes()?.length || 0})
            </h3>
            <Show
              when={(classes()?.length || 0) > 0}
              fallback={<p class="text-xs text-secondary-500">Belum ada kelas untuk MK ini di periode tersebut.</p>}
            >
              <div class="flex flex-wrap gap-2">
                <For each={classes()}>
                  {(kelas) => (
                    <span class="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-xs font-semibold text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-800">
                      {kelas.namaKelas}
                      <Show when={kelas.dosenPengajarKelas?.length}>
                        <span class="text-secondary-500 font-normal ml-1">
                          ({kelas.dosenPengajarKelas?.map((dp) => dp.dosen?.nama).join(', ')})
                        </span>
                      </Show>
                    </span>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* Copy RPS Section */}
        <Show when={selectedMk() > 0 && selectedPeriode()}>
          <div class="bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-secondary-700 dark:text-secondary-200">
                Salin RPS Lintas Prodi & Periode
              </h3>
              <p class="text-xs text-secondary-500 dark:text-secondary-200">
                Salin RPS dari mata kuliah lain (kode MK berbeda / prodi lain) lengkap dengan CPMK & rencana evaluasi.
              </p>
            </div>
            <Button onClick={openCopyModal}>Cari Sumber & Salin</Button>
          </div>
        </Show>

        {/* Main Content Area */}
        <Show when={selectedMk() > 0 && selectedPeriode() !== ''}>
          <Show when={rps.loading || classes.loading}>
            <div class="flex items-center justify-center py-10 text-secondary-400">
              <div class="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
              <span class="text-sm">Memuat data...</span>
            </div>
          </Show>
          <Show when={!(rps.loading || classes.loading)}>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* RPS Header and Topics */}
              <div class="lg:col-span-2 flex flex-col gap-6">
                <div class="bg-white dark:bg-secondary-900 p-6 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-col gap-4">
                  <div class="flex justify-between items-start border-b border-secondary-100 dark:border-secondary-800 pb-4">
                    <h2 class="text-lg font-bold text-secondary-800 dark:text-white">Deskripsi & CPL</h2>
                    <Show when={rps()}>
                      <Button variant="secondary" onClick={openEditRpsHeader}>
                        Edit Deskripsi
                      </Button>
                    </Show>
                  </div>
                  <Show when={!rps()}>
                    <div class="p-6 text-center border-2 border-dashed border-secondary-200 dark:border-secondary-800 rounded-lg">
                      <p class="text-sm text-secondary-500 dark:text-secondary-200 mb-4">
                        RPS belum disusun untuk mata kuliah & periode ini.
                      </p>
                      <Button onClick={handleCreateRps}>Buat RPS Baru</Button>
                    </div>
                  </Show>
                  <Show when={rps()}>
                    <div>
                      <h3 class="text-sm font-semibold text-secondary-500">Deskripsi Mata Kuliah</h3>
                      <p class="text-sm text-secondary-700 dark:text-secondary-200 mt-1 whitespace-pre-line">
                        {rps()?.deskripsi || 'Belum diisi.'}
                      </p>
                    </div>
                    <div>
                      <h3 class="text-sm font-semibold text-secondary-500">Capaian Pembelajaran Lulusan (CPL)</h3>
                      <p class="text-sm text-secondary-700 dark:text-secondary-200 mt-1 whitespace-pre-line">
                        {rps()?.cplProdi || 'Belum diisi.'}
                      </p>
                    </div>
                  </Show>
                </div>

                <Show when={rps()}>
                  <div class="bg-white dark:bg-secondary-900 p-6 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-col gap-4">
                    <div class="flex justify-between items-center">
                      <h2 class="text-lg font-bold text-secondary-800 dark:text-white">Rencana Pertemuan Mingguan</h2>
                      <Button onClick={openAddTopik}>+ Tambah Pertemuan</Button>
                    </div>
                    <Table
                      headers={[
                        <SortableHeader
                          field="pertemuanKe"
                          sortBy={sortBy()}
                          sortOrder={sortOrder()}
                          onSort={toggleSort}
                        >
                          Minggu
                        </SortableHeader>,
                        <SortableHeader field="topik" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                          Topik Pembahasan
                        </SortableHeader>,
                        'Metode',
                        'Aksi',
                      ]}
                    >
                      <Show when={!rps()?.topik || rps()?.topik?.length === 0}>
                        <tr>
                          <td colspan="4" class="p-6 text-center text-secondary-500">
                            Belum ada topik pertemuan.
                          </td>
                        </tr>
                      </Show>
                      <For each={paginatedData()}>
                        {(t) => (
                          <tr class="hover:bg-secondary-50 dark:hover:bg-secondary-800/50">
                            <td class="px-6 py-4 text-sm font-bold text-secondary-900 dark:text-white">
                              #{t.pertemuanKe}
                            </td>
                            <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">
                              <div class="font-medium">{t.topik}</div>
                              <Show when={t.subTopik}>
                                <div class="text-xs text-secondary-500 mt-0.5">{t.subTopik}</div>
                              </Show>
                            </td>
                            <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">
                              {t.metode || '-'}
                            </td>
                            <td class="px-6 py-4 text-sm space-x-1">
                              <Button variant="secondary" onClick={() => openEditTopik(t)}>
                                Edit
                              </Button>
                              <Button variant="danger" onClick={() => handleDeleteTopik(t.id)}>
                                Hapus
                              </Button>
                            </td>
                          </tr>
                        )}
                      </For>
                    </Table>
                    <Pagination
                      currentPage={page()}
                      totalPages={totalPages()}
                      total={rps()?.topik?.length || 0}
                      limit={limit()}
                      onPageChange={setPage}
                      onLimitChange={setLimit}
                    />
                  </div>
                </Show>
              </div>

              {/* Rencana Evaluasi */}
              <div class="flex flex-col gap-6">
                <div class="bg-white dark:bg-secondary-900 p-6 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 flex flex-col gap-4">
                  <div class="flex justify-between items-center border-b border-secondary-100 dark:border-secondary-800 pb-4">
                    <h2 class="text-lg font-bold text-secondary-800 dark:text-white">Rencana Evaluasi</h2>
                    <Button onClick={openAddEval}>+ Tambah</Button>
                  </div>
                  <div class="flex flex-col gap-3">
                    <Show when={rencanaEvals()?.length === 0}>
                      <p class="text-sm text-secondary-500 text-center py-6">Belum ada komponen penilaian.</p>
                    </Show>
                    <For each={rencanaEvals()}>
                      {(item) => (
                        <div class="p-3 border border-secondary-100 dark:border-secondary-800 rounded-lg flex justify-between items-start bg-secondary-50/50 dark:bg-secondary-800/30">
                          <div>
                            <div class="font-semibold text-sm text-secondary-800 dark:text-white">
                              {item.namaEvaluasi} ({item.bobotEvaluasi}%)
                            </div>
                            <Show when={item.deskripsi}>
                              <div class="text-xs text-secondary-500 mt-1">{item.deskripsi}</div>
                            </Show>
                          </div>
                          <div class="flex gap-1 ml-2">
                            <Button variant="secondary" onClick={() => openEditEval(item)}>
                              Edit
                            </Button>
                            <Button variant="danger" onClick={() => handleDeleteEval(item.id)}>
                              Hapus
                            </Button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </Show>
        </Show>

        {/* Modal RPS Header */}
        <Modal show={showRpsModal()} onClose={() => setShowRpsModal(false)} title="Edit Deskripsi RPS">
          <form onSubmit={handleSaveRpsHeader} class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Deskripsi Mata Kuliah
              </label>
              <textarea
                rows="4"
                class="w-full p-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={deskripsi()}
                onInput={(e) => setDeskripsi(e.currentTarget.value)}
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Capaian Pembelajaran Lulusan (CPL)
              </label>
              <textarea
                rows="4"
                class="w-full p-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={cplProdi()}
                onInput={(e) => setCplProdi(e.currentTarget.value)}
              />
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowRpsModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Topik */}
        <Modal
          show={showTopikModal()}
          onClose={() => setShowTopikModal(false)}
          title={editTopikId() ? 'Edit Topik Pertemuan' : 'Tambah Topik Pertemuan'}
        >
          <form onSubmit={handleSaveTopik} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Pertemuan Ke</label>
              <Input
                type="number"
                min="1"
                max="16"
                value={pertemuanKe()}
                onInput={(e) => setPertemuanKe(Number(e.currentTarget.value))}
                required
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Topik Utama</label>
              <Input type="text" value={topikText()} onInput={(e) => setTopikText(e.currentTarget.value)} required />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Sub-Topik / Materi (Opsional)
              </label>
              <Input type="text" value={subTopik()} onInput={(e) => setSubTopik(e.currentTarget.value)} />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Metode Pembelajaran
              </label>
              <Input type="text" value={metode()} onInput={(e) => setMetode(e.currentTarget.value)} />
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowTopikModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Rencana Evaluasi */}
        <Modal
          show={showEvalModal()}
          onClose={() => setShowEvalModal(false)}
          title={editEvalId() ? 'Edit Rencana Evaluasi' : 'Tambah Rencana Evaluasi'}
        >
          <form onSubmit={handleSaveEval} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Nama Evaluasi</label>
              <Input
                type="text"
                placeholder="Contoh: UTS, UAS, Tugas Besar"
                value={namaEvaluasi()}
                onInput={(e) => setNamaEvaluasi(e.currentTarget.value)}
                required
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Bobot Penilaian (%)
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={bobotEvaluasi()}
                onInput={(e) => setBobotEvaluasi(Number(e.currentTarget.value))}
                required
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Deskripsi / Indikator (Opsional)
              </label>
              <textarea
                rows="3"
                class="w-full p-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={evalDeskripsi()}
                onInput={(e) => setEvalDeskripsi(e.currentTarget.value)}
              />
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowEvalModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Modal Copy RPS Lintas Prodi */}
        <Modal
          show={showCopyModal()}
          onClose={() => setShowCopyModal(false)}
          title="Salin RPS Lintas Prodi & Periode"
          maxWidth="xl"
        >
          <div class="flex flex-col gap-4">
            <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800 p-3 text-xs text-secondary-600 dark:text-secondary-200">
              Target: <strong>{selectedMkLabel()}</strong> · Periode <strong>{selectedPeriode()}</strong>
            </div>

            {/* Filter & Search */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="flex flex-col gap-1 md:col-span-1">
                <label class="text-xs font-semibold text-secondary-500">Cari MK Sumber (Kode/Nama)</label>
                <Input
                  type="text"
                  placeholder="misal: Bahasa Inggris, K3..."
                  value={sourceSearch()}
                  onInput={(e) => {
                    const q = e.currentTarget.value;
                    setSourceSearch(q);
                    setSelectedSource(null);
                    clearTimeout(copySearchTimer);
                    copySearchTimer = setTimeout(() => setDebouncedSourceSearch(q), 350);
                  }}
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-secondary-500">Program Studi Sumber</label>
                <select
                  class="h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={sourceProdiId() || ''}
                  onChange={(e) => {
                    setSourceProdiId(e.currentTarget.value ? Number(e.currentTarget.value) : undefined);
                    setSelectedSource(null);
                  }}
                >
                  <option value="">Semua Prodi</option>
                  <For each={prodis()?.data}>
                    {(p) => (
                      <option value={p.id}>
                        {p.jenjang} - {p.nama}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-secondary-500">Periode RPS Sumber</label>
                <select
                  class="h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={sourcePeriode()}
                  onChange={(e) => {
                    setSourcePeriode(e.currentTarget.value);
                    setSelectedSource(null);
                  }}
                >
                  <option value="">Semua Periode</option>
                  <For each={allPeriodes()}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
                </select>
              </div>
            </div>

            {/* Source List */}
            <div class="border border-secondary-200 dark:border-secondary-700 rounded-xl divide-y divide-secondary-100 dark:divide-secondary-800 max-h-64 overflow-y-auto">
              <Show when={sources.loading}>
                <div class="flex items-center justify-center py-8 text-secondary-400">
                  <div class="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
                  <span class="text-xs">Memuat sumber...</span>
                </div>
              </Show>
              <Show when={!sources.loading && (sources()?.length || 0) === 0}>
                <div class="py-8 text-center text-secondary-400 text-sm">
                  Tidak ada RPS sumber dengan topik yang cocok.
                </div>
              </Show>
              <For each={sources()}>
                {(s) => (
                  <button
                    type="button"
                    class={`w-full flex items-start justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      selectedSource()?.id === s.id
                        ? 'bg-brand-50 dark:bg-brand-900/30 border-l-4 border-brand-600'
                        : 'hover:bg-secondary-50 dark:hover:bg-secondary-800/40 border-l-4 border-transparent'
                    }`}
                    onClick={() => setSelectedSource(s)}
                  >
                    <div>
                      <div class="font-semibold text-secondary-800 dark:text-white">
                        {s.kodeMataKuliah} - {s.namaMataKuliah}
                      </div>
                      <div class="text-xs text-secondary-500 dark:text-secondary-200">
                        {s.prodiNama || '-'} · {s.periodeNama || s.periodeId} · {s.jumlahTopik} topik
                      </div>
                      <Show when={s.deskripsi}>
                        <div class="text-xs text-secondary-400 line-clamp-1 mt-1">{s.deskripsi}</div>
                      </Show>
                    </div>
                    <span class="text-xs text-brand-600 font-semibold shrink-0 mt-0.5">Pilih</span>
                  </button>
                )}
              </For>
            </div>

            <Show when={selectedSource()}>
              <div class="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex flex-col gap-1">
                <span>
                  <strong>Sumber terpilih:</strong> {selectedSource()?.kodeMataKuliah} -{' '}
                  {selectedSource()?.namaMataKuliah} ({selectedSource()?.prodiNama || '-'})
                </span>
                <span>
                  Akan menyalin <strong>{selectedSource()?.jumlahTopik} topik</strong> pertemuan ke target.
                </span>
              </div>
            </Show>

            {/* Options */}
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-200 cursor-pointer">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-brand-600"
                  checked={copyRencanaEvaluasi()}
                  onChange={(e) => setCopyRencanaEvaluasi(e.currentTarget.checked)}
                />
                Salin Rencana Evaluasi
              </label>
              <label class="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-200 cursor-pointer">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-brand-600"
                  checked={copyCpmk()}
                  onChange={(e) => setCopyCpmk(e.currentTarget.checked)}
                />
                Salin CPMK & Pemetaan Topik
              </label>
              <p class="text-xs text-secondary-500 dark:text-secondary-200">
                Bila target MK belum memiliki CPMK, CPMK/Sub-CPMK sumber akan dibuat ulang dan dipetakan ke topik. Jika
                tidak, topik tetap tersalin lengkap tanpa tautan CPMK.
              </p>
            </div>

            <Show when={copyError()}>
              <div class="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {copyError()}
              </div>
            </Show>

            <div class="flex justify-end gap-2 mt-2">
              <Button variant="secondary" onClick={() => setShowCopyModal(false)}>
                Batal
              </Button>
              <Button onClick={handleCopyRps} disabled={!selectedSource() || copyLoading()}>
                {copyLoading() ? 'Menyalin...' : 'Salin ke Target'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
