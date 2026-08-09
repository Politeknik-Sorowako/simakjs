import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  apelController,
  KelompokApel,
  KelompokApelDetail,
  PresensiApelItem,
  SesiApel,
} from '../controllers/apelController';
import { Dosen, dosenController } from '../controllers/dosenController';
import { Mahasiswa, mahasiswaController } from '../controllers/mahasiswaController';
import { Prodi, prodiController } from '../controllers/prodiController';

export default function ApelKelola() {
  const auth = useAuth();
  const toast = useToast();
  const ws = useWorkspace();

  const [selectedKelompok, setSelectedKelompok] = createSignal<number | null>(null);
  const [selectedSesi, setSelectedSesi] = createSignal<number | null>(null);
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = createSignal('pagi');
  const [jamMulai, setJamMulai] = createSignal('');
  const [catatanSesi, setCatatanSesi] = createSignal('');
  const [presensiData, setPresensiData] = createSignal<PresensiApelItem[]>([]);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Hanya admin/super_admin yang boleh menetapkan sakit/izin/alpa secara manual.
  // Dosen/PJ apel hanya dapat memilih Hadir, Terlambat (+durasi), atau Unknown.
  const APEL_STATUS_LABELS: Record<string, string> = {
    hadir: 'Hadir (H)',
    terlambat: 'Terlambat (T)',
    sakit: 'Sakit (S)',
    izin: 'Izin (I)',
    alpa: 'Alpa (A)',
    unknown: 'Unknown (?)',
  };
  const APEL_FULL_STATUSES = ['hadir', 'terlambat', 'sakit', 'izin', 'alpa', 'unknown'];
  const APEL_STAFF_STATUSES = ['hadir', 'terlambat', 'unknown'];
  const statusOptions = () => (auth.hasRole(['admin', 'super_admin']) ? APEL_FULL_STATUSES : APEL_STAFF_STATUSES);
  const [showBukaSesiModal, setShowBukaSesiModal] = createSignal(false);

  // Modal Buat Kelompok State
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [newNamaKelompok, setNewNamaKelompok] = createSignal('');
  const [newKeterangan, setNewKeterangan] = createSignal('');
  // State Dosen PJ untuk Buka Sesi
  const [selectedDosenPJSesi, setSelectedDosenPJSesi] = createSignal<number | null>(null);

  // Modal Edit Sesi State
  const [showEditSesiModal, setShowEditSesiModal] = createSignal(false);
  const [editTanggal, setEditTanggal] = createSignal('');
  const [editShift, setEditShift] = createSignal('pagi');
  const [editJamMulai, setEditJamMulai] = createSignal('');
  const [editDosenId, setEditDosenId] = createSignal<number | null>(null);

  // Modal Kelola Anggota State
  const [showAnggotaModal, setShowAnggotaModal] = createSignal(false);
  const [mhsSearch, setMhsSearch] = createSignal('');
  const [selectedMhsToAdd, setSelectedMhsToAdd] = createSignal<number[]>([]);

  // Modal Catatan / Alasan Presensi State
  const [editingCatatanMhs, setEditingCatatanMhs] = createSignal<{ id: number; nama: string; text: string } | null>(
    null,
  );

  const openCatatanModal = (item: PresensiApelItem) => {
    setEditingCatatanMhs({
      id: item.mahasiswaId,
      nama: item.mahasiswaNama,
      text: item.keterangan || '',
    });
  };

  const handleSaveCatatanModal = (e: Event) => {
    e.preventDefault();
    const current = editingCatatanMhs();
    if (!current) return;
    handleKeteranganChange(current.id, current.text);
    setEditingCatatanMhs(null);
  };

  const openBukaSesiModalWithCheck = () => {
    if (!selectedKelompok()) {
      if ((kelompokList() || []).length > 0) {
        setSelectedKelompok(kelompokList()![0].id);
        setShowBukaSesiModal(true);
      } else {
        toast.showToast('Pilih atau buat kelompok apel terlebih dahulu', 'error');
      }
      return;
    }
    setShowBukaSesiModal(true);
  };

  // Resource Data Kelompok (Memuat seluruh kelompok apel kampus)
  const [kelompokList, { refetch: refetchKelompok }] = createResource(async () => {
    if (auth.hasRole(['dosen'])) {
      const dosenId = auth.user()?.id as unknown as number;
      return apelController.getKelompokByProdi(undefined, dosenId);
    }
    return apelController.getKelompokByProdi();
  });

  // Resource Detail Kelompok (untuk anggota)
  const [kelompokDetail, { refetch: refetchKelompokDetail }] = createResource(
    () => (showAnggotaModal() ? selectedKelompok() : null),
    async (id) => {
      if (!id) return null;
      return apelController.getKelompokDetail(id);
    },
  );

  // Resource Daftar Dosen (untuk Form Sesi - seluruh Dosen)
  const [allDosenList] = createResource(async () => {
    const res = await dosenController.getAll('', 1, 100);
    return res.data;
  });

  // Resource Daftar Mahasiswa Lintas Prodi (untuk Modal Kelola Anggota)
  const [mhsList] = createResource(
    () => ({ search: mhsSearch(), open: showAnggotaModal() }),
    async ({ search, open }) => {
      if (!open) return [];
      const res = await mahasiswaController.getAll(search, 1, 50);
      return res.data;
    },
  );

  // Resource Data Sesi
  const [sesiList, { refetch: refetchSesi }] = createResource(
    () => selectedKelompok(),
    async (kelompokId) => {
      if (!kelompokId) return [];
      return apelController.getSesiByKelompok(kelompokId);
    },
  );

  // Resource Data Presensi Sesi
  const [sesiPresensi, { refetch: refetchSesiPresensi }] = createResource(
    () => selectedSesi(),
    async (sesiId) => {
      if (!sesiId) return null;
      const data = await apelController.getSesiPresensi(sesiId);
      setPresensiData(data.presensi);
      return data;
    },
  );

  // Handle Buat Kelompok Baru
  const handleCreateKelompok = async (e: Event) => {
    e.preventDefault();
    if (!newNamaKelompok()) {
      toast.showToast('Isi Nama Kelompok', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await apelController.createKelompok({
        namaKelompok: newNamaKelompok(),
        keterangan: newKeterangan(),
      });
      toast.showToast('Kelompok Apel berhasil dibuat', 'success');
      setShowCreateModal(false);
      setNewNamaKelompok('');
      setNewKeterangan('');
      refetchKelompok();
      if (created && created.id) {
        setSelectedKelompok(created.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat kelompok apel';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Tambah Anggota Mahasiswa
  const handleAddAnggota = async () => {
    const kelId = selectedKelompok();
    const ids = selectedMhsToAdd();
    if (!kelId || ids.length === 0) {
      toast.showToast('Pilih setidaknya satu mahasiswa', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apelController.manageAnggota(kelId, ids);
      toast.showToast(`Berhasil menambahkan ${res.added} anggota`, 'success');
      setSelectedMhsToAdd([]);
      refetchKelompokDetail();
      refetchKelompok();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan anggota';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Hapus Anggota Mahasiswa
  const handleRemoveAnggota = async (mahasiswaId: number) => {
    const kelId = selectedKelompok();
    if (!kelId) return;

    try {
      setIsSubmitting(true);
      await apelController.removeAnggota(kelId, mahasiswaId);
      toast.showToast('Anggota berhasil dihapus', 'success');
      refetchKelompokDetail();
      refetchKelompok();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus anggota';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBukaSesi = async () => {
    if (!selectedKelompok() || !tanggal() || !jamMulai()) {
      toast.showToast('Lengkapi data sesi (kelompok, tanggal, jam mulai)', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await apelController.bukaSesi({
        kelompokApelId: selectedKelompok()!,
        tanggal: tanggal(),
        shift: shift(),
        jamMulai: jamMulai(),
        dosenId: selectedDosenPJSesi() || undefined,
        catatan: catatanSesi() || undefined,
      });
      toast.showToast(`Sesi dibuka dengan ${result.jumlahAnggota} mahasiswa`, 'success');
      refetchSesi();
      setSelectedSesi(result.id);
      setShowBukaSesiModal(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuka sesi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (
    mahasiswaId: number,
    newStatus: 'hadir' | 'terlambat' | 'unknown' | 'sakit' | 'izin' | 'alpa',
  ) => {
    setPresensiData((prev) =>
      prev.map((p) => {
        if (p.mahasiswaId === mahasiswaId) {
          return {
            ...p,
            status: newStatus,
            menitTerlambat:
              newStatus !== 'hadir'
                ? p.menitTerlambat !== undefined && p.menitTerlambat !== null
                  ? p.menitTerlambat
                  : 0
                : undefined,
          };
        }
        return p;
      }),
    );
  };

  const handleMenitChange = (mahasiswaId: number, menit: number) => {
    setPresensiData((prev) =>
      prev.map((p) => {
        if (p.mahasiswaId === mahasiswaId) {
          return { ...p, menitTerlambat: menit };
        }
        return p;
      }),
    );
  };

  const handleKeteranganChange = (mahasiswaId: number, ket: string) => {
    setPresensiData((prev) =>
      prev.map((p) => {
        if (p.mahasiswaId === mahasiswaId) {
          return { ...p, keterangan: ket };
        }
        return p;
      }),
    );
  };

  const handleSubmit = async () => {
    if (!selectedSesi()) return;
    try {
      setIsSubmitting(true);
      const list = presensiData().map((p) => ({
        mahasiswaId: p.mahasiswaId,
        status: p.status,
        menitTerlambat: p.menitTerlambat,
        keterangan: p.keterangan || null,
      }));
      await apelController.submitPresensi(selectedSesi()!, list);
      toast.showToast('Presensi berhasil disimpan', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan presensi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTutupSesi = async () => {
    if (!selectedSesi()) return;
    try {
      setIsSubmitting(true);
      await apelController.tutupSesi(selectedSesi()!);
      toast.showToast('Sesi berhasil ditutup', 'success');
      refetchSesi();
      refetchSesiPresensi();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menutup sesi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBukaKembaliSesi = async (targetSesiId?: number) => {
    const sesiId = targetSesiId || selectedSesi();
    if (!sesiId) return;
    try {
      setIsSubmitting(true);
      await apelController.bukaKembaliSesi(sesiId);
      toast.showToast('Sesi berhasil dibuka kembali', 'success');
      refetchSesi();
      if (selectedSesi() === sesiId) {
        refetchSesiPresensi();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal membuka kembali sesi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSesi = async (targetSesiId?: number) => {
    const sesiId = targetSesiId || selectedSesi();
    if (!sesiId) return;
    if (
      !confirm('Apakah Anda yakin ingin menghapus sesi apel ini? Seluruh data presensi pada sesi ini akan terhapus.')
    ) {
      return;
    }
    try {
      setIsSubmitting(true);
      await apelController.deleteSesi(sesiId);
      toast.showToast('Sesi berhasil dihapus', 'success');
      if (selectedSesi() === sesiId) {
        setSelectedSesi(null);
        setPresensiData([]);
      }
      refetchSesi();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menghapus sesi';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditSesiModal = () => {
    const sesi = sesiPresensi()?.sesi;
    if (!sesi) return;
    setEditTanggal(sesi.tanggal || '');
    setEditShift(sesi.shift || 'pagi');
    setEditJamMulai(sesi.jamMulai || '');
    setEditDosenId(sesi.dosenId || null);
    setShowEditSesiModal(true);
  };

  const handleUpdateSesi = async (e: Event) => {
    e.preventDefault();
    if (!selectedSesi()) return;
    try {
      setIsSubmitting(true);
      await apelController.updateSesi(selectedSesi()!, {
        tanggal: editTanggal(),
        shift: editShift(),
        jamMulai: editJamMulai(),
        dosenId: editDosenId() || null,
      });
      toast.showToast('Sesi apel berhasil diperbarui', 'success');
      setShowEditSesiModal(false);
      refetchSesi();
      refetchSesiPresensi();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui sesi apel';
      toast.showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadSesiDetail = (sesiId: number) => {
    setSelectedSesi(sesiId);
  };

  const toggleMhsSelection = (mhsId: number) => {
    setSelectedMhsToAdd((prev) => (prev.includes(mhsId) ? prev.filter((id) => id !== mhsId) : [...prev, mhsId]));
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 class="text-2xl font-bold">Presensi Apel Pagi & Sore</h1>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Kelompok + Kelola Anggota + Buat Sesi */}
          <div class="lg:col-span-1 space-y-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
              <div class="flex justify-between items-center">
                <h2 class="text-lg font-semibold">Pilih Kelompok</h2>
                <Show when={auth.hasRole(['super_admin', 'admin'])}>
                  <button
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    onClick={() => setShowCreateModal(true)}
                  >
                    + Buat Kelompok
                  </button>
                </Show>
              </div>

              <SearchableSelect
                placeholder="-- Pilih Kelompok --"
                value={selectedKelompok()}
                options={(kelompokList() || []).map((item: KelompokApel) => ({
                  label: `${item.namaKelompok.replace(/\s*\((pagi|sore)\)/gi, '')} (${item.jumlahAnggota ?? 0} Mhs)`,
                  value: item.id,
                }))}
                onChange={(val) => {
                  setSelectedKelompok(val ? Number(val) : null);
                  setSelectedSesi(null);
                  setPresensiData([]);
                }}
              />

              <Show when={kelompokList() && kelompokList()!.length === 0}>
                <div class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                  Belum ada kelompok apel pada prodi ini. Klik tombol <b>+ Buat Kelompok Baru</b> di atas untuk membuat.
                </div>
              </Show>

              <Show when={selectedKelompok()}>
                <button
                  class="w-full text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 py-2 px-3 rounded-lg flex items-center justify-center gap-1 font-medium"
                  onClick={() => setShowAnggotaModal(true)}
                  title="Kelola Anggota Mahasiswa"
                >
                  👥 Kelola Anggota
                </button>
              </Show>
            </div>

            <Show when={selectedKelompok()}>
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                <div class="flex justify-between items-center">
                  <h2 class="text-sm font-bold text-gray-800 dark:text-white">Pilih Riwayat Sesi</h2>
                  <div class="flex items-center gap-2">
                    <button
                      class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      onClick={openBukaSesiModalWithCheck}
                    >
                      + Tambah Sesi
                    </button>
                    <Show when={selectedSesi() && auth.hasRole(['admin'])}>
                      <button
                        class="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold"
                        onClick={() => handleDeleteSesi(selectedSesi()!)}
                      >
                        🗑 Hapus Sesi
                      </button>
                    </Show>
                  </div>
                </div>

                <Show
                  when={sesiList() && sesiList()!.length > 0}
                  fallback={
                    <div class="text-xs text-gray-500 italic py-1">
                      Belum ada sesi. Klik{' '}
                      <button onClick={openBukaSesiModalWithCheck} class="text-blue-600 underline font-semibold">
                        + Tambah Sesi
                      </button>{' '}
                      untuk membuka sesi baru.
                    </div>
                  }
                >
                  <SearchableSelect
                    placeholder="-- Cari / Pilih Riwayat Sesi --"
                    value={selectedSesi()}
                    options={(sesiList() || []).map((sesi: SesiApel) => ({
                      label: `${sesi.tanggal} (${sesi.shift}) ${sesi.jamMulai || ''} - [${
                        sesi.isClosed ? 'Tertutup' : 'Aktif'
                      }] (H:${sesi.hadirCount ?? 0} T:${sesi.terlambatCount ?? 0} ?:${sesi.unknownCount ?? 0})`,
                      value: sesi.id,
                    }))}
                    onChange={(val) => {
                      if (val) loadSesiDetail(Number(val));
                      else setSelectedSesi(null);
                    }}
                  />
                </Show>
              </div>
            </Show>
          </div>

          {/* Right: Presensi Table */}
          <div class="lg:col-span-2">
            <Show
              when={selectedSesi() && sesiPresensi()}
              fallback={
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500">
                  Pilih sesi apel untuk melihat atau mengelola presensi
                </div>
              }
            >
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h2 class="text-lg font-semibold">
                      Presensi - {sesiPresensi()?.sesi.tanggal} ({sesiPresensi()?.sesi.shift})
                    </h2>
                    <p class="text-sm text-gray-500">
                      {sesiPresensi()?.sesi.jamMulai} | {sesiPresensi()?.sesi.dosenNama}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                      onClick={handleSubmit}
                      disabled={isSubmitting() || sesiPresensi()?.sesi.isClosed}
                    >
                      Simpan
                    </button>

                    <Show
                      when={sesiPresensi()?.sesi.isClosed}
                      fallback={
                        <button
                          class="bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-50"
                          onClick={handleTutupSesi}
                          disabled={isSubmitting()}
                        >
                          Tutup Sesi
                        </button>
                      }
                    >
                      <Show
                        when={auth.hasRole(['admin', 'dosen', 'prodi'])}
                        fallback={
                          <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded font-semibold">
                            Sesi Tertutup
                          </span>
                        }
                      >
                        <button
                          class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                          onClick={() => handleBukaKembaliSesi()}
                          disabled={isSubmitting()}
                        >
                          Buka Sesi Kembali
                        </button>
                      </Show>
                    </Show>

                    <Show when={auth.hasRole(['admin', 'dosen', 'prodi'])}>
                      <button
                        class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                        onClick={openEditSesiModal}
                        disabled={isSubmitting()}
                        title="Edit Sesi Apel"
                      >
                        ✏ Edit Sesi
                      </button>
                    </Show>

                    <Show when={auth.hasRole(['admin'])}>
                      <button
                        class="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                        onClick={() => handleDeleteSesi()}
                        disabled={isSubmitting()}
                        title="Hapus Sesi Apel"
                      >
                        Hapus Sesi
                      </button>
                    </Show>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">No</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">NIM</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Nama</th>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase">Status</th>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase">Durasi (Menit)</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Catatan / Alasan</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y dark:divide-gray-700">
                      <For each={presensiData()}>
                        {(item: PresensiApelItem, idx) => (
                          <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td class="px-4 py-3 text-sm">{idx() + 1}</td>
                            <td class="px-4 py-3 text-sm font-mono">{item.mahasiswaNim}</td>
                            <td class="px-4 py-3 text-sm">{item.mahasiswaNama}</td>
                            <td class="px-4 py-3 text-center">
                              <select
                                class={`px-2 py-1 rounded text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${
                                  item.status === 'hadir'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300'
                                    : item.status === 'terlambat'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-300'
                                      : item.status === 'sakit'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300'
                                        : item.status === 'izin'
                                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-300'
                                          : item.status === 'alpa'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-300'
                                }`}
                                value={item.status}
                                disabled={isSubmitting() || sesiPresensi()?.sesi.isClosed}
                                onChange={(e) =>
                                  handleStatusChange(
                                    item.mahasiswaId,
                                    e.currentTarget.value as
                                      | 'hadir'
                                      | 'terlambat'
                                      | 'unknown'
                                      | 'sakit'
                                      | 'izin'
                                      | 'alpa',
                                  )
                                }
                              >
                                <For each={statusOptions()}>
                                  {(opt) => <option value={opt}>{APEL_STATUS_LABELS[opt]}</option>}
                                </For>
                              </select>
                            </td>
                            <td class="px-4 py-3 text-center">
                              <Show when={item.status !== 'hadir'}>
                                <div class="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    class="w-16 border rounded px-2 py-1 text-sm text-center dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                                    value={item.menitTerlambat ?? 0}
                                    disabled={isSubmitting() || sesiPresensi()?.sesi.isClosed}
                                    onInput={(e) => {
                                      const val = parseInt(e.currentTarget.value) || 0;
                                      item.menitTerlambat = val;
                                    }}
                                    onChange={(e) => {
                                      const val = parseInt(e.currentTarget.value) || 0;
                                      handleMenitChange(item.mahasiswaId, val);
                                    }}
                                  />
                                  <span class="text-xs text-gray-500">mnt</span>
                                </div>
                              </Show>
                            </td>
                            <td class="px-4 py-3 text-left">
                              <button
                                type="button"
                                onClick={() => openCatatanModal(item)}
                                disabled={isSubmitting() || sesiPresensi()?.sesi.isClosed}
                                class={`px-2.5 py-1 rounded text-xs transition-colors max-w-[130px] truncate text-left ${
                                  item.keterangan
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 font-medium'
                                    : 'border border-dashed border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600'
                                }`}
                              >
                                {item.keterangan ? `📝 ${item.keterangan}` : '+ Catatan'}
                              </button>
                            </td>
                          </tr>
                        )}
                      </For>
                      <Show when={presensiData().length === 0}>
                        <tr>
                          <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                            Belum ada data presensi
                          </td>
                        </tr>
                      </Show>
                    </tbody>
                  </table>
                </div>
              </div>
            </Show>
          </div>
        </div>

        {/* MODAL 1: Buat Kelompok Baru */}
        <Show when={showCreateModal()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
              <div class="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                <h3 class="text-lg font-bold">Buat Kelompok Apel Baru</h3>
                <button
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowCreateModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateKelompok} class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Nama Kelompok *</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Kelompok Apel Mesin A"
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    value={newNamaKelompok()}
                    onInput={(e) => setNewNamaKelompok(e.currentTarget.value)}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Keterangan (Opsional)</label>
                  <textarea
                    rows={2}
                    placeholder="misal: Lokasi Lapangan Olahraga"
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
                    value={newKeterangan()}
                    onInput={(e) => setNewKeterangan(e.currentTarget.value)}
                  />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting()}
                    class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {isSubmitting() ? 'Menyimpan...' : 'Simpan Kelompok'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* MODAL 2: Kelola Anggota Mahasiswa */}
        <Show when={showAnggotaModal()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
              <div class="flex justify-between items-center border-b dark:border-gray-700 pb-3 flex-shrink-0">
                <div>
                  <h3 class="text-lg font-bold">Kelola Anggota Kelompok Apel</h3>
                  <p class="text-xs text-gray-500">{kelompokDetail()?.namaKelompok}</p>
                </div>
                <button
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowAnggotaModal(false)}
                >
                  ✕
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
                {/* Kiri: Anggota Terdaftar */}
                <div class="flex flex-col border rounded-lg p-3 dark:border-gray-700 overflow-hidden">
                  <h4 class="font-semibold text-sm mb-2 flex justify-between items-center">
                    <span>Anggota Terdaftar</span>
                    <span class="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {kelompokDetail()?.anggota?.length || 0} Mahasiswa
                    </span>
                  </h4>
                  <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    <For each={kelompokDetail()?.anggota}>
                      {(mhs) => (
                        <div class="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50 text-xs">
                          <div>
                            <div class="font-semibold">{mhs.nama}</div>
                            <div class="text-gray-500 font-mono">{mhs.nim}</div>
                          </div>
                          <button
                            class="text-red-600 hover:text-red-800 dark:text-red-400 font-medium px-2 py-1"
                            onClick={() => handleRemoveAnggota(mhs.mahasiswaId)}
                            title="Hapus dari kelompok"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </For>
                    <Show when={!kelompokDetail()?.anggota || kelompokDetail()?.anggota.length === 0}>
                      <div class="text-center text-xs text-gray-500 py-6">Belum ada anggota di kelompok ini</div>
                    </Show>
                  </div>
                </div>

                {/* Kanan: Cari & Tambah Mahasiswa */}
                <div class="flex flex-col border rounded-lg p-3 dark:border-gray-700 overflow-hidden space-y-2">
                  <h4 class="font-semibold text-sm">Tambah Mahasiswa</h4>
                  <input
                    type="text"
                    placeholder="Cari berdasarkan NIM atau Nama Mahasiswa..."
                    class="w-full border rounded-lg px-2.5 py-1.5 text-xs dark:bg-gray-700 dark:border-gray-600"
                    value={mhsSearch()}
                    onInput={(e) => setMhsSearch(e.currentTarget.value)}
                  />
                  <div class="flex-1 overflow-y-auto space-y-1 pr-1">
                    <For each={mhsList()}>
                      {(mhs: Mahasiswa) => {
                        const isAlreadyMember = () => kelompokDetail()?.anggota?.some((a) => a.mahasiswaId === mhs.id);
                        const isSelected = () => selectedMhsToAdd().includes(mhs.id);
                        return (
                          <div
                            class={`flex items-center justify-between p-2 rounded text-xs border ${
                              isAlreadyMember()
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-transparent cursor-not-allowed'
                                : isSelected()
                                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400'
                                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-pointer hover:border-blue-300'
                            }`}
                            onClick={() => !isAlreadyMember() && toggleMhsSelection(mhs.id)}
                          >
                            <div>
                              <div class="font-medium">{mhs.nama}</div>
                              <div class="text-gray-500 font-mono text-[10px]">{mhs.nim}</div>
                            </div>
                            <Show
                              when={!isAlreadyMember()}
                              fallback={<span class="text-[10px] text-gray-400 italic">Sudah Ada</span>}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected()}
                                readOnly
                                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                              />
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                    <Show when={mhsList() && mhsList()!.length === 0}>
                      <div class="text-center text-xs text-gray-500 py-6">Mahasiswa tidak ditemukan</div>
                    </Show>
                  </div>

                  <button
                    class="w-full bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex-shrink-0"
                    onClick={handleAddAnggota}
                    disabled={isSubmitting() || selectedMhsToAdd().length === 0}
                  >
                    {isSubmitting() ? 'Menambahkan...' : `+ Tambahkan (${selectedMhsToAdd().length}) Mahasiswa`}
                  </button>
                </div>
              </div>

              <div class="flex justify-end pt-2 border-t dark:border-gray-700 flex-shrink-0">
                <button
                  class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  onClick={() => setShowAnggotaModal(false)}
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* MODAL 3: Edit Sesi Apel */}
        <Show when={showEditSesiModal()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
              <div class="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                <h3 class="text-lg font-bold">Edit Data Sesi Apel</h3>
                <button
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowEditSesiModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateSesi} class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 text-sm"
                    value={editTanggal()}
                    onChange={(e) => setEditTanggal(e.target.value)}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Shift</label>
                  <select
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 text-sm"
                    value={editShift()}
                    onChange={(e) => setEditShift(e.target.value)}
                  >
                    <option value="pagi">Pagi</option>
                    <option value="sore">Sore</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Dosen PJ Sesi (Opsional)</label>
                  <select
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 text-sm"
                    value={editDosenId() ?? ''}
                    onChange={(e) => setEditDosenId(Number(e.target.value) || null)}
                  >
                    <option value="">-- Pilih Dosen PJ Sesi --</option>
                    <For each={allDosenList()}>
                      {(d: Dosen) => (
                        <option value={d.id}>
                          {d.nama} {d.nip ? `(${d.nip})` : ''}
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 text-sm"
                    value={editJamMulai()}
                    onChange={(e) => setEditJamMulai(e.target.value)}
                  />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowEditSesiModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting()}
                    class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {isSubmitting() ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
        {/* MODAL 4: Catatan / Alasan Presensi */}
        <Show when={editingCatatanMhs()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl">
              <div class="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                <h3 class="text-base font-bold text-gray-900 dark:text-white">Catatan — {editingCatatanMhs()?.nama}</h3>
                <button
                  type="button"
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setEditingCatatanMhs(null)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCatatanModal} class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
                    Keterangan / Alasan Ketidakhadiran
                  </label>
                  <textarea
                    rows={3}
                    maxlength="1000"
                    placeholder="Tuliskan catatan atau alasan..."
                    class="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-xs dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCatatanMhs()?.text || ''}
                    onInput={(e) =>
                      setEditingCatatanMhs((prev) => (prev ? { ...prev, text: e.currentTarget.value } : null))
                    }
                  />
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setEditingCatatanMhs(null)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Simpan Catatan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* MODAL 5: Buka Sesi Apel Baru */}
        <Show when={showBukaSesiModal()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
              <div class="flex justify-between items-center border-b dark:border-gray-700 pb-3">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Buka Sesi Apel Baru</h3>
                <button
                  type="button"
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowBukaSesiModal(false)}
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBukaSesi();
                }}
                class="space-y-4"
              >
                <div>
                  <label class="block text-sm font-medium mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={tanggal()}
                    onChange={(e) => setTanggal(e.target.value)}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Shift *</label>
                  <select
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={shift()}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    <option value="pagi">Pagi</option>
                    <option value="sore">Sore</option>
                  </select>
                </div>
                <div>
                  <SearchableSelect
                    label="Dosen PJ Sesi (Opsional)"
                    placeholder="-- Pilih Dosen PJ Sesi --"
                    value={selectedDosenPJSesi()}
                    options={(allDosenList() || []).map((d: Dosen) => ({
                      label: `${d.nama} ${d.nip ? `(${d.nip})` : ''}`,
                      value: d.id,
                    }))}
                    onChange={(val) => setSelectedDosenPJSesi(val ? Number(val) : null)}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    required
                    class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={jamMulai()}
                    onChange={(e) => setJamMulai(e.target.value)}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Catatan Sesi Apel (Opsional)</label>
                  <textarea
                    rows="2"
                    maxlength="1000"
                    placeholder="Keterangan / Catatan Sesi Apel..."
                    class="w-full border rounded-lg px-3 py-2 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={catatanSesi()}
                    onInput={(e) => setCatatanSesi(e.currentTarget.value)}
                  />
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowBukaSesiModal(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting()}
                    class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {isSubmitting() ? 'Memproses...' : 'Buka Sesi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
