import { createSignal, createResource, Show, For, createEffect } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { khsController } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';

export default function Khs() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const role = () => user()?.role;

  const [activeTab, setActiveTab] = createSignal<'khs' | 'transkrip' | 'input-nilai'>('khs');
  const [selectedPeriode, setSelectedPeriode] = createSignal('20231'); // Default Active Period

  // For Admin / Dosen view
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [searchNim, setSearchNim] = createSignal('');

  // Lecturer Input Nilai States
  const [selectedKelasId, setSelectedKelasId] = createSignal<number | null>(null);
  const [editableComponents, setEditableComponents] = createSignal<Array<{ name: string; bobot: number }>>([]);
  const [inputGrades, setInputGrades] = createSignal<Record<string, number>>({});

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
    }
  );

  // Search Mahasiswa (Admin/Dosen only)
  const [searchedStudents] = createResource(
    searchNim,
    async (nim) => {
      if (!nim) return [];
      const res = await mahasiswaController.getAll(nim, 1, 10);
      return res.data;
    }
  );

  // Load all Kelas Kuliah for Lecturer/Admin
  const [classes] = createResource(
    () => {
      if (role() !== 'mahasiswa') return true;
      return null;
    },
    async () => {
      try {
        const res = await kelasKuliahController.getAll(undefined, 1, 100);
        return res.data;
      } catch (e) {
        return [];
      }
    }
  );

  // Load components for selected class
  const [components, { refetch: refetchComponents }] = createResource(
    selectedKelasId,
    async (kelasId) => {
      if (!kelasId) return [];
      try {
        return await khsController.getKomponen(kelasId);
      } catch (e) {
        return [];
      }
    }
  );

  // Load students and their grades for selected class
  const [studentsGrades, { refetch: refetchStudentsGrades }] = createResource(
    selectedKelasId,
    async (kelasId) => {
      if (!kelasId) return [];
      try {
        return await khsController.getNilaiMahasiswa(kelasId);
      } catch (e) {
        return [];
      }
    }
  );

  // Sync components to editable list
  createEffect(() => {
    const list = components();
    if (list && list.length > 0) {
      setEditableComponents(list.map(c => ({ name: c.nama, bobot: c.bobot })));
    } else {
      setEditableComponents([]);
    }
  });

  // Sync student grades to input states
  createEffect(() => {
    const sg = studentsGrades();
    if (sg) {
      const initial: Record<string, number> = {};
      for (const stud of sg) {
        for (const val of stud.nilaiKomponen) {
          initial[`${stud.krsId}_${val.komponenNilaiId}`] = parseFloat(val.nilai) || 0;
        }
      }
      setInputGrades(initial);
    }
  });

  // Helper to add component
  const addComponent = () => {
    setEditableComponents(prev => [...prev, { name: '', bobot: 0 }]);
  };

  // Helper to remove component
  const removeComponent = (index: number) => {
    setEditableComponents(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to update component fields
  const updateComponentField = (index: number, field: 'name' | 'bobot', value: any) => {
    setEditableComponents(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          [field]: field === 'bobot' ? Number(value) : value
        };
      }
      return item;
    }));
  };

  // Save component list to backend
  const handleSaveComponents = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) {
      toast.showToast('Silakan pilih kelas kuliah terlebih dahulu.', 'error');
      return;
    }

    const list = editableComponents();
    const totalBobot = list.reduce((sum, item) => sum + item.bobot, 0);
    if (totalBobot !== 100) {
      toast.showToast('Total bobot komponen nilai harus tepat 100%.', 'error');
      return;
    }

    for (const comp of list) {
      if (!comp.name.trim()) {
        toast.showToast('Nama komponen tidak boleh kosong.', 'error');
        return;
      }
    }

    try {
      await khsController.saveKomponen(kelasId, list);
      toast.showToast('Komponen nilai berhasil disimpan.', 'success');
      refetchComponents();
      refetchStudentsGrades();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan komponen.', 'error');
    }
  };

  // Handle student grade change
  const handleGradeChange = (krsId: number, komponenNilaiId: number, value: number) => {
    setInputGrades(prev => ({
      ...prev,
      [`${krsId}_${komponenNilaiId}`]: value
    }));
  };

  // Save all student grades
  const handleSaveGrades = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    const list = studentsGrades();
    const comps = components();
    if (!list || !comps) return;

    const payload = list.map(stud => {
      const nilaiKomponenList = comps.map(c => {
        const val = inputGrades()[`${stud.krsId}_${c.id}`];
        return {
          komponenNilaiId: c.id!,
          nilai: val !== undefined ? Number(val) : 0
        };
      });
      return {
        krsId: stud.krsId,
        nilaiKomponenList
      };
    });

    try {
      await khsController.saveNilaiMahasiswa(kelasId, payload);
      toast.showToast('Nilai mahasiswa berhasil disimpan.', 'success');
      refetchStudentsGrades();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan nilai.', 'error');
    }
  };

  const [khsData, { refetch: refetchKhs }] = createResource(
    () => {
      const mId = selectedMhsId();
      const pId = selectedPeriode();
      if (!mId) return null;
      return { mhsId: mId, periodeId: pId };
    },
    async ({ mhsId, periodeId }) => {
      return await khsController.getByMhsIdAndPeriode(mhsId, periodeId);
    }
  );

  // Load Transkrip
  const [transkripData, { refetch: refetchTranskrip }] = createResource(
    selectedMhsId,
    async (mhsId) => {
      if (!mhsId) return null;
      return await khsController.getTranskrip(mhsId);
    }
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800 tracking-tight">Hasil Studi Akademik</h1>
            <p class="text-sm text-gray-500">Kartu Hasil Studi (KHS) dan Transkrip Nilai Akademik Mahasiswa</p>
          </div>
          
          <div class="flex gap-2">
            <button
              onClick={() => setActiveTab('khs')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'khs' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              KHS Semester
            </button>
            <button
              onClick={() => setActiveTab('transkrip')}
              class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'transkrip' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Transkrip Nilai
            </button>
            <Show when={role() !== 'mahasiswa'}>
              <button
                onClick={() => setActiveTab('input-nilai')}
                class={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab() === 'input-nilai' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ✏️ Input Nilai Kelas
              </button>
            </Show>
          </div>
        </div>

        {/* Admin/Dosen Student Selector */}
        <Show when={role() !== 'mahasiswa' && activeTab() !== 'input-nilai'}>
          <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <h3 class="font-bold text-gray-700 text-sm">Pilih Mahasiswa & Periode</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500">Cari NIM / Nama</label>
                <input
                  type="text"
                  placeholder="Masukkan NIM atau Nama..."
                  value={searchNim()}
                  onInput={(e) => setSearchNim(e.currentTarget.value)}
                  class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-500">Pilih dari Hasil Pencarian</label>
                <select
                  onChange={(e) => {
                    const id = parseInt(e.currentTarget.value);
                    setSelectedMhsId(id || null);
                  }}
                  class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500"
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
                  <label class="text-xs font-semibold text-gray-500">Pilih Periode</label>
                  <select
                    value={selectedPeriode()}
                    onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
                    class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="20231">Ganjil 2023/2024</option>
                    <option value="20232">Genap 2023/2024</option>
                  </select>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        {/* Student Period Selector */}
        <Show when={role() === 'mahasiswa' && activeTab() === 'khs'}>
          <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <span class="text-sm font-bold text-gray-700">Periode Akademik:</span>
            <select
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
              class="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
            >
              <option value="20231">Ganjil 2023/2024</option>
              <option value="20232">Genap 2023/2024</option>
            </select>
          </div>
        </Show>

        {/* Lecturer / Admin Grade Input Tab */}
        <Show when={activeTab() === 'input-nilai'}>
          <div class="flex flex-col gap-6">
            {/* Class Selection Card */}
            <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <h3 class="font-bold text-gray-700 text-sm">Pilih Kelas Kuliah</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="text-xs font-semibold text-gray-500">Kelas Kuliah</label>
                  <select
                    onChange={(e) => {
                      const id = e.currentTarget.value ? parseInt(e.currentTarget.value) : null;
                      setSelectedKelasId(id);
                    }}
                    class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kelas Kuliah --</option>
                    <For each={classes()}>
                      {(item) => (
                        <option value={item.id} selected={selectedKelasId() === item.id}>
                          {item.periodeId} - {item.mataKuliah?.nama} ({item.namaKelas})
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>
            </div>

            <Show when={selectedKelasId()} fallback={
              <div class="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center text-gray-400">
                Silakan pilih kelas kuliah terlebih dahulu untuk mengelola komponen dan nilai.
              </div>
            }>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left side: Component Weights Management */}
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4">
                  <h3 class="font-bold text-gray-800 border-b pb-2">Komposisi Bobot Nilai (%)</h3>
                  <div class="flex flex-col gap-3">
                    <For each={editableComponents()}>
                      {(comp, idx) => (
                        <div class="flex items-center gap-2 border-b pb-2">
                          <input
                            type="text"
                            placeholder="Nama Komponen"
                            value={comp.name}
                            onInput={(e) => updateComponentField(idx(), 'name', e.currentTarget.value)}
                            class="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none"
                          />
                          <input
                            type="number"
                            placeholder="Bobot"
                            value={comp.bobot}
                            onInput={(e) => updateComponentField(idx(), 'bobot', e.currentTarget.value)}
                            class="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs w-16 focus:outline-none"
                          />
                          <span class="text-xs text-gray-400 font-bold">%</span>
                          <button
                            onClick={() => removeComponent(idx())}
                            class="text-rose-500 hover:text-rose-700 text-xs p-1"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </For>

                    <div class="flex justify-between items-center mt-2">
                      <button
                        onClick={addComponent}
                        class="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1"
                      >
                        ➕ Tambah Komponen
                      </button>
                      <span class="text-xs font-bold text-gray-600">
                        Total: {editableComponents().reduce((sum, item) => sum + item.bobot, 0)}%
                      </span>
                    </div>

                    <button
                      onClick={handleSaveComponents}
                      class="mt-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-100"
                    >
                      Simpan Bobot Komponen
                    </button>
                  </div>
                </div>

                {/* Right side: Student Grades Table */}
                <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 overflow-x-auto">
                  <div class="flex justify-between items-center border-b pb-2">
                    <h3 class="font-bold text-gray-800">Daftar Mahasiswa & Pengisian Nilai</h3>
                    <Show when={components() && components().length > 0}>
                      <button
                        onClick={handleSaveGrades}
                        class="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                      >
                        Simpan Semua Nilai
                      </button>
                    </Show>
                  </div>

                  <Show when={components() && components().length > 0} fallback={
                    <div class="text-center py-12 text-gray-400 italic">
                      Harap tentukan dan simpan komponen bobot nilai (kiri) terlebih dahulu sebelum menginput nilai mahasiswa.
                    </div>
                  }>
                    <table class="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                          <th class="p-3">Mahasiswa</th>
                          <For each={components()}>
                            {(c) => <th class="p-3 text-center">{c.nama} ({c.bobot}%)</th>}
                          </For>
                          <th class="p-3 text-center">Nilai Akhir</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                        <For each={studentsGrades()} fallback={
                          <tr>
                            <td colspan={components().length + 2} class="p-4 text-center text-gray-400 italic">
                              Tidak ada mahasiswa terdaftar di kelas ini.
                            </td>
                          </tr>
                        }>
                          {(stud) => (
                            <tr class="hover:bg-gray-50/20">
                              <td class="p-3">
                                <div class="flex flex-col">
                                  <span class="font-bold text-gray-800">{stud.nama}</span>
                                  <span class="text-[10px] text-gray-400">NIM: {stud.nim}</span>
                                </div>
                              </td>
                              <For each={components()}>
                                {(c) => (
                                  <td class="p-3 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="0"
                                      value={inputGrades()[`${stud.krsId}_${c.id}`] || ''}
                                      onInput={(e) => handleGradeChange(stud.krsId, c.id!, parseFloat(e.currentTarget.value) || 0)}
                                      class="border border-gray-200 rounded-lg px-2 py-1 text-xs w-16 text-center focus:outline-none focus:border-blue-500"
                                    />
                                  </td>
                                )}
                              </For>
                              <td class="p-3 text-center font-extrabold text-gray-800">
                                <Show when={stud.nilaiAngka} fallback="-">
                                  {stud.nilaiAngka} ({stud.nilaiHuruf})
                                </Show>
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Show>

        {/* Content Area */}
        <Show when={activeTab() !== 'input-nilai'}>
          <Show when={selectedMhsId()} fallback={
            <div class="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center text-gray-400">
              Silakan cari dan pilih mahasiswa terlebih dahulu untuk menampilkan data akademik.
            </div>
          }>
            <Show when={activeTab() === 'khs'}>
              <Show when={khsData.loading}>
                <div class="text-center py-12 text-gray-400">Memuat data KHS...</div>
              </Show>

              <Show when={!khsData.loading && khsData()}>
                <Show
                  when={khsData()?.blocked}
                  fallback={
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Summary Cards */}
                      <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">IP Semester</span>
                          <span class="text-3xl font-extrabold text-blue-600">{khsData()?.summary?.ipSemester?.toFixed(2)}</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">IPK Kumulatif</span>
                          <span class="text-3xl font-extrabold text-indigo-600">{khsData()?.summary?.ipk?.toFixed(2)}</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">SKS Terkontrak</span>
                          <span class="text-3xl font-extrabold text-gray-800">{khsData()?.summary?.totalSks} SKS</span>
                        </div>
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">SKS Kumulatif</span>
                          <span class="text-3xl font-extrabold text-gray-800">{khsData()?.summary?.totalSksKumulatif} SKS</span>
                        </div>
                      </div>

                      {/* KHS Table */}
                      <div class="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 overflow-x-auto">
                        <h3 class="font-bold text-gray-800 border-b pb-2">Rincian Mata Kuliah & Nilai</h3>
                        <table class="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                              <th class="p-3">Kode MK</th>
                              <th class="p-3">Nama Mata Kuliah</th>
                              <th class="p-3">SKS</th>
                              <th class="p-3">Nilai Angka</th>
                              <th class="p-3">Nilai Huruf</th>
                              <th class="p-3">Nilai Indeks</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                            <For each={khsData()?.krsList} fallback={
                              <tr>
                                <td colspan="6" class="p-4 text-center text-gray-400 italic">Nilai belum dimasukkan atau belum disetujui Dosen PA.</td>
                              </tr>
                            }>
                              {(item) => (
                                <tr class="hover:bg-gray-50/20">
                                  <td class="p-3 whitespace-nowrap">{item.mataKuliah?.kode}</td>
                                  <td class="p-3 font-bold text-gray-800">{item.mataKuliah?.nama}</td>
                                  <td class="p-3">{item.mataKuliah?.sksTotal}</td>
                                  <td class="p-3">{item.nilaiAngka || '-'}</td>
                                  <td class="p-3">
                                    <Show when={item.nilaiHuruf} fallback="-">
                                      <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.nilaiHuruf === 'A' || item.nilaiHuruf === 'B+' || item.nilaiHuruf === 'B'
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                          : item.nilaiHuruf === 'C+' || item.nilaiHuruf === 'C'
                                          ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                                      }`}>
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
                      Sesuai dengan ketentuan Buku Panduan Akademik, Anda harus melunasi seluruh kewajiban administrasi sebelum dapat mengakses nilai akhir KHS.
                    </p>
                    <div class="bg-white border border-rose-100 rounded-xl p-4 w-full text-left flex flex-col gap-1.5 shadow-sm">
                      <span class="text-xs uppercase font-extrabold tracking-wider text-rose-500">Penyebab Blokir:</span>
                      <p class="text-xs font-bold text-gray-700">{khsData()?.reason}</p>
                      <p class="text-xs text-gray-500 font-medium">{khsData()?.detail}</p>
                    </div>
                    <p class="text-xs text-rose-600 font-bold mt-2">Silakan hubungi Bagian Keuangan atau BAAK untuk melakukan penyelesaian tanggungan.</p>
                  </div>
                </Show>
              </Show>
            </Show>

            <Show when={activeTab() === 'transkrip'}>
              <Show when={transkripData.loading}>
                <div class="text-center py-12 text-gray-400">Memuat Transkrip...</div>
              </Show>

              <Show when={!transkripData.loading && transkripData()}>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">IPK Kumulatif (Transcript)</span>
                      <span class="text-3xl font-extrabold text-blue-600">{transkripData()?.summary?.ipk?.toFixed(2)}</span>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                      <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">Total SKS Lulus</span>
                      <span class="text-3xl font-extrabold text-indigo-600">{transkripData()?.summary?.totalSks} SKS</span>
                    </div>
                  </div>

                  <div class="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 overflow-x-auto">
                    <h3 class="font-bold text-gray-800 border-b pb-2">Transkrip Nilai Akademik Kumulatif</h3>
                    <table class="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr class="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase tracking-wider font-bold">
                          <th class="p-3">Semester</th>
                          <th class="p-3">Kode MK</th>
                          <th class="p-3">Nama Mata Kuliah</th>
                          <th class="p-3">SKS</th>
                          <th class="p-3">Nilai Angka</th>
                          <th class="p-3">Nilai Huruf</th>
                          <th class="p-3">Nilai Indeks</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-50 text-gray-600 font-medium">
                        <For each={transkripData()?.transkripList} fallback={
                          <tr>
                            <td colspan="7" class="p-4 text-center text-gray-400 italic">Belum ada nilai akademik terdaftar dalam transkrip.</td>
                          </tr>
                        }>
                          {(item) => (
                            <tr class="hover:bg-gray-50/20">
                              <td class="p-3 font-semibold text-gray-500">{item.periodeId}</td>
                              <td class="p-3 whitespace-nowrap">{item.mataKuliah?.kode}</td>
                              <td class="p-3 font-bold text-gray-800">{item.mataKuliah?.nama}</td>
                              <td class="p-3">{item.mataKuliah?.sksTotal}</td>
                              <td class="p-3">{item.nilaiAngka || '-'}</td>
                              <td class="p-3">
                                <Show when={item.nilaiHuruf} fallback="-">
                                  <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.nilaiHuruf === 'A' || item.nilaiHuruf === 'B+' || item.nilaiHuruf === 'B'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                                  }`}>
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
      </div>
    </MainLayout>
  );
}
