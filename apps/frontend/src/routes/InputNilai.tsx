import { createEffect, createMemo, createResource, createSignal, For, Index, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import SubKomponenEditor from '../components/SubKomponenEditor';
import { Button } from '../components/ui/Button';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { StudentAvatar } from '../components/ui/StudentAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import { khsController, type SubKomponenNilai } from '../controllers/khsController';
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
  const [inputSubGrades, setInputSubGrades] = createSignal<Record<string, string>>({});
  const [expandedKomponenId, setExpandedKomponenId] = createSignal<number | null>(null);

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
      const list = await khsController.getNilaiMahasiswa(kelasId);
      return (list || []).sort((a, b) => (a.nim || '').localeCompare(b.nim || '', 'id'));
    } catch (e) {
      return [];
    }
  });

  // 3b. Load sub-komponen definitions for selected class
  const [subComponents, { refetch: refetchSubComponents }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await khsController.getSubKomponen(kelasId);
    } catch (e) {
      return [];
    }
  });

  const subsByKomponen = createMemo(() => {
    const map = new Map<number, SubKomponenNilai[]>();
    for (const sub of subComponents() || []) {
      const arr = map.get(sub.komponenNilaiId) ?? [];
      arr.push(sub);
      map.set(sub.komponenNilaiId, arr);
    }
    return map;
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

  const isRulesMissing = () => Boolean(selectedKelasId() && (konversiRules()?.length || 0) === 0);

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

  // Sync student sub-grades to input states
  createEffect(() => {
    const sg = studentsGrades();
    if (sg) {
      const initial: Record<string, string> = {};
      for (const stud of sg) {
        for (const val of stud.nilaiSub || []) {
          initial[`${stud.krsId}_${val.subKomponenNilaiId}`] =
            val.nilai !== undefined && val.nilai !== null ? val.nilai.toString() : '';
        }
      }
      setInputSubGrades(initial);
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
  const updateComponentField = (index: number, field: 'name' | 'bobot', value: string | number) => {
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
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan komponen.', 'error');
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
      toast.showToast('Tidak ada rencana evaluasi di RPS untuk mata kuliah ini.', 'info');
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

  // Handle student sub-grade change
  const handleSubGradeChange = (krsId: number, subKomponenNilaiId: number, value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setInputSubGrades((prev) => ({
      ...prev,
      [`${krsId}_${subKomponenNilaiId}`]: sanitized,
    }));
  };

  const parseGradeInput = (raw: string | undefined): number | null => {
    const cleaned = raw ? raw.replace(',', '.') : '';
    if (cleaned === '' || isNaN(Number(cleaned))) return null;
    return Number(cleaned);
  };

  // Nilai level-1 suatu komponen: agregasi sub (weighted avg) atau nilai langsung
  const getDynamicKomponenScore = (krsId: number, komponenId: number, bobot: number) => {
    const subs = subsByKomponen().get(komponenId) || [];
    if (subs.length === 0) {
      const grade = parseGradeInput(inputGrades()[`${krsId}_${komponenId}`]);
      return { score: grade, complete: grade !== null };
    }

    let total = 0;
    let weight = 0;
    let missing = 0;
    for (const sub of subs) {
      const grade = parseGradeInput(inputSubGrades()[`${krsId}_${sub.id}`]);
      if (grade === null) {
        missing += 1;
        continue;
      }
      total += grade * (Number(sub.bobot) / 100);
      weight += Number(sub.bobot);
    }

    const complete = missing === 0 && weight === 100;
    return { score: complete ? parseFloat(total.toFixed(2)) : null, complete };
  };

  const getDynamicFinalGrade = (stud: { krsId: number }) => {
    const list = components();
    if (!list || list.length === 0) return null;

    let totalScore = 0;
    let totalBobot = 0;
    for (const c of list) {
      const result = getDynamicKomponenScore(stud.krsId, c.id!, c.bobot);
      if (!result.complete || result.score === null) return null;
      totalScore += result.score * (c.bobot / 100);
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

  // Save all student grades (level-1 langsung + nilai sub-komponen)
  const handleSaveGrades = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    const list = studentsGrades();
    const comps = components();
    if (!list || !comps) return;

    const payload: Array<{
      krsId: number;
      nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }>;
    }> = [];
    const payloadSub: Array<{
      krsId: number;
      subNilaiList: Array<{ subKomponenNilaiId: number; nilai: number }>;
    }> = [];

    for (const stud of list) {
      const nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }> = [];
      const subNilaiList: Array<{ subKomponenNilaiId: number; nilai: number }> = [];

      for (const c of comps) {
        const subs = subsByKomponen().get(c.id!) || [];
        if (subs.length > 0) {
          for (const sub of subs) {
            const grade = parseGradeInput(inputSubGrades()[`${stud.krsId}_${sub.id}`]);
            subNilaiList.push({ subKomponenNilaiId: sub.id!, nilai: grade ?? 0 });
          }
        } else {
          const grade = parseGradeInput(inputGrades()[`${stud.krsId}_${c.id}`]);
          nilaiKomponenList.push({ komponenNilaiId: c.id!, nilai: grade ?? 0 });
        }
      }

      payload.push({ krsId: stud.krsId, nilaiKomponenList });
      if (subNilaiList.length > 0) {
        payloadSub.push({ krsId: stud.krsId, subNilaiList });
      }
    }

    try {
      if (payloadSub.length > 0) {
        await khsController.saveNilaiSub(kelasId, payloadSub);
      }
      await khsController.saveNilaiMahasiswa(kelasId, payload);
      toast.showToast('Nilai mahasiswa berhasil disimpan.', 'success');
      refetchStudentsGrades();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan nilai.', 'error');
    }
  };

  // Save sub-komponen definitions for one component
  const handleSaveSub = async (komponenId: number, list: Array<{ nama: string; bobot: number }>) => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    try {
      await khsController.saveSubKomponen(kelasId, komponenId, list);
      toast.showToast('Sub-komponen berhasil disimpan.', 'success');
      refetchSubComponents();
      refetchStudentsGrades();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan sub-komponen.', 'error');
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
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengunci kelas.', 'error');
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
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membuka kunci kelas.', 'error');
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
            <SearchableSelect
              label="Kelas Kuliah"
              value={selectedKelasId() || ''}
              onChange={(val) => setSelectedKelasId(val ? Number(val) : null)}
              options={
                classes()?.map((item) => ({
                  label: `${item.mataKuliah?.kode ? `${item.mataKuliah.kode} - ` : ''}${item.mataKuliah?.nama || 'Mata Kuliah'} (${item.namaKelas}) - Periode ${item.periodeId}`,
                  value: item.id,
                })) || []
              }
              placeholder="-- Pilih / Cari Kelas Kuliah --"
            />
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
                  {(comp, idx) => {
                    const komponenId = () => components()?.[idx]?.id;
                    const isExpanded = () => komponenId() !== undefined && expandedKomponenId() === komponenId();
                    return (
                      <div class="flex flex-col gap-1 border-b pb-2">
                        <div class="flex items-center gap-2">
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
                          <Show when={komponenId() !== undefined}>
                            <button
                              type="button"
                              title="Breakdown sub-komponen"
                              onClick={() => setExpandedKomponenId(isExpanded() ? null : (komponenId() as number))}
                              class={`text-xs p-1 rounded ${isExpanded() ? 'text-brand-700' : 'text-secondary-400 hover:text-brand-600'}`}
                            >
                              🧩
                            </button>
                          </Show>
                          <Show when={!isClassLocked()}>
                            <button
                              onClick={() => removeComponent(idx)}
                              class="text-rose-500 hover:text-rose-700 text-xs p-1"
                            >
                              ❌
                            </button>
                          </Show>
                        </div>
                        <Show when={isExpanded()}>
                          <SubKomponenEditor
                            komponenId={komponenId() as number}
                            disabled={isClassLocked()}
                            subs={subsByKomponen().get(komponenId() as number) || []}
                            onSave={handleSaveSub}
                          />
                        </Show>
                      </div>
                    );
                  }}
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
                      <Show when={(rencanaEvals()?.length || 0) > 0}>
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
                  <Show when={(components()?.length || 0) > 0}>
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
                when={(components()?.length || 0) > 0}
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
                            <Show when={(subsByKomponen().get(c.id!) || []).length > 0}>
                              <span class="ml-1" title="Memiliki sub-komponen">
                                🧩
                              </span>
                            </Show>
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
                          <td
                            colspan={(components()?.length || 0) + 2}
                            class="p-4 text-center text-secondary-400 italic"
                          >
                            Tidak ada mahasiswa terdaftar di kelas ini.
                          </td>
                        </tr>
                      }
                    >
                      {(stud) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3">
                            <div class="flex items-center gap-2">
                              <StudentAvatar foto={stud.foto} nama={stud.nama} nim={stud.nim} size="sm" />
                              <div class="flex flex-col">
                                <span class="font-bold text-secondary-800 dark:text-white">{stud.nama}</span>
                                <span class="text-[10px] text-secondary-400">NIM: {stud.nim}</span>
                              </div>
                            </div>
                          </td>
                          <For each={components()}>
                            {(c) => (
                              <td class="p-3 text-center align-top">
                                <Show
                                  when={(subsByKomponen().get(c.id!) || []).length > 0}
                                  fallback={
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
                                  }
                                >
                                  <div class="flex flex-col gap-1 items-center">
                                    <For each={subsByKomponen().get(c.id!)}>
                                      {(sub) => (
                                        <div class="flex items-center gap-1">
                                          <span
                                            class="text-[9px] text-secondary-400 max-w-[70px] truncate"
                                            title={sub.nama}
                                          >
                                            {sub.nama}
                                          </span>
                                          <input
                                            type="text"
                                            placeholder="0.00"
                                            disabled={isClassLocked()}
                                            value={inputSubGrades()[`${stud.krsId}_${sub.id}`] ?? ''}
                                            onInput={(e) =>
                                              handleSubGradeChange(stud.krsId, sub.id!, e.currentTarget.value)
                                            }
                                            class="border border-secondary-200 rounded-lg px-2 py-1 text-[11px] w-14 text-center focus:outline-none focus:border-brand-500 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:border-secondary-700 dark:text-white"
                                          />
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                </Show>
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
