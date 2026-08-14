import { createResource, createSignal, For, onMount, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { bimbinganController, Pelanggaran as IPelanggaran } from '../controllers/bimbinganController';
import { Mahasiswa, mahasiswaController } from '../controllers/mahasiswaController';
import { pasalController } from '../controllers/pasalController';

export default function Pelanggaran() {
  const auth = useAuth();
  const user = () => auth.user();
  const isStaff = () => auth.hasRole(['admin', 'dosen', 'prodi', 'instruktur']);

  // Student Profile (if logged in as student)
  const [mhsProfile] = createResource(
    () => {
      if (auth.hasRole(['mahasiswa'])) return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Load student's own violations
  const [studentViolations, { refetch: refetchStudentViolations }] = createResource(
    () => mhsProfile()?.id,
    async (id) => {
      if (!id) return null;
      return await bimbinganController.getPelanggaranByMhsId(id);
    },
  );

  // Load all violations (for Staff: Admin/Dosen/Prodi/Instruktur)
  const [allViolations, { refetch: refetchAllViolations }] = createResource(
    () => {
      if (isStaff()) return true;
      return null;
    },
    async () => {
      return await bimbinganController.getAllPelanggaran();
    },
  );

  // Load master pasal BPA (global + prodi scoped)
  const [pasalList] = createResource(
    () => (isStaff() ? true : null),
    async () => {
      if (!isStaff()) return [];
      return await pasalController.getAll();
    },
  );
  const [showImportModal, setShowImportModal] = createSignal(false);

  // Server-side search + lazy-load list of active students for the form dropdown
  const MAHASISWA_PAGE_SIZE = 50;
  const [mahasiswaList, setMahasiswaList] = createSignal<Mahasiswa[]>([]);
  const [mahasiswaSearch, setMahasiswaSearch] = createSignal('');
  const [mahasiswaPage, setMahasiswaPage] = createSignal(1);
  const [mahasiswaHasMore, setMahasiswaHasMore] = createSignal(false);
  const [mahasiswaLoading, setMahasiswaLoading] = createSignal(false);

  const fetchMahasiswa = async (page: number, search: string, append: boolean) => {
    if (!isStaff()) return;
    setMahasiswaLoading(true);
    try {
      const res = await mahasiswaController.getAll(search || undefined, page, MAHASISWA_PAGE_SIZE, undefined, {
        filterStatus: 'aktif',
        allStudents: true,
      });
      setMahasiswaList((prev) => (append ? [...prev, ...res.data] : res.data));
      setMahasiswaPage(page + 1);
      setMahasiswaHasMore(page < (res.meta?.totalPages || 1));
    } catch {
      // silently ignore search errors
    } finally {
      setMahasiswaLoading(false);
    }
  };

  onMount(() => {
    fetchMahasiswa(1, '', false);
  });

  const handleMahasiswaSearch = (q: string) => {
    setMahasiswaSearch(q);
    fetchMahasiswa(1, q, false);
  };

  const handleMahasiswaLoadMore = () => {
    if (mahasiswaHasMore() && !mahasiswaLoading()) {
      fetchMahasiswa(mahasiswaPage(), mahasiswaSearch(), true);
    }
  };

  const ensureStudentLoaded = async (id: number) => {
    if (mahasiswaList().some((m) => m.id === id)) return;
    try {
      const m = await mahasiswaController.getById(id, true);
      if (m && !mahasiswaList().some((x) => x.id === m.id)) {
        setMahasiswaList((prev) => [m, ...prev]);
      }
    } catch {
      // ignore
    }
  };

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [mahasiswaId, setMahasiswaId] = createSignal(0);
  const [tanggal, setTanggal] = createSignal('');
  const [jenisPelanggaran, setJenisPelanggaran] = createSignal('');
  const [keterangan, setKeterangan] = createSignal('');
  const [pasalId, setPasalId] = createSignal<number | null>(null);
  const [pelapor, setPelapor] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [editPelanggaranId, setEditPelanggaranId] = createSignal<number | null>(null);

  // Preview / Cetak SP State
  const [selectedSpItem, setSelectedSpItem] = createSignal<IPelanggaran | null>(null);
  const [showSpModal, setShowSpModal] = createSignal(false);

  const openSpModal = (item: IPelanggaran) => {
    setSelectedSpItem(item);
    setShowSpModal(true);
  };

  const selectedPasal = () => pasalList()?.find((p) => p.id === pasalId()) || null;

  const openAddModal = () => {
    setEditPelanggaranId(null);
    const firstStudent = mahasiswaList()?.[0]?.id || 0;
    setMahasiswaId(firstStudent);
    const today = new Date();
    setTanggal(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    );
    setJenisPelanggaran('');
    setKeterangan('');
    setPasalId(null);
    setPelapor(user()?.nama || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handlePasalChange = (val: string | number) => {
    const id = val ? Number(val) : null;
    const cleanId = id && id > 0 ? id : null;
    setPasalId(cleanId);
    if (cleanId) {
      const pasal = pasalList()?.find((p) => p.id === cleanId);
      if (pasal) {
        setJenisPelanggaran(`${pasal.nomorPasal} - ${pasal.bunyiPasal}`.slice(0, 255));
      }
    }
  };

  const openEditModal = (item: IPelanggaran) => {
    setEditPelanggaranId(item.id);
    setMahasiswaId(item.mahasiswaId);
    ensureStudentLoaded(item.mahasiswaId);
    setTanggal(item.tanggal);
    setJenisPelanggaran(item.jenisPelanggaran);
    setKeterangan(item.keterangan);
    setPasalId(item.pasalId && item.pasalId > 0 ? item.pasalId : null);
    setPelapor(item.pelapor || '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!mahasiswaId() || !tanggal() || !keterangan()) {
      setErrorMsg('Mahasiswa, tanggal, dan keterangan wajib diisi.');
      return;
    }
    if (!jenisPelanggaran().trim()) {
      setErrorMsg('Jenis pelanggaran wajib diisi. Pilih pasal BPA atau tulis jenis pelanggaran secara manual.');
      return;
    }

    try {
      const payload = {
        mahasiswaId: mahasiswaId(),
        tanggal: tanggal(),
        jenisPelanggaran: jenisPelanggaran(),
        keterangan: keterangan(),
        pasalId: pasalId() && pasalId()! > 0 ? pasalId() : null,
        pelapor: pelapor().trim() || undefined,
      };

      const activeId = editPelanggaranId();
      if (activeId) {
        await bimbinganController.updatePelanggaran(activeId, payload);
      } else {
        await bimbinganController.createPelanggaran(payload);
      }
      setShowModal(false);
      refetchAllViolations();
      refetchRekap();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal menyimpan data.');
    }
  };

  // Rekap state
  const [viewTab, setViewTab] = createSignal<'daftar' | 'rekap'>('daftar');
  const [rekapProdi, setRekapProdi] = createSignal<number | undefined>(undefined);
  const [rekap, { refetch: refetchRekap }] = createResource(
    () => rekapProdi(),
    async (prodi) => {
      if (!isStaff()) return null;
      return await bimbinganController.getRekapPelanggaran(prodi);
    },
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header Section */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
              Kedisiplinan Mahasiswa
            </h1>
            <p class="text-sm text-secondary-500">Pencatatan pelanggaran indisipliner dan rekap poin kedisiplinan</p>
          </div>
          <Show when={isStaff()}>
            <div class="flex items-center gap-3">
              <Show when={auth.hasRole(['admin', 'prodi', 'super_admin'])}>
                <a
                  href="/pelanggaran/pasal-bpa"
                  class="px-5 py-2.5 bg-white border border-secondary-200 hover:bg-secondary-50 text-secondary-700 font-bold rounded-xl text-sm transition-all active:scale-95 dark:bg-secondary-900 dark:border-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-800"
                >
                  Kelola Pasal BPA
                </a>
              </Show>
              <button
                onClick={() => setShowImportModal(true)}
                class="px-5 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-bold rounded-xl text-sm transition-all active:scale-95 dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
              >
                Impor CSV
              </button>
              <button
                onClick={openAddModal}
                class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
              >
                + Catat Pelanggaran
              </button>
            </div>
          </Show>
        </div>

        {/* Staff tab switcher */}
        <Show when={isStaff()}>
          <div class="flex gap-2">
            <button
              onClick={() => setViewTab('daftar')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                viewTab() === 'daftar'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50 dark:bg-secondary-900 dark:text-secondary-300 dark:border-secondary-800'
              }`}
            >
              Daftar Pelanggaran
            </button>
            <button
              onClick={() => setViewTab('rekap')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                viewTab() === 'rekap'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50 dark:bg-secondary-900 dark:text-secondary-300 dark:border-secondary-800'
              }`}
            >
              Rekap & Predikat TXLY
            </button>
          </div>
        </Show>

        {/* Student View */}
        <Show when={auth.hasRole(['mahasiswa'])}>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Widget */}
            <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Status Kedisiplinan</h3>
              <div class="flex flex-col gap-2 items-center justify-center py-6">
                <span
                  class={`text-6xl font-extrabold ${
                    (studentViolations()?.totalPoin || 0) > 25 ? 'text-rose-600 animate-pulse' : 'text-accent-600'
                  }`}
                >
                  {studentViolations.loading ? '...' : studentViolations()?.totalPoin || 0}
                </span>
                <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                  Total Poin Pelanggaran
                </span>
                <Show when={studentViolations()?.predikat}>
                  <div class="flex flex-col items-center gap-1 mt-1">
                    <span class="px-3 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-100 font-extrabold text-sm dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                      Predikat: {studentViolations()?.predikat}
                    </span>
                    <span class="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      Degradasi Mutu Sikap: -{studentViolations()?.degradasiNilaiSikap ?? 0}
                    </span>
                  </div>
                </Show>
              </div>
              <div class="p-3.5 bg-secondary-50 border border-secondary-100 rounded-xl dark:bg-secondary-800 dark:border-secondary-800">
                <p class="text-[10px] text-secondary-400 leading-relaxed uppercase tracking-wider font-semibold">
                  Batas Poin Kelayakan (BPA):
                </p>
                <ul class="text-[11px] text-secondary-500 list-disc pl-4 mt-1 flex flex-col gap-0.5 font-medium">
                  <li>Total poin &gt; 25: Peringatan Keras (SP-1)</li>
                  <li>Total poin &gt; 50: Skorsing Akademik (SP-2)</li>
                  <li>Total poin &gt; 75: Drop Out / Diberhentikan (SP-3)</li>
                </ul>
              </div>
            </div>

            {/* Violation List */}
            <div class="lg:col-span-2 bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Riwayat Tindakan Indisipliner</h3>
              <Show
                when={studentViolations()?.pelanggaranList && studentViolations()!.pelanggaranList.length > 0}
                fallback={
                  <div class="py-12 text-center text-secondary-400 text-sm">
                    🎉 Luar biasa! Anda tidak memiliki catatan pelanggaran indisipliner semester ini.
                  </div>
                }
              >
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th class="p-3">Tanggal</th>
                        <th class="p-3">Pasal</th>
                        <th class="p-3">Jenis Pelanggaran</th>
                        <th class="p-3">Pelapor</th>
                        <th class="p-3">Sanksi</th>
                        <th class="p-3">Keterangan</th>
                        <th class="p-3 text-center">Dokumen</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={studentViolations()?.pelanggaranList}>
                        {(item) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString()}</td>
                            <td class="p-3">
                              <Show when={item.nomorPasal} fallback={<span class="text-secondary-400">-</span>}>
                                <span class="font-bold text-secondary-800 dark:text-white">{item.nomorPasal}</span>
                                <Show when={item.bunyiPasal}>
                                  <div class="text-[11px] text-secondary-500 max-w-[200px] truncate">
                                    {item.bunyiPasal}
                                  </div>
                                </Show>
                              </Show>
                            </td>
                            <td class="p-3">{item.jenisPelanggaran}</td>
                            <td class="p-3 whitespace-nowrap">
                              <span class="text-secondary-600 dark:text-secondary-300 font-medium">
                                {item.pelapor || '-'}
                              </span>
                            </td>
                            <td class="p-3">
                              <span
                                class={`px-2 py-0.5 rounded border font-bold ${
                                  item.jenisSanksi === 4
                                    ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                }`}
                              >
                                {item.jenisSanksi === 4 ? 'Tertulis (-1.00)' : 'Lisan (-0.25)'}
                              </span>
                            </td>
                            <td class="p-3">{item.keterangan}</td>
                            <td class="p-3 text-center">
                              <Button
                                onClick={() => openSpModal(item)}
                                variant="secondary"
                                class="py-1 px-2.5 text-[10px]"
                              >
                                Preview SP
                              </Button>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Staff View (Admin/Dosen/Prodi/Instruktur) */}
        <Show when={isStaff() && viewTab() === 'daftar'}>
          <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">Daftar Pelanggaran Mahasiswa</h3>
            <Show
              when={allViolations() && allViolations()!.length > 0}
              fallback={
                <div class="py-12 text-center text-secondary-400 text-sm">
                  Belum ada catatan tindakan indisipliner terdaftar.
                </div>
              }
            >
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                      <th class="p-3">Mahasiswa</th>
                      <th class="p-3">NIM</th>
                      <th class="p-3">Program Studi</th>
                      <th class="p-3">Tanggal</th>
                      <th class="p-3">Pasal</th>
                      <th class="p-3">Pelapor</th>
                      <th class="p-3">Sanksi</th>
                      <th class="p-3">Keterangan</th>
                      <th class="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                    <For each={allViolations()}>
                      {(item) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3 font-bold text-secondary-800 dark:text-white">{item.namaMahasiswa}</td>
                          <td class="p-3 whitespace-nowrap">{item.nim}</td>
                          <td class="p-3">{item.prodiNama}</td>
                          <td class="p-3 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString()}</td>
                          <td class="p-3">
                            <Show when={item.nomorPasal} fallback={<span class="text-secondary-400">-</span>}>
                              <span class="font-bold text-secondary-800 dark:text-white">{item.nomorPasal}</span>
                              <Show when={item.bunyiPasal}>
                                <div class="text-[11px] text-secondary-500 max-w-[220px] truncate">
                                  {item.bunyiPasal}
                                </div>
                              </Show>
                            </Show>
                          </td>
                          <td class="p-3 whitespace-nowrap">
                            <span class="text-secondary-600 dark:text-secondary-300 font-semibold">
                              {item.pelapor || '-'}
                            </span>
                          </td>
                          <td class="p-3">
                            <span
                              class={`px-2 py-0.5 rounded border font-bold ${
                                item.jenisSanksi === 4
                                  ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                              }`}
                            >
                              {item.jenisSanksi === 4 ? 'Tertulis (-1.00)' : 'Lisan (-0.25)'}
                            </span>
                          </td>
                          <td class="p-3 max-w-[200px] truncate">{item.keterangan}</td>
                          <td class="p-3 text-center">
                            <div class="flex items-center justify-center gap-1.5">
                              <Button
                                onClick={() => openSpModal(item)}
                                variant="secondary"
                                class="py-1 px-2 text-[10px]"
                                title="Preview & Cetak Dokumen SP"
                              >
                                Cetak SP
                              </Button>
                              <Show when={auth.hasRole(['admin'])}>
                                <Button
                                  onClick={() => openEditModal(item)}
                                  variant="secondary"
                                  class="py-1 px-2 text-[10px]"
                                >
                                  Edit
                                </Button>
                              </Show>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </Show>

        {/* Rekap View (Staff) */}
        <Show when={isStaff() && viewTab() === 'rekap'}>
          <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-secondary-800 border-b pb-2 dark:text-white">
                  Rekap Pelanggaran & Predikat TXLY
                </h3>
                <p class="text-xs text-secondary-500 mt-1">
                  Predikat TXLY: X = sanksi tertulis (pengurangan nilai mutu -1,00), Y = sanksi lisan (pengurangan nilai
                  mutu -0,25).
                </p>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-[10px] font-bold text-secondary-500 uppercase">Program Studi</label>
                  <input
                    type="number"
                    placeholder="Prodi ID"
                    value={rekapProdi() ?? ''}
                    onInput={(e) => setRekapProdi(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
                    class="border border-secondary-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
                  />
                </div>
                <Button variant="secondary" class="mt-4" onClick={() => refetchRekap()}>
                  Terapkan
                </Button>
              </div>
            </div>

            {/* Summary stats */}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-4 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-extrabold text-secondary-800 dark:text-white">
                  {rekap()?.totalPelanggaran || 0}
                </div>
                <div class="text-[10px] uppercase font-semibold text-secondary-400">Total Pelanggaran</div>
              </div>
              <div class="p-4 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-extrabold text-secondary-800 dark:text-white">
                  {rekap()?.totalMahasiswa || 0}
                </div>
                <div class="text-[10px] uppercase font-semibold text-secondary-400">Mahasiswa</div>
              </div>
              <div class="p-4 bg-accent-50 rounded-xl border border-accent-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-extrabold text-accent-600 dark:text-accent-400">
                  {rekap()?.perProdi.reduce((a, p) => a + p.totalPoin, 0) || 0}
                </div>
                <div class="text-[10px] uppercase font-semibold text-secondary-400">Total Poin</div>
              </div>
              <div class="p-4 bg-brand-50 rounded-xl border border-brand-100 dark:bg-secondary-800 dark:border-secondary-800">
                <div class="text-2xl font-extrabold text-brand-600 dark:text-brand-400">
                  {rekap()?.topPelanggar.length || 0}
                </div>
                <div class="text-[10px] uppercase font-semibold text-secondary-400">Top 10</div>
              </div>
            </div>

            {/* Top pelanggar table with predikat */}
            <div>
              <h4 class="text-sm font-bold text-secondary-700 border-b pb-2 mb-2 dark:text-secondary-200">
                Pelanggar Terbanyak (Top 10)
              </h4>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                      <th class="p-3">#</th>
                      <th class="p-3">NIM</th>
                      <th class="p-3">Nama</th>
                      <th class="p-3">Program Studi</th>
                      <th class="p-3">Jumlah Pelanggaran</th>
                      <th class="p-3">Total Poin</th>
                      <th class="p-3">Predikat TXLY</th>
                      <th class="p-3">Degradasi Mutu</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                    <For each={rekap()?.topPelanggar || []}>
                      {(item, idx) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3">{idx() + 1}</td>
                          <td class="p-3 font-mono">{item.nim}</td>
                          <td class="p-3 font-bold text-secondary-800 dark:text-white">{item.nama}</td>
                          <td class="p-3">{item.prodiNama}</td>
                          <td class="p-3">{item.jumlahPelanggaran}</td>
                          <td class="p-3">
                            <span class="px-2 py-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100 font-bold dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                              {item.totalPoin}
                            </span>
                          </td>
                          <td class="p-3">
                            <span class="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-100 font-extrabold dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                              {item.predikat}
                            </span>
                          </td>
                          <td class="p-3 font-bold text-rose-600 dark:text-rose-400">
                            -{item.degradasiNilaiSikap ?? 0}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per prodi breakdown */}
            <Show when={(rekap()?.perProdi || []).length > 0}>
              <div>
                <h4 class="text-sm font-bold text-secondary-700 border-b pb-2 mb-2 dark:text-secondary-200">
                  Per Program Studi
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <For each={rekap()?.perProdi || []}>
                    {(p) => (
                      <div class="p-3 bg-secondary-50 rounded-xl border border-secondary-100 dark:bg-secondary-800 dark:border-secondary-800">
                        <div class="text-xs font-bold text-secondary-800 dark:text-white">{p.prodiNama}</div>
                        <div class="text-[11px] text-secondary-500 mt-1">
                          {p.totalPelanggaran} pelanggaran · {p.totalPoin} poin
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Per jenis breakdown */}
            <Show when={(rekap()?.perJenis || []).length > 0}>
              <div>
                <h4 class="text-sm font-bold text-secondary-700 border-b pb-2 mb-2 dark:text-secondary-200">
                  Per Jenis Pelanggaran
                </h4>
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                        <th class="p-3">Jenis</th>
                        <th class="p-3">Jumlah</th>
                        <th class="p-3">Total Poin</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                      <For each={rekap()?.perJenis || []}>
                        {(j) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3">{j.jenis}</td>
                            <td class="p-3">{j.jumlah}</td>
                            <td class="p-3">{j.totalPoin}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        {/* Modal Entry Pelanggaran */}
        <Modal
          show={showModal()}
          onClose={() => setShowModal(false)}
          title={editPelanggaranId() ? 'Edit Catatan Pelanggaran' : 'Catat Pelanggaran Baru'}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {errorMsg()}
              </div>
            </Show>

            {/* Select Mahasiswa */}
            <div class="flex flex-col gap-1">
              <SearchableSelect
                label="Pilih Mahasiswa"
                required
                placeholder="Cari NIM atau Nama Mahasiswa Aktif..."
                value={mahasiswaId()}
                options={mahasiswaList().map((m) => ({
                  label: `${m.nama} (${m.nim})`,
                  value: m.id,
                }))}
                onChange={(val) => setMahasiswaId(Number(val))}
                onSearch={handleMahasiswaSearch}
                hasMore={mahasiswaHasMore()}
                onLoadMore={handleMahasiswaLoadMore}
                isLoading={mahasiswaLoading()}
              />
            </div>

            {/* Tanggal */}
            <Input
              label="Tanggal Pelanggaran"
              type="date"
              value={tanggal()}
              onInput={(e) => setTanggal(e.currentTarget.value)}
            />

            {/* Pasal BPA (opsional) */}
            <SearchableSelect
              label="Pasal Pelanggaran (BPA)"
              placeholder="Pilih pasal BPA (opsional, otomatis mengisi jenis pelanggaran & poin)..."
              value={pasalId() ?? ''}
              options={(pasalList() || []).map((p) => ({
                label: `${p.nomorPasal} - ${p.bunyiPasal.slice(0, 80)}${p.bunyiPasal.length > 80 ? '…' : ''}`,
                value: p.id,
              }))}
              onChange={handlePasalChange}
            />

            {/* Info pasal terpilih */}
            <Show when={selectedPasal()}>
              <div class="p-3 bg-accent-50 border border-accent-100 rounded-xl text-xs flex flex-col gap-1 dark:bg-secondary-800 dark:border-secondary-700">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-accent-800 dark:text-accent-300">{selectedPasal()?.nomorPasal}</span>
                  <span
                    class={`px-2 py-0.5 rounded border font-bold ${
                      selectedPasal()?.jenisSanksi === 4
                        ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                    }`}
                  >
                    {selectedPasal()?.jenisSanksi === 4 ? 'Tertulis (-1.00 Mutu)' : 'Lisan (-0.25 Mutu)'}
                  </span>
                </div>
                <p class="text-secondary-600 dark:text-secondary-300">{selectedPasal()?.bunyiPasal}</p>
              </div>
            </Show>

            {/* Jenis Pelanggaran */}
            <Input
              label="Jenis Pelanggaran"
              type="text"
              placeholder="Contoh: Terlambat Kelas Praktik, Kerusakan Fasilitas (otomatis terisi bila memilih pasal)"
              value={jenisPelanggaran()}
              onInput={(e) => setJenisPelanggaran(e.currentTarget.value)}
            />

            {/* Pelapor / Reported By */}
            <Input
              label="Dilaporkan Oleh (Pelapor)"
              type="text"
              placeholder="Nama dosen, instruktur, staf, atau satpam pelapor..."
              value={pelapor()}
              onInput={(e) => setPelapor(e.currentTarget.value)}
            />

            {/* Keterangan */}
            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-secondary-700">Keterangan Pelanggaran</label>
              <textarea
                rows="4"
                placeholder="Tulis kronologi singkat atau rincian pelanggaran yang terjadi..."
                value={keterangan()}
                onInput={(e) => setKeterangan(e.currentTarget.value)}
                class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 resize-none dark:border-secondary-700"
              />
            </div>

            <div class="flex justify-end gap-3 border-t pt-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Pelanggaran
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Preview & Cetak Surat Peringatan (SP) Sesuai BPA */}
        <Modal
          show={showSpModal()}
          onClose={() => setShowSpModal(false)}
          title="Dokumen Surat Peringatan (SP) Mahasiswa"
        >
          <Show when={selectedSpItem()}>
            {(sp) => {
              const isTertulis = () => sp().jenisSanksi === 4;
              return (
                <div class="flex flex-col gap-5 text-secondary-800 dark:text-secondary-100">
                  {/* Printable Document Box */}
                  <div
                    id="printable-sp"
                    class="p-6 bg-white border border-secondary-200 rounded-xl shadow-sm text-secondary-900 dark:bg-secondary-900 dark:border-secondary-700 dark:text-white"
                  >
                    {/* Kop Surat Politeknik Sorowako */}
                    <div class="text-center border-b-2 border-secondary-800 dark:border-white pb-3 mb-4">
                      <h2 class="text-base font-extrabold uppercase tracking-wider">
                        KEMENTERIAN PENDIDIKAN TINGGI, RISET, DAN TEKNOLOGI
                      </h2>
                      <h3 class="text-lg font-black uppercase text-brand-700 dark:text-brand-400">
                        POLITEKNIK SOROWAKO
                      </h3>
                      <p class="text-[10px] text-secondary-500 dark:text-secondary-400">
                        Jl. Sorowako Raya No. 1, Luwu Timur, Sulawesi Selatan | SIMAK Kedisiplinan Mahasiswa
                      </p>
                    </div>

                    {/* Judul Surat */}
                    <div class="text-center my-3">
                      <h4 class="text-sm font-extrabold underline uppercase">
                        SURAT PERINGATAN KEDISIPLINAN {isTertulis() ? 'TERTULIS (SP TERTULIS)' : 'LISAN (SP LISAN)'}
                      </h4>
                      <p class="text-[11px] text-secondary-500 dark:text-secondary-400">
                        Berdasarkan Buku Pedoman Akademik (BPA) Pasal 25, 26, & 28
                      </p>
                    </div>

                    {/* Identitas Mahasiswa */}
                    <div class="my-3 text-xs bg-secondary-50 p-3 rounded-lg border border-secondary-100 dark:bg-secondary-800/50 dark:border-secondary-700 flex flex-col gap-1">
                      <div class="grid grid-cols-3">
                        <span class="font-semibold text-secondary-500 dark:text-secondary-400">Nama Mahasiswa</span>
                        <span class="col-span-2 font-bold">: {sp().namaMahasiswa || '-'}</span>
                      </div>
                      <div class="grid grid-cols-3">
                        <span class="font-semibold text-secondary-500 dark:text-secondary-400">NIM</span>
                        <span class="col-span-2 font-mono font-bold">: {sp().nim || '-'}</span>
                      </div>
                      <div class="grid grid-cols-3">
                        <span class="font-semibold text-secondary-500 dark:text-secondary-400">Program Studi</span>
                        <span class="col-span-2">: {sp().prodiNama || '-'}</span>
                      </div>
                    </div>

                    {/* Rincian Pelanggaran */}
                    <div class="my-3 text-xs flex flex-col gap-2">
                      <p class="leading-relaxed">
                        Dengan ini diberikan peringatan indisipliner kepada mahasiswa bersangkutan atas pelanggaran yang
                        terjadi pada:
                      </p>

                      <div class="p-3 border border-secondary-200 rounded-lg dark:border-secondary-700 flex flex-col gap-1.5">
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Tanggal Kejadian</span>
                          <span class="col-span-2 font-medium">
                            : {new Date(sp().tanggal).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                          </span>
                        </div>
                        <Show when={sp().nomorPasal}>
                          <div class="grid grid-cols-3">
                            <span class="font-semibold text-secondary-500 dark:text-secondary-400">Pasal BPA</span>
                            <span class="col-span-2 font-bold text-brand-600 dark:text-brand-400">
                              : {sp().nomorPasal} - {sp().bunyiPasal}
                            </span>
                          </div>
                        </Show>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">
                            Jenis Pelanggaran
                          </span>
                          <span class="col-span-2 font-bold">: {sp().jenisPelanggaran}</span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Tingkat Sanksi</span>
                          <span class="col-span-2 font-bold">
                            :{' '}
                            {isTertulis()
                              ? 'Peringatan Tertulis (Degradasi Nilai Mutu Sikap -1.00)'
                              : 'Peringatan Lisan (Degradasi Nilai Mutu Sikap -0.25)'}
                          </span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">Dilaporkan Oleh</span>
                          <span class="col-span-2 font-bold text-accent-700 dark:text-accent-400">
                            : {sp().pelapor || 'Petugas Kedisiplinan'}
                          </span>
                        </div>
                        <div class="grid grid-cols-3">
                          <span class="font-semibold text-secondary-500 dark:text-secondary-400">
                            Keterangan / Kronologi
                          </span>
                          <span class="col-span-2 italic text-secondary-700 dark:text-secondary-300">
                            : "{sp().keterangan}"
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sanksi & Pernyataan */}
                    <p class="text-[11px] text-secondary-500 dark:text-secondary-400 leading-relaxed my-2">
                      Mahasiswa diharapkan mematuhi Buku Pedoman Akademik Politeknik Sorowako. Apabila melakukan
                      pelanggaran berulang, akan dikenakan sanksi peringatan tingkat berikutnya hingga pemberhentian
                      (Drop Out).
                    </p>

                    {/* Kolom Tanda Tangan Resmi Sesuai BPA */}
                    <div class="mt-8 pt-4 border-t border-dashed border-secondary-300 dark:border-secondary-700 grid grid-cols-3 text-center text-xs gap-4">
                      <div class="flex flex-col justify-between h-28">
                        <span class="font-semibold">Mahasiswa Bersangkutan,</span>
                        <div>
                          <p class="font-bold underline">{sp().namaMahasiswa || '....................'}</p>
                          <p class="text-[10px] text-secondary-500">NIM. {sp().nim || '...............'}</p>
                        </div>
                      </div>

                      <div class="flex flex-col justify-between h-28">
                        <span class="font-semibold">
                          Mengetahui,
                          <br />
                          Dosen Pembimbing Akademik
                        </span>
                        <div>
                          <p class="font-bold underline">_________________________</p>
                          <p class="text-[10px] text-secondary-500">NIP/NIDN Dosen PA</p>
                        </div>
                      </div>

                      <div class="flex flex-col justify-between h-28">
                        <span class="font-semibold">
                          Menyetujui,
                          <br />
                          Ketua Program Studi
                        </span>
                        <div>
                          <p class="font-bold underline">_________________________</p>
                          <p class="text-[10px] text-secondary-500">Ketua Program Studi</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div class="flex justify-end gap-3 border-t pt-4 dark:border-secondary-800">
                    <Button type="button" variant="secondary" onClick={() => setShowSpModal(false)}>
                      Tutup
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => window.print()}
                      class="flex items-center gap-2 font-bold"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                      Cetak Surat Peringatan
                    </Button>
                  </div>
                </div>
              );
            }}
          </Show>
        </Modal>

        {/* Import CSV Modal */}
        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          title="Pelanggaran / Peringatan"
          importUrl="/pelanggaran/import"
          templateHeaders={[
            'nim',
            'tanggal',
            'nomor_pasal',
            'jenis_pelanggaran',
            'jenis_sanksi',
            'pelapor',
            'keterangan',
          ]}
          customTemplateRows={[
            ['nim', 'tanggal', 'nomor_pasal', 'jenis_pelanggaran', 'jenis_sanksi', 'pelapor', 'keterangan'],
            [
              '202301001',
              '2026-06-27',
              'Pasal 2',
              'Terlambat masuk kelas praktikum',
              'L',
              'Budi Santoso, M.T.',
              'Terlambat lebih dari 30 menit tanpa alasan sah.',
            ],
            [
              '202301002',
              '2026-06-27',
              '',
              'Merusak fasilitas laboratorium',
              'T',
              'Satpam Kampus',
              'Melaporkan kerusakan keyboard praktikum.',
            ],
          ]}
          onSuccess={refetchAllViolations}
        />
      </div>
    </MainLayout>
  );
}
