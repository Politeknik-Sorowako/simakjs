import { createEffect, createResource, createSignal, For, Index, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { khsController } from '../controllers/khsController';
import { rpsController } from '../controllers/rpsController';

export default function InputNilai() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const role = () => user()?.role;

  // Selected State
  const [selectedKelasId, setSelectedKelasId] = createSignal<number | null>(null);
  const [editableComponents, setEditableComponents] = createSignal<Array<{ name: string; bobot: number }>>([]);
  const [inputGrades, setInputGrades] = createSignal<Record<string, string>>({});

  // 1. Load all Kelas Kuliah for Lecturer/Admin
  const [classes, { refetch: refetchClasses }] = createResource(
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
    },
  );

  // 2. Load components for selected class
  const [components, { refetch: refetchComponents }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await khsController.getKomponen(kelasId);
    } catch (e) {
      return [];
    }
  });

  // 3. Load students and their grades for selected class
  const [studentsGrades, { refetch: refetchStudentsGrades }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await khsController.getNilaiMahasiswa(kelasId);
    } catch (e) {
      return [];
    }
  });

  const selectedClassDetails = () => classes()?.find((c) => c.id === selectedKelasId()) || null;
  const isClassLocked = () => selectedClassDetails()?.isLocked || false;
  const selectedProdiId = () => selectedClassDetails()?.mataKuliah?.programStudiId || null;

  const [konversiRules] = createResource(
    () => ({ prodiId: selectedProdiId() }),
    async ({ prodiId }) => {
      try {
        const rules = await khsController.getAllKonversi();
        const prodiRules = rules.filter((r) => r.programStudiId === prodiId);
        return prodiRules.length > 0 ? prodiRules : rules.filter((r) => r.programStudiId === null);
      } catch (e) {
        return [];
      }
    },
  );

  const isRulesMissing = () => selectedKelasId() && konversiRules() && konversiRules().length === 0;

  // 4. Load RPS Rencana Evaluasi for the selected class's Mata Kuliah
  const [rencanaEvals] = createResource(
    () => {
      const kelas = selectedClassDetails();
      return kelas ? kelas.mataKuliahId : null;
    },
    async (mkId) => {
      if (!mkId) return [];
      try {
        return await rpsController.getRencanaEvaluasi(mkId);
      } catch (e) {
        return [];
      }
    },
  );

  // Sync components to editable list
  createEffect(() => {
    const list = components();
    if (list && list.length > 0) {
      setEditableComponents(list.map((c) => ({ name: c.nama, bobot: c.bobot })));
    } else {
      setEditableComponents([]);
    }
  });

  // Sync student grades to input states
  createEffect(() => {
    const sg = studentsGrades();
    if (sg) {
      const initial: Record<string, string> = {};
      for (const stud of sg) {
        if (stud.nilaiKomponen) {
          for (const val of stud.nilaiKomponen) {
            initial[`${stud.krsId}_${val.komponenNilaiId}`] =
              val.nilai !== undefined && val.nilai !== null ? val.nilai.toString() : '';
          }
        }
      }
      setInputGrades(initial);
    }
  });

  // Helper to add component
  const addComponent = () => {
    setEditableComponents((prev) => [...prev, { name: '', bobot: 0 }]);
  };

  // Helper to remove component
  const removeComponent = (index: number) => {
    setEditableComponents((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to update component fields
  const updateComponentField = (index: number, field: 'name' | 'bobot', value: any) => {
    setEditableComponents((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            [field]: field === 'bobot' ? Number(value) : value,
          };
        }
        return item;
      }),
    );
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
      await khsController.saveKomponen(
        kelasId,
        list.map((c) => ({ nama: c.name, bobot: c.bobot })),
      );
      toast.showToast('Komponen nilai berhasil disimpan.', 'success');
      refetchComponents();
      refetchStudentsGrades();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menyimpan komponen.', 'error');
    }
  };

  // Import weights from RPS Rencana Evaluasi
  const handleImportFromRps = () => {
    const list = rencanaEvals();
    if (list && list.length > 0) {
      const totalRpsBobot = list.reduce((sum, item) => sum + Number(item.bobotEvaluasi), 0);
      setEditableComponents(
        list.map((item) => ({
          name: item.namaEvaluasi,
          bobot: Number(item.bobotEvaluasi),
        })),
      );
      toast.showToast(
        `Berhasil mengimpor ${list.length} komponen dari RPS (Total Bobot: ${totalRpsBobot}%).`,
        'success',
      );
    } else {
      toast.showToast('Tidak ada rencana evaluasi di RPS untuk mata kuliah ini.', 'warning');
    }
  };

  // Handle student grade change
  const handleGradeChange = (krsId: number, komponenNilaiId: number, value: string) => {
    // Only allow numbers, dot, and comma
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setInputGrades((prev) => ({
      ...prev,
      [`${krsId}_${komponenNilaiId}`]: sanitized,
    }));
  };

  const getDynamicFinalGrade = (stud: any) => {
    const list = components();
    if (!list || list.length === 0) return null;

    let totalScore = 0;
    let totalBobot = 0;
    for (const c of list) {
      const val = inputGrades()[`${stud.krsId}_${c.id}`];
      const cleanedVal = val ? val.replace(',', '.') : '';
      const grade = cleanedVal !== '' && !isNaN(Number(cleanedVal)) ? Number(cleanedVal) : 0;
      totalScore += grade * (c.bobot / 100);
      totalBobot += c.bobot;
    }

    if (totalBobot !== 100) return null;

    const finalScore = parseFloat(totalScore.toFixed(2));

    let huruf = 'E';
    const rules = konversiRules();
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const min = parseFloat(rule.nilaiMin.toString());
        const max = parseFloat(rule.nilaiMax.toString());
        if (finalScore >= min && finalScore <= max) {
          huruf = rule.nilaiHuruf;
          break;
        }
      }
    } else {
      if (finalScore >= 80) huruf = 'A';
      else if (finalScore >= 75) huruf = 'B+';
      else if (finalScore >= 70) huruf = 'B';
      else if (finalScore >= 65) huruf = 'C+';
      else if (finalScore >= 60) huruf = 'C';
      else if (finalScore >= 50) huruf = 'D';
    }

    return {
      score: finalScore,
      huruf,
    };
  };

  // Save all student grades
  const handleSaveGrades = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    const list = studentsGrades();
    const comps = components();
    if (!list || !comps) return;

    const payload = list.map((stud) => {
      const nilaiKomponenList = comps.map((c) => {
        const val = inputGrades()[`${stud.krsId}_${c.id}`];
        const cleanedVal = val ? val.replace(',', '.') : '';
        return {
          komponenNilaiId: c.id!,
          nilai: cleanedVal !== '' && !isNaN(Number(cleanedVal)) ? Number(cleanedVal) : 0,
        };
      });
      return {
        krsId: stud.krsId,
        nilaiKomponenList,
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

  const handleLockKelas = async () => {
    const id = selectedKelasId();
    if (!id) return;
    if (
      !confirm(
        'Apakah Anda yakin ingin mengunci nilai kelas ini? Setelah dikunci, komponen dan nilai tidak dapat diubah kembali.',
      )
    )
      return;

    try {
      await khsController.lockKelas(id);
      toast.showToast('Nilai kelas berhasil dikunci!', 'success');
      refetchStudentsGrades();
      refetchClasses();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal mengunci kelas.', 'error');
    }
  };

  const handleUnlockKelas = async () => {
    const id = selectedKelasId();
    if (!id) return;
    if (
      !confirm(
        'Apakah Anda yakin ingin membuka kunci nilai kelas ini? Setelah dibuka, komponen dan nilai dapat diubah kembali.',
      )
    )
      return;

    try {
      await khsController.unlockKelas(id);
      toast.showToast('Kunci nilai kelas berhasil dibuka!', 'success');
      refetchStudentsGrades();
      refetchClasses();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal membuka kunci kelas.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">Input Nilai Kelas</h1>
          <p class="text-sm text-secondary-500">
            Kelola komposisi komponen nilai dan input nilai mahasiswa per kelas kuliah
          </p>
        </div>

        {/* Class Selection Card */}
        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <h3 class="font-bold text-secondary-700 text-sm">Pilih Kelas Kuliah</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold text-secondary-500">Kelas Kuliah</label>
              <select
                onChange={(e) => {
                  const id = e.currentTarget.value ? parseInt(e.currentTarget.value) : null;
                  setSelectedKelasId(id);
                }}
                class="border border-secondary-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
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

        <Show when={isRulesMissing()}>
          <div class="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-2xl text-xs font-semibold flex flex-col gap-1.5 shadow-sm dark:bg-rose-900/30 dark:text-rose-400">
            <span class="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
              ⚠️ Peringatan: Aturan Konversi Belum Ditetapkan
            </span>
            <span>
              Aturan konversi nilai belum ditetapkan untuk program studi ini atau secara global. Silakan hubungi Admin
              untuk menetapkan aturan konversi di tab Aturan Konversi (halaman KHS) terlebih dahulu agar penginputan
              nilai dapat diproses dengan benar.
            </span>
          </div>
        </Show>

        <Show
          when={selectedKelasId()}
          fallback={
            <div class="bg-white p-12 rounded-2xl border border-secondary-100 shadow-sm text-center text-secondary-400 dark:bg-secondary-900 dark:border-secondary-800">
              Silakan pilih kelas kuliah terlebih dahulu untuk mengelola komponen dan nilai.
            </div>
          }
        >
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: Component Weights Management */}
            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 h-fit dark:bg-secondary-900 dark:border-secondary-800">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 dark:text-white">Komposisi Bobot Nilai (%)</h3>
                <Show when={isClassLocked()}>
                  <span class="px-2.5 py-1 bg-accent-50 text-accent-700 border border-accent-200 text-[10px] font-bold rounded-lg flex items-center gap-1 dark:bg-accent-900/30 dark:text-accent-400">
                    🔒 Dikunci
                  </span>
                </Show>
              </div>

              <div class="flex flex-col gap-3">
                {/* We use Index instead of For to preserve focus when elements update */}
                <Index each={editableComponents()}>
                  {(comp, idx) => (
                    <div class="flex items-center gap-2 border-b pb-2">
                      <input
                        type="text"
                        placeholder="Nama Komponen"
                        value={comp().name}
                        disabled={isClassLocked()}
                        onInput={(e) => updateComponentField(idx, 'name', e.currentTarget.value)}
                        class="border border-secondary-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:border-secondary-700 dark:text-white"
                      />
                      <input
                        type="number"
                        placeholder="Bobot"
                        value={comp().bobot}
                        disabled={isClassLocked()}
                        onInput={(e) => updateComponentField(idx, 'bobot', e.currentTarget.value)}
                        class="border border-secondary-200 rounded-lg px-2.5 py-1.5 text-xs w-16 focus:outline-none disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 text-center dark:border-secondary-700 dark:text-white"
                      />
                      <span class="text-xs text-secondary-400 font-bold">%</span>
                      <Show when={!isClassLocked()}>
                        <button
                          onClick={() => removeComponent(idx)}
                          class="text-rose-500 hover:text-rose-700 text-xs p-1"
                        >
                          ❌
                        </button>
                      </Show>
                    </div>
                  )}
                </Index>

                <div class="flex justify-between items-center mt-2">
                  <Show
                    when={!isClassLocked()}
                    fallback={
                      <span class="text-xs text-secondary-400 font-medium">Pengaturan komponen dinonaktifkan.</span>
                    }
                  >
                    <div class="flex flex-col gap-2 align-start">
                      <button
                        onClick={addComponent}
                        class="text-brand-600 hover:text-brand-700 font-bold text-xs flex items-center gap-1 text-left"
                      >
                        ➕ Tambah Komponen
                      </button>
                      <Show when={rencanaEvals() && rencanaEvals().length > 0}>
                        <button
                          onClick={handleImportFromRps}
                          class="text-accent-600 hover:text-accent-700 font-bold text-xs flex items-center gap-1 text-left"
                        >
                          📥 Ambil Komposisi dari RPS
                        </button>
                      </Show>
                    </div>
                  </Show>
                  <span class="text-xs font-bold text-secondary-600">
                    Total: {editableComponents().reduce((sum, item) => sum + item.bobot, 0)}%
                  </span>
                </div>

                <Show when={!isClassLocked()}>
                  <button
                    onClick={handleSaveComponents}
                    class="mt-4 px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-100 dark:bg-brand-700 dark:hover:bg-brand-600"
                  >
                    Simpan Bobot Komponen
                  </button>
                </Show>
              </div>
            </div>

            {/* Right side: Student Grades Table */}
            <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 overflow-x-auto dark:bg-secondary-900 dark:border-secondary-800">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 dark:text-white">Daftar Mahasiswa & Pengisian Nilai</h3>
                <div class="flex gap-2">
                  <Show when={components() && components().length > 0}>
                    <Show
                      when={!isClassLocked()}
                      fallback={
                        <div class="flex items-center gap-2">
                          <span class="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-extrabold rounded-xl dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                            🔒 Nilai Kelas Telah Dikunci (Selesai)
                          </span>
                          <Show when={role() === 'admin' || role() === 'prodi' || role() === 'dosen'}>
                            <button
                              onClick={handleUnlockKelas}
                              class="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                            >
                              🔓 Buka Kunci
                            </button>
                          </Show>
                        </div>
                      }
                    >
                      <button
                        onClick={handleSaveGrades}
                        class="px-4 py-2 bg-accent-600 text-white font-bold rounded-xl text-xs hover:bg-accent-700 active:scale-95 transition-all shadow-sm"
                      >
                        Simpan Nilai
                      </button>
                      <button
                        onClick={handleLockKelas}
                        class="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 active:scale-95 transition-all shadow-sm"
                      >
                        🔒 Kunci Nilai
                      </button>
                    </Show>
                  </Show>
                </div>
              </div>

              <Show
                when={components() && components().length > 0}
                fallback={
                  <div class="text-center py-12 text-secondary-400 italic">
                    Harap tentukan dan simpan komponen bobot nilai (kiri) terlebih dahulu sebelum menginput nilai
                    mahasiswa.
                  </div>
                }
              >
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                      <th class="p-3">Mahasiswa</th>
                      <For each={components()}>
                        {(c) => (
                          <th class="p-3 text-center">
                            {c.nama} ({c.bobot}%)
                          </th>
                        )}
                      </For>
                      <th class="p-3 text-center">Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                    <For
                      each={studentsGrades()}
                      fallback={
                        <tr>
                          <td colspan={components().length + 2} class="p-4 text-center text-secondary-400 italic">
                            Tidak ada mahasiswa terdaftar di kelas ini.
                          </td>
                        </tr>
                      }
                    >
                      {(stud) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3">
                            <div class="flex flex-col">
                              <span class="font-bold text-secondary-800 dark:text-white">{stud.nama}</span>
                              <span class="text-[10px] text-secondary-400">NIM: {stud.nim}</span>
                            </div>
                          </td>
                          <For each={components()}>
                            {(c) => (
                              <td class="p-3 text-center">
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  disabled={isClassLocked()}
                                  value={
                                    inputGrades()[`${stud.krsId}_${c.id}`] !== undefined
                                      ? inputGrades()[`${stud.krsId}_${c.id}`]
                                      : ''
                                  }
                                  onInput={(e) => handleGradeChange(stud.krsId, c.id!, e.currentTarget.value)}
                                  class="border border-secondary-200 rounded-lg px-2 py-1 text-xs w-16 text-center focus:outline-none focus:border-brand-500 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:border-secondary-700 dark:text-white"
                                />
                              </td>
                            )}
                          </For>
                          <td class="p-3 text-center font-extrabold text-secondary-800 dark:text-white">
                            <Show
                              when={getDynamicFinalGrade(stud)}
                              fallback={
                                <Show when={stud.nilaiAngka} fallback="-">
                                  {stud.nilaiAngka} ({stud.nilaiHuruf})
                                </Show>
                              }
                            >
                              {(res) => (
                                <span>
                                  {res().score} ({res().huruf})
                                </span>
                              )}
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
    </MainLayout>
  );
}
