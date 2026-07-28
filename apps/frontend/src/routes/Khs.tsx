import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { khsController } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';

export default function Khs() {
  const auth = useAuth();
  const toast = useToast();
  const workspace = useWorkspace();
  const user = () => auth.user();
  const role = () => user()?.role;

  const [activeTab, setActiveTab] = createSignal<'khs' | 'transkrip' | 'konversi'>('khs');
  const [selectedPeriode, setSelectedPeriode] = createSignal(''); // Dynamic Period selection

  // Konversi Nilai states
  const [showKonversiModal, setShowKonversiModal] = createSignal(false);
  const [konversiId, setKonversiId] = createSignal<number | null>(null);
  const [konversiProdiId, setKonversiProdiId] = createSignal<string>('');
  const [nilaiHuruf, setNilaiHuruf] = createSignal('');
  const [nilaiIndeks, setNilaiIndeks] = createSignal('');
  const [nilaiMin, setNilaiMin] = createSignal('');
  const [nilaiMax, setNilaiMax] = createSignal('');
  const [predikat, setPredikat] = createSignal('');

  const [konversis, { refetch: refetchKonversis }] = createResource(
    () => {
      if (role() === 'admin') return true;
      return null;
    },
    async () => {
      return await khsController.getAllKonversi();
    },
  );

  const [prodis] = createResource(
    () => {
      if (role() === 'admin') return true;
      return null;
    },
    async () => {
      const res = await prodiController.getAll(undefined, 1, 100);
      return res.data;
    },
  );

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

  // For Admin / Dosen view
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [searchNim, setSearchNim] = createSignal('');

  // Printing States
  const [showPrintUjian, setShowPrintUjian] = createSignal(false);
  const [showPrintKhs, setShowPrintKhs] = createSignal(false);
  const [showPrintTranskrip, setShowPrintTranskrip] = createSignal(false);

  // Load exam eligibility for print card
  const [eligibilityData] = createResource(
    () => {
      const mhsId = selectedMhsId();
      const pId = selectedPeriode();
      if (!mhsId || !showPrintUjian()) return null;
      return { mhsId, periodeId: pId };
    },
    async ({ mhsId, periodeId }) => {
      try {
        return await khsController.getExamEligibility(mhsId, periodeId);
      } catch (e) {
        return null;
      }
    },
  );

  // Load Mahasiswa profile if logged in as student
  const [mhsProfile] = createResource(
    () => {
      if (role() === 'mahasiswa') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      const profile = res.data[0] || null;
      if (profile) setSelectedMhsId(profile.id);
      return profile;
    },
  );

  // Search Mahasiswa (Admin/Dosen only)
  const [searchedStudents] = createResource(searchNim, async (nim) => {
    if (!nim) return [];
    const res = await mahasiswaController.getAll(nim, 1, 10);
    return res.data;
  });

  const [khsData, { refetch: refetchKhs }] = createResource(
    () => {
      const mId = selectedMhsId();
      const pId = selectedPeriode();
      if (!mId || !pId) return null;
      return { mhsId: mId, periodeId: pId };
    },
    async ({ mhsId, periodeId }) => {
      return await khsController.getByMhsIdAndPeriode(mhsId, periodeId);
    },
  );

  // Load Transkrip
  const [transkripData, { refetch: refetchTranskrip }] = createResource(selectedMhsId, async (mhsId) => {
    if (!mhsId) return null;
    return await khsController.getTranskrip(mhsId);
  });

  const handleSaveKonversi = async (e: Event) => {
    e.preventDefault();
    if (!nilaiHuruf().trim() || !nilaiIndeks() || !nilaiMin() || !nilaiMax() || !predikat().trim()) {
      toast.showToast('Semua kolom wajib diisi.', 'error');
      return;
    }
    try {
      await khsController.saveKonversi({
        id: konversiId() || undefined,
        programStudiId: konversiProdiId() ? parseInt(konversiProdiId()) : null,
        nilaiHuruf: nilaiHuruf().toUpperCase(),
        bobotIndeks: parseFloat(nilaiIndeks()),
        nilaiMin: parseFloat(nilaiMin()),
        nilaiMax: parseFloat(nilaiMax()),
        predikat: predikat(),
      });
      toast.showToast('Aturan konversi nilai berhasil disimpan.', 'success');
      setShowKonversiModal(false);
      refetchKonversis();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan aturan konversi.', 'error');
    }
  };

  const handleDeleteKonversi = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aturan konversi ini?')) return;
    try {
      await khsController.deleteKonversi(id);
      toast.showToast('Aturan konversi nilai berhasil dihapus.', 'success');
      refetchKonversis();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menghapus aturan konversi.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
              Hasil Studi Akademik
            </h1>
            <p class="text-sm text-secondary-500">Kartu Hasil Studi (KHS) dan Transkrip Nilai Akademik Mahasiswa</p>
          </div>

          <div class="flex gap-2">
            <button
              onClick={() => setActiveTab('khs')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'khs' ? 'bg-brand-600 text-white shadow-sm' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}
            >
              KHS Semester
            </button>
            <button
              onClick={() => setActiveTab('transkrip')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'transkrip' ? 'bg-brand-600 text-white shadow-sm' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}
            >
              Transkrip Nilai
            </button>
            <Show when={role() === 'admin'}>
              <button
                onClick={() => setActiveTab('konversi')}
                class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'konversi' ? 'bg-brand-600 text-white shadow-sm' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}
              >
                Aturan Konversi Nilai
              </button>
            </Show>
          </div>
        </div>

        {/* Admin/Dosen Student Selector */}
        <Show when={role() !== 'mahasiswa' && activeTab() !== 'konversi'}>
          <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <h3 class="font-bold text-secondary-700 text-sm">Pilih Mahasiswa & Periode</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-secondary-500">Cari NIM / Nama</label>
                <input
                  type="text"
                  placeholder="Masukkan NIM atau Nama..."
                  value={searchNim()}
                  onInput={(e) => setSearchNim(e.currentTarget.value)}
                  class="border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 dark:border-secondary-700"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-secondary-500">Pilih dari Hasil Pencarian</label>
                <select
                  onChange={(e) => {
                    const id = parseInt(e.currentTarget.value);
                    setSelectedMhsId(id || null);
                  }}
                  class="border border-secondary-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                >
                  <option value="">-- Pilih Mahasiswa --</option>
                  <For each={searchedStudents()}>
                    {(item) => (
                      <option value={item.id} selected={selectedMhsId() === item.id}>
                        {item.nim} - {item.nama}
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <Show when={activeTab() === 'khs'}>
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-secondary-500">Pilih Periode</label>
                  <select
                    value={selectedPeriode()}
                    onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                  >
                    <For each={periodes()}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
                  </select>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Student Period Selector */}
        <Show when={role() === 'mahasiswa' && activeTab() === 'khs'}>
          <div class="bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm flex items-center gap-4 dark:bg-secondary-900 dark:border-secondary-800">
            <span class="text-sm font-bold text-secondary-700">Periode Akademik:</span>
            <select
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
              class="border border-secondary-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-brand-500 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
            >
              <For each={periodes()}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
        </Show>

        {/* Aturan Konversi Nilai View */}
        <Show when={activeTab() === 'konversi' && role() === 'admin'}>
          <div class="flex justify-between items-center gap-4 bg-white/60 p-6 rounded-2xl border border-secondary-100 shadow-sm mb-4 dark:bg-secondary-900/60 dark:border-secondary-800">
            <h3 class="font-bold text-secondary-800 dark:text-white">Aturan Konversi Nilai Akademik</h3>
            <button
              onClick={() => {
                setKonversiId(null);
                setKonversiProdiId('');
                setNilaiHuruf('');
                setNilaiIndeks('');
                setNilaiMin('');
                setNilaiMax('');
                setPredikat('');
                setShowKonversiModal(true);
              }}
              class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-200 dark:bg-brand-700 dark:hover:bg-brand-600"
            >
              ➕ Tambah Aturan Konversi
            </button>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm overflow-x-auto dark:bg-secondary-900 dark:border-secondary-800">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                  <th class="p-3">Program Studi</th>
                  <th class="p-3">Nilai Huruf</th>
                  <th class="p-3">Nilai Indeks</th>
                  <th class="p-3">Nilai Minimum Angka</th>
                  <th class="p-3">Nilai Maksimum Angka</th>
                  <th class="p-3">Predikat</th>
                  <th class="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                <For
                  each={konversis()}
                  fallback={
                    <tr>
                      <td colspan="7" class="p-4 text-center text-secondary-400 italic">
                        Belum ada aturan konversi nilai terdaftar.
                      </td>
                    </tr>
                  }
                >
                  {(konv) => (
                    <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                      <td class="p-3 font-semibold text-secondary-800 dark:text-white">
                        {konv.programStudi?.nama || 'GLOBAL (Semua Prodi)'}
                      </td>
                      <td class="p-3 font-bold text-brand-600">{konv.nilaiHuruf}</td>
                      <td class="p-3 font-mono">{konv.bobotIndeks.toFixed(2)}</td>
                      <td class="p-3 font-mono">{konv.nilaiMin.toFixed(2)}</td>
                      <td class="p-3 font-mono">{konv.nilaiMax.toFixed(2)}</td>
                      <td class="p-3 font-medium text-secondary-800 dark:text-white">{konv.predikat}</td>
                      <td class="p-3 flex gap-2">
                        <button
                          onClick={() => {
                            setKonversiId(konv.id || 0);
                            setKonversiProdiId(konv.programStudiId ? konv.programStudiId.toString() : '');
                            setNilaiHuruf(konv.nilaiHuruf);
                            setNilaiIndeks(konv.bobotIndeks.toString());
                            setNilaiMin(konv.nilaiMin.toString());
                            setNilaiMax(konv.nilaiMax.toString());
                            setPredikat(konv.predikat);
                            setShowKonversiModal(true);
                          }}
                          class="px-2.5 py-1 bg-secondary-100 text-secondary-700 font-semibold rounded-lg hover:bg-secondary-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => konv.id && handleDeleteKonversi(konv.id)}
                          class="px-2.5 py-1 bg-rose-50 text-rose-600 font-semibold rounded-lg hover:bg-rose-100 transition-colors dark:bg-rose-900/30 dark:text-rose-400"
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
        </Show>

        {/* Content Area */}
        <Show when={activeTab() !== 'konversi'}>
          <Show
            when={selectedMhsId()}
            fallback={
              <div class="bg-white p-12 rounded-2xl border border-secondary-100 shadow-sm text-center text-secondary-400 dark:bg-secondary-900 dark:border-secondary-800">
                Silakan cari dan pilih mahasiswa terlebih dahulu untuk menampilkan data akademik.
              </div>
            }
          >
            <Show when={activeTab() === 'khs'}>
              <Show when={khsData.loading}>
                <div class="text-center py-12 text-secondary-400">Memuat data KHS...</div>
              </Show>

              <Show when={!khsData.loading && khsData()}>
                <Show
                  when={khsData()?.blocked}
                  fallback={
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Summary Cards */}
                      <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-1 dark:bg-secondary-900 dark:border-secondary-800">
                          <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                            IP Semester
                          </span>
                          <span class="text-3xl font-extrabold text-brand-600">
                            {khsData()?.summary?.ipSemester?.toFixed(2)}
                          </span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-1 dark:bg-secondary-900 dark:border-secondary-800">
                          <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                            IPK Kumulatif
                          </span>
                          <span class="text-3xl font-extrabold text-accent-600">
                            {khsData()?.summary?.ipk?.toFixed(2)}
                          </span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-1 dark:bg-secondary-900 dark:border-secondary-800">
                          <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                            SKS Terkontrak
                          </span>
                          <span class="text-3xl font-extrabold text-secondary-800 dark:text-white">
                            {khsData()?.summary?.totalSks} SKS
                          </span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-1 dark:bg-secondary-900 dark:border-secondary-800">
                          <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                            SKS Kumulatif
                          </span>
                          <span class="text-3xl font-extrabold text-secondary-800 dark:text-white">
                            {khsData()?.summary?.totalSksKumulatif} SKS
                          </span>
                        </div>
                      </div>

                      {/* KHS Table */}
                      <div class="lg:col-span-3 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 overflow-x-auto dark:bg-secondary-900 dark:border-secondary-800">
                        <div class="flex justify-between items-center border-b pb-2">
                          <h3 class="font-bold text-secondary-800 dark:text-white">Rincian Mata Kuliah & Nilai</h3>
                          <div class="flex gap-2">
                            <button
                              onClick={() => setShowPrintUjian(true)}
                              disabled={khsData()?.blocked}
                              class="px-3 py-1.5 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition-all shadow-sm shadow-accent-100 dark:bg-brand-700 dark:hover:bg-brand-600"
                            >
                              🖨️ Cetak Kartu Ujian
                            </button>
                            <button
                              onClick={() => setShowPrintKhs(true)}
                              disabled={khsData()?.blocked}
                              class="px-3 py-1.5 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition-all shadow-sm shadow-accent-100 dark:bg-brand-700 dark:hover:bg-brand-600"
                            >
                              🖨️ Cetak KHS
                            </button>
                          </div>
                        </div>

                        <table class="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                              <th class="p-3">Kode MK</th>
                              <th class="p-3">Nama Mata Kuliah</th>
                              <th class="p-3">SKS</th>
                              <th class="p-3">Nilai Angka</th>
                              <th class="p-3">Nilai Huruf</th>
                              <th class="p-3">Nilai Indeks</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                            <For
                              each={khsData()?.krsList}
                              fallback={
                                <tr>
                                  <td colspan="6" class="p-4 text-center text-secondary-400 italic">
                                    Nilai belum dimasukkan atau belum disetujui Dosen PA.
                                  </td>
                                </tr>
                              }
                            >
                              {(item) => (
                                <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                                  <td class="p-3 whitespace-nowrap">{item.mataKuliah?.kode}</td>
                                  <td class="p-3 font-bold text-secondary-800 dark:text-white">
                                    {item.mataKuliah?.nama}
                                  </td>
                                  <td class="p-3">{item.mataKuliah?.sksTotal}</td>
                                  <td class="p-3">{item.nilaiAngka || '-'}</td>
                                  <td class="p-3">
                                    <Show when={item.nilaiHuruf} fallback="-">
                                      <span
                                        class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          item.nilaiHuruf === 'A' || item.nilaiHuruf === 'B+' || item.nilaiHuruf === 'B'
                                            ? 'bg-accent-50 text-accent-600 border border-accent-100'
                                            : item.nilaiHuruf === 'C+' || item.nilaiHuruf === 'C'
                                              ? 'bg-accent-50 text-accent-600 border border-accent-100'
                                              : 'bg-rose-50 text-rose-600 border border-rose-100'
                                        }`}
                                      >
                                        {item.nilaiHuruf}
                                      </span>
                                    </Show>
                                  </td>
                                  <td class="p-3">{item.nilaiIndeks || '-'}</td>
                                </tr>
                              )}
                            </For>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                >
                  {/* Blocked View */}
                  <div class="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-rose-800 shadow-sm flex flex-col items-center justify-center text-center gap-4 max-w-2xl mx-auto my-8">
                    <span class="text-5xl">🔒</span>
                    <h2 class="text-xl font-extrabold tracking-tight text-rose-900">Akses KHS Diblokir Sementara</h2>
                    <p class="text-sm font-medium leading-relaxed max-w-md text-rose-700">
                      Sesuai dengan ketentuan Buku Panduan Akademik, Anda harus melunasi seluruh kewajiban administrasi
                      sebelum dapat mengakses nilai akhir KHS.
                    </p>
                    <div class="bg-white border border-rose-100 rounded-xl p-4 w-full text-left flex flex-col gap-1.5 shadow-sm dark:bg-secondary-900 dark:border-rose-800">
                      <span class="text-xs uppercase font-extrabold tracking-wider text-rose-500">
                        Penyebab Blokir:
                      </span>
                      <p class="text-xs font-bold text-secondary-700">{khsData()?.reason}</p>
                      <p class="text-xs text-secondary-500 font-medium">{khsData()?.detail}</p>
                    </div>
                    <p class="text-xs text-rose-600 font-bold mt-2">
                      Silakan hubungi Bagian Keuangan atau BAAK untuk melakukan penyelesaian tanggungan.
                    </p>
                  </div>
                </Show>
              </Show>
            </Show>

            <Show when={activeTab() === 'transkrip'}>
              <Show when={transkripData.loading}>
                <div class="text-center py-12 text-secondary-400">Memuat Transkrip...</div>
              </Show>

              <Show when={!transkripData.loading && transkripData()}>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-1 dark:bg-secondary-900 dark:border-secondary-800">
                      <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                        IPK Kumulatif (Transcript)
                      </span>
                      <span class="text-3xl font-extrabold text-brand-600">
                        {Number(transkripData()?.ipk || 0).toFixed(2)}
                      </span>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-1 dark:bg-secondary-900 dark:border-secondary-800">
                      <span class="text-xs font-semibold uppercase tracking-wider text-secondary-400">
                        Total SKS Lulus
                      </span>
                      <span class="text-3xl font-extrabold text-accent-600">{transkripData()?.totalSksLulus} SKS</span>
                    </div>
                  </div>

                  <div class="lg:col-span-3 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 overflow-x-auto dark:bg-secondary-900 dark:border-secondary-800">
                    <div class="flex justify-between items-center border-b pb-2">
                      <h3 class="font-bold text-secondary-800 dark:text-white">Transkrip Nilai Akademik Kumulatif</h3>
                      <button
                        onClick={() => setShowPrintTranskrip(true)}
                        class="px-3 py-1.5 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-100 dark:bg-brand-700 dark:hover:bg-brand-600"
                      >
                        🖨️ Cetak Transkrip
                      </button>
                    </div>

                    <table class="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                          <th class="p-3">Semester</th>
                          <th class="p-3">Kode MK</th>
                          <th class="p-3">Nama Mata Kuliah</th>
                          <th class="p-3">SKS</th>
                          <th class="p-3">Nilai Angka</th>
                          <th class="p-3">Nilai Huruf</th>
                          <th class="p-3">Nilai Indeks</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                        <For
                          each={transkripData()?.transkripList}
                          fallback={
                            <tr>
                              <td colspan="7" class="p-4 text-center text-secondary-400 italic">
                                Belum ada nilai akademik terdaftar dalam transkrip.
                              </td>
                            </tr>
                          }
                        >
                          {(item) => (
                            <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                              <td class="p-3 font-semibold text-secondary-500">{item.periodeId}</td>
                              <td class="p-3 whitespace-nowrap">{item.mataKuliah?.kode}</td>
                              <td class="p-3 font-bold text-secondary-800 dark:text-white">{item.mataKuliah?.nama}</td>
                              <td class="p-3">{item.mataKuliah?.sksTotal}</td>
                              <td class="p-3">{item.nilaiAngka || '-'}</td>
                              <td class="p-3">
                                <Show when={item.nilaiHuruf} fallback="-">
                                  <span
                                    class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      item.nilaiHuruf === 'A' || item.nilaiHuruf === 'B+' || item.nilaiHuruf === 'B'
                                        ? 'bg-accent-50 text-accent-600 border border-accent-100'
                                        : 'bg-accent-50 text-accent-600 border border-accent-100'
                                    }`}
                                  >
                                    {item.nilaiHuruf}
                                  </span>
                                </Show>
                              </td>
                              <td class="p-3">{item.nilaiIndeks || '-'}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>
            </Show>
          </Show>
        </Show>

        {/* PRINTABLE OVERLAY MODALS */}
        <Show when={showPrintUjian()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 print:shadow-none print:p-0 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-secondary-800 dark:text-white">Print Preview - Kartu Ujian</h3>
                <button onClick={() => setShowPrintUjian(false)} class="text-secondary-400 hover:text-secondary-600">
                  ❌
                </button>
              </div>

              <div class="flex flex-col gap-4 text-secondary-800" id="print-area-ujian">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-xl font-extrabold text-brand-700 tracking-wider">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-sm font-bold text-secondary-600 uppercase tracking-widest">
                    KARTU UJIAN MAHASISWA (UTS/UAS)
                  </h3>
                  <p class="text-xs text-secondary-400">Periode Akademik: {selectedPeriode()}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-secondary-600 mb-2">
                  <div>
                    <p>
                      NIM:{' '}
                      <span class="text-secondary-900 font-bold dark:text-white">{mhsProfile()?.nim || 'N/A'}</span>
                    </p>
                    <p>
                      Nama:{' '}
                      <span class="text-secondary-900 font-bold dark:text-white">{mhsProfile()?.nama || 'N/A'}</span>
                    </p>
                  </div>
                  <div class="text-right">
                    <p>
                      Bimbingan PA:{' '}
                      <span
                        class={`font-bold ${eligibilityData()?.bimbingan?.eligible ? 'text-accent-600' : 'text-rose-600'}`}
                      >
                        {eligibilityData()?.bimbingan?.eligible ? 'TERPENUHI' : 'BELUM TERPENUHI'}
                      </span>
                    </p>
                  </div>
                </div>

                <table class="w-full text-left text-xs border border-secondary-200 border-collapse dark:border-secondary-700">
                  <thead>
                    <tr class="bg-secondary-50 text-secondary-500 dark:text-secondary-200 font-bold uppercase border-b border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700">
                      <th class="p-2 border-r">Kode</th>
                      <th class="p-2 border-r">Mata Kuliah</th>
                      <th class="p-2 border-r text-center">Kehadiran</th>
                      <th class="p-2 text-center">Status Kelayakan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-200 font-medium text-secondary-700 dark:text-secondary-200">
                    <For
                      each={eligibilityData()?.classes}
                      fallback={
                        <tr>
                          <td colspan="4" class="p-4 text-center text-secondary-400 italic">
                            Memuat data kelayakan ujian...
                          </td>
                        </tr>
                      }
                    >
                      {(c) => (
                        <tr>
                          <td class="p-2 border-r">{c.mataKuliahKode}</td>
                          <td class="p-2 border-r font-bold text-secondary-800 dark:text-white">
                            {c.mataKuliahNama} ({c.namaKelas})
                          </td>
                          <td class="p-2 border-r text-center">
                            {c.attendanceRate}% ({c.presentMeetings}/{c.totalMeetings})
                          </td>
                          <td class="p-2 text-center">
                            <span
                              class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.eligible
                                  ? 'bg-accent-50 text-accent-600 border border-accent-100'
                                  : 'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}
                            >
                              {c.eligible ? 'LAYAK' : 'TIDAK LAYAK'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-3 mt-4 border-t pt-4 print:hidden">
                <button
                  onClick={() => setShowPrintUjian(false)}
                  class="px-4 py-2 border rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 active:scale-95 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showPrintKhs()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 print:shadow-none print:p-0 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-secondary-800 dark:text-white">Print Preview - KHS</h3>
                <button onClick={() => setShowPrintKhs(false)} class="text-secondary-400 hover:text-secondary-600">
                  ❌
                </button>
              </div>

              <div class="flex flex-col gap-4 text-secondary-800" id="print-area-khs">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-xl font-extrabold text-brand-700 tracking-wider">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-sm font-bold text-secondary-600 uppercase tracking-widest">
                    KARTU HASIL STUDI (KHS) SEMESTER
                  </h3>
                  <p class="text-xs text-secondary-400">Periode Akademik: {selectedPeriode()}</p>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-secondary-600 mb-2">
                  <div>
                    <p>
                      NIM:{' '}
                      <span class="text-secondary-900 font-bold dark:text-white">{mhsProfile()?.nim || 'N/A'}</span>
                    </p>
                    <p>
                      Nama: <span class="font-bold dark:text-white">{mhsProfile()?.nama || 'N/A'}</span>
                    </p>
                  </div>
                  <div class="text-right">
                    <p>
                      IP Semester:{' '}
                      <span class="font-extrabold text-brand-600 dark:text-white">
                        {khsData()?.summary?.ipSemester?.toFixed(2)}
                      </span>
                    </p>
                    <p>
                      SKS Terkontrak: <span class="font-bold dark:text-white">{khsData()?.summary?.totalSks} SKS</span>
                    </p>
                  </div>
                </div>

                <table class="w-full text-left text-xs border border-secondary-200 border-collapse dark:border-secondary-700">
                  <thead>
                    <tr class="bg-secondary-50 text-secondary-500 dark:text-secondary-200 font-bold uppercase border-b border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700">
                      <th class="p-2 border-r">Kode MK</th>
                      <th class="p-2 border-r">Nama Mata Kuliah</th>
                      <th class="p-2 border-r text-center">SKS</th>
                      <th class="p-2 border-r text-center">Nilai Angka</th>
                      <th class="p-2 border-r text-center">Nilai Huruf</th>
                      <th class="p-2 text-center">Nilai Indeks</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-200 font-medium text-secondary-700 dark:text-secondary-200">
                    <For each={khsData()?.krsList}>
                      {(item) => (
                        <tr>
                          <td class="p-2 border-r">{item.mataKuliah?.kode}</td>
                          <td class="p-2 border-r font-bold text-secondary-800 dark:text-white">
                            {item.mataKuliah?.nama}
                          </td>
                          <td class="p-2 border-r text-center">{item.mataKuliah?.sksTotal}</td>
                          <td class="p-2 border-r text-center">{item.nilaiAngka || '-'}</td>
                          <td class="p-2 border-r text-center">{item.nilaiHuruf || '-'}</td>
                          <td class="p-2 text-center">{item.nilaiIndeks || '-'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-3 mt-4 border-t pt-4 print:hidden">
                <button
                  onClick={() => setShowPrintKhs(false)}
                  class="px-4 py-2 border rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 active:scale-95 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={showPrintTranskrip()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-0">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 print:shadow-none print:p-0 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2 print:hidden">
                <h3 class="font-bold text-secondary-800 dark:text-white">Print Preview - Transkrip Akademik</h3>
                <button
                  onClick={() => setShowPrintTranskrip(false)}
                  class="text-secondary-400 hover:text-secondary-600"
                >
                  ❌
                </button>
              </div>

              <div class="flex flex-col gap-4 text-secondary-800" id="print-area-transkrip">
                <div class="text-center border-b pb-3 flex flex-col gap-1">
                  <h2 class="text-xl font-extrabold text-brand-700 tracking-wider">POLITEKNIK SOROWAKO</h2>
                  <h3 class="text-sm font-bold text-secondary-600 uppercase tracking-widest">
                    TRANSKRIP NILAI AKADEMIK KUMULATIF
                  </h3>
                </div>

                <div class="grid grid-cols-2 gap-4 text-xs font-semibold text-secondary-600 mb-2">
                  <div>
                    <p>
                      NIM:{' '}
                      <span class="text-secondary-900 font-bold dark:text-white">{mhsProfile()?.nim || 'N/A'}</span>
                    </p>
                    <p>
                      Nama:{' '}
                      <span class="text-secondary-900 font-bold dark:text-white">{mhsProfile()?.nama || 'N/A'}</span>
                    </p>
                  </div>
                  <div class="text-right">
                    <p>
                      IPK Kumulatif:{' '}
                      <span class="font-extrabold text-brand-600 dark:text-white">
                        {transkripData()?.ipk?.toFixed(2)}
                      </span>
                    </p>
                    <p>
                      Total SKS Lulus:{' '}
                      <span class="text-secondary-900 font-bold dark:text-white">
                        {transkripData()?.totalSksLulus} SKS
                      </span>
                    </p>
                  </div>
                </div>

                <table class="w-full text-left text-xs border border-secondary-200 border-collapse dark:border-secondary-700">
                  <thead>
                    <tr class="bg-secondary-50 text-secondary-500 dark:text-secondary-200 font-bold uppercase border-b border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700">
                      <th class="p-2 border-r">Semester</th>
                      <th class="p-2 border-r">Kode MK</th>
                      <th class="p-2 border-r">Nama Mata Kuliah</th>
                      <th class="p-2 border-r text-center">SKS</th>
                      <th class="p-2 border-r text-center">Nilai Angka</th>
                      <th class="p-2 border-r text-center">Nilai Huruf</th>
                      <th class="p-2 text-center">Nilai Indeks</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-200 font-medium text-secondary-700 dark:text-secondary-200">
                    <For each={transkripData()?.transkripList}>
                      {(item) => (
                        <tr>
                          <td class="p-2 border-r">{item.periodeId}</td>
                          <td class="p-2 border-r">{item.mataKuliah?.kode}</td>
                          <td class="p-2 border-r font-bold text-secondary-800 dark:text-white">
                            {item.mataKuliah?.nama}
                          </td>
                          <td class="p-2 border-r text-center">{item.mataKuliah?.sksTotal}</td>
                          <td class="p-2 border-r text-center">{item.nilaiAngka || '-'}</td>
                          <td class="p-2 border-r text-center">{item.nilaiHuruf || '-'}</td>
                          <td class="p-2 text-center">{item.nilaiIndeks || '-'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end gap-3 mt-4 border-t pt-4 print:hidden">
                <button
                  onClick={() => setShowPrintTranskrip(false)}
                  class="px-4 py-2 border rounded-xl text-xs font-bold text-secondary-600 hover:bg-secondary-50 active:scale-95 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  class="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  🖨️ Cetak Sekarang
                </button>
              </div>
            </div>
          </div>
        </Show>
        {/* --- ADMIN KONVERSI NILAI MODAL --- */}
        <Show when={showKonversiModal()}>
          <div class="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 dark:bg-secondary-900">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 text-sm dark:text-white">
                  {konversiId() ? 'Edit Aturan Konversi Nilai' : 'Tambah Aturan Konversi Nilai'}
                </h3>
                <button onClick={() => setShowKonversiModal(false)} class="text-secondary-400 hover:text-secondary-600">
                  ❌
                </button>
              </div>

              <form onSubmit={handleSaveKonversi} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">
                    Program Studi (Pilih jika aturan khusus prodi)
                  </label>
                  <select
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 bg-white font-medium dark:border-secondary-700 dark:text-white dark:bg-secondary-900"
                    value={konversiProdiId()}
                    onChange={(e) => setKonversiProdiId(e.currentTarget.value)}
                  >
                    <option value="">-- Aturan Global (Semua Prodi) --</option>
                    <For each={prodis()}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
                  </select>
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Nilai Huruf</label>
                  <input
                    type="text"
                    placeholder="Contoh: A, B+, C"
                    value={nilaiHuruf()}
                    onInput={(e) => setNilaiHuruf(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Nilai Indeks (Bobot)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="4.00"
                    placeholder="Contoh: 4.00"
                    value={nilaiIndeks()}
                    onInput={(e) => setNilaiIndeks(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Nilai Minimum Angka</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="100.00"
                    placeholder="Contoh: 80.00"
                    value={nilaiMin()}
                    onInput={(e) => setNilaiMin(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Nilai Maksimum Angka</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="100.00"
                    placeholder="Contoh: 100.00"
                    value={nilaiMax()}
                    onInput={(e) => setNilaiMax(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-bold text-secondary-700">Predikat</label>
                  <input
                    type="text"
                    placeholder="Contoh: Istimewa, Amat Baik"
                    value={predikat()}
                    onInput={(e) => setPredikat(e.currentTarget.value)}
                    class="border border-secondary-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  class="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                >
                  Simpan Aturan Konversi
                </button>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
