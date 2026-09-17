import { useSearchParams } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Index, onCleanup, Show } from 'solid-js';
import logoImg from '../assets/logo.png';
import { MainLayout } from '../components/MainLayout';
import SubKomponenEditor from '../components/SubKomponenEditor';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { StudentAvatar } from '../components/ui/StudentAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { type KelasKuliah, kelasKuliahController } from '../controllers/kelasKuliahController';
import { khsController, type NilaiMahasiswa, type SubKomponenNilai } from '../controllers/khsController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { type Prodi, prodiController } from '../controllers/prodiController';
import { rombelPraktikumController } from '../controllers/rombelPraktikumController';
import { rpsController } from '../controllers/rpsController';
import { isHeaderRow } from '../utils/csv';
import { type ExportColumn, exportToCSV, exportToExcelMultipleSheets, exportToPDF } from '../utils/export';

type InputMethod = 'akhir' | 'komponen' | 'sub';

export default function InputNilai() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();
  const role = () => user()?.role;

  // Selected State
  const [searchParams] = useSearchParams();
  const initialKelasId =
    searchParams.kelas || searchParams.kelasId ? Number(searchParams.kelas || searchParams.kelasId) : null;
  const initialRombelId = searchParams.rombel ? Number(searchParams.rombel) : null;
  const [selectedKelasId, setSelectedKelasId] = createSignal<number | null>(initialKelasId);
  const [selectedRombelId, setSelectedRombelId] = createSignal<number | null>(initialRombelId);
  const [selectedKrsIds, setSelectedKrsIds] = createSignal<Set<number>>(new Set());
  const [bulkValue, setBulkValue] = createSignal('');
  const [bulkKomponenId, setBulkKomponenId] = createSignal<number | null>(null);
  const [editableComponents, setEditableComponents] = createSignal<Array<{ id?: number; name: string; bobot: number }>>(
    [],
  );
  const [inputGrades, setInputGrades] = createSignal<Record<string, string>>({});
  const [inputSubGrades, setInputSubGrades] = createSignal<Record<string, string>>({});
  const [inputAkhir, setInputAkhir] = createSignal<Record<string, string>>({});
  const [expandedKomponenId, setExpandedKomponenId] = createSignal<number | null>(null);
  const [activeMethod, setActiveMethod] = createSignal<InputMethod>('komponen');
  const [showImportModal, setShowImportModal] = createSignal(false);
  const [focusKomponenId, setFocusKomponenId] = createSignal<number | null>(null);
  const [bulkSubId, setBulkSubId] = createSignal<number | null>(null);
  const [dirtyKeys, setDirtyKeys] = createSignal<Set<string>>(new Set());
  const [showRekap, setShowRekap] = createSignal(true);
  const [isExporting, setIsExporting] = createSignal(false);
  const [showMappingModal, setShowMappingModal] = createSignal(false);
  const [pendingImportRows, setPendingImportRows] = createSignal<string[][]>([]);
  const [columnMapping, setColumnMapping] = createSignal<Record<number, string>>({});

  // 1. Filter periode & program studi (default: periode aktif + prodi workspace admin)
  const workspace = useWorkspace();
  const [periodes] = createResource(async () => {
    try {
      const res = await periodeAkademikController.getAll(undefined, 1, 100);
      return res.data || [];
    } catch {
      return [];
    }
  });
  const [prodis] = createResource(async () => {
    if (role() === 'mahasiswa') return [];
    try {
      const res = await prodiController.getAll(undefined, 1, 100);
      return res.data || [];
    } catch {
      return [];
    }
  });

  const [selectedPeriodeId, setSelectedPeriodeId] = createSignal('');
  const [filterProdiId, setFilterProdiId] = createSignal<number | null>(null);

  createEffect(() => {
    const list = periodes();
    if (list && list.length > 0 && !selectedPeriodeId()) {
      const ws = workspace.activePeriodeId();
      const wsMatch = ws && list.some((p) => p.id === ws) ? ws : null;
      const aktif = list.find((p) => p.aktif)?.id ?? list[0].id;
      setSelectedPeriodeId(wsMatch ?? aktif);
    }
  });

  createEffect(() => {
    const list = prodis();
    if (list && list.length > 0 && filterProdiId() === null) {
      const ws = workspace.activeProdiId();
      if (ws && list.some((p) => p.id === ws)) {
        setFilterProdiId(ws);
      }
    }
  });

  // 2. Fetch Kelas Kuliah (server-side search + filter periode/prodi + load more)
  const KELAS_PAGE_SIZE = 50;
  const [classes, setClasses] = createSignal<KelasKuliah[]>([]);
  const [classesLoading, setClassesLoading] = createSignal(false);
  const [classesHasMore, setClassesHasMore] = createSignal(false);
  const [classesPage, setClassesPage] = createSignal(1);
  const [kelasSearch, setKelasSearch] = createSignal('');
  let kelasDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  const fetchClasses = async (page: number, append: boolean) => {
    if (role() === 'mahasiswa') return;
    setClassesLoading(true);
    try {
      const res = await kelasKuliahController.getAll(
        kelasSearch() || undefined,
        page,
        KELAS_PAGE_SIZE,
        filterProdiId() ?? undefined,
        selectedPeriodeId() || undefined,
      );
      setClasses((prev) => (append ? [...prev, ...res.data] : res.data));
      setClassesPage(page + 1);
      setClassesHasMore(page < (res.meta?.totalPages || 1));
    } catch {
      toast.showToast('Gagal memuat daftar kelas kuliah', 'error');
    } finally {
      setClassesLoading(false);
    }
  };

  // Muat ulang dari halaman 1 setiap filter berubah (tunggu periode termuat lebih dulu).
  createEffect(() => {
    const loaded = periodes();
    const periode = selectedPeriodeId();
    const prodi = filterProdiId();
    const search = kelasSearch();
    void periode;
    void prodi;
    void search;
    if (!loaded || role() === 'mahasiswa') return;
    if (!periode) return;
    fetchClasses(1, false);
  });

  onCleanup(() => {
    clearTimeout(kelasDebounceTimer);
  });

  const handleKelasSearch = (q: string) => {
    setKelasSearch(q);
    clearTimeout(kelasDebounceTimer);
    kelasDebounceTimer = setTimeout(() => fetchClasses(1, false), 350);
  };

  const handleKelasLoadMore = () => {
    if (classesHasMore() && !classesLoading()) {
      fetchClasses(classesPage(), true);
    }
  };

  const refetchClasses = () => {
    fetchClasses(1, false);
  };

  // 2. Load components for selected class
  const [components, { refetch: refetchComponents }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await khsController.getKomponen(kelasId);
    } catch {
      return [];
    }
  });

  // 3. Load students and their grades for selected class
  const [studentsGrades, { refetch: refetchStudentsGrades }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      const list = await khsController.getNilaiMahasiswa(kelasId);
      return (list || []).sort((a, b) => (a.nim || '').localeCompare(b.nim || '', 'id'));
    } catch {
      return [];
    }
  });

  // 3b. Load sub-komponen definitions for selected class
  const [subComponents, { refetch: refetchSubComponents }] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await khsController.getSubKomponen(kelasId);
    } catch {
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

  // Referensi stabil untuk komponen yang sedang di-expand agar editor tidak reset.
  const expandedSubs = createMemo<SubKomponenNilai[]>(() => {
    const id = expandedKomponenId();
    if (id === null) return [];
    return subsByKomponen().get(id) ?? [];
  });

  // 3c. Load rombel praktikum untuk kelas terpilih (untuk mode rombel via ?rombel=)
  const [rombelData] = createResource(selectedKelasId, async (kelasId) => {
    if (!kelasId) return [];
    try {
      return await rombelPraktikumController.getByKelas(kelasId);
    } catch {
      return [];
    }
  });

  const currentRombel = () => (rombelData() || []).find((r) => r.id === selectedRombelId()) || null;

  // Daftar mahasiswa yang ditampilkan: semua KRS, atau hanya anggota rombel terpilih.
  const visibleStudents = createMemo<NilaiMahasiswa[]>(() => {
    const all = studentsGrades() || [];
    const rombelId = selectedRombelId();
    if (!rombelId) return all;
    const rombel = currentRombel();
    if (!rombel) return all;
    const memberIds = new Set((rombel.mahasiswaList || []).map((m) => m.mahasiswaId));
    return all.filter((stud) => memberIds.has(stud.mahasiswaId));
  });

  // Anggota rombel yang belum punya KRS di kelas induk → tidak dapat diberi nilai.
  const rombelNonKrs = createMemo(() => {
    if (!selectedRombelId()) return [];
    const rombel = currentRombel();
    if (!rombel) return [];
    const krsMhsIds = new Set((studentsGrades() || []).map((stud) => stud.mahasiswaId));
    return (rombel.mahasiswaList || []).filter((m) => !krsMhsIds.has(m.mahasiswaId));
  });

  // Target simpan: subset terpilih bila ada, selain itu seluruh mahasiswa yang tampil.
  const targetStudents = () => {
    const all = studentsGrades() || [];
    const sel = selectedKrsIds();
    if (sel.size > 0) return all.filter((stud) => sel.has(stud.krsId));
    return visibleStudents();
  };

  const hasStoredKomponen = (stud: NilaiMahasiswa, komponenNilaiId: number) =>
    (stud.nilaiKomponen || []).some((v) => v.komponenNilaiId === komponenNilaiId && v.nilai !== null && v.nilai !== '');

  const isAkhirCellEmpty = (stud: NilaiMahasiswa) =>
    !inputAkhir()[String(stud.krsId)] && (stud.nilaiAngka === null || stud.nilaiAngka === undefined);

  const isKomponenCellEmpty = (stud: NilaiMahasiswa, komponenNilaiId: number) =>
    !inputGrades()[`${stud.krsId}_${komponenNilaiId}`] && !hasStoredKomponen(stud, komponenNilaiId);

  const isKrsSelected = (krsId: number) => selectedKrsIds().has(krsId);

  const toggleKrsSelected = (krsId: number) => {
    setSelectedKrsIds((prev) => {
      const next = new Set(prev);
      if (next.has(krsId)) next.delete(krsId);
      else next.add(krsId);
      return next;
    });
  };

  const allVisibleSelected = () => {
    const list = visibleStudents();
    return list.length > 0 && list.every((stud) => selectedKrsIds().has(stud.krsId));
  };

  const toggleSelectAll = () => {
    const list = visibleStudents();
    if (allVisibleSelected()) {
      setSelectedKrsIds((prev) => {
        const next = new Set(prev);
        for (const stud of list) next.delete(stud.krsId);
        return next;
      });
    } else {
      setSelectedKrsIds((prev) => {
        const next = new Set(prev);
        for (const stud of list) next.add(stud.krsId);
        return next;
      });
    }
  };

  const selectedCount = () => {
    const sel = selectedKrsIds();
    return visibleStudents().filter((stud) => sel.has(stud.krsId)).length;
  };

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
      } catch {
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
      } catch {
        return [];
      }
    },
  );

  // Sync components to editable list
  createEffect(() => {
    const list = components();
    if (list && list.length > 0) {
      setEditableComponents(list.map((c) => ({ id: c.id, name: c.nama, bobot: c.bobot })));
    } else {
      setEditableComponents([]);
    }
  });

  // Sync student grades to input states (preserve draft yang belum disimpan)
  createEffect(() => {
    const sg = studentsGrades();
    if (sg) {
      const dirty = dirtyKeys();
      const initial: Record<string, string> = {};
      for (const stud of sg) {
        if (stud.nilaiKomponen) {
          for (const val of stud.nilaiKomponen) {
            initial[`${stud.krsId}_${val.komponenNilaiId}`] =
              val.nilai !== undefined && val.nilai !== null ? val.nilai.toString() : '';
          }
        }
      }
      setInputGrades((prev) => {
        const next = { ...initial };
        for (const key of dirty) {
          if (key.startsWith('g:')) {
            const rawKey = key.slice(2);
            if (rawKey in prev) next[rawKey] = prev[rawKey];
          }
        }
        return next;
      });
    }
  });

  // Sync student sub-grades to input states (preserve draft)
  createEffect(() => {
    const sg = studentsGrades();
    if (sg) {
      const dirty = dirtyKeys();
      const initial: Record<string, string> = {};
      for (const stud of sg) {
        for (const val of stud.nilaiSub || []) {
          initial[`${stud.krsId}_${val.subKomponenNilaiId}`] =
            val.nilai !== undefined && val.nilai !== null ? val.nilai.toString() : '';
        }
      }
      setInputSubGrades((prev) => {
        const next = { ...initial };
        for (const key of dirty) {
          if (key.startsWith('s:')) {
            const rawKey = key.slice(2);
            if (rawKey in prev) next[rawKey] = prev[rawKey];
          }
        }
        return next;
      });
    }
  });

  // Sync stored final grades to M1 input states (preserve draft)
  createEffect(() => {
    const sg = studentsGrades();
    if (sg) {
      const dirty = dirtyKeys();
      const initial: Record<string, string> = {};
      for (const stud of sg) {
        initial[String(stud.krsId)] =
          stud.nilaiAngka !== undefined && stud.nilaiAngka !== null ? stud.nilaiAngka.toString() : '';
      }
      setInputAkhir((prev) => {
        const next = { ...initial };
        for (const key of dirty) {
          if (key.startsWith('a:')) {
            const rawKey = key.slice(2);
            if (rawKey in prev) next[rawKey] = prev[rawKey];
          }
        }
        return next;
      });
    }
  });

  // Reset seleksi mahasiswa setiap kelas berganti.
  let lastKelasForSelection: number | null = null;
  createEffect(() => {
    const id = selectedKelasId();
    if (id !== lastKelasForSelection) {
      lastKelasForSelection = id;
      setSelectedKrsIds(new Set<number>());
    }
  });

  // Komponen default untuk bulk nilai (mode komponen).
  createEffect(() => {
    const comps = components();
    const current = bulkKomponenId();
    if (comps && comps.length > 0) {
      if (current === null || !comps.some((c) => c.id === current)) {
        setBulkKomponenId(comps[0].id ?? null);
      }
    } else {
      setBulkKomponenId(null);
    }
  });

  // Deep-link ?kelas=<id>: pastikan kelas tetap ada di daftar walau di luar halaman filter.
  createEffect(() => {
    const id = selectedKelasId();
    const list = classes();
    if (!id || !list) return;
    if (list.some((c) => c.id === id)) return;
    let cancelled = false;
    kelasKuliahController
      .getById(id)
      .then((detail) => {
        if (cancelled) return;
        setClasses((prev) => [...prev.filter((c) => c.id !== detail.id), detail]);
      })
      .catch(() => {
        /* kelas tidak ditemukan / tanpa akses */
      });
    onCleanup(() => {
      cancelled = true;
    });
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
        list.map((c) => ({ id: c.id, nama: c.name, bobot: c.bobot })),
      );
      toast.showToast('Bobot komponen berhasil disimpan. Nilai yang ada tetap dipertahankan.', 'success');
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
      const existingByName = new Map((components() || []).map((c) => [c.nama.trim().toLowerCase(), c.id]));
      setEditableComponents(
        list.map((item) => ({
          id: existingByName.get(item.namaEvaluasi.trim().toLowerCase()),
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

  // Dirty-tracking draft (mencegah refetch menimpa ketikan yang belum disimpan)
  const markDirty = (key: string) =>
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

  const clearDirty = (...prefixes: string[]) =>
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      for (const key of next) {
        if (prefixes.some((p) => key.startsWith(p))) next.delete(key);
      }
      return next;
    });

  const dirtyCount = () => dirtyKeys().size;

  // Handle student grade change
  const handleGradeChange = (krsId: number, komponenNilaiId: number, value: string) => {
    // Only allow numbers, dot, and comma
    const sanitized = value.replace(/[^0-9.,]/g, '');
    markDirty(`g:${krsId}_${komponenNilaiId}`);
    setInputGrades((prev) => ({
      ...prev,
      [`${krsId}_${komponenNilaiId}`]: sanitized,
    }));
  };

  // Handle student sub-grade change
  const handleSubGradeChange = (krsId: number, subKomponenNilaiId: number, value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '');
    markDirty(`s:${krsId}_${subKomponenNilaiId}`);
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

  const componentHasSub = (komponenId: number) => (subsByKomponen().get(komponenId) || []).length > 0;

  // Preview huruf mutu dari aturan konversi (identik dengan fallback backend)
  const getDynamicHuruf = (score: number | null): string | null => {
    if (score === null || Number.isNaN(score)) return null;
    const rules = konversiRules();
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const min = parseFloat(rule.nilaiMin.toString());
        const max = parseFloat(rule.nilaiMax.toString());
        if (score >= min && score <= max) return rule.nilaiHuruf;
      }
      return 'E';
    }
    if (score >= 80) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'E';
  };

  const isMahasiswaHasHalusData = (stud: NilaiMahasiswa) => {
    const hasDirect = (stud.nilaiKomponen || []).some((v) => v.nilai !== null && v.nilai !== '');
    const hasSub = (stud.nilaiSub || []).length > 0;
    return hasDirect || hasSub;
  };

  const handleAkhirChange = (krsId: number, value: string) => {
    const sanitized = value.replace(/[^0-9.,]/g, '');
    markDirty(`a:${krsId}`);
    setInputAkhir((prev) => ({ ...prev, [String(krsId)]: sanitized }));
  };

  const isSubCellEmpty = (stud: NilaiMahasiswa, subKomponenNilaiId: number) =>
    !inputSubGrades()[`${stud.krsId}_${subKomponenNilaiId}`] &&
    !(stud.nilaiSub || []).some(
      (v) => v.subKomponenNilaiId === subKomponenNilaiId && v.nilai !== null && v.nilai !== '',
    );

  // Bulk "nilai awal": hanya mengisi sel yang masih kosong untuk mahasiswa terpilih.
  const handleBulkApply = () => {
    const method = activeMethod();

    const sel = selectedKrsIds();
    if (sel.size === 0) {
      toast.showToast('Pilih minimal satu mahasiswa terlebih dahulu.', 'error');
      return;
    }

    const val = parseGradeInput(bulkValue());
    if (val === null || val < 0 || val > nilaiEnvelope().max) {
      toast.showToast(`Nilai awal harus numerik 0-${nilaiEnvelope().max}.`, 'error');
      return;
    }

    const list = visibleStudents() || [];
    let filled = 0;
    let skipped = 0;

    if (method === 'akhir') {
      const targets: number[] = [];
      for (const stud of list) {
        if (!sel.has(stud.krsId)) continue;
        if (isAkhirCellEmpty(stud)) {
          filled += 1;
          targets.push(stud.krsId);
        } else skipped += 1;
      }
      setInputAkhir((prev) => {
        const next = { ...prev };
        for (const krsId of targets) next[String(krsId)] = String(val);
        return next;
      });
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        for (const krsId of targets) next.add(`a:${krsId}`);
        return next;
      });
    } else if (method === 'sub') {
      const subId = bulkSubId();
      if (!subId) {
        toast.showToast('Pilih sub-komponen terlebih dahulu.', 'error');
        return;
      }
      const targets: number[] = [];
      for (const stud of list) {
        if (!sel.has(stud.krsId)) continue;
        if (isSubCellEmpty(stud, subId)) {
          filled += 1;
          targets.push(stud.krsId);
        } else skipped += 1;
      }
      setInputSubGrades((prev) => {
        const next = { ...prev };
        for (const krsId of targets) next[`${krsId}_${subId}`] = String(val);
        return next;
      });
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        for (const krsId of targets) next.add(`s:${krsId}_${subId}`);
        return next;
      });
    } else {
      const komponenId = bulkKomponenId();
      if (!komponenId) {
        toast.showToast('Pilih komponen terlebih dahulu.', 'error');
        return;
      }
      const targets: number[] = [];
      for (const stud of list) {
        if (!sel.has(stud.krsId)) continue;
        if (isKomponenCellEmpty(stud, komponenId)) {
          filled += 1;
          targets.push(stud.krsId);
        } else skipped += 1;
      }
      setInputGrades((prev) => {
        const next = { ...prev };
        for (const krsId of targets) next[`${krsId}_${komponenId}`] = String(val);
        return next;
      });
      setDirtyKeys((prev) => {
        const next = new Set(prev);
        for (const krsId of targets) next.add(`g:${krsId}_${komponenId}`);
        return next;
      });
    }

    toast.showToast(`Terisi ${filled}, dilewati ${skipped} (sudah ada nilai).`, filled > 0 ? 'success' : 'info');
  };

  const clearSelection = () => {
    setSelectedKrsIds(new Set<number>());
    setBulkValue('');
  };

  const komponenAggLabel = (krsId: number, komponenId: number, bobot: number) => {
    void bobot;
    const direct = parseGradeInput(inputGrades()[`${krsId}_${komponenId}`]);
    if (direct !== null) return `override ${direct.toFixed(2)}`;
    const result = getDynamicKomponenScore(krsId, komponenId, 0);
    if (result.complete && result.score !== null) return `Σ ${result.score.toFixed(2)}`;
    return '–';
  };

  // Nilai level-1 suatu komponen: override langsung menang, fallback agregasi sub.
  const getDynamicKomponenScore = (krsId: number, komponenId: number, bobot: number) => {
    void bobot;
    const directGrade = parseGradeInput(inputGrades()[`${krsId}_${komponenId}`]);
    if (directGrade !== null) {
      return { score: directGrade, complete: true };
    }

    const subs = subsByKomponen().get(komponenId) || [];
    if (subs.length > 0) {
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
      if (missing === 0 && weight === 100) {
        return { score: parseFloat(total.toFixed(2)), complete: true };
      }
    }

    return { score: null, complete: false };
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

  // ===== Envelope & validasi visual =====
  const nilaiEnvelope = createMemo(() => {
    const rules = konversiRules() || [];
    let max = Number.NEGATIVE_INFINITY;
    for (const r of rules) {
      const m = parseFloat(String(r.nilaiMax));
      if (Number.isFinite(m) && m > max) max = m;
    }
    const maxVal = Number.isFinite(max) && max > 0 ? (max <= 10 ? 10 : 100) : 100;
    return { min: 0, max: maxVal };
  });

  const isCellInvalid = (raw: string | undefined): boolean => {
    const n = parseGradeInput(raw);
    if (n === null) return false;
    return n < nilaiEnvelope().min || n > nilaiEnvelope().max;
  };

  // ===== Export helpers (client-side) =====
  const toNum = (v: string | number | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  // Nilai tersimpan level-1: override langsung menang, fallback agregasi sub tersimpan.
  const storedKomponenScore = (stud: NilaiMahasiswa, komponenId: number): number | null => {
    const l1 = (stud.nilaiKomponen || []).find((v) => v.komponenNilaiId === komponenId);
    if (l1) return toNum(l1.nilai);
    const subs = subsByKomponen().get(komponenId) || [];
    if (subs.length === 0) return null;
    let total = 0;
    let weight = 0;
    let missing = 0;
    for (const sub of subs) {
      const raw = (stud.nilaiSub || []).find((v) => v.subKomponenNilaiId === sub.id);
      const n = toNum(raw?.nilai);
      if (n === null) {
        missing += 1;
        continue;
      }
      total += n * (Number(sub.bobot) / 100);
      weight += Number(sub.bobot);
    }
    if (missing === 0 && weight === 100) return parseFloat(total.toFixed(2));
    return null;
  };

  const exportFilename = () => {
    const k = selectedClassDetails();
    const kode = k?.mataKuliah?.kode || 'MK';
    const kelas = k?.namaKelas || 'Kelas';
    const periode = k?.periodeId || selectedPeriodeId() || '';
    return `Nilai_${kode}_${kelas}_${periode}`.replace(/[^A-Za-z0-9_-]+/g, '_');
  };

  const buildRingkasanColumns = (): ExportColumn[] => {
    const comps = components() || [];
    return [
      { header: 'NIM', accessor: 'nim' },
      { header: 'Nama', accessor: 'nama' },
      ...comps.map((c) => ({
        header: `${c.nama} (${c.bobot}%)`,
        accessor: (r: Record<string, unknown>) => (r[`komp_${c.id}`] as string | number) ?? '-',
      })),
      { header: 'Nilai Akhir', accessor: 'nilaiAkhir' },
      { header: 'Huruf', accessor: 'huruf' },
      { header: 'Indeks', accessor: 'indeks' },
      { header: 'Status', accessor: 'status' },
      { header: 'Sisa Kosong', accessor: 'sisaKosong' },
    ];
  };

  const buildRingkasanRows = (data: NilaiMahasiswa[]): Record<string, string | number>[] => {
    const comps = components() || [];
    return data.map((d) => {
      const row: Record<string, string | number> = { nim: d.nim, nama: d.nama };
      let kosong = 0;
      for (const c of comps) {
        const score = storedKomponenScore(d, c.id!);
        row[`komp_${c.id}`] = score === null ? '-' : score;
        if (score === null) kosong += 1;
      }
      row.nilaiAkhir = d.nilaiAngka ?? '-';
      row.huruf = d.nilaiHuruf ?? '-';
      row.indeks = d.nilaiIndeks ?? '-';
      row.status =
        d.nilaiAngka !== null && d.nilaiAngka !== undefined && d.nilaiAngka !== '' ? 'Lengkap' : 'Belum Lengkap';
      row.sisaKosong = kosong;
      return row;
    });
  };

  const handleExportXLSX = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;
    setIsExporting(true);
    try {
      const data = (await khsController.getNilaiMahasiswa(kelasId)) || [];
      const comps = components() || [];
      const subs = subComponents() || [];
      const kelas = selectedClassDetails();

      const detailRows: Record<string, string | number>[] = [];
      for (const d of data) {
        for (const c of comps) {
          const subsOf = subs.filter((s) => s.komponenNilaiId === c.id);
          const hasL1 = (d.nilaiKomponen || []).some((v) => v.komponenNilaiId === c.id);
          const agregat = storedKomponenScore(d, c.id!) ?? '-';
          if (subsOf.length === 0) {
            detailRows.push({
              nim: d.nim,
              nama: d.nama,
              komponen: c.nama,
              bobotKomponen: c.bobot,
              sub: '—',
              bobotSub: '—',
              nilai: agregat,
              agregat,
              sumber: hasL1 ? 'L1' : 'L2',
            });
          } else {
            for (const s of subsOf) {
              const raw = (d.nilaiSub || []).find((v) => v.subKomponenNilaiId === s.id);
              detailRows.push({
                nim: d.nim,
                nama: d.nama,
                komponen: c.nama,
                bobotKomponen: c.bobot,
                sub: s.nama,
                bobotSub: s.bobot,
                nilai: toNum(raw?.nilai) ?? '-',
                agregat,
                sumber: hasL1 ? 'L1' : 'L2',
              });
            }
          }
        }
      }

      const definisiRows: Record<string, string | number>[] = [];
      for (const c of comps) {
        const subsOf = subs.filter((s) => s.komponenNilaiId === c.id);
        if (subsOf.length === 0) {
          definisiRows.push({ komponen: c.nama, bobotKomponen: c.bobot, sub: '—', bobotSub: '—' });
        } else {
          for (const s of subsOf) {
            definisiRows.push({ komponen: c.nama, bobotKomponen: c.bobot, sub: s.nama, bobotSub: s.bobot });
          }
        }
      }

      const metaRows: Record<string, string | number>[] = [
        { keterangan: 'Mata Kuliah', nilai: kelas?.mataKuliah?.nama || '-' },
        { keterangan: 'Kelas', nilai: kelas?.namaKelas || '-' },
        { keterangan: 'Periode', nilai: kelas?.periodeId || selectedPeriodeId() || '-' },
        { keterangan: 'Program Studi', nilai: kelas?.mataKuliah?.programStudi?.nama || '-' },
        { keterangan: 'Total Mahasiswa', nilai: data.length },
        { keterangan: 'Rentang Nilai', nilai: `0 - ${nilaiEnvelope().max}` },
        { keterangan: 'Status Kunci', nilai: isClassLocked() ? 'Terkunci' : 'Terbuka' },
        { keterangan: 'Diekspor Pada', nilai: new Date().toLocaleString('id-ID') },
      ];

      exportToExcelMultipleSheets(
        [
          { name: 'Ringkasan', columns: buildRingkasanColumns(), data: buildRingkasanRows(data) },
          {
            name: 'Detail Sub-Komponen',
            columns: [
              { header: 'NIM', accessor: 'nim' },
              { header: 'Nama', accessor: 'nama' },
              { header: 'Komponen', accessor: 'komponen' },
              { header: 'Bobot Komponen (%)', accessor: 'bobotKomponen' },
              { header: 'Sub-Komponen', accessor: 'sub' },
              { header: 'Bobot Sub (%)', accessor: 'bobotSub' },
              { header: 'Nilai', accessor: 'nilai' },
              { header: 'Agregat Komponen', accessor: 'agregat' },
              { header: 'Sumber', accessor: 'sumber' },
            ],
            data: detailRows,
          },
          {
            name: 'Definisi',
            columns: [
              { header: 'Komponen', accessor: 'komponen' },
              { header: 'Bobot Komponen (%)', accessor: 'bobotKomponen' },
              { header: 'Sub-Komponen', accessor: 'sub' },
              { header: 'Bobot Sub (%)', accessor: 'bobotSub' },
            ],
            data: definisiRows,
          },
          {
            name: 'Meta',
            columns: [
              { header: 'Keterangan', accessor: 'keterangan' },
              { header: 'Nilai', accessor: 'nilai' },
            ],
            data: metaRows,
          },
        ],
        exportFilename(),
      );
      toast.showToast('Berhasil mengekspor nilai ke Excel.', 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengekspor nilai.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSVFile = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;
    setIsExporting(true);
    try {
      const data = (await khsController.getNilaiMahasiswa(kelasId)) || [];
      exportToCSV(buildRingkasanRows(data), buildRingkasanColumns(), exportFilename());
      toast.showToast('Berhasil mengekspor nilai ke CSV.', 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengekspor nilai.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Unduh template terisi (kompatibel dengan impor CSV per metode aktif)
  const handleDownloadTemplate = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;
    setIsExporting(true);
    try {
      const data = (await khsController.getNilaiMahasiswa(kelasId)) || [];
      const comps = components() || [];
      const method = activeMethod();
      const columns: ExportColumn[] = [{ header: 'nim', accessor: 'nim' }];

      if (method === 'akhir') {
        columns.push({ header: 'nilai_akhir', accessor: 'nilai_akhir' });
      } else if (method === 'sub') {
        for (const c of comps) {
          for (const s of subsByKomponen().get(c.id!) || []) {
            columns.push({ header: s.nama, accessor: `sub_${s.id}` });
          }
        }
      } else {
        for (const c of comps) {
          if (!componentHasSub(c.id!)) columns.push({ header: c.nama, accessor: `komp_${c.id}` });
        }
      }

      const rows = data.map((d) => {
        const row: Record<string, string | number> = { nim: d.nim };
        if (method === 'akhir') {
          row.nilai_akhir = d.nilaiAngka ?? '';
        } else if (method === 'sub') {
          for (const c of comps) {
            for (const s of subsByKomponen().get(c.id!) || []) {
              const raw = (d.nilaiSub || []).find((v) => v.subKomponenNilaiId === s.id);
              row[`sub_${s.id}`] = raw ? String(raw.nilai) : '';
            }
          }
        } else {
          for (const c of comps) {
            if (componentHasSub(c.id!)) continue;
            row[`komp_${c.id}`] = storedKomponenScore(d, c.id!) ?? '';
          }
        }
        return row;
      });

      exportToCSV(rows, columns, `${exportFilename()}_template`);
      toast.showToast('Template terisi berhasil diunduh.', 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengunduh template.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Muat logo institusi sebagai data URL untuk kop PDF
  const loadPdfLogoDataUrl = (): Promise<string | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoImg;
    });

  const handleExportPDF = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;
    setIsExporting(true);
    try {
      const data = (await khsController.getNilaiMahasiswa(kelasId)) || [];
      const kelas = selectedClassDetails();
      const logoDataUrl = await loadPdfLogoDataUrl();
      const periode = kelas?.periodeId || selectedPeriodeId() || '-';
      const pengampu = (kelas?.dosenPengajarKelas || [])
        .map((d) => d.dosen?.nama)
        .filter((n): n is string => Boolean(n))
        .join(', ');

      exportToPDF(
        buildRingkasanRows(data),
        buildRingkasanColumns(),
        exportFilename(),
        'DAFTAR NILAI UJIAN',
        undefined,
        {
          logoDataUrl: logoDataUrl ?? undefined,
          institusi: 'POLITEKNIK SOROWAKO',
          alamat: 'Program Pendidikan Vokasi',
          judulDokumen: 'DAFTAR NILAI UJIAN',
          infoLines: [
            `Mata Kuliah: ${kelas?.mataKuliah?.nama || '-'} (${kelas?.mataKuliah?.kode || '-'})`,
            `Kelas: ${kelas?.namaKelas || '-'}  |  Periode: ${periode}`,
            `Program Studi: ${kelas?.mataKuliah?.programStudi?.nama || '-'}`,
            `Dosen Pengampu: ${pengampu || '-'}`,
            `Rentang Nilai: 0 - ${nilaiEnvelope().max}`,
          ],
          signatures: ['Dosen Pengampu', 'Ketua Program Studi'],
        },
      );
      toast.showToast('Berhasil mengekspor Daftar Nilai Ujian (PDF).', 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengekspor PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ===== Rekap pra-simpan =====
  const rekapRows = createMemo(() => {
    if (!showRekap()) return [];
    return visibleStudents().map((stud) => {
      const live = getDynamicFinalGrade(stud);
      const liveScore = live?.score ?? null;
      const stored = toNum(stud.nilaiAngka);
      const delta = liveScore !== null && stored !== null ? parseFloat((liveScore - stored).toFixed(2)) : null;
      return {
        krsId: stud.krsId,
        nim: stud.nim,
        nama: stud.nama,
        live: liveScore,
        liveHuruf: live?.huruf ?? null,
        stored,
        delta,
      };
    });
  });

  const rekapOverall = createMemo(() => {
    const list = visibleStudents();
    const total = list.length;
    let lengkap = 0;
    for (const stud of list) {
      if (getDynamicFinalGrade(stud) !== null) lengkap += 1;
    }
    return { total, lengkap, belum: total - lengkap };
  });

  const rekapKomponen = createMemo(() => {
    if (!showRekap()) return [];
    return (components() || []).map((c) => {
      const scores: number[] = [];
      let filled = 0;
      const total = visibleStudents().length;
      for (const stud of visibleStudents()) {
        const res = getDynamicKomponenScore(stud.krsId, c.id!, c.bobot);
        if (res.complete && res.score !== null) {
          filled += 1;
          scores.push(res.score);
        }
      }
      return {
        id: c.id,
        nama: c.nama,
        bobot: c.bobot,
        filled,
        total,
        min: scores.length ? Math.min(...scores) : null,
        max: scores.length ? Math.max(...scores) : null,
      };
    });
  });

  const displayComponents = createMemo(() => {
    const all = components() || [];
    const focus = focusKomponenId();
    if (focus === null) return all;
    return all.filter((c) => c.id === focus);
  });

  const switchMethod = (m: InputMethod) => {
    if (m === activeMethod()) return;
    if (dirtyCount() > 0) {
      const ok = confirm('Ada nilai yang belum disimpan. Draft tetap dipertahankan saat berpindah metode. Lanjutkan?');
      if (!ok) return;
    }
    setActiveMethod(m);
    setFocusKomponenId(null);
  };

  // Save all student grades (level-1 langsung + nilai sub-komponen)
  const handleSaveGrades = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    const list = targetStudents();
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
            if (grade !== null) subNilaiList.push({ subKomponenNilaiId: sub.id!, nilai: grade });
          }
        } else {
          const grade = parseGradeInput(inputGrades()[`${stud.krsId}_${c.id}`]);
          if (grade !== null) nilaiKomponenList.push({ komponenNilaiId: c.id!, nilai: grade });
        }
      }

      if (nilaiKomponenList.length > 0) {
        payload.push({ krsId: stud.krsId, nilaiKomponenList });
      }
      if (subNilaiList.length > 0) {
        payloadSub.push({ krsId: stud.krsId, subNilaiList });
      }
    }

    try {
      if (payloadSub.length > 0) {
        await khsController.saveNilaiSub(kelasId, payloadSub);
      }
      await khsController.saveNilaiMahasiswa(kelasId, payload);
      clearDirty('s:', 'g:');
      toast.showToast('Nilai mahasiswa berhasil disimpan.', 'success');
      refetchStudentsGrades();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan nilai.', 'error');
    }
  };

  // Save sub-komponen definitions for one component
  const handleSaveSub = async (komponenId: number, list: Array<{ id?: number; nama: string; bobot: number }>) => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;

    try {
      await khsController.saveSubKomponen(kelasId, komponenId, list);
      toast.showToast('Sub-komponen berhasil disimpan. Nilai yang ada tetap dipertahankan.', 'success');
      refetchSubComponents();
      refetchStudentsGrades();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan sub-komponen.', 'error');
    }
  };

  // Save direct component grades (M2) — termasuk menimpa komponen yang memiliki sub.
  const handleSaveKomponenOnly = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;
    const list = targetStudents();
    const comps = components();
    if (!list || !comps) return;

    const payload = list
      .map((stud) => ({
        krsId: stud.krsId,
        nilaiKomponenList: comps
          .map((c) => ({
            komponenNilaiId: c.id!,
            nilai: parseGradeInput(inputGrades()[`${stud.krsId}_${c.id}`]),
          }))
          .filter((v): v is { komponenNilaiId: number; nilai: number } => v.nilai !== null),
      }))
      .filter((item) => item.nilaiKomponenList.length > 0);

    if (payload.length === 0) {
      toast.showToast('Isi minimal satu nilai komponen.', 'error');
      return;
    }

    try {
      await khsController.saveNilaiMahasiswa(kelasId, payload);
      clearDirty('g:');
      toast.showToast('Nilai komponen berhasil disimpan.', 'success');
      refetchStudentsGrades();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan nilai komponen.', 'error');
    }
  };

  // Save direct final grades (M1) — non-destruktif, nilai komponen/sub dipertahankan
  const handleSaveAkhir = async () => {
    const kelasId = selectedKelasId();
    if (!kelasId) return;
    const list = targetStudents();
    if (!list) return;

    const entries = list
      .map((stud) => {
        const grade = parseGradeInput(inputAkhir()[String(stud.krsId)]);
        return grade === null ? null : { krsId: stud.krsId, nilai: grade };
      })
      .filter((e): e is { krsId: number; nilai: number } => e !== null);

    if (entries.length === 0) {
      toast.showToast('Isi minimal satu nilai akhir.', 'error');
      return;
    }

    try {
      await khsController.saveNilaiAkhir(kelasId, entries);
      clearDirty('a:');
      toast.showToast('Nilai akhir berhasil disimpan.', 'success');
      refetchStudentsGrades();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menyimpan nilai akhir.', 'error');
    }
  };

  const importTemplateHeaders = createMemo(() => {
    const method = activeMethod();
    if (method === 'akhir') return ['nim', 'nilai_akhir'];
    const headers = ['nim'];
    if (method === 'sub') {
      for (const c of components() || []) {
        for (const s of subsByKomponen().get(c.id!) || []) headers.push(s.nama);
      }
    } else {
      for (const c of components() || []) {
        if (!componentHasSub(c.id!)) headers.push(c.nama);
      }
    }
    return headers;
  });

  // Impor CSV sesuai metode aktif (header dinamis dari definisi aktual)
  const processImport = async (rows: string[][]) => {
    const kelasId = selectedKelasId();
    const errors: { line: number; error: string }[] = [];
    if (!kelasId) return { successCount: 0, errors: [{ line: 0, error: 'Pilih kelas terlebih dahulu.' }] };
    if (!rows || rows.length === 0) {
      return { successCount: 0, errors: [{ line: 1, error: 'File CSV kosong.' }] };
    }

    const method = activeMethod();
    const students = studentsGrades() || [];
    const nimToKrs = new Map(students.map((s) => [String(s.nim).trim().toLowerCase(), s.krsId]));
    const headerDetected = isHeaderRow(rows[0]?.[0] ?? '', ['nim', 'nilai_akhir', 'nilai']);
    const header = headerDetected ? rows[0].map((h) => String(h).trim().toLowerCase()) : [];
    const dataRows = headerDetected ? rows.slice(1) : rows;

    const resolveKrs = (nim: string | undefined, line: number): number | null => {
      const key = String(nim ?? '')
        .trim()
        .toLowerCase();
      if (!key) {
        errors.push({ line, error: 'NIM kosong.' });
        return null;
      }
      const id = nimToKrs.get(key);
      if (!id) {
        errors.push({ line, error: `NIM ${nim} tidak ditemukan di kelas ini.` });
        return null;
      }
      return id;
    };

    if (method === 'akhir') {
      const col = headerDetected ? header.findIndex((h) => h === 'nilai_akhir' || h === 'nilai') : 1;
      if (col < 0) return { successCount: 0, errors: [{ line: 1, error: 'Kolom "nilai_akhir" tidak ditemukan.' }] };
      const entries: Array<{ krsId: number; nilai: number }> = [];
      const seenKrs = new Set<number>();
      dataRows.forEach((row, i) => {
        const line = (headerDetected ? 2 : 1) + i;
        const krsId = resolveKrs(row[0], line);
        if (!krsId) return;
        if (seenKrs.has(krsId)) {
          errors.push({ line, error: `NIM ${row[0]} muncul lebih dari satu kali.` });
          return;
        }
        seenKrs.add(krsId);
        const nilai = parseGradeInput(row[col]);
        if (nilai === null || nilai < 0 || nilai > nilaiEnvelope().max) {
          errors.push({ line, error: `Nilai akhir harus numerik 0-${nilaiEnvelope().max}.` });
          return;
        }
        entries.push({ krsId, nilai });
      });
      if (entries.length === 0) return { successCount: 0, errors };
      try {
        await khsController.saveNilaiAkhir(kelasId, entries);
        clearDirty('a:');
        refetchStudentsGrades();
        return { successCount: entries.length, errors };
      } catch (e: unknown) {
        errors.push({ line: 0, error: e instanceof Error ? e.message : 'Gagal menyimpan nilai akhir.' });
        return { successCount: 0, errors };
      }
    }

    if (!headerDetected) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'Header kolom wajib ada untuk impor ini (contoh: nim,<nama kolom>).' }],
      };
    }

    const comps = components() || [];

    if (method === 'komponen') {
      const nameToComp = new Map<string, number>();
      const ambiguousComp = new Set<string>();
      for (const c of comps) {
        const key = c.nama.trim().toLowerCase();
        if (nameToComp.has(key)) ambiguousComp.add(key);
        else nameToComp.set(key, c.id!);
      }
      const colMap: Array<{ col: number; komponenNilaiId: number }> = [];
      for (let col = 1; col < header.length; col++) {
        const name = header[col];
        if (!name) continue;
        if (ambiguousComp.has(name)) {
          errors.push({
            line: 1,
            error: `Nama komponen "${rows[0][col]}" dipakai oleh lebih dari satu komponen — ganti nama agar unik sebelum impor.`,
          });
          continue;
        }
        const id = nameToComp.get(name);
        if (id === undefined) {
          errors.push({
            line: 1,
            error: `Kolom "${rows[0][col]}" tidak cocok dengan komponen manapun.`,
          });
          continue;
        }
        colMap.push({ col, komponenNilaiId: id });
      }
      if (colMap.length === 0) return { successCount: 0, errors };

      const seenComp = new Set<number>();
      for (const entry of colMap) {
        if (seenComp.has(entry.komponenNilaiId)) {
          return {
            successCount: 0,
            errors: [
              {
                line: 1,
                error: `Kolom "${rows[0][entry.col]}" duplikat — setiap komponen hanya boleh muncul satu kali.`,
              },
            ],
          };
        }
        seenComp.add(entry.komponenNilaiId);
      }

      const payload: Array<{
        krsId: number;
        nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }>;
      }> = [];
      dataRows.forEach((row, i) => {
        const line = 2 + i;
        const krsId = resolveKrs(row[0], line);
        if (!krsId) return;
        const nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }> = [];
        for (const { col, komponenNilaiId } of colMap) {
          const raw = row[col];
          if (raw === undefined || String(raw).trim() === '') continue;
          const nilai = parseGradeInput(raw);
          if (nilai === null || nilai < 0 || nilai > nilaiEnvelope().max) {
            errors.push({ line, error: `Nilai "${rows[0][col]}" harus 0-${nilaiEnvelope().max}.` });
            return;
          }
          nilaiKomponenList.push({ komponenNilaiId, nilai });
        }
        if (nilaiKomponenList.length > 0) payload.push({ krsId, nilaiKomponenList });
      });
      if (payload.length === 0) return { successCount: 0, errors };

      try {
        await khsController.saveNilaiMahasiswa(kelasId, payload);
        clearDirty('g:');
        refetchStudentsGrades();
        return { successCount: payload.length, errors };
      } catch (e: unknown) {
        errors.push({ line: 0, error: e instanceof Error ? e.message : 'Gagal menyimpan nilai komponen.' });
        return { successCount: 0, errors };
      }
    }

    // method === 'sub'
    const nameToSub = new Map<string, number>();
    const ambiguousSub = new Set<string>();
    for (const c of comps) {
      for (const s of subsByKomponen().get(c.id!) || []) {
        const key = s.nama.trim().toLowerCase();
        if (nameToSub.has(key)) ambiguousSub.add(key);
        else nameToSub.set(key, s.id!);
      }
    }
    const colMap: Array<{ col: number; subKomponenNilaiId: number }> = [];
    for (let col = 1; col < header.length; col++) {
      const name = header[col];
      if (!name) continue;
      if (ambiguousSub.has(name)) {
        errors.push({
          line: 1,
          error: `Nama sub-komponen "${rows[0][col]}" dipakai oleh lebih dari satu definisi — ganti nama agar unik sebelum impor.`,
        });
        continue;
      }
      const id = nameToSub.get(name);
      if (id === undefined) {
        errors.push({ line: 1, error: `Kolom "${rows[0][col]}" tidak cocok dengan sub-komponen manapun.` });
        continue;
      }
      colMap.push({ col, subKomponenNilaiId: id });
    }
    if (colMap.length === 0) return { successCount: 0, errors };

    const seenSub = new Set<number>();
    for (const entry of colMap) {
      if (seenSub.has(entry.subKomponenNilaiId)) {
        return {
          successCount: 0,
          errors: [
            {
              line: 1,
              error: `Kolom "${rows[0][entry.col]}" duplikat — setiap sub-komponen hanya boleh muncul satu kali.`,
            },
          ],
        };
      }
      seenSub.add(entry.subKomponenNilaiId);
    }

    const payloadSub: Array<{
      krsId: number;
      subNilaiList: Array<{ subKomponenNilaiId: number; nilai: number }>;
    }> = [];
    dataRows.forEach((row, i) => {
      const line = 2 + i;
      const krsId = resolveKrs(row[0], line);
      if (!krsId) return;
      const subNilaiList: Array<{ subKomponenNilaiId: number; nilai: number }> = [];
      for (const { col, subKomponenNilaiId } of colMap) {
        const raw = row[col];
        if (raw === undefined || String(raw).trim() === '') continue;
        const nilai = parseGradeInput(raw);
        if (nilai === null || nilai < 0 || nilai > nilaiEnvelope().max) {
          errors.push({ line, error: `Nilai "${rows[0][col]}" harus 0-${nilaiEnvelope().max}.` });
          return;
        }
        subNilaiList.push({ subKomponenNilaiId, nilai });
      }
      if (subNilaiList.length > 0) payloadSub.push({ krsId, subNilaiList });
    });
    if (payloadSub.length === 0) return { successCount: 0, errors };
    try {
      await khsController.saveNilaiSub(kelasId, payloadSub);
      clearDirty('s:');
      refetchStudentsGrades();
      return { successCount: payloadSub.length, errors };
    } catch (e: unknown) {
      errors.push({ line: 0, error: e instanceof Error ? e.message : 'Gagal menyimpan nilai sub-komponen.' });
      return { successCount: 0, errors };
    }
  };

  // ===== Pemetaan kolom impor (F3) =====
  const mappingTargetOptions = createMemo(() => {
    const method = activeMethod();
    if (method === 'sub') {
      return (subComponents() || []).map((s) => ({ key: s.nama, label: `Sub: ${s.nama} (${s.bobot}%)` }));
    }
    return (components() || [])
      .filter((c) => !componentHasSub(c.id!))
      .map((c) => ({ key: c.nama, label: `${c.nama} (${c.bobot}%)` }));
  });

  const mappingKeptColumns = createMemo(() =>
    Object.keys(columnMapping())
      .map(Number)
      .filter((i) => columnMapping()[i] !== '__ignore__')
      .sort((a, b) => a - b),
  );

  const mappingDiagnostics = createMemo(() => {
    const rows = pendingImportRows();
    const errors: { line: number; error: string }[] = [];
    const duplicateTargets: string[] = [];
    if (rows.length < 1) return { errors, duplicateTargets };

    const mapping = columnMapping();
    const targetKeys = Object.values(mapping).filter((k) => k !== '__ignore__' && k !== '__nim__');
    const counts = new Map<string, number>();
    for (const k of targetKeys) counts.set(k, (counts.get(k) || 0) + 1);
    for (const [k, c] of counts.entries()) if (c > 1) duplicateTargets.push(k);

    const nimToKrs = new Map(
      (studentsGrades() || []).map((s) => [String(s.nim).trim().toLowerCase(), s.krsId] as const),
    );
    const kept = Object.keys(mapping)
      .map(Number)
      .filter((i) => mapping[i] !== '__ignore__');

    rows.slice(1).forEach((r, i) => {
      const line = 2 + i;
      const nim = String(r[0] ?? '').trim();
      if (!nim) errors.push({ line, error: 'NIM kosong.' });
      else if (!nimToKrs.has(nim.toLowerCase()))
        errors.push({ line, error: `NIM ${nim} tidak ditemukan di kelas ini.` });
      for (const col of kept) {
        if (col === 0) continue;
        const raw = r[col];
        if (raw === undefined || String(raw).trim() === '') continue;
        const n = parseGradeInput(raw);
        if (n === null || n < nilaiEnvelope().min || n > nilaiEnvelope().max) {
          errors.push({
            line,
            error: `Kolom "${rows[0][col] ?? col}" -> ${mapping[col]}: nilai harus ${nilaiEnvelope().min}-${nilaiEnvelope().max}.`,
          });
        }
      }
    });

    return { errors, duplicateTargets };
  });

  const buildNormalizedImportRows = (): string[][] => {
    const rows = pendingImportRows();
    const mapping = columnMapping();
    const kept = mappingKeptColumns();
    const headerRow = kept.map((i) => (i === 0 ? 'nim' : mapping[i]));
    const dataRows = rows.slice(1).map((r) => kept.map((i) => r[i] ?? ''));
    return [headerRow, ...dataRows];
  };

  const handleDownloadImportErrors = () => {
    const errors = mappingDiagnostics().errors;
    if (errors.length === 0) return;
    exportToCSV(
      errors.map((e) => ({ baris: e.line, kendala: e.error })),
      [
        { header: 'Baris', accessor: 'baris' },
        { header: 'Kendala', accessor: 'kendala' },
      ],
      'error_impor_nilai',
    );
  };

  // Wrapper dipakai ImportCsvModal: bila header perlu dipetakan, buka panel pemetaan.
  const handleImportNilais = async (
    rows: string[][],
    mode: string,
  ): Promise<{ successCount: number; errors: { line: number; error: string }[] }> => {
    void mode;
    const method = activeMethod();
    const headerDetected = isHeaderRow(rows[0]?.[0] ?? '', ['nim', 'nilai_akhir', 'nilai']);
    if (method === 'akhir' || !headerDetected || rows.length < 2) {
      return processImport(rows);
    }

    const targets = mappingTargetOptions();
    const header = rows[0].map((h) => String(h).trim().toLowerCase());
    const mapping: Record<number, string> = { 0: '__nim__' };
    for (let i = 1; i < header.length; i++) {
      const match = targets.find((t) => t.key.trim().toLowerCase() === header[i]);
      mapping[i] = match ? match.key : '__ignore__';
    }
    setColumnMapping(mapping);
    setPendingImportRows(rows);
    setShowImportModal(false);
    setShowMappingModal(true);
    return {
      successCount: 0,
      errors: [{ line: 1, error: 'Silakan lengkapi pemetaan kolom pada panel yang terbuka.' }],
    };
  };

  const handleConfirmMapping = async () => {
    const diag = mappingDiagnostics();
    if (diag.duplicateTargets.length > 0) {
      toast.showToast(`Target terpetakan lebih dari sekali: ${diag.duplicateTargets.join(', ')}`, 'error');
      return;
    }
    const mappedCount = mappingKeptColumns().filter((i) => i !== 0).length;
    if (mappedCount === 0) {
      toast.showToast('Petakan minimal satu kolom ke komponen/sub-komponen.', 'error');
      return;
    }
    const normalized = buildNormalizedImportRows();
    setShowMappingModal(false);
    setPendingImportRows([]);
    setColumnMapping({});
    await processImport(normalized);
  };

  const handleCloseMapping = () => {
    setShowMappingModal(false);
    setPendingImportRows([]);
    setColumnMapping({});
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
      <div class="flex flex-col gap-6 pb-28">
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchableSelect
              label="Periode Semester"
              value={selectedPeriodeId()}
              onChange={(val) => {
                setSelectedPeriodeId(String(val));
                setSelectedKelasId(null);
              }}
              options={
                (periodes() || []).map((p: { id: string; nama: string; aktif?: boolean }) => ({
                  label: `${p.nama} (${p.id})${p.aktif ? ' - Aktif' : ''}`,
                  value: p.id,
                })) || []
              }
              placeholder="-- Pilih Periode --"
            />
            <SearchableSelect
              label="Program Studi"
              value={filterProdiId() ?? ''}
              onChange={(val) => {
                setFilterProdiId(val ? Number(val) : null);
                setSelectedKelasId(null);
              }}
              options={
                (prodis() || []).map((p: Prodi) => ({
                  label: `${p.nama} (${p.jenjang})`,
                  value: p.id,
                })) || []
              }
              placeholder="-- Semua Program Studi --"
            />
            <SearchableSelect
              label="Kelas Kuliah"
              value={selectedKelasId() || ''}
              onChange={(val) => {
                setSelectedKelasId(val ? Number(val) : null);
                setSelectedRombelId(null);
              }}
              options={
                classes()?.map((item) => ({
                  label: `${item.mataKuliah?.kode ? `${item.namaKelas} - ` : ''}${item.mataKuliah?.nama || 'Mata Kuliah'} (${item.mataKuliah?.kode || 'Kode MK'}) - Periode ${item.periodeId}`,
                  value: item.id,
                })) || []
              }
              placeholder="-- Pilih / Cari Kelas Kuliah --"
              onSearch={handleKelasSearch}
              isLoading={classesLoading()}
              hasMore={classesHasMore()}
              onLoadMore={handleKelasLoadMore}
            />
          </div>
        </div>

        <Show when={isRulesMissing()}>
          <div class="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-2xl text-xs font-semibold flex flex-col gap-1.5 shadow-sm dark:bg-rose-900/30 dark:text-rose-400">
            <span class="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
              ⚠ Peringatan: Aturan Konversi Belum Ditetapkan
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
          <Show when={selectedRombelId() && currentRombel()}>
            <div class="flex flex-col gap-3 mb-6">
              <div class="bg-brand-50 border border-brand-200 text-brand-800 p-4 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-3 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
                <div class="flex flex-col gap-0.5">
                  <span class="font-bold text-sm">Mode Rombel: {currentRombel()?.namaGroup}</span>
                  <span>
                    Menampilkan {visibleStudents().length} dari {(studentsGrades() || []).length} mahasiswa KRS pada
                    kelas ini.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRombelId(null)}
                  class="px-3 py-1.5 rounded-full bg-white text-brand-700 border border-brand-300 font-semibold hover:bg-brand-100 active:scale-95 transition-all dark:bg-secondary-800 dark:text-brand-300 dark:border-brand-700"
                >
                  Tampilkan semua mahasiswa
                </button>
              </div>
              <Show when={rombelNonKrs().length > 0}>
                <div class="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs flex flex-col gap-1 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                  <span class="font-bold">Peringatan: {rombelNonKrs().length} anggota rombel belum terdaftar KRS</span>
                  <span>
                    Mahasiswa berikut tidak memiliki KRS di kelas induk sehingga nilainya tidak dapat disimpan lewat
                    halaman ini:
                  </span>
                  <span class="font-medium">
                    {rombelNonKrs()
                      .map((m) => m.mahasiswa?.nama || `#${m.mahasiswaId}`)
                      .join(', ')}
                  </span>
                </div>
              </Show>
            </div>
          </Show>

          {/* Rekap Pra-Simpan */}
          <Show when={!isClassLocked()}>
            <div class="bg-white rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
              <button
                type="button"
                onClick={() => setShowRekap((v) => !v)}
                class="w-full flex items-center justify-between px-6 py-4 text-left active:scale-[0.995] transition-transform"
              >
                <span class="flex flex-wrap items-center gap-2">
                  <h3 class="font-bold text-secondary-800 dark:text-white text-sm">Rekap Pra-Simpan</h3>
                  <span class="text-[11px] px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-600 font-semibold dark:bg-secondary-800 dark:text-secondary-300">
                    {rekapOverall().lengkap}/{rekapOverall().total} lengkap
                  </span>
                  <span class="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-semibold dark:bg-brand-900/30 dark:text-brand-300">
                    Rentang {nilaiEnvelope().min}-{nilaiEnvelope().max}
                  </span>
                  <Show when={dirtyCount() > 0}>
                    <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold dark:bg-amber-900/30 dark:text-amber-400">
                      {dirtyCount()} sel belum disimpan
                    </span>
                  </Show>
                </span>
                <span class="text-secondary-400 text-xs">{showRekap() ? '▲' : '▼'}</span>
              </button>
              <Show when={showRekap()}>
                <div class="px-6 pb-6 flex flex-col gap-5 border-t border-secondary-100 dark:border-secondary-800 pt-4">
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800/50 p-3">
                      <p class="text-[10px] uppercase tracking-wider text-secondary-400 font-bold">Mahasiswa</p>
                      <p class="text-lg font-bold text-secondary-800 dark:text-white">{rekapOverall().total}</p>
                    </div>
                    <div class="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                      <p class="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">NA Lengkap</p>
                      <p class="text-lg font-bold text-emerald-700 dark:text-emerald-400">{rekapOverall().lengkap}</p>
                    </div>
                    <div class="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3">
                      <p class="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Belum Lengkap</p>
                      <p class="text-lg font-bold text-amber-700 dark:text-amber-400">{rekapOverall().belum}</p>
                    </div>
                    <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800/50 p-3">
                      <p class="text-[10px] uppercase tracking-wider text-secondary-400 font-bold">Dipilih</p>
                      <p class="text-lg font-bold text-secondary-800 dark:text-white">{selectedCount()}</p>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div class="flex flex-col gap-2">
                      <h4 class="text-xs font-bold text-secondary-700 dark:text-secondary-200">Per Komponen</h4>
                      <Show
                        when={rekapKomponen().length > 0}
                        fallback={<p class="text-xs text-secondary-400 italic">Belum ada komponen.</p>}
                      >
                        <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                          <For each={rekapKomponen()}>
                            {(k) => (
                              <div class="flex items-center justify-between gap-2 rounded-lg border border-secondary-100 dark:border-secondary-800 px-3 py-2">
                                <span class="text-xs font-semibold text-secondary-700 dark:text-secondary-200 truncate">
                                  {k.nama} ({k.bobot}%)
                                </span>
                                <span class="text-[11px] text-secondary-500 whitespace-nowrap">
                                  {k.filled}/{k.total} terisi
                                  <Show when={k.min !== null}>
                                    {' '}
                                    • {k.min}–{k.max}
                                  </Show>
                                </span>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>

                    <div class="flex flex-col gap-2">
                      <h4 class="text-xs font-bold text-secondary-700 dark:text-secondary-200">
                        Per Mahasiswa (NA Live vs Tersimpan)
                      </h4>
                      <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                        <For each={rekapRows()}>
                          {(r) => (
                            <div class="flex items-center justify-between gap-2 rounded-lg border border-secondary-100 dark:border-secondary-800 px-3 py-2">
                              <span class="flex flex-col">
                                <span class="text-xs font-semibold text-secondary-700 dark:text-secondary-200">
                                  {r.nama}
                                </span>
                                <span class="text-[10px] text-secondary-400 font-mono">{r.nim}</span>
                              </span>
                              <span class="flex items-center gap-2 text-[11px] whitespace-nowrap">
                                <span class="text-secondary-500">
                                  {r.live ?? '-'}
                                  <Show when={r.liveHuruf}> ({r.liveHuruf})</Show>
                                </span>
                                <Show when={r.delta !== null && r.delta !== 0}>
                                  <span
                                    class={`font-bold ${(r.delta ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                                  >
                                    {(r.delta ?? 0) > 0 ? '+' : ''}
                                    {r.delta}
                                  </span>
                                </Show>
                              </span>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </Show>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: Component Weights Management */}
            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 h-fit dark:bg-secondary-900 dark:border-secondary-800">
              <div class="flex justify-between items-center border-b pb-2">
                <h3 class="font-bold text-secondary-800 dark:text-white">Komposisi Bobot Nilai (%)</h3>
                <Show when={isClassLocked()}>
                  <span class="px-2.5 py-1 bg-accent-50 text-accent-700 border border-accent-200 text-[10px] font-bold rounded-lg flex items-center gap-1 dark:bg-accent-900/30 dark:text-accent-400">
                    ⊘ Dikunci
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
                              [S]
                            </button>
                          </Show>
                          <Show when={!isClassLocked()}>
                            <button
                              onClick={() => removeComponent(idx)}
                              class="text-rose-500 hover:text-rose-700 text-xs p-1"
                            >
                              ×
                            </button>
                          </Show>
                        </div>
                        <Show when={isExpanded()}>
                          <SubKomponenEditor
                            komponenId={komponenId() as number}
                            disabled={isClassLocked()}
                            subs={expandedSubs()}
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
                        + Tambah Komponen
                      </button>
                      <Show when={(rencanaEvals()?.length || 0) > 0}>
                        <button
                          onClick={handleImportFromRps}
                          class="text-accent-600 hover:text-accent-700 font-bold text-xs flex items-center gap-1 text-left"
                        >
                          Ambil Komposisi dari RPS
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
              <div class="flex flex-col gap-3 border-b pb-3">
                <div class="flex justify-between items-center">
                  <h3 class="font-bold text-secondary-800 dark:text-white">Daftar Mahasiswa & Pengisian Nilai</h3>
                  <Show when={isClassLocked()}>
                    <span class="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-extrabold rounded-xl dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                      Nilai Kelas Telah Dikunci (Selesai)
                    </span>
                  </Show>
                </div>

                {/* Method switcher */}
                <div class="flex flex-wrap gap-2">
                  <For
                    each={[
                      { id: 'akhir' as InputMethod, label: '1. Nilai Akhir Langsung' },
                      { id: 'komponen' as InputMethod, label: '2. Nilai Komponen' },
                      { id: 'sub' as InputMethod, label: '3. Nilai Sub-Komponen' },
                    ]}
                  >
                    {(m) => (
                      <button
                        type="button"
                        onClick={() => switchMethod(m.id)}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                          activeMethod() === m.id
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-secondary-600 border-secondary-200 hover:border-brand-400 dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    )}
                  </For>
                </div>

                {/* Focus selector — mode fokus satu komponen agar tabel mudah dibaca */}
                <Show when={activeMethod() !== 'akhir' && (components()?.length || 0) > 1}>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Fokus Kolom</span>
                    <button
                      type="button"
                      onClick={() => setFocusKomponenId(null)}
                      class={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
                        focusKomponenId() === null
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-secondary-600 border-secondary-200 hover:border-brand-400 dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      Semua Komponen
                    </button>
                    <For each={components()}>
                      {(c) => (
                        <button
                          type="button"
                          onClick={() => setFocusKomponenId(c.id!)}
                          class={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all active:scale-95 ${
                            focusKomponenId() === c.id
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white text-secondary-600 border-secondary-200 hover:border-brand-400 dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-700'
                          }`}
                        >
                          {c.nama} ({c.bobot}%)
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                {/* Actions */}
                <Show when={!isClassLocked()}>
                  <div class="flex flex-wrap items-center gap-2">
                    <Show when={activeMethod() === 'akhir'}>
                      <button
                        onClick={handleSaveAkhir}
                        class="px-4 py-2 bg-accent-600 text-white font-bold rounded-xl text-xs hover:bg-accent-700 active:scale-95 transition-all shadow-sm"
                      >
                        {selectedCount() > 0 ? `Simpan Terpilih (${selectedCount()})` : 'Simpan Nilai Akhir'}
                      </button>
                    </Show>
                    <Show when={activeMethod() === 'komponen'}>
                      <button
                        onClick={handleSaveKomponenOnly}
                        class="px-4 py-2 bg-accent-600 text-white font-bold rounded-xl text-xs hover:bg-accent-700 active:scale-95 transition-all shadow-sm"
                      >
                        {selectedCount() > 0 ? `Simpan Terpilih (${selectedCount()})` : 'Simpan Nilai Komponen'}
                      </button>
                    </Show>
                    <Show when={activeMethod() === 'sub'}>
                      <button
                        onClick={handleSaveGrades}
                        class="px-4 py-2 bg-accent-600 text-white font-bold rounded-xl text-xs hover:bg-accent-700 active:scale-95 transition-all shadow-sm"
                      >
                        {selectedCount() > 0 ? `Simpan Terpilih (${selectedCount()})` : 'Simpan Nilai Sub'}
                      </button>
                    </Show>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      class="px-4 py-2 bg-secondary-100 text-secondary-700 font-bold rounded-xl text-xs hover:bg-secondary-200 active:scale-95 transition-all dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
                    >
                      Impor CSV
                    </button>
                    <button
                      onClick={handleLockKelas}
                      class="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 active:scale-95 transition-all shadow-sm"
                    >
                      Kunci Nilai
                    </button>
                    <button
                      type="button"
                      onClick={handleExportXLSX}
                      disabled={isExporting()}
                      class="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting() ? 'Menyiapkan…' : 'Ekspor Excel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSVFile}
                      disabled={isExporting()}
                      class="px-4 py-2 bg-secondary-100 text-secondary-700 font-bold rounded-xl text-xs hover:bg-secondary-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
                    >
                      Ekspor CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={isExporting()}
                      class="px-4 py-2 bg-secondary-100 text-secondary-700 font-bold rounded-xl text-xs hover:bg-secondary-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
                    >
                      Unduh Template
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      disabled={isExporting()}
                      class="px-4 py-2 bg-secondary-100 text-secondary-700 font-bold rounded-xl text-xs hover:bg-secondary-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-secondary-800 dark:text-secondary-200 dark:hover:bg-secondary-700"
                    >
                      Cetak PDF (DNU)
                    </button>
                  </div>

                  {/* Bulk nilai awal — hanya mengisi sel kosong mahasiswa terpilih */}
                  <div class="flex flex-wrap items-end gap-2 bg-secondary-50 border border-secondary-100 rounded-xl p-3 dark:bg-secondary-800/50 dark:border-secondary-700">
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-secondary-400">
                        Nilai Awal (0-{nilaiEnvelope().max})
                      </span>
                      <input
                        type="text"
                        inputmode="decimal"
                        placeholder="0.00"
                        value={bulkValue()}
                        onInput={(e) => setBulkValue(e.currentTarget.value.replace(/[^0-9.,]/g, ''))}
                        class="border border-secondary-200 rounded-lg px-2 py-1.5 text-xs w-24 text-center focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white dark:bg-secondary-900"
                      />
                    </div>
                    <Show when={activeMethod() === 'komponen'}>
                      <div class="flex flex-col gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Komponen</span>
                        <select
                          value={bulkKomponenId() ?? ''}
                          onChange={(e) =>
                            setBulkKomponenId(e.currentTarget.value ? Number(e.currentTarget.value) : null)
                          }
                          class="border border-secondary-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white dark:bg-secondary-900"
                        >
                          <option value="">-- Pilih Komponen --</option>
                          <For each={components() || []}>{(c) => <option value={c.id}>{c.nama}</option>}</For>
                        </select>
                      </div>
                    </Show>
                    <Show when={activeMethod() === 'sub'}>
                      <div class="flex flex-col gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-secondary-400">
                          Sub-Komponen
                        </span>
                        <select
                          value={bulkSubId() ?? ''}
                          onChange={(e) => setBulkSubId(e.currentTarget.value ? Number(e.currentTarget.value) : null)}
                          class="border border-secondary-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-secondary-900 dark:border-secondary-700 dark:text-white dark:bg-secondary-900"
                        >
                          <option value="">-- Pilih Sub-Komponen --</option>
                          <For each={components() || []}>
                            {(c) => (
                              <Show when={componentHasSub(c.id!)}>
                                <optgroup label={c.nama}>
                                  <For each={subsByKomponen().get(c.id!) || []}>
                                    {(s) => (
                                      <option value={s.id}>
                                        {s.nama} ({s.bobot}%)
                                      </option>
                                    )}
                                  </For>
                                </optgroup>
                              </Show>
                            )}
                          </For>
                        </select>
                      </div>
                    </Show>
                    <button
                      type="button"
                      onClick={handleBulkApply}
                      disabled={selectedCount() === 0}
                      class="px-3 py-1.5 rounded-full bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Terapkan ke Terpilih
                    </button>
                    <Show when={selectedCount() > 0}>
                      <span class="text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                        {selectedCount()} mahasiswa dipilih
                      </span>
                      <button
                        type="button"
                        onClick={clearSelection}
                        class="text-[11px] font-semibold text-secondary-500 hover:text-rose-600 underline"
                      >
                        Bersihkan seleksi
                      </button>
                    </Show>
                  </div>
                </Show>
                <Show when={isClassLocked()}>
                  <Show
                    when={role() === 'admin' || role() === 'prodi' || role() === 'dosen' || role() === 'instruktur'}
                  >
                    <button
                      onClick={handleUnlockKelas}
                      class="self-start px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-sm dark:bg-brand-700 dark:hover:bg-brand-600"
                    >
                      Buka Kunci
                    </button>
                  </Show>
                </Show>
              </div>

              {/* M1 — Nilai Akhir Langsung */}
              <Show when={activeMethod() === 'akhir'}>
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                      <th class="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label="Pilih semua mahasiswa"
                          checked={allVisibleSelected()}
                          onChange={toggleSelectAll}
                          class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th class="p-3">Mahasiswa</th>
                      <th class="p-3 text-center sticky right-0 bg-secondary-50/95 dark:bg-secondary-800 backdrop-blur-sm">
                        Nilai Akhir (0-{nilaiEnvelope().max})
                      </th>
                      <th class="p-3 text-center">Huruf</th>
                      <th class="p-3 text-center">Tersimpan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
                    <For
                      each={visibleStudents()}
                      fallback={
                        <tr>
                          <td colspan="5" class="p-4 text-center text-secondary-400 italic">
                            Tidak ada mahasiswa terdaftar di kelas ini.
                          </td>
                        </tr>
                      }
                    >
                      {(stud) => (
                        <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                          <td class="p-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${stud.nama}`}
                              checked={isKrsSelected(stud.krsId)}
                              onChange={() => toggleKrsSelected(stud.krsId)}
                              class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                            />
                          </td>
                          <td class="p-3">
                            <div class="flex items-center gap-2">
                              <StudentAvatar foto={stud.foto} nama={stud.nama} nim={stud.nim} size="sm" />
                              <div class="flex flex-col">
                                <span class="font-bold text-secondary-800 dark:text-white">{stud.nama}</span>
                                <span class="text-[10px] text-secondary-400">NIM: {stud.nim}</span>
                                <Show when={isMahasiswaHasHalusData(stud)}>
                                  <span class="text-[9px] font-bold text-brand-600">
                                    ℹ punya nilai komponen/sub — tetap dipertahankan
                                  </span>
                                </Show>
                              </div>
                            </div>
                          </td>
                          <td class="p-3 text-center">
                            <input
                              type="text"
                              placeholder="0.00"
                              disabled={isClassLocked()}
                              value={inputAkhir()[String(stud.krsId)] ?? ''}
                              onInput={(e) => handleAkhirChange(stud.krsId, e.currentTarget.value)}
                              class={`border rounded-lg px-2 h-11 w-20 text-center text-sm focus:outline-none focus:ring-2 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:text-white dark:bg-secondary-900 ${
                                isCellInvalid(inputAkhir()[String(stud.krsId)])
                                  ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 dark:bg-rose-950/30'
                                  : 'border-secondary-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-secondary-700'
                              }`}
                            />
                          </td>
                          <td class="p-3 text-center font-bold text-brand-700">
                            {getDynamicHuruf(parseGradeInput(inputAkhir()[String(stud.krsId)])) ?? '-'}
                          </td>
                          <td class="p-3 text-center">
                            <Show when={stud.nilaiAngka} fallback="-">
                              <span>
                                {stud.nilaiAngka} ({stud.nilaiHuruf})
                              </span>
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </Show>

              {/* M2 / M3 — Nilai Komponen & Sub-Komponen */}
              <Show when={activeMethod() !== 'akhir'}>
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
                        <th class="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            aria-label="Pilih semua mahasiswa"
                            checked={allVisibleSelected()}
                            onChange={toggleSelectAll}
                            class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                          />
                        </th>
                        <th class="p-3">Mahasiswa</th>
                        <For each={displayComponents()}>
                          {(c) => (
                            <th class="p-3 text-center">
                              {c.nama} ({c.bobot}%)
                              <Show when={componentHasSub(c.id!)}>
                                <span class="ml-1" title="Memiliki sub-komponen">
                                  [S]
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
                        each={visibleStudents()}
                        fallback={
                          <tr>
                            <td
                              colspan={(displayComponents()?.length || 0) + 3}
                              class="p-4 text-center text-secondary-400 italic"
                            >
                              Tidak ada mahasiswa terdaftar di kelas ini.
                            </td>
                          </tr>
                        }
                      >
                        {(stud) => (
                          <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                            <td class="p-3 text-center">
                              <input
                                type="checkbox"
                                aria-label={`Pilih ${stud.nama}`}
                                checked={isKrsSelected(stud.krsId)}
                                onChange={() => toggleKrsSelected(stud.krsId)}
                                class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
                              />
                            </td>
                            <td class="p-3">
                              <div class="flex items-center gap-2">
                                <StudentAvatar foto={stud.foto} nama={stud.nama} nim={stud.nim} size="sm" />
                                <div class="flex flex-col">
                                  <span class="font-bold text-secondary-800 dark:text-white">{stud.nama}</span>
                                  <span class="text-[10px] text-secondary-400">NIM: {stud.nim}</span>
                                </div>
                              </div>
                            </td>
                            <For each={displayComponents()}>
                              {(c) => (
                                <td class="p-3 text-center align-top">
                                  <Show
                                    when={componentHasSub(c.id!)}
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
                                        class={`border rounded-lg px-2 h-11 w-20 text-center text-sm focus:outline-none focus:ring-2 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:text-white dark:bg-secondary-900 ${
                                          isCellInvalid(inputGrades()[`${stud.krsId}_${c.id}`])
                                            ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 dark:bg-rose-950/30'
                                            : 'border-secondary-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-secondary-700'
                                        }`}
                                      />
                                    }
                                  >
                                    <Show
                                      when={activeMethod() === 'sub'}
                                      fallback={
                                        <div class="flex flex-col items-center gap-1">
                                          <input
                                            type="text"
                                            placeholder="0.00"
                                            disabled={isClassLocked()}
                                            value={inputGrades()[`${stud.krsId}_${c.id}`] ?? ''}
                                            onInput={(e) => handleGradeChange(stud.krsId, c.id!, e.currentTarget.value)}
                                            class={`border rounded-lg px-2 h-11 w-20 text-center text-sm focus:outline-none focus:ring-2 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:text-white dark:bg-secondary-900 ${
                                              isCellInvalid(inputGrades()[`${stud.krsId}_${c.id}`])
                                                ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 dark:bg-rose-950/30'
                                                : 'border-secondary-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-secondary-700'
                                            }`}
                                          />
                                          <span
                                            class="text-[9px] text-brand-600"
                                            title="Nilai langsung menimpa agregasi sub; nilai sub tetap tersimpan"
                                          >
                                            [S] override
                                          </span>
                                        </div>
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
                                                class={`border rounded-lg px-2 h-10 w-16 text-center text-xs focus:outline-none focus:ring-2 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:text-white dark:bg-secondary-900 ${
                                                  isCellInvalid(inputSubGrades()[`${stud.krsId}_${sub.id}`])
                                                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 dark:bg-rose-950/30'
                                                    : 'border-secondary-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-secondary-700'
                                                }`}
                                              />
                                            </div>
                                          )}
                                        </For>
                                        <span class="text-[10px] font-bold text-secondary-600 dark:text-secondary-300">
                                          Σ {komponenAggLabel(stud.krsId, c.id!, c.bobot)}
                                        </span>
                                      </div>
                                    </Show>
                                  </Show>
                                </td>
                              )}
                            </For>
                            <td class="p-3 text-center font-extrabold text-secondary-800 dark:text-white sticky right-0 bg-white dark:bg-secondary-900">
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
              </Show>
            </div>
          </div>
        </Show>
      </div>

      {/* Sticky action bar */}
      <Show when={selectedKelasId()}>
        <div class="fixed bottom-0 left-0 right-0 z-40 print:hidden border-t border-secondary-200 bg-white/90 backdrop-blur px-4 py-3 dark:bg-secondary-900/90 dark:border-secondary-800">
          <div class="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-secondary-600 dark:text-secondary-300">
              <span class="px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-800">
                {rekapOverall().lengkap}/{rekapOverall().total} NA lengkap
              </span>
              <span class="px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-800">
                Σ bobot {editableComponents().reduce((sum, item) => sum + item.bobot, 0)}%
              </span>
              <span class="px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-800">
                Rentang {nilaiEnvelope().min}-{nilaiEnvelope().max}
              </span>
              <Show when={dirtyCount() > 0}>
                <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {dirtyCount()} belum disimpan
                </span>
              </Show>
              <Show when={isClassLocked()}>
                <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                  Terkunci
                </span>
              </Show>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isExporting() || isClassLocked()}
                onClick={handleExportXLSX}
              >
                Ekspor Excel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isExporting() || isClassLocked()}
                onClick={handleExportCSVFile}
              >
                Ekspor CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isExporting() || isClassLocked()}
                onClick={handleDownloadTemplate}
              >
                Unduh Template
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isExporting() || isClassLocked()}
                onClick={handleExportPDF}
              >
                Cetak PDF (DNU)
              </Button>
              <Show when={!isClassLocked()}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const method = activeMethod();
                    if (method === 'akhir') handleSaveAkhir();
                    else if (method === 'komponen') handleSaveKomponenOnly();
                    else handleSaveGrades();
                  }}
                >
                  Simpan{selectedCount() > 0 ? ` (${selectedCount()})` : ''}
                </Button>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* F3 — Panel pemetaan kolom impor */}
      <Modal show={showMappingModal()} onClose={handleCloseMapping} title="Pemetaan Kolom Impor Nilai" maxWidth="xl">
        <div class="flex flex-col gap-4">
          <p class="text-xs text-secondary-600 dark:text-secondary-300 leading-relaxed">
            Cocokkan setiap kolom CSV ke komponen/sub-komponen tujuan. Kolom pertama selalu NIM, kolom kosong diabaikan,
            dan validasi akhir tetap dilakukan saat menyimpan.
          </p>

          <div class="flex flex-col gap-2">
            <span class="text-xs font-bold text-secondary-700 dark:text-secondary-200">Pemetaan Kolom</span>
            <div class="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              <For each={(pendingImportRows()[0] || []).map((h, i) => ({ h, i }))}>
                {(col) => (
                  <div class="flex items-center justify-between gap-3 rounded-lg border border-secondary-100 dark:border-secondary-800 px-3 py-2">
                    <span class="text-xs font-mono text-secondary-600 dark:text-secondary-300 truncate">
                      {col.i === 0 ? 'NIM (kolom 1)' : `${col.h || `Kolom ${col.i + 1}`}`}
                    </span>
                    <Show
                      when={col.i !== 0}
                      fallback={<span class="text-[11px] font-semibold text-secondary-400">NIM</span>}
                    >
                      <select
                        value={columnMapping()[col.i] ?? '__ignore__'}
                        onChange={(e) => setColumnMapping((prev) => ({ ...prev, [col.i]: e.currentTarget.value }))}
                        class="border border-secondary-200 rounded-lg px-2 py-1.5 text-xs min-w-56 dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                      >
                        <option value="__ignore__">-- Abaikan kolom ini --</option>
                        <For each={mappingTargetOptions()}>{(t) => <option value={t.key}>{t.label}</option>}</For>
                      </select>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>

          <Show when={mappingDiagnostics().duplicateTargets.length > 0}>
            <div class="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs font-medium dark:bg-rose-900/30 dark:text-rose-400">
              Target terpetakan lebih dari sekali: {mappingDiagnostics().duplicateTargets.join(', ')}
            </div>
          </Show>

          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-secondary-700 dark:text-secondary-200">
              Pratinjau (5 baris pertama)
            </span>
            <div class="overflow-auto max-h-52 border border-secondary-200 dark:border-secondary-800 rounded-lg">
              <table class="min-w-full text-left text-xs">
                <thead class="bg-secondary-50 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 font-bold">
                  <tr>
                    <For each={mappingKeptColumns()}>
                      {(i) => <th class="px-3 py-2 whitespace-nowrap">{i === 0 ? 'NIM' : columnMapping()[i]}</th>}
                    </For>
                  </tr>
                </thead>
                <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                  <For each={pendingImportRows().slice(1, 6)}>
                    {(row) => (
                      <tr>
                        <For each={mappingKeptColumns()}>
                          {(i) => (
                            <td class="px-3 py-1.5 text-secondary-700 dark:text-secondary-200">{row[i] ?? ''}</td>
                          )}
                        </For>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>

          <Show when={mappingDiagnostics().errors.length > 0}>
            <div class="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-900/20 dark:border-amber-800">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {mappingDiagnostics().errors.length} baris bermasalah (baris lain tetap dapat diimpor)
                </span>
                <Button variant="secondary" size="sm" onClick={handleDownloadImportErrors}>
                  Unduh Daftar Error
                </Button>
              </div>
              <div class="max-h-32 overflow-y-auto text-[11px] font-mono text-amber-800 dark:text-amber-300 flex flex-col gap-0.5">
                <For each={mappingDiagnostics().errors.slice(0, 50)}>
                  {(e) => (
                    <span>
                      Baris {e.line}: {e.error}
                    </span>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <div class="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCloseMapping}>
              Batal
            </Button>
            <Button
              variant="primary"
              disabled={mappingKeptColumns().length <= 1 || mappingDiagnostics().duplicateTargets.length > 0}
              onClick={handleConfirmMapping}
            >
              Lanjutkan Impor
            </Button>
          </div>
        </div>
      </Modal>

      <ImportCsvModal
        show={showImportModal()}
        onClose={() => setShowImportModal(false)}
        importUrl=""
        templateHeaders={importTemplateHeaders()}
        title={`Nilai ${
          activeMethod() === 'akhir' ? 'Akhir' : activeMethod() === 'komponen' ? 'Komponen' : 'Sub-Komponen'
        }`}
        description="Kolom pertama wajib 'nim'. Kolom lainnya menggunakan nama komponen/sub-komponen yang tertera pada template."
        onImport={handleImportNilais}
        onSuccess={() => refetchStudentsGrades()}
      />
    </MainLayout>
  );
}
