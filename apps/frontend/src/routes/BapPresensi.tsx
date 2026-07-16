import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { krsController } from '../controllers/krsController';
import { BAP, CPMK, PresensiItem, presensiController } from '../controllers/presensiController';

export default function BapPresensi() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  // Selected state
  const [selectedKelasId, setSelectedKelasId] = createSignal<number | null>(null);
  const [selectedBapId, setSelectedBapId] = createSignal<number | null>(null);

  // Modals
  const [showBapModal, setShowBapModal] = createSignal(false);
  const [showCpmkModal, setShowCpmkModal] = createSignal(false);

  // Form states
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().split('T')[0]);
  const [pertemuanKe, setPertemuanKe] = createSignal(1);
  const [materi, setMateri] = createSignal('');
  const [durasiMenit, setDurasiMenit] = createSignal(100);
  const [selectedCpmkId, setSelectedCpmkId] = createSignal<number | null>(null);
  const [editBapId, setEditBapId] = createSignal<number | null>(null);

  // New CPMK Form
  const [newCpmkKode, setNewCpmkKode] = createSignal('');
  const [newCpmkDeskripsi, setNewCpmkDeskripsi] = createSignal('');

  // Attendance Sheet state (studentId -> { status, durasiMangkir })
  const [attendanceSheet, setAttendanceSheet] = createSignal<Record<number, { status: string; durasiMangkir: number }>>(
    {},
  );

  // 1. Fetch Classes
  const [kelasData] = createResource(() => kelasKuliahController.getAll(undefined, 1, 100));

  const activeKelasList = () => kelasData()?.data || [];
  const selectedKelas = () => activeKelasList().find((k) => k.id === selectedKelasId());

  // 2. Fetch BAPs for selected Class
  const [bapData, { refetch: refetchBap }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await presensiController.getBapByKelas(kelasId);
    } catch (e: any) {
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
      } catch (e: any) {
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
      } catch (e: any) {
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

    const initialSheet: Record<number, { status: string; durasiMangkir: number }> = {};

    for (const k of listMhs) {
      const existing = saved.find((p) => p.mahasiswaId === k.mahasiswaId);
      if (existing) {
        initialSheet[k.mahasiswaId] = {
          status: existing.status,
          durasiMangkir: existing.durasiMangkir,
        };
      } else {
        initialSheet[k.mahasiswaId] = {
          status: 'hadir',
          durasiMangkir: 0,
        };
      }
    }

    setAttendanceSheet(initialSheet);
  });

  // Handlers
  const openAddBap = () => {
    setEditBapId(null);
    setTanggal(new Date().toISOString().split('T')[0]);
    setPertemuanKe((bapData()?.length || 0) + 1);
    setMateri('');
    setDurasiMenit(100);
    setSelectedCpmkId(null);
    setShowBapModal(true);
  };

  const openEditBap = () => {
    const activeBap = bapData()?.find((b) => b.id === selectedBapId());
    if (!activeBap) return;
    setEditBapId(activeBap.id);
    setTanggal(new Date(activeBap.tanggal).toISOString().split('T')[0]);
    setPertemuanKe(activeBap.pertemuanKe);
    setMateri(activeBap.materi);
    setDurasiMenit(activeBap.durasiMenit);
    setSelectedCpmkId(activeBap.cpmkId);
    setShowBapModal(true);
  };

  const handleSaveBap = async (e: Event) => {
    e.preventDefault();
    const kelasId = selectedKelasId();
    const cpmkId = selectedCpmkId();
    if (!kelasId) return;
    if (!cpmkId) {
      toast.showToast('Silakan pilih materi CPMK terlebih dahulu', 'warning');
      return;
    }

    try {
      const payload = {
        kelasKuliahId: kelasId,
        tanggal: tanggal(),
        pertemuanKe: pertemuanKe(),
        materi: materi(),
        durasiMenit: durasiMenit(),
        cpmkId: cpmkId,
        dosenId: selectedKelas()?.dosenPengajarKelas?.[0]?.dosenId || 1,
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
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan BAP', 'error');
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
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menambahkan CPMK', 'error');
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

  const handleSaveAttendance = async () => {
    const bapId = selectedBapId();
    if (!bapId) return;

    const sheet = attendanceSheet();
    const presensiList = Object.entries(sheet).map(([mhsId, data]) => ({
      mahasiswaId: parseInt(mhsId),
      status: data.status,
      durasiMangkir: data.durasiMangkir,
    }));

    try {
      await presensiController.saveBulkPresensi({ bapId, presensiList });
      toast.showToast('Presensi berhasil disimpan', 'success');
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan presensi', 'error');
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

        {/* Selection bar */}
        <div class="bg-white border border-secondary-100 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <label class="block text-sm font-semibold text-secondary-600 mb-2 dark:text-secondary-200">
              Pilih Kelas Kuliah
            </label>
            <select
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedKelasId() || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedKelasId(val ? parseInt(val) : null);
                setSelectedBapId(null);
              }}
            >
              <option value="">-- Pilih Kelas --</option>
              <For each={activeKelasList()}>
                {(kelas) => (
                  <option value={kelas.id}>
                    {kelas.mataKuliah?.nama} (Kelas {kelas.namaKelas})
                  </option>
                )}
              </For>
            </select>
          </div>

          <Show when={selectedKelasId()}>
            <div>
              <label class="block text-sm font-semibold text-secondary-600 mb-2 dark:text-secondary-200">
                Pilih Pertemuan / BAP
              </label>
              <select
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={selectedBapId() || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedBapId(val ? parseInt(val) : null);
                }}
              >
                <option value="">-- Pilih Pertemuan --</option>
                <For each={bapData() || []}>
                  {(b) => (
                    <option value={b.id}>
                      Pertemuan {b.pertemuanKe} -{' '}
                      {new Date(b.tanggal).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </option>
                  )}
                </For>
              </select>
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
                  Catatan / Detail Materi
                </span>
                <span class="text-sm text-secondary-700 dark:text-secondary-200">
                  {bapData()?.find((b) => b.id === selectedBapId())?.materi || '-'}
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
                    </tr>
                  </thead>
                  <tbody>
                    <For each={krsData() || []}>
                      {(k) => {
                        const state = () => attendanceSheet()[k.mahasiswaId] || { status: 'hadir', durasiMangkir: 0 };
                        return (
                          <tr class="border-b border-secondary-50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50">
                            <td class="py-4 px-4">
                              <div class="font-bold text-secondary-800 dark:text-white">{k.mahasiswa?.nama}</div>
                              <div class="text-xs text-secondary-400 dark:text-secondary-200">{k.mahasiswa?.nim}</div>
                            </td>
                            <td class="py-4 px-4">
                              <div class="flex items-center gap-2">
                                <For each={['hadir', 'sakit', 'izin', 'telat', 'alpa']}>
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
                                              : 'bg-accent-50 text-accent-700 border-accent-200'
                                          : 'bg-transparent text-secondary-400 border-secondary-200 hover:bg-secondary-100'
                                      }`}
                                    >
                                      {st.toUpperCase()}
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

        <Show when={selectedKelasId() && !selectedBapId()}>
          <div class="bg-secondary-50 border border-dashed border-secondary-200 rounded-2xl p-12 text-center text-secondary-500 dark:bg-secondary-800 dark:border-secondary-700">
            Silakan pilih pertemuan/BAP di atas untuk mulai mengisi presensi kehadiran mahasiswa kelas ini.
          </div>
        </Show>

        <Show when={!selectedKelasId()}>
          <div class="bg-secondary-50 border border-dashed border-secondary-200 rounded-2xl p-12 text-center text-secondary-500 dark:bg-secondary-800 dark:border-secondary-700">
            Pilih kelas kuliah pengampu Anda untuk melihat jurnal harian dan presensi mahasiswa.
          </div>
        </Show>
      </div>

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

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
                Pilih CPMK (OBE Target)
              </label>
              <button
                type="button"
                onClick={() => setShowCpmkModal(true)}
                class="text-xs text-brand-600 font-bold hover:underline"
              >
                + Tambah CPMK Baru
              </button>
            </div>
            <select
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedCpmkId() || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCpmkId(val ? parseInt(val) : null);
              }}
              required
            >
              <option value="">-- Pilih Target Pembelajaran CPMK --</option>
              <For each={cpmkData() || []}>
                {(c) => (
                  <option value={c.id}>
                    [{c.kode}] {c.deskripsi}
                  </option>
                )}
              </For>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
              Catatan / Topik Materi Kuliah (Dari RPS)
            </label>
            <select
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={materi()}
              onChange={(e) => {
                const selectedVal = e.target.value;
                setMateri(selectedVal);

                // Automatically pre-fill CPMK if the selected topic maps to one
                const matchedTopic = rpsTopics()?.find((t) => t.topik === selectedVal);
                if (matchedTopic && matchedTopic.cpmkId) {
                  setSelectedCpmkId(matchedTopic.cpmkId);
                }
              }}
              required
            >
              <option value="">-- Pilih Topik Pembelajaran RPS --</option>
              <For each={rpsTopics() || []}>
                {(topic) => (
                  <option value={topic.topik}>
                    Pertemuan {topic.pertemuanKe}: {topic.topik} {topic.subTopik ? `(${topic.subTopik})` : ''}
                  </option>
                )}
              </For>
            </select>
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
