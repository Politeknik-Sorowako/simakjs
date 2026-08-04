import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { dosenController, Dosen as IDosen } from '../controllers/dosenController';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { krsController } from '../controllers/krsController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { BAP, CPMK, MonitoringRpsItem, PresensiItem, presensiController } from '../controllers/presensiController';
import { prodiController } from '../controllers/prodiController';
import { BapPraktikum, RombelPraktikum, rombelPraktikumController } from '../controllers/rombelPraktikumController';

export default function BapPresensi() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  // Selected state
  const [selectedKelasId, setSelectedKelasId] = createSignal<number | null>(null);
  const [selectedBapId, setSelectedBapId] = createSignal<number | null>(null);
  const [filterMkText, setFilterMkText] = createSignal('');

  // Main Tabs: 'teori' | 'praktikum' | 'monitoring'
  const [mainTab, setMainTab] = createSignal<'teori' | 'praktikum' | 'monitoring'>('teori');
  const [selectedDetailKelasId, setSelectedDetailKelasId] = createSignal<number | null>(null);
  const [searchMonitoring, setSearchMonitoring] = createSignal('');
  const [selectedPeriodeId, setSelectedPeriodeId] = createSignal<number | null>(null);
  const [selectedProdiId, setSelectedProdiId] = createSignal<number | null>(null);

  // Modals
  const [showBapModal, setShowBapModal] = createSignal(false);
  const [showCpmkModal, setShowCpmkModal] = createSignal(false);

  // Form states
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().split('T')[0]);
  const [pertemuanKe, setPertemuanKe] = createSignal(1);
  const [materi, setMateri] = createSignal('');
  const [catatan, setCatatan] = createSignal('');
  const [durasiMenit, setDurasiMenit] = createSignal(100);
  const [selectedCpmkId, setSelectedCpmkId] = createSignal<number | null>(null);
  const [selectedTopikIds, setSelectedTopikIds] = createSignal<number[]>([]);
  const [editBapId, setEditBapId] = createSignal<number | null>(null);

  // Filter Resources
  const [periodeData] = createResource(() => periodeAkademikController.getAll(undefined, 1, 100));
  const [prodiData] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Monitoring Resource
  const [monitoringData, { refetch: refetchMonitoring }] = createResource(
    () => ({ periodeId: selectedPeriodeId(), prodiId: selectedProdiId() }),
    async ({ periodeId, prodiId }) => {
      return presensiController.getMonitoringRps(periodeId || undefined, prodiId || undefined);
    },
  );
  const [detailMatrixData] = createResource(selectedDetailKelasId, (id) =>
    presensiController.getMonitoringRpsDetail(id),
  );

  // Mode Tab: 'teori' | 'praktikum'
  const [activeTab, setActiveTab] = createSignal<'teori' | 'praktikum'>('teori');

  // Dosen Profile lookup for scoping
  const [dosenProfile] = createResource(
    () => user()?.email,
    async (email) => {
      if (!email || user()?.role !== 'dosen') return null;
      const res = await dosenController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // New CPMK Form
  const [newCpmkKode, setNewCpmkKode] = createSignal('');
  const [newCpmkDeskripsi, setNewCpmkDeskripsi] = createSignal('');

  // Attendance Sheet state (studentId -> { status, durasiMangkir, keterangan })
  const [attendanceSheet, setAttendanceSheet] = createSignal<
    Record<number, { status: string; durasiMangkir: number; keterangan: string }>
  >({});

  // 1. Fetch Classes
  const [kelasData] = createResource(() => kelasKuliahController.getAll(undefined, 1, 100));

  const activeKelasList = () => {
    const all = kelasData()?.data || [];
    if (user()?.role === 'dosen') {
      const dId = dosenProfile()?.id;
      if (!dId) return all;
      return all.filter((k) => k.dosenPengajarKelas?.some((dp) => dp.dosenId === dId));
    }
    return all;
  };

  const filteredKelasList = () => {
    const txt = filterMkText().toLowerCase().trim();
    if (!txt) return activeKelasList();
    return activeKelasList().filter((k) => {
      const mkNama = k.mataKuliah?.nama?.toLowerCase() || '';
      const mkKode = k.mataKuliah?.kode?.toLowerCase() || '';
      const kelasNama = k.namaKelas?.toLowerCase() || '';
      return mkNama.includes(txt) || mkKode.includes(txt) || kelasNama.includes(txt);
    });
  };
  const selectedKelas = () => activeKelasList().find((k) => k.id === selectedKelasId());

  // 2. Fetch BAPs for selected Class
  const [bapData, { refetch: refetchBap }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await presensiController.getBapByKelas(kelasId);
    } catch (e: unknown) {
      toast.showToast('Gagal memuat BAP', 'error');
      return [];
    }
  });

  // 3. Fetch CPMKs for selected Mata Kuliah
  const [cpmkData, { refetch: refetchCpmk }] = createResource(
    () => selectedKelas()?.mataKuliahId,
    async (mkId) => {
      if (!mkId) return [];
      try {
        return await presensiController.getCpmkByMataKuliah(mkId);
      } catch (e: unknown) {
        toast.showToast('Gagal memuat CPMK', 'error');
        return [];
      }
    },
  );

  // Fetch RPS Topics for selected Class
  const [rpsTopics] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await presensiController.getRpsTopikByKelas(kelasId);
    } catch (e) {
      return [];
    }
  });

  // 4. Fetch students in Class (via KRS)
  const [krsData] = createResource(
    () => ({ kelasId: selectedKelasId(), loaded: !!selectedKelasId() }),
    async ({ kelasId, loaded }) => {
      if (!loaded || !kelasId) return [];
      try {
        // Load KRS entries for this class
        const res = await krsController.getAll(undefined, 1, 1000);
        return res.data.filter((k) => k.kelasKuliahId === kelasId) || [];
      } catch (e: unknown) {
        toast.showToast('Gagal memuat mahasiswa kelas', 'error');
        return [];
      }
    },
  );

  // 5. Fetch attendance for selected BAP
  const [savedPresensi] = createResource(selectedBapId, async (bapId) => {
    if (!bapId) return [];
    try {
      return await presensiController.getPresensiByBap(bapId);
    } catch (e) {
      return [];
    }
  });

  // Initialize attendance sheet when students or savedPresensi loads
  createEffect(() => {
    const listMhs = krsData() || [];
    const saved = savedPresensi() || [];

    const initialSheet: Record<number, { status: string; durasiMangkir: number; keterangan: string }> = {};

    for (const k of listMhs) {
      const existing = saved.find((p) => p.mahasiswaId === k.mahasiswaId);
      if (existing) {
        initialSheet[k.mahasiswaId] = {
          status: existing.status,
          durasiMangkir: existing.durasiMangkir,
          keterangan: existing.keterangan || '',
        };
      } else {
        initialSheet[k.mahasiswaId] = {
          status: 'hadir',
          durasiMangkir: 0,
          keterangan: '',
        };
      }
    }

    setAttendanceSheet(initialSheet);
  });

  // Handlers
  const openAddBap = () => {
    setEditBapId(null);
    setTanggal(new Date().toISOString().split('T')[0]);
    const maxPertemuan = (bapData() || []).reduce((max, b) => Math.max(max, b.pertemuanKe || 0), 0);
    setPertemuanKe(maxPertemuan + 1);
    setMateri('');
    setCatatan('');
    setDurasiMenit(100);
    setSelectedCpmkId(null);
    setSelectedTopikIds([]);
    setShowBapModal(true);
  };

  const openEditBap = () => {
    const activeBap = bapData()?.find((b) => b.id === selectedBapId());
    if (!activeBap) return;
    setEditBapId(activeBap.id);
    setTanggal(new Date(activeBap.tanggal).toISOString().split('T')[0]);
    setPertemuanKe(activeBap.pertemuanKe);
    setMateri(activeBap.materi);
    setCatatan(activeBap.catatan || '');
    setDurasiMenit(activeBap.durasiMenit);
    setSelectedCpmkId(activeBap.cpmkId || null);
    setSelectedTopikIds(activeBap.topikIds || []);
    setShowBapModal(true);
  };

  const handleSaveBap = async (e: Event) => {
    e.preventDefault();
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    try {
      const selectedTopics = (rpsTopics() || []).filter((t) => selectedTopikIds().includes(t.id));
      const autoMateri = selectedTopics.map((t) => `P${t.pertemuanKe}: ${t.topik}`).join(', ');
      const finalMateri = materi() || autoMateri || 'Materi Perkuliahan RPS';

      const payload = {
        kelasKuliahId: kelasId,
        tanggal: tanggal(),
        pertemuanKe: pertemuanKe(),
        materi: finalMateri,
        catatan: catatan() && catatan().trim() !== '' ? catatan().trim() : undefined,
        durasiMenit: durasiMenit(),
        cpmkId: selectedCpmkId() || selectedTopics[0]?.cpmkId || undefined,
        topikIds: selectedTopikIds(),
        dosenId: dosenProfile()?.id || selectedKelas()?.dosenPengajarKelas?.[0]?.dosenId || 1,
      };

      let activeBapId = editBapId();
      if (activeBapId) {
        await presensiController.updateBap(activeBapId, payload);
        toast.showToast('BAP berhasil diperbarui', 'success');
      } else {
        const newBap = await presensiController.createBap(payload);
        toast.showToast('BAP berhasil dibuat', 'success');
        activeBapId = newBap.id;
      }

      setShowBapModal(false);
      refetchBap();
      if (activeBapId) {
        setSelectedBapId(activeBapId);
      }
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan BAP', 'error');
    }
  };

  const handleCreateCpmk = async (e: Event) => {
    e.preventDefault();
    const mkId = selectedKelas()?.mataKuliahId;
    if (!mkId) return;

    try {
      const newCpmk = await presensiController.createCpmk({
        mataKuliahId: mkId,
        kode: newCpmkKode(),
        deskripsi: newCpmkDeskripsi(),
      });
      toast.showToast('CPMK berhasil ditambahkan', 'success');
      setShowCpmkModal(false);
      refetchCpmk();
      setSelectedCpmkId(newCpmk.id);
      setNewCpmkKode('');
      setNewCpmkDeskripsi('');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menambahkan CPMK', 'error');
    }
  };

  const handleStatusChange = (mhsId: number, status: string) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [mhsId]: {
        ...prev[mhsId],
        status,
        durasiMangkir: status === 'telat' ? 15 : 0, // default late duration to 15m
      },
    }));
  };

  const handleMangkirChange = (mhsId: number, durasi: number) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [mhsId]: {
        ...prev[mhsId],
        durasiMangkir: durasi,
      },
    }));
  };

  const handleKeteranganChange = (mhsId: number, ket: string) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [mhsId]: {
        ...prev[mhsId],
        keterangan: ket,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    const bapId = selectedBapId();
    if (!bapId) return;

    const sheet = attendanceSheet();
    const presensiList = Object.entries(sheet).map(([mhsId, data]) => ({
      mahasiswaId: parseInt(mhsId),
      status: data.status,
      durasiMangkir: data.durasiMangkir,
      keterangan: data.keterangan,
    }));

    try {
      await presensiController.saveBulkPresensi({ bapId, presensiList });
      toast.showToast('Presensi berhasil disimpan', 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan presensi', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Jurnal & Presensi Kuliah</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Isi Berita Acara Perkuliahan (BAP) dan Presensi kehadiran mahasiswa
            </p>
          </div>
          <Show when={selectedKelasId()}>
            <Button onClick={openAddBap} variant="primary">
              + Buat Pertemuan / BAP
            </Button>
          </Show>
        </div>

        {/* Main Tab Switcher */}
        <div class="flex items-center gap-2 border-b border-secondary-200 dark:border-secondary-800 pb-3">
          <button
            type="button"
            onClick={() => setMainTab('teori')}
            class={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              mainTab() === 'teori'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            Perkuliahan & Presensi Teori
          </button>
          <button
            type="button"
            onClick={() => setMainTab('praktikum')}
            class={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              mainTab() === 'praktikum'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            Kelas Praktikum (Rombel)
          </button>
          <button
            type="button"
            onClick={() => setMainTab('monitoring')}
            class={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
              mainTab() === 'monitoring'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            📊 Monitoring Kesesuaian RPS
          </button>
        </div>

        <Show when={mainTab() === 'teori'}>
          {/* Selection bar */}
          <div class="bg-white border border-secondary-100 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <div>
              <SearchableSelect
                label="Pilih Kelas Kuliah"
                placeholder="-- Cari & Pilih Kelas Kuliah --"
                value={selectedKelasId()}
                options={(activeKelasList() || []).map((kelas) => ({
                  label: `${kelas.mataKuliah?.kode ? `[${kelas.mataKuliah.kode}] ` : ''}${kelas.mataKuliah?.nama} (Kelas ${kelas.namaKelas})`,
                  value: kelas.id,
                }))}
                onChange={(val) => {
                  setSelectedKelasId(val ? Number(val) : null);
                  setSelectedBapId(null);
                }}
              />
            </div>

            <Show when={selectedKelasId()}>
              <div>
                <SearchableSelect
                  label="Pilih Pertemuan / BAP"
                  placeholder="-- Pilih Pertemuan --"
                  value={selectedBapId()}
                  options={(bapData() || []).map((bap) => ({
                    label: `Pertemuan ${bap.pertemuanKe} (${bap.tanggal}) - ${bap.materi}`,
                    value: bap.id,
                  }))}
                  onChange={(val) => {
                    setSelectedBapId(val ? Number(val) : null);
                  }}
                />
              </div>
            </Show>
          </div>

          {/* Main Content Area */}
          <Show when={selectedKelasId() && selectedBapId()}>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left BAP Summary */}
              <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4 lg:col-span-1 h-fit dark:bg-secondary-900 dark:border-secondary-800">
                <div class="flex justify-between items-center border-b pb-2">
                  <h3 class="font-bold text-secondary-800 dark:text-white">Detail Berita Acara (BAP)</h3>
                  <Button onClick={openEditBap} variant="secondary" class="py-1 px-2.5 text-xs">
                    Edit
                  </Button>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-xs font-semibold text-secondary-400 uppercase dark:text-secondary-200">
                    Materi Pokok (CPMK)
                  </span>
                  <span class="text-sm font-semibold text-brand-600">
                    {(() => {
                      const activeBapObj = bapData()?.find((b) => b.id === selectedBapId());
                      const cpmkObj = cpmkData()?.find((c) => c.id === activeBapObj?.cpmkId);
                      return cpmkObj ? `[${cpmkObj.kode}] ${cpmkObj.deskripsi}` : 'N/A';
                    })()}
                  </span>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-xs font-semibold text-secondary-400 uppercase dark:text-secondary-200">
                    Materi Utama (RPS)
                  </span>
                  <span class="text-sm text-secondary-700 dark:text-secondary-200">
                    {bapData()?.find((b) => b.id === selectedBapId())?.materi || '-'}
                  </span>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-xs font-semibold text-secondary-400 uppercase dark:text-secondary-200">
                    Catatan Pertemuan
                  </span>
                  <span class="text-sm text-secondary-700 dark:text-secondary-200">
                    {bapData()?.find((b) => b.id === selectedBapId())?.catatan || '-'}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-semibold text-secondary-400 uppercase dark:text-secondary-200">
                      Pertemuan Ke
                    </span>
                    <span class="text-sm font-bold text-secondary-800 dark:text-white">
                      {bapData()?.find((b) => b.id === selectedBapId())?.pertemuanKe || '-'}
                    </span>
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-semibold text-secondary-400 uppercase dark:text-secondary-200">
                      Durasi Kelas
                    </span>
                    <span class="text-sm font-bold text-secondary-800 dark:text-white">
                      {bapData()?.find((b) => b.id === selectedBapId())?.durasiMenit || 0} Menit
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Attendance Table */}
              <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
                <div class="flex items-center justify-between border-b pb-4">
                  <h3 class="font-bold text-secondary-800 dark:text-white">Presensi Kehadiran Mahasiswa</h3>
                  <Button onClick={handleSaveAttendance} variant="success">
                    Simpan Presensi
                  </Button>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold dark:border-secondary-800">
                        <th class="py-3 px-4">NIM / Nama</th>
                        <th class="py-3 px-4">Status Kehadiran</th>
                        <th class="py-3 px-4">Durasi Keterlambatan</th>
                        <th class="py-3 px-4">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={krsData() || []}>
                        {(k) => {
                          const state = () =>
                            attendanceSheet()[k.mahasiswaId] || { status: 'hadir', durasiMangkir: 0, keterangan: '' };
                          return (
                            <tr class="border-b border-secondary-50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50">
                              <td class="py-4 px-4">
                                <div class="font-bold text-secondary-800 dark:text-white">{k.mahasiswa?.nama}</div>
                                <div class="text-xs text-secondary-400 dark:text-secondary-200">{k.mahasiswa?.nim}</div>
                              </td>
                              <td class="py-4 px-4">
                                <div class="flex items-center gap-2">
                                  <For each={['hadir', 'sakit', 'izin', 'telat', 'alpa', 'unknown']}>
                                    {(st) => (
                                      <button
                                        type="button"
                                        onClick={() => handleStatusChange(k.mahasiswaId, st)}
                                        class={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                          state().status === st
                                            ? st === 'hadir'
                                              ? 'bg-accent-50 text-accent-700 border-accent-200'
                                              : st === 'alpa'
                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                : st === 'unknown'
                                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                                                  : 'bg-accent-50 text-accent-700 border-accent-200'
                                            : 'bg-transparent text-secondary-400 border-secondary-200 hover:bg-secondary-100'
                                        }`}
                                      >
                                        {st === 'unknown' ? '? UNKNOWN' : st.toUpperCase()}
                                      </button>
                                    )}
                                  </For>
                                </div>
                              </td>
                              <td class="py-4 px-4">
                                <Show
                                  when={state().status === 'telat'}
                                  fallback={
                                    <span class="text-xs text-secondary-400 italic dark:text-secondary-200">
                                      {state().status === 'hadir' ? '0' : 'Full Sesi'}
                                    </span>
                                  }
                                >
                                  <div class="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={state().durasiMangkir}
                                      onInput={(e) =>
                                        handleMangkirChange(k.mahasiswaId, parseInt(e.currentTarget.value) || 0)
                                      }
                                      class="w-16 bg-secondary-50 border border-secondary-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none dark:bg-secondary-800 dark:border-secondary-700"
                                    />
                                    <span class="text-xs text-secondary-500 dark:text-secondary-200">Menit</span>
                                  </div>
                                </Show>
                              </td>
                              <td class="py-4 px-4">
                                <input
                                  type="text"
                                  placeholder="Keterangan / Alasan..."
                                  value={state().keterangan || ''}
                                  onInput={(e) => handleKeteranganChange(k.mahasiswaId, e.currentTarget.value)}
                                  class="w-full min-w-[140px] bg-secondary-50 border border-secondary-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                                />
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Show>
        </Show>

        <Show when={mainTab() === 'monitoring'}>
          <div class="flex flex-col gap-6">
            {/* Stats Cards */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-white border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-secondary-400 dark:text-secondary-200">
                  Total Kelas Perkuliahan
                </span>
                <span class="text-2xl font-bold text-secondary-800 dark:text-white">
                  {(monitoringData() || []).length}
                </span>
              </div>
              <div class="bg-white border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-secondary-400 dark:text-secondary-200">
                  Rata-Rata Progres RPS
                </span>
                <span class="text-2xl font-bold text-brand-600">
                  {(() => {
                    const list = monitoringData() || [];
                    if (list.length === 0) return '0%';
                    const avg = Math.round(list.reduce((acc, curr) => acc + curr.persentaseCapaian, 0) / list.length);
                    return `${avg}%`;
                  })()}
                </span>
              </div>
              <div class="bg-white border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-secondary-400 dark:text-secondary-200">
                  Kelas Sesuai Target (&gt;=80%)
                </span>
                <span class="text-2xl font-bold text-emerald-600">
                  {(monitoringData() || []).filter((m) => m.persentaseCapaian >= 80).length}
                </span>
              </div>
              <div class="bg-white border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase text-secondary-400 dark:text-secondary-200">
                  Kelas Belum Sesuai (&lt;80%)
                </span>
                <span class="text-2xl font-bold text-amber-600">
                  {(monitoringData() || []).filter((m) => m.persentaseCapaian < 80).length}
                </span>
              </div>
            </div>

            {/* Search Filter & Table */}
            <div class="bg-white border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
              <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 class="text-lg font-bold text-secondary-800 dark:text-white">
                  Rekapitulasi Kesesuaian RPS vs Realisasi BAP
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                  <div>
                    <SearchableSelect
                      placeholder="-- Semua Periode --"
                      value={selectedPeriodeId()}
                      options={(periodeData()?.data || []).map((p) => ({
                        label: p.nama,
                        value: Number(p.id),
                      }))}
                      onChange={(val) => setSelectedPeriodeId(val ? Number(val) : null)}
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      placeholder="-- Semua Prodi --"
                      value={selectedProdiId()}
                      options={(prodiData()?.data || []).map((pr) => ({
                        label: pr.nama,
                        value: pr.id,
                      }))}
                      onChange={(val) => setSelectedProdiId(val ? Number(val) : null)}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari Mata Kuliah / Dosen..."
                    value={searchMonitoring()}
                    onInput={(e) => setSearchMonitoring(e.currentTarget.value)}
                    class="w-full bg-secondary-50 border border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-secondary-800 dark:text-white"
                  />
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 uppercase text-xs font-semibold">
                      <th class="py-3 px-4">Mata Kuliah / Kelas</th>
                      <th class="py-3 px-4">Program Studi</th>
                      <th class="py-3 px-4">Dosen Pengajar</th>
                      <th class="py-3 px-4">Topik Tercover</th>
                      <th class="py-3 px-4">Progres (%)</th>
                      <th class="py-3 px-4">Status</th>
                      <th class="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For
                      each={(monitoringData() || []).filter((item) => {
                        const s = searchMonitoring().toLowerCase();
                        return (
                          item.mataKuliahNama.toLowerCase().includes(s) ||
                          item.mataKuliahKode.toLowerCase().includes(s) ||
                          item.dosenPengajar.toLowerCase().includes(s) ||
                          item.prodiNama.toLowerCase().includes(s)
                        );
                      })}
                    >
                      {(item) => (
                        <tr class="border-b border-secondary-50 dark:border-secondary-800/60 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                          <td class="py-3 px-4">
                            <div class="font-bold text-secondary-800 dark:text-white">
                              [{item.mataKuliahKode}] {item.mataKuliahNama}
                            </div>
                            <div class="text-xs text-secondary-400 dark:text-secondary-300">Kelas {item.namaKelas}</div>
                          </td>
                          <td class="py-3 px-4 font-medium text-secondary-600 dark:text-secondary-300">
                            {item.prodiNama}
                          </td>
                          <td class="py-3 px-4 font-medium text-secondary-700 dark:text-white">{item.dosenPengajar}</td>
                          <td class="py-3 px-4 font-bold text-brand-600 dark:text-brand-400">
                            {item.topikDiajarkanCount} / {item.totalTopikRps} Topik
                          </td>
                          <td class="py-3 px-4">
                            <div class="flex items-center gap-2">
                              <div class="w-24 bg-secondary-100 dark:bg-secondary-800 rounded-full h-2 overflow-hidden">
                                <div
                                  class={`h-full rounded-full ${item.persentaseCapaian >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ width: `${item.persentaseCapaian}%` }}
                                />
                              </div>
                              <span class="text-xs font-bold text-secondary-700 dark:text-secondary-200">
                                {item.persentaseCapaian}%
                              </span>
                            </div>
                          </td>
                          <td class="py-3 px-4">
                            <span
                              class={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                item.status === 'SESUAI_TARGET'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                                  : item.status === 'BERJALAN'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200'
                                    : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-300'
                              }`}
                            >
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td class="py-3 px-4 text-center">
                            <Button
                              onClick={() => setSelectedDetailKelasId(item.kelasKuliahId)}
                              variant="secondary"
                              class="text-xs py-1 px-3"
                            >
                              Detail Matrix RPS
                            </Button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Modal Detail Matrix RPS */}
      <Show when={selectedDetailKelasId()}>
        <Modal
          isOpen={true}
          onClose={() => setSelectedDetailKelasId(null)}
          title={`Matrix Kesesuaian RPS - ${detailMatrixData()?.mataKuliahNama || ''} (${detailMatrixData()?.namaKelas || ''})`}
        >
          <div class="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <div class="bg-brand-50/50 p-4 rounded-xl border border-brand-200/50 dark:bg-brand-900/20 dark:border-brand-800/40 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="font-bold">Mata Kuliah:</span> [{detailMatrixData()?.mataKuliahKode}]{' '}
                {detailMatrixData()?.mataKuliahNama}
              </div>
              <div>
                <span class="font-bold">Program Studi:</span> {detailMatrixData()?.prodiNama}
              </div>
              <div>
                <span class="font-bold">Dosen Pengajar:</span> {detailMatrixData()?.dosenPengajar}
              </div>
              <div>
                <span class="font-bold">Status RPS:</span> Active / Approved
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-200 dark:border-secondary-700 font-semibold text-secondary-500 dark:text-secondary-300 uppercase">
                    <th class="py-2 px-3">P-Ke</th>
                    <th class="py-2 px-3">Topik Pembelajaran RPS</th>
                    <th class="py-2 px-3">Status Realisasi BAP</th>
                    <th class="py-2 px-3">BAP Relevan & Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={detailMatrixData()?.matrix || []}>
                    {(row) => (
                      <tr class="border-b border-secondary-100 dark:border-secondary-800/50 hover:bg-secondary-50 dark:hover:bg-secondary-800/50">
                        <td class="py-2.5 px-3 font-bold text-brand-600">P{row.pertemuanRps}</td>
                        <td class="py-2.5 px-3 font-medium text-secondary-800 dark:text-white">
                          {row.topik} {row.subTopik ? `(${row.subTopik})` : ''}
                        </td>
                        <td class="py-2.5 px-3">
                          <span
                            class={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              row.diajarkan
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                : 'bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400'
                            }`}
                          >
                            {row.diajarkan ? '✓ TERCOVER' : 'BELUM DIAJARIKAN'}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-secondary-600 dark:text-secondary-300">
                          {row.bapInfo ? (
                            <span>
                              Pertemuan {row.bapInfo.pertemuanKe} ({row.bapInfo.tanggal}) - {row.bapInfo.dosenNama}
                            </span>
                          ) : (
                            <span class="italic text-secondary-400">-</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      </Show>

      {/* Modal Buat BAP */}
      <Modal
        isOpen={showBapModal()}
        onClose={() => setShowBapModal(false)}
        title={editBapId() ? 'Edit Jurnal Harian (BAP)' : 'Buat Jurnal Harian (BAP) Baru'}
      >
        <form onSubmit={handleSaveBap} class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Tanggal Pertemuan"
              value={tanggal()}
              onInput={(e) => setTanggal(e.currentTarget.value)}
              required
            />
            <Input
              type="number"
              label="Pertemuan Ke"
              min="1"
              max="20"
              value={pertemuanKe()}
              onInput={(e) => setPertemuanKe(parseInt(e.currentTarget.value) || 1)}
              required
            />
          </div>

          <Show
            when={(rpsTopics() || []).length > 0}
            fallback={
              <Input
                type="text"
                label="Materi Pertemuan"
                placeholder="Misal: Pengenalan dan Dasar Perkuliahan"
                value={materi()}
                onInput={(e) => setMateri(e.currentTarget.value)}
                required
              />
            }
          >
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                Pilih Topik RPS (Dapat Memilih Lebih Dari Satu Topik)
              </label>
              <div class="max-h-48 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-xl p-2 bg-secondary-50 dark:bg-secondary-800 space-y-1">
                <For each={rpsTopics() || []}>
                  {(topic) => {
                    const isChecked = () => selectedTopikIds().includes(topic.id);
                    return (
                      <label class="flex items-center gap-2 text-xs cursor-pointer hover:bg-white dark:hover:bg-secondary-700 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked()}
                          onChange={(e) => {
                            let nextIds: number[];
                            if (e.currentTarget.checked) {
                              nextIds = [...selectedTopikIds(), topic.id];
                            } else {
                              nextIds = selectedTopikIds().filter((id) => id !== topic.id);
                            }
                            setSelectedTopikIds(nextIds);

                            const selectedTopics = (rpsTopics() || []).filter((t) => nextIds.includes(t.id));
                            const derivedMateri = selectedTopics.map((t) => `P${t.pertemuanKe}: ${t.topik}`).join(', ');
                            setMateri(derivedMateri);

                            if (selectedTopics[0]?.cpmkId) {
                              setSelectedCpmkId(selectedTopics[0].cpmkId);
                            }
                          }}
                          class="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                        />
                        <span class="font-bold text-brand-700 dark:text-brand-400">P{topic.pertemuanKe}:</span>
                        <span class="text-secondary-700 dark:text-white font-medium">{topic.topik}</span>
                        {topic.subTopik && (
                          <span class="text-secondary-400 dark:text-secondary-300">({topic.subTopik})</span>
                        )}
                      </label>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>

          <Show when={materi()}>
            <div class="rounded-xl bg-brand-50/50 p-3 border border-brand-200/50 dark:bg-brand-900/20 dark:border-brand-800/40 text-xs">
              <span class="font-bold text-brand-700 dark:text-brand-300">Target CPMK (Otomatis dari RPS): </span>
              <span class="text-secondary-700 dark:text-secondary-200">
                {(() => {
                  const matchedTopic = rpsTopics()?.find((t) => t.topik === materi());
                  const cpmkObj = cpmkData()?.find((c) => c.id === (matchedTopic?.cpmkId || selectedCpmkId()));
                  return cpmkObj ? `[${cpmkObj.kode}] ${cpmkObj.deskripsi}` : 'Terkoneksi dengan CPMK umum mata kuliah';
                })()}
              </span>
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
              Catatan Pertemuan (Opsional)
            </label>
            <textarea
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              rows="3"
              placeholder="Tambahkan catatan khusus mengenai pertemuan perkuliahan ini..."
              value={catatan()}
              onInput={(e) => setCatatan(e.currentTarget.value)}
            />
          </div>

          <Input
            type="number"
            label="Durasi Kelas (Menit)"
            min="10"
            value={durasiMenit()}
            onInput={(e) => setDurasiMenit(parseInt(e.currentTarget.value) || 100)}
            required
          />

          <div class="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowBapModal(false)} variant="secondary">
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan & Buka Presensi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Buat CPMK */}
      <Modal
        isOpen={showCpmkModal()}
        onClose={() => setShowCpmkModal(false)}
        title="Tambah Target Capaian Pembelajaran (CPMK)"
      >
        <form onSubmit={handleCreateCpmk} class="flex flex-col gap-4">
          <Input
            type="text"
            label="Kode CPMK"
            placeholder="Misal: CPMK-1"
            value={newCpmkKode()}
            onInput={(e) => setNewCpmkKode(e.currentTarget.value)}
            required
          />

          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">Deskripsi CPMK</label>
            <textarea
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700"
              rows="3"
              placeholder="Jelaskan capaian mata kuliah ini..."
              value={newCpmkDeskripsi()}
              onInput={(e) => setNewCpmkDeskripsi(e.currentTarget.value)}
              required
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowCpmkModal(false)} variant="secondary">
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan CPMK
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
