import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import {
  type ConflictResolution,
  khsController,
  type PullApplyResult,
  type PullDiffStatus,
  type PullEntityKey,
  type PullPreviewItem,
  type PullPreviewResult,
} from '../controllers/khsController';

export function PddiktiSync() {
  const toast = useToast();
  const [stats, { refetch: refetchStats }] = createResource(async () => {
    try {
      return await khsController.getPddiktiStats();
    } catch {
      return null;
    }
  });

  const [pullCatalog, { refetch: refetchCatalog }] = createResource(async () => {
    try {
      return await khsController.getPullEntities();
    } catch {
      return null;
    }
  });

  const [selectedEntity, setSelectedEntity] = createSignal<PullEntityKey>('semester');
  const [feederFilter, setFeederFilter] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<'actionable' | 'all' | PullDiffStatus>('actionable');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [conflictResolution, setConflictResolution] = createSignal<ConflictResolution>('lokal');

  const [confirmingPull, setConfirmingPull] = createSignal(false);
  const [loadingPreview, setLoadingPreview] = createSignal(false);
  const [applyingPull, setApplyingPull] = createSignal(false);
  const [previewError, setPreviewError] = createSignal('');
  const [previewData, setPreviewData] = createSignal<PullPreviewResult | null>(null);
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [applyResult, setApplyResult] = createSignal<PullApplyResult | null>(null);

  const [isSyncing, setIsSyncing] = createSignal(false);
  const [syncLogs, setSyncLogs] = createSignal<string[]>([]);

  const currentEntityMeta = createMemo(() => pullCatalog()?.entities.find((e) => e.key === selectedEntity()) ?? null);

  const filteredItems = createMemo<PullPreviewItem[]>(() => {
    const data = previewData();
    if (!data) return [];
    const sf = statusFilter();
    const q = searchQuery().trim().toLowerCase();
    return data.items.filter((item) => {
      if (sf === 'actionable' && item.status === 'sama') return false;
      if (sf !== 'all' && sf !== 'actionable' && item.status !== sf) return false;
      if (q && !item.label.toLowerCase().includes(q) && !item.naturalKey.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  const selectableFilteredIds = createMemo(() =>
    filteredItems()
      .filter((i) => i.canApply && i.status !== 'sama')
      .map((i) => i.feederId),
  );

  const allFilteredSelected = createMemo(() => {
    const ids = selectableFilteredIds();
    if (ids.length === 0) return false;
    const set = new Set(selectedIds());
    return ids.every((id) => set.has(id));
  });

  const toggleSelectAllFiltered = (checked: boolean) => {
    const filteredSet = new Set(selectableFilteredIds());
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredSet])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    }
  };

  const toggleItem = (feederId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(feederId) ? prev : [...prev, feederId]));
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== feederId));
    }
  };

  const handleSelectEntity = (key: PullEntityKey) => {
    setSelectedEntity(key);
    setConfirmingPull(false);
    setPreviewData(null);
    setSelectedIds([]);
    setPreviewError('');
    setApplyResult(null);
  };

  const executeFetchPreview = async () => {
    setConfirmingPull(false);
    setLoadingPreview(true);
    setPreviewError('');
    setApplyResult(null);
    try {
      const res = await khsController.getPullPreview(selectedEntity(), feederFilter());
      setPreviewData(res);
      // Pilih otomatis baris yang baru atau hanya butuh tautan ID (aman).
      const safeDefaultIds = res.items
        .filter((i) => i.canApply && (i.status === 'baru' || i.status === 'link_id'))
        .map((i) => i.feederId);
      setSelectedIds(safeDefaultIds);
      refetchCatalog();
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : 'Gagal menarik preview dari Neo Feeder');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApplySelected = async () => {
    const ids = selectedIds();
    if (ids.length === 0) {
      toast.showToast('Pilih minimal satu baris untuk diterapkan.', 'error');
      return;
    }
    setApplyingPull(true);
    setPreviewError('');
    try {
      const res = await khsController.applyPull({
        entity: selectedEntity(),
        feederIds: ids,
        conflictResolution: conflictResolution(),
        filter: feederFilter(),
      });
      toast.showToast(
        `Berhasil menerapkan data (${res.inserted} baru, ${res.linkedOnly} ditautkan, ${res.updated} diperbarui).`,
        'success',
      );
      refetchStats();
      await executeFetchPreview();
      // Setelah refresh preview (yang mereset applyResult) baru tampilkan ringkasan hasil.
      setApplyResult(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal menerapkan data Feeder ke lokal';
      setPreviewError(msg);
      toast.showToast(msg, 'error');
    } finally {
      setApplyingPull(false);
    }
  };

  const statusBadgeVariant = (status: PullDiffStatus): 'success' | 'info' | 'warning' | 'default' => {
    if (status === 'baru') return 'info';
    if (status === 'link_id') return 'success';
    if (status === 'konflik') return 'warning';
    return 'default';
  };

  const statusLabel = (status: PullDiffStatus): string => {
    if (status === 'baru') return 'Baru di Feeder';
    if (status === 'link_id') return 'Tautkan ID PDDIKTI';
    if (status === 'konflik') return 'Berbeda (Konflik)';
    return 'Sudah Sinkron';
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncLogs([
      'Menjalankan penandaan kesiapan sinkronisasi lokal...',
      'Mengumpulkan data akademik lokal yang belum ditandai...',
    ]);

    try {
      setTimeout(() => {
        setSyncLogs((prev) => [...prev, 'Memproses Program Studi dan Mata Kuliah lokal...']);
      }, 800);

      setTimeout(() => {
        setSyncLogs((prev) => [...prev, 'Memvalidasi data Mahasiswa dan Kelas Kuliah lokal...']);
      }, 1500);

      const res = await khsController.syncPddikti();

      setTimeout(() => {
        setSyncLogs((prev) => [
          ...prev,
          `Program Studi ditandai siap: +${res.details.prodiSynced} data`,
          `Mata Kuliah ditandai siap: +${res.details.mataKuliahSynced} data`,
          `Mahasiswa ditandai siap: +${res.details.mahasiswaSynced} data`,
          `Kelas Kuliah ditandai siap: +${res.details.kelasSynced} data`,
          `KRS & Nilai ditandai siap: +${res.details.krsSynced} data`,
          '-------------------------------------------------------',
          '✅ Selesai memperbarui status kesiapan lokal (tanpa mengubah server Feeder).',
        ]);
        setIsSyncing(false);
        refetchStats();
        toast.showToast('Status sinkronisasi lokal diperbarui!', 'success');
      }, 2500);
    } catch (e: unknown) {
      setSyncLogs((prev) => [...prev, `❌ ERROR: ${(e as Error).message || 'Gagal memperbarui status sinkronisasi'}`]);
      setIsSyncing(false);
      toast.showToast('Gagal melakukan sinkronisasi PDDIKTI.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6 max-w-6xl mx-auto p-4">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
                PDDIKTI Feeder Sync
              </h1>
              <Show when={pullCatalog()}>
                {(cat) => (
                  <Badge variant={cat().writeGuard ? 'success' : 'warning'}>
                    {cat().writeGuard ? 'Write Guard ON (Baca Saja)' : 'Write Guard OFF'}
                  </Badge>
                )}
              </Show>
            </div>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Tarik data referensi & master dari Neo Feeder PDDIKTI (read-only Get*) dan pantau kesiapan data lokal
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing()}
            class="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-xl disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-accent-100 flex items-center gap-2 dark:bg-brand-700 dark:hover:bg-brand-600"
          >
            <Show when={isSyncing()} fallback="⚡ Tandai Kesiapan Lokal">
              <span class="animate-spin">🔄</span> Memproses...
            </Show>
          </button>
        </div>

        {/* Section: Tarik Data dari Neo Feeder (Read-Only Pull) */}
        <Card>
          <div class="flex flex-col gap-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-secondary-100 pb-4 dark:border-secondary-800">
              <div>
                <h2 class="text-lg font-bold text-secondary-800 dark:text-white">
                  Tarik Data dari Neo Feeder ke Aplikasi (Pull)
                </h2>
                <p class="text-xs text-secondary-500 dark:text-secondary-400">
                  Tahap 1: Referensi (Periode/Semester & Program Studi) dan Master (Mata Kuliah, Dosen, Mahasiswa).
                  Operasi ke Feeder murni baca (<code class="font-mono">Get*</code>) lalu diterapkan ke database lokal.
                </p>
              </div>
              <a
                href="/konfigurasi-parameter"
                class="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                Pengaturan Koneksi & Write Guard →
              </a>
            </div>

            {/* Entity Selector */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <For each={pullCatalog()?.entities ?? []}>
                {(ent) => {
                  const active = () => selectedEntity() === ent.key;
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEntity(ent.key)}
                      class={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all active:scale-95 ${
                        active()
                          ? 'border-brand-600 bg-brand-50/70 dark:border-brand-500 dark:bg-brand-900/30'
                          : 'border-secondary-200 bg-white hover:border-secondary-300 dark:border-secondary-800 dark:bg-secondary-900'
                      }`}
                    >
                      <div class="flex w-full items-center justify-between gap-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-secondary-400">
                          {ent.category === 'referensi' ? '1. Referensi' : '2. Master'}
                        </span>
                        <code class="text-[10px] font-mono text-brand-600 dark:text-brand-400">{ent.feederAct}</code>
                      </div>
                      <span class="text-sm font-bold text-secondary-800 dark:text-white">{ent.label}</span>
                    </button>
                  );
                }}
              </For>
            </div>

            <Show when={currentEntityMeta()}>
              {(meta) => (
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-3 rounded-xl bg-secondary-50/70 p-4 dark:bg-secondary-900/50">
                  <div class="flex-1 flex flex-col gap-2">
                    <p class="text-xs text-secondary-600 dark:text-secondary-300">{meta().description}</p>
                    <label class="flex flex-col gap-1 text-xs font-semibold text-secondary-600 dark:text-secondary-300">
                      Filter Feeder Opsional (klausa filter WS Feeder, kosongkan untuk semua)
                      <Input
                        type="text"
                        value={feederFilter()}
                        onInput={(e) => setFeederFilter(e.currentTarget.value)}
                        placeholder="Contoh: id_semester='20241' atau kosongkan"
                      />
                    </label>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="primary" loading={loadingPreview()} onClick={() => setConfirmingPull(true)}>
                      Tarik Preview ({meta().feederAct})
                    </Button>
                  </div>
                </div>
              )}
            </Show>

            {/* Konfirmasi Eksplisit sebelum menghubungi Server Feeder */}
            <Show when={confirmingPull() && currentEntityMeta()}>
              {(meta) => (
                <div class="rounded-xl border border-brand-300 bg-brand-50/80 p-4 dark:border-brand-700 dark:bg-brand-900/30">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex flex-col gap-1">
                      <span class="text-sm font-bold text-secondary-800 dark:text-white">
                        Konfirmasi Interaksi ke Server Neo Feeder
                      </span>
                      <p class="text-xs text-secondary-600 dark:text-secondary-300">
                        Aplikasi akan mengirim permintaan <strong>baca-saja</strong> (
                        <code class="font-mono">GetToken</code> + <code class="font-mono">{meta().feederAct}</code>) ke
                        server Feeder untuk menampilkan perbandingan data. Tidak ada data di Feeder maupun lokal yang
                        diubah pada tahap preview ini.
                      </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => setConfirmingPull(false)}>
                        Batal
                      </Button>
                      <Button variant="primary" size="sm" loading={loadingPreview()} onClick={executeFetchPreview}>
                        Ya, Hubungi Feeder
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Show>

            <Show when={previewError()}>
              <div class="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/30 dark:text-danger-400">
                {previewError()}
              </div>
            </Show>

            <Show when={applyResult()}>
              {(res) => (
                <div class="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-800 dark:border-success-800 dark:bg-success-900/30 dark:text-success-300">
                  <strong>Hasil Penerapan:</strong> {res().inserted} ditambahkan baru · {res().linkedOnly} ditautkan ID
                  PDDIKTI · {res().updated} diperbarui · {res().skipped} dilewati
                  <Show when={res().errors.length > 0}>
                    <span>
                      {' '}
                      · {res().errors.length} gagal ({res().errors[0]?.error})
                    </span>
                  </Show>
                </div>
              )}
            </Show>

            {/* Preview Results */}
            <Show when={previewData()}>
              {(data) => (
                <div class="flex flex-col gap-4">
                  {/* Summary Pills */}
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('actionable')}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          statusFilter() === 'actionable'
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
                        }`}
                      >
                        Perlu Tindakan ({data().summary.baru + data().summary.linkId + data().summary.konflik})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('baru')}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          statusFilter() === 'baru'
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
                        }`}
                      >
                        Baru ({data().summary.baru})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('link_id')}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          statusFilter() === 'link_id'
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
                        }`}
                      >
                        Tautkan ID ({data().summary.linkId})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('konflik')}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          statusFilter() === 'konflik'
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
                        }`}
                      >
                        Konflik ({data().summary.konflik})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('sama')}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          statusFilter() === 'sama'
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
                        }`}
                      >
                        Sudah Sinkron ({data().summary.sama})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        class={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          statusFilter() === 'all'
                            ? 'bg-brand-600 text-white'
                            : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
                        }`}
                      >
                        Semua ({data().summary.totalFeeder})
                      </button>
                    </div>

                    <div class="w-full sm:w-64">
                      <Input
                        type="search"
                        value={searchQuery()}
                        onInput={(e) => setSearchQuery(e.currentTarget.value)}
                        placeholder="Cari kode / nama..."
                      />
                    </div>
                  </div>

                  {/* Conflict Policy & Apply Action Bar */}
                  <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-secondary-200 p-3 dark:border-secondary-800">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-secondary-700 dark:text-secondary-200">
                      <span class="font-semibold">Kebijakan saat baris Konflik dipilih:</span>
                      <select
                        value={conflictResolution()}
                        onChange={(e) => setConflictResolution(e.currentTarget.value as ConflictResolution)}
                        class="rounded-lg border border-secondary-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary-800 dark:border-secondary-700 dark:bg-secondary-900 dark:text-secondary-100"
                      >
                        <option value="lokal">Pertahankan nilai lokal (hanya tautkan ID PDDIKTI)</option>
                        <option value="feeder">Ikuti nilai Feeder (perbarui field yang berbeda)</option>
                      </select>
                    </div>

                    <div class="flex items-center justify-end gap-2">
                      <span class="text-xs text-secondary-500 dark:text-secondary-400">
                        {selectedIds().length} baris dipilih
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={applyingPull()}
                        disabled={selectedIds().length === 0}
                        onClick={handleApplySelected}
                      >
                        Terapkan ke Lokal ({selectedIds().length})
                      </Button>
                    </div>
                  </div>

                  {/* Table */}
                  <div class="overflow-x-auto rounded-xl border border-secondary-200 dark:border-secondary-800">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-secondary-50 text-secondary-600 uppercase dark:bg-secondary-800/60 dark:text-secondary-300">
                        <tr>
                          <th class="p-3 w-10">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected()}
                              disabled={selectableFilteredIds().length === 0}
                              onChange={(e) => toggleSelectAllFiltered(e.currentTarget.checked)}
                              class="h-4 w-4 rounded border-secondary-300 text-brand-600"
                            />
                          </th>
                          <th class="p-3">Kunci / Identitas</th>
                          <th class="p-3">Status Perbandingan</th>
                          <th class="p-3">Detail Perbedaan / Catatan</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800">
                        <Show
                          when={filteredItems().length > 0}
                          fallback={
                            <tr>
                              <td colspan={4} class="p-6 text-center text-secondary-400">
                                Tidak ada baris pada filter ini.
                              </td>
                            </tr>
                          }
                        >
                          <For each={filteredItems()}>
                            {(item) => {
                              const checked = () => selectedIds().includes(item.feederId);
                              return (
                                <tr class="hover:bg-secondary-50/60 dark:hover:bg-secondary-800/40">
                                  <td class="p-3 align-top">
                                    <input
                                      type="checkbox"
                                      checked={checked()}
                                      disabled={!item.canApply || item.status === 'sama'}
                                      onChange={(e) => toggleItem(item.feederId, e.currentTarget.checked)}
                                      class="h-4 w-4 rounded border-secondary-300 text-brand-600 disabled:opacity-40"
                                    />
                                  </td>
                                  <td class="p-3 align-top">
                                    <div class="font-bold text-secondary-800 dark:text-white">{item.label}</div>
                                    <div class="text-[11px] font-mono text-secondary-400">
                                      ID Feeder: {item.feederId}
                                      <Show when={item.localId !== null}>
                                        <span> · Lokal #{String(item.localId)}</span>
                                      </Show>
                                    </div>
                                  </td>
                                  <td class="p-3 align-top">
                                    <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                                  </td>
                                  <td class="p-3 align-top text-secondary-600 dark:text-secondary-300">
                                    <Show when={item.diffs.length > 0}>
                                      <div class="flex flex-col gap-1">
                                        <For each={item.diffs}>
                                          {(d) => (
                                            <div>
                                              <span class="font-semibold">{d.field}:</span>{' '}
                                              <span class="line-through text-rose-500">
                                                {String(d.localValue ?? '-')}
                                              </span>{' '}
                                              →{' '}
                                              <span class="font-semibold text-emerald-600">
                                                {String(d.feederValue ?? '-')}
                                              </span>
                                            </div>
                                          )}
                                        </For>
                                      </div>
                                    </Show>
                                    <Show when={item.diffs.length === 0 && item.status === 'link_id'}>
                                      <span>Data cocok; akan menautkan id_pddikti ke baris lokal.</span>
                                    </Show>
                                    <Show when={item.diffs.length === 0 && item.status === 'baru' && !item.note}>
                                      <span>Belum ada di database lokal; akan ditambahkan baru.</span>
                                    </Show>
                                    <Show when={item.note}>
                                      <span class="text-amber-600 dark:text-amber-400">{item.note}</span>
                                    </Show>
                                  </td>
                                </tr>
                              );
                            }}
                          </For>
                        </Show>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </Card>

        {/* Stats Grid */}
        <Show
          when={stats()}
          fallback={
            <div class="text-center py-12 text-secondary-400 dark:text-secondary-200">
              Memuat status sinkronisasi...
            </div>
          }
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mahasiswa Stats */}
            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <div class="flex justify-between items-center">
                <span class="text-xs uppercase font-extrabold tracking-wider text-secondary-400 dark:text-secondary-200">
                  Data Mahasiswa
                </span>
                <span class="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-bold rounded">PDDIKTI</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-3xl font-extrabold text-secondary-800 dark:text-white">
                  {stats()?.mahasiswa?.total}
                </span>
                <span class="text-xs text-secondary-400 font-medium">Total Mahasiswa Terdaftar</span>
              </div>
              <div class="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <p class="text-secondary-400 dark:text-secondary-200">Tersinkron</p>
                  <p class="font-bold text-accent-600 dark:text-accent-400">{stats()?.mahasiswa?.synced}</p>
                </div>
                <div>
                  <p class="text-secondary-400 dark:text-secondary-200">Belum Sinkron</p>
                  <p class="font-bold text-rose-500 dark:text-rose-400">{stats()?.mahasiswa?.unsynced}</p>
                </div>
              </div>
            </div>

            {/* Kelas Stats */}
            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <div class="flex justify-between items-center">
                <span class="text-xs uppercase font-extrabold tracking-wider text-secondary-400 dark:text-secondary-200">
                  Kelas Kuliah
                </span>
                <span class="px-2 py-0.5 bg-accent-50 text-accent-600 text-[10px] font-bold rounded dark:bg-accent-900/30 dark:text-accent-400">
                  PDDIKTI
                </span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-3xl font-extrabold text-secondary-800 dark:text-white">
                  {stats()?.kelasKuliah?.total}
                </span>
                <span class="text-xs text-secondary-400 font-medium">Total Kelas Kuliah</span>
              </div>
              <div class="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <p class="text-secondary-400 dark:text-secondary-200">Tersinkron</p>
                  <p class="font-bold text-accent-600 dark:text-accent-400">{stats()?.kelasKuliah?.synced}</p>
                </div>
                <div>
                  <p class="text-secondary-400 dark:text-secondary-200">Belum Sinkron</p>
                  <p class="font-bold text-rose-500 dark:text-rose-400">{stats()?.kelasKuliah?.unsynced}</p>
                </div>
              </div>
            </div>

            {/* KRS Stats */}
            <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
              <div class="flex justify-between items-center">
                <span class="text-xs uppercase font-extrabold tracking-wider text-secondary-400 dark:text-secondary-200">
                  KRS & Nilai
                </span>
                <span class="px-2 py-0.5 bg-accent-50 text-accent-600 text-[10px] font-bold rounded">PDDIKTI</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-3xl font-extrabold text-secondary-800 dark:text-white">{stats()?.krs?.total}</span>
                <span class="text-xs text-secondary-400 font-medium">Total KRS Terkontrak</span>
              </div>
              <div class="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <p class="text-secondary-400 dark:text-secondary-200">Tersinkron</p>
                  <p class="font-bold text-accent-600 dark:text-accent-400">{stats()?.krs?.synced}</p>
                </div>
                <div>
                  <p class="text-secondary-400 dark:text-secondary-200">Belum Sinkron</p>
                  <p class="font-bold text-rose-500 dark:text-rose-400">{stats()?.krs?.unsynced}</p>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Sync Console Logs */}
        <Show when={syncLogs().length > 0}>
          <div class="bg-secondary-900 rounded-2xl p-6 border border-secondary-800 shadow-xl flex flex-col gap-4 font-mono text-xs text-secondary-300 dark:border-secondary-700">
            <div class="flex justify-between items-center border-b border-secondary-800 pb-2">
              <span class="text-secondary-400 font-bold uppercase tracking-wider dark:text-secondary-200">
                Sync Log Console
              </span>
              <span class="w-3 h-3 bg-accent-500 rounded-full animate-ping"></span>
            </div>
            <div class="flex flex-col gap-2 max-h-72 overflow-y-auto">
              <For each={syncLogs()}>
                {(log) => (
                  <div
                    class={`${log.startsWith('❌') ? 'text-rose-400' : log.startsWith('✅') ? 'text-accent-450 font-bold' : 'text-secondary-300'}`}
                  >
                    {log}
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
