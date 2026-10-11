import { createEffect, createMemo, createSignal, For, onCleanup, Show } from 'solid-js';
import {
  LampiranItem,
  PengumumanItem,
  pengumumanController,
  TargetOptions,
} from '../../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MultiSearchableOption, MultiSearchableSelect } from '../ui/MultiSearchableSelect';
import { RichMarkdownEditor } from '../ui/RichMarkdownEditor';

interface PengumumanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PengumumanItem | null;
  targetOptions: TargetOptions;
}

function toLocalDateTimeInput(isoString?: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PengumumanFormModal(props: PengumumanFormModalProps) {
  const [currentId, setCurrentId] = createSignal<number | undefined>(undefined);
  const [judul, setJudul] = createSignal('');
  const [konten, setKonten] = createSignal('');
  const [targetRole, setTargetRole] = createSignal<'semua' | 'mahasiswa' | 'dosen' | 'admin'>('semua');
  const [targetProdiType, setTargetProdiType] = createSignal<'semua' | 'spesifik'>('semua');
  const [targetProdiIds, setTargetProdiIds] = createSignal<number[]>([]);
  const [targetScopeType, setTargetScopeType] = createSignal<'umum' | 'kelas' | 'rombel'>('umum');
  const [targetKelasIds, setTargetKelasIds] = createSignal<number[]>([]);
  const [targetRombelIds, setTargetRombelIds] = createSignal<number[]>([]);
  const [isPinned, setIsPinned] = createSignal(false);
  const [thumbnailUrl, setThumbnailUrl] = createSignal<string | null>(null);
  const [publishMode, setPublishMode] = createSignal<'now' | 'scheduled'>('now');
  const [scheduledPublishAt, setScheduledPublishAt] = createSignal('');
  const [expiresMode, setExpiresMode] = createSignal<'forever' | 'scheduled'>('forever');
  const [expiresAt, setExpiresAt] = createSignal('');
  const [lampiran, setLampiran] = createSignal<LampiranItem[]>([]);

  // Thumbnail upload states
  const [isUploadingThumbnail, setIsUploadingThumbnail] = createSignal(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = createSignal(false);

  // Auto-save status states
  const [autoSaveStatus, setAutoSaveStatus] = createSignal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = createSignal<string>('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  let isAutoSaving = false;

  let autoSaveTimeout: ReturnType<typeof setTimeout> | undefined;
  let thumbnailInputRef: HTMLInputElement | undefined;

  // Initialize or reset form when initialData or isOpen changes
  createEffect(() => {
    if (props.isOpen) {
      if (props.initialData) {
        setCurrentId(props.initialData.id);
        setJudul(props.initialData.judul);
        setKonten(props.initialData.konten);
        setTargetRole(props.initialData.targetRole);
        setTargetProdiType(props.initialData.targetProdiType);
        setTargetProdiIds(props.initialData.targetProdiIds || []);
        setTargetScopeType(props.initialData.targetScopeType);
        setTargetKelasIds(props.initialData.targetKelasIds || []);
        setTargetRombelIds(props.initialData.targetRombelIds || []);
        setIsPinned(props.initialData.isPinned);
        setThumbnailUrl(props.initialData.thumbnailUrl || null);
        setLampiran(props.initialData.lampiran || []);
        if (props.initialData.status === 'scheduled' && props.initialData.publishedAt) {
          setPublishMode('scheduled');
          setScheduledPublishAt(toLocalDateTimeInput(props.initialData.publishedAt));
        } else {
          setPublishMode('now');
          setScheduledPublishAt('');
        }
        if (props.initialData.expiresAt) {
          setExpiresMode('scheduled');
          setExpiresAt(toLocalDateTimeInput(props.initialData.expiresAt));
        } else {
          setExpiresMode('forever');
          setExpiresAt('');
        }
      } else {
        setCurrentId(undefined);
        setJudul('');
        setKonten('');
        setTargetRole('semua');
        setTargetProdiType('semua');
        setTargetProdiIds([]);
        setTargetScopeType('umum');
        setTargetKelasIds([]);
        setTargetRombelIds([]);
        setIsPinned(false);
        setThumbnailUrl(null);
        setPublishMode('now');
        setScheduledPublishAt('');
        setExpiresMode('forever');
        setExpiresAt('');
        setLampiran([]);
      }
      setAutoSaveStatus('idle');
      setLastSavedTime('');
    }
  });

  // Debounced auto-save function
  const triggerAutoSave = () => {
    if (!props.isOpen || isSubmitting() || isAutoSaving) return;
    if (!judul().trim() && !konten().trim()) return;

    clearTimeout(autoSaveTimeout);
    setAutoSaveStatus('saving');

    autoSaveTimeout = setTimeout(async () => {
      if (isAutoSaving) return;
      isAutoSaving = true;
      try {
        const res = await pengumumanController.saveDraft({
          id: currentId(),
          judul: judul().trim() || 'Draf Pengumuman',
          konten: konten(),
          targetRole: targetRole(),
          targetProdiType: targetProdiType(),
          targetProdiIds: targetProdiIds(),
          targetScopeType: targetScopeType(),
          targetKelasIds: targetKelasIds(),
          targetRombelIds: targetRombelIds(),
          isPinned: isPinned(),
          thumbnailUrl: thumbnailUrl(),
          expiresAt: expiresMode() === 'scheduled' && expiresAt() ? new Date(expiresAt()).toISOString() : null,
          lampiran: lampiran(),
        });
        if (!currentId()) {
          setCurrentId(res.id);
        }
        setAutoSaveStatus('saved');
        setLastSavedTime(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        );
      } catch {
        setAutoSaveStatus('error');
      } finally {
        isAutoSaving = false;
      }
    }, 2500); // 2.5 second debounce
  };

  onCleanup(() => {
    clearTimeout(autoSaveTimeout);
  });

  // Handle upload thumbnail image
  const handleThumbnailUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File thumbnail harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    setIsUploadingThumbnail(true);
    try {
      const res = await pengumumanController.uploadAttachment(file);
      setThumbnailUrl(res.url);
      triggerAutoSave();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah thumbnail');
    } finally {
      setIsUploadingThumbnail(false);
      if (input) input.value = '';
    }
  };

  // Upload attachment via RichMarkdownEditor
  const handleEditorAttachmentUpload = async (file: File) => {
    setIsUploadingAttachment(true);
    try {
      const res = await pengumumanController.uploadAttachment(file);
      // Track in lampiran array as well
      setLampiran((prev) => [...prev, res]);
      triggerAutoSave();
      return {
        fileName: res.nama,
        fileUrl: res.url,
      };
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah lampiran');
      return null;
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handlePublishSubmit = async (e: Event) => {
    e.preventDefault();
    if (!judul().trim()) {
      alert('Judul pengumuman wajib diisi');
      return;
    }
    if (!konten().trim()) {
      alert('Konten pengumuman wajib diisi');
      return;
    }

    if (publishMode() === 'scheduled' && !scheduledPublishAt()) {
      alert('Tentukan tanggal & jam tayang pengumuman');
      return;
    }

    if (expiresMode() === 'scheduled' && !expiresAt()) {
      alert('Tentukan batas waktu berakhir pengumuman');
      return;
    }

    setIsSubmitting(true);
    clearTimeout(autoSaveTimeout);
    try {
      await pengumumanController.publish({
        id: currentId(),
        judul: judul().trim(),
        konten: konten(),
        targetRole: targetRole(),
        targetProdiType: targetProdiType(),
        targetProdiIds: targetProdiIds(),
        targetScopeType: targetScopeType(),
        targetKelasIds: targetKelasIds(),
        targetRombelIds: targetRombelIds(),
        isPinned: isPinned(),
        thumbnailUrl: thumbnailUrl(),
        publishMode: publishMode(),
        scheduledPublishAt: publishMode() === 'scheduled' ? new Date(scheduledPublishAt()).toISOString() : null,
        expiresAt: expiresMode() === 'scheduled' && expiresAt() ? new Date(expiresAt()).toISOString() : null,
        lampiran: lampiran(),
      });
      props.onSuccess();
      props.onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mempublikasikan pengumuman');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleProdi = (id: number) => {
    if (targetProdiIds().includes(id)) {
      setTargetProdiIds(targetProdiIds().filter((pId) => pId !== id));
    } else {
      setTargetProdiIds([...targetProdiIds(), id]);
    }
    triggerAutoSave();
  };

  // Transform options for MultiSearchableSelect
  const kelasOptions = createMemo<MultiSearchableOption[]>(() => {
    return (props.targetOptions.kelas || []).map((kl) => ({
      id: kl.id,
      label: `${kl.namaKelas} — ${kl.mataKuliah}${kl.dosenPengajar ? ` (${kl.dosenPengajar})` : ''}`,
      subLabel: `Mata Kuliah: ${kl.mataKuliah}${kl.dosenPengajar ? ` • Dosen: ${kl.dosenPengajar}` : ''}`,
      badgeText: kl.namaKelas,
    }));
  });

  const rombelOptions = createMemo<MultiSearchableOption[]>(() => {
    return (props.targetOptions.rombel || []).map((rm) => ({
      id: rm.id,
      label: `${rm.namaGroup} — ${rm.kelas}${rm.instruktur ? ` (${rm.instruktur})` : ''}`,
      subLabel: `Kelas: ${rm.kelas}${rm.instruktur ? ` • Instruktur: ${rm.instruktur}` : ''}`,
      badgeText: rm.namaGroup,
    }));
  });

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header & Auto-Save Status Bar */}
          <div class="px-6 py-4 border-b border-secondary-200 dark:border-secondary-800 flex items-center justify-between shrink-0 bg-secondary-50/50 dark:bg-secondary-800/30">
            <div>
              <h2 class="text-base font-bold text-secondary-900 dark:text-white">
                {currentId() ? 'Ubah Pengumuman' : 'Buat Pengumuman Baru'}
              </h2>
              <div class="flex items-center gap-2 mt-0.5 text-xs text-secondary-500">
                <span>Sasaran Fleksibel</span>
                <span>•</span>
                <span class="inline-flex items-center gap-1">
                  <Show when={autoSaveStatus() === 'saving'}>
                    <span class="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Menyimpan draf...</span>
                  </Show>
                  <Show when={autoSaveStatus() === 'saved'}>
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Tersimpan otomatis ({lastSavedTime()})</span>
                  </Show>
                  <Show when={autoSaveStatus() === 'error'}>
                    <span class="inline-block w-2 h-2 rounded-full bg-rose-500" />
                    <span>Gagal auto-save</span>
                  </Show>
                  <Show when={autoSaveStatus() === 'idle'}>
                    <span class="inline-block w-2 h-2 rounded-full bg-secondary-300 dark:bg-secondary-600" />
                    <span>Auto-save aktif</span>
                  </Show>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="p-2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handlePublishSubmit} class="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Judul & Pin Option */}
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <label class="block text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                  Judul Pengumuman *
                </label>
                <label class="inline-flex items-center gap-2 text-xs font-medium text-secondary-700 dark:text-secondary-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPinned()}
                    onChange={(e) => {
                      setIsPinned(e.currentTarget.checked);
                      triggerAutoSave();
                    }}
                    class="rounded border-secondary-300 text-[#0066cc] focus:ring-[#0066cc]"
                  />
                  <span>📌 Sematkan di Baris Atas (Pin Slide)</span>
                </label>
              </div>
              <input
                type="text"
                value={judul()}
                onInput={(e) => {
                  setJudul(e.currentTarget.value);
                  triggerAutoSave();
                }}
                placeholder="Masukkan judul pengumuman yang jelas dan ringkas..."
                class="w-full px-4 py-3 rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-hidden focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 transition-all font-medium"
                required
              />
            </div>

            {/* Thumbnail Image Picker */}
            <div class="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    🖼️ Gambar Thumbnail (Opsional)
                  </div>
                  <div class="text-[11px] text-secondary-500">
                    Gambar sampul yang akan ditampilkan di slide card dan feed pengumuman.
                  </div>
                </div>
                <Show when={thumbnailUrl()}>
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailUrl(null);
                      triggerAutoSave();
                    }}
                    class="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                  >
                    Hapus Thumbnail
                  </button>
                </Show>
              </div>

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                class="hidden"
                disabled={isUploadingThumbnail()}
                onChange={handleThumbnailUpload}
              />

              <Show
                when={thumbnailUrl()}
                fallback={
                  <div
                    onClick={() => thumbnailInputRef?.click()}
                    class="border-2 border-dashed border-secondary-200 dark:border-secondary-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-white dark:bg-secondary-900 transition-colors"
                  >
                    <span class="text-xl">📸</span>
                    <span class="text-xs font-medium text-secondary-700 dark:text-secondary-300">
                      {isUploadingThumbnail() ? 'Mengunggah thumbnail...' : 'Pilih Gambar Thumbnail'}
                    </span>
                    <span class="text-[11px] text-secondary-400">Format JPG, PNG, atau WebP (maks 5MB)</span>
                  </div>
                }
              >
                <div class="flex items-center gap-4 bg-white dark:bg-secondary-900 p-2.5 rounded-xl border border-secondary-200 dark:border-secondary-700">
                  <img
                    src={getAbsoluteStorageUrl(thumbnailUrl()!)}
                    alt="Thumbnail Preview"
                    class="w-24 h-16 object-cover rounded-lg border border-secondary-200 dark:border-secondary-800"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-medium text-secondary-800 dark:text-secondary-200 truncate">
                      {thumbnailUrl()}
                    </div>
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef?.click()}
                      class="text-xs text-brand-600 hover:underline mt-1 font-semibold"
                    >
                      Ganti Gambar
                    </button>
                  </div>
                </div>
              </Show>
            </div>

            {/* Target Audiens: Role, Prodi, Kelas, Rombel */}
            <div class="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 space-y-4">
              <div class="text-xs font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                🎯 Sasaran Audiens Pengumuman
              </div>

              {/* Target Role */}
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-secondary-600 dark:text-secondary-400">
                  Ditujukan Kepada (Role):
                </label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <For each={['semua', 'mahasiswa', 'dosen', 'admin'] as const}>
                    {(role) => (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRole(role);
                          triggerAutoSave();
                        }}
                        class={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                          targetRole() === role
                            ? 'bg-[#0066cc] text-white border-[#0066cc] shadow-sm'
                            : 'bg-white dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 border-secondary-200 dark:border-secondary-700 hover:border-secondary-300'
                        }`}
                      >
                        {role === 'semua'
                          ? 'Semua Civitas'
                          : role === 'mahasiswa'
                            ? 'Mahasiswa'
                            : role === 'dosen'
                              ? 'Dosen & Pengajar'
                              : 'Admin / Staf'}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Target Prodi */}
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <label class="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                    Lingkup Program Studi:
                  </label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetProdiType('semua');
                        setTargetProdiIds([]);
                        triggerAutoSave();
                      }}
                      class={`px-3 py-1 rounded-md text-xs font-medium ${
                        targetProdiType() === 'semua'
                          ? 'bg-secondary-800 text-white dark:bg-secondary-200 dark:text-secondary-900'
                          : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      Semua Prodi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetProdiType('spesifik');
                        triggerAutoSave();
                      }}
                      class={`px-3 py-1 rounded-md text-xs font-medium ${
                        targetProdiType() === 'spesifik'
                          ? 'bg-secondary-800 text-white dark:bg-secondary-200 dark:text-secondary-900'
                          : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      Pilih Prodi Spesifik
                    </button>
                  </div>
                </div>

                <Show when={targetProdiType() === 'spesifik'}>
                  <div class="p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex flex-wrap gap-2">
                    <For each={props.targetOptions.prodi}>
                      {(pr) => (
                        <button
                          type="button"
                          onClick={() => toggleProdi(pr.id)}
                          class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            targetProdiIds().includes(pr.id)
                              ? 'bg-brand-600 text-white'
                              : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300'
                          }`}
                        >
                          {pr.nama}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Target Scope (Umum vs Kelas vs Rombel) */}
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <label class="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                    Lingkup Kelas/Rombel:
                  </label>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetScopeType('umum');
                        setTargetKelasIds([]);
                        setTargetRombelIds([]);
                        triggerAutoSave();
                      }}
                      class={`px-3 py-1 rounded-md text-xs font-medium ${
                        targetScopeType() === 'umum'
                          ? 'bg-secondary-800 text-white dark:bg-secondary-200 dark:text-secondary-900'
                          : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      Umum
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetScopeType('kelas');
                        setTargetRombelIds([]);
                        triggerAutoSave();
                      }}
                      class={`px-3 py-1 rounded-md text-xs font-medium ${
                        targetScopeType() === 'kelas'
                          ? 'bg-secondary-800 text-white dark:bg-secondary-200 dark:text-secondary-900'
                          : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      Kelas Tertentu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetScopeType('rombel');
                        setTargetKelasIds([]);
                        triggerAutoSave();
                      }}
                      class={`px-3 py-1 rounded-md text-xs font-medium ${
                        targetScopeType() === 'rombel'
                          ? 'bg-secondary-800 text-white dark:bg-secondary-200 dark:text-secondary-900'
                          : 'bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 border border-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      Rombel Tertentu
                    </button>
                  </div>
                </div>

                {/* Autocomplete Multi-Select for Kelas */}
                <Show when={targetScopeType() === 'kelas'}>
                  <div class="space-y-1">
                    <MultiSearchableSelect
                      options={kelasOptions()}
                      selectedIds={targetKelasIds()}
                      onChange={(newIds) => {
                        setTargetKelasIds(newIds);
                        triggerAutoSave();
                      }}
                      placeholder="Ketik nama mata kuliah, dosen pengajar, atau nama kelas..."
                      emptyMessage="Semua kelas yang tersedia sudah dipilih."
                    />
                    <p class="text-[11px] text-secondary-400">
                      Ketikkan nama subjek mata kuliah, nama dosen pengampu, atau nama kelas untuk memfilter saran.
                    </p>
                  </div>
                </Show>

                {/* Autocomplete Multi-Select for Rombel */}
                <Show when={targetScopeType() === 'rombel'}>
                  <div class="space-y-1">
                    <MultiSearchableSelect
                      options={rombelOptions()}
                      selectedIds={targetRombelIds()}
                      onChange={(newIds) => {
                        setTargetRombelIds(newIds);
                        triggerAutoSave();
                      }}
                      placeholder="Ketik nama grup rombel, kelas, atau nama instruktur..."
                      emptyMessage="Semua rombel praktikum sudah dipilih."
                    />
                    <p class="text-[11px] text-secondary-400">
                      Ketikkan nama grup rombel, kelas praktikum, atau nama instruktur untuk memfilter saran.
                    </p>
                  </div>
                </Show>
              </div>
            </div>

            {/* Rich Markdown Editor with Attachment & Link Support */}
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                  Isi Pengumuman (Rich Markdown) *
                </label>
                <span class="text-[11px] text-secondary-400">
                  Gunakan tombol 🔗 tautan atau 📎 berkas di toolbar untuk menyisipkan lampiran langsung ke dalam teks.
                </span>
              </div>
              <RichMarkdownEditor
                value={konten()}
                onInput={(val) => {
                  setKonten(val);
                  triggerAutoSave();
                }}
                onUploadAttachment={handleEditorAttachmentUpload}
                uploadingAttachment={isUploadingAttachment()}
                maxAttachmentMb={25}
                rows={12}
                placeholder="Tulis pengumuman di sini... Sisipkan lampiran dokumen dan link menggunakan toolbar di atas."
              />
            </div>

            {/* Scheduled Release Option */}
            <div class="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 space-y-3">
              <div class="text-xs font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                🕒 Pengaturan Waktu Tayang / Rilis
              </div>

              <div class="flex flex-col sm:flex-row gap-3">
                <label class="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex-1 text-xs">
                  <input
                    type="radio"
                    name="publishMode"
                    value="now"
                    checked={publishMode() === 'now'}
                    onChange={() => {
                      setPublishMode('now');
                      triggerAutoSave();
                    }}
                    class="text-[#0066cc]"
                  />
                  <div>
                    <div class="font-bold text-secondary-900 dark:text-white">Rilis Sekarang (Live)</div>
                    <div class="text-secondary-500 text-[11px]">Langsung tayang dan muncul di feed audiens</div>
                  </div>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex-1 text-xs">
                  <input
                    type="radio"
                    name="publishMode"
                    value="scheduled"
                    checked={publishMode() === 'scheduled'}
                    onChange={() => {
                      setPublishMode('scheduled');
                      triggerAutoSave();
                    }}
                    class="text-[#0066cc]"
                  />
                  <div>
                    <div class="font-bold text-secondary-900 dark:text-white">Jadwalkan Waktu Rilis</div>
                    <div class="text-secondary-500 text-[11px]">Hanya tayang otomatis setelah jadwal tiba</div>
                  </div>
                </label>
              </div>

              <Show when={publishMode() === 'scheduled'}>
                <div class="pt-2">
                  <label class="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                    Pilih Tanggal & Waktu Rilis Live:
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledPublishAt()}
                    onInput={(e) => {
                      setScheduledPublishAt(e.currentTarget.value);
                      triggerAutoSave();
                    }}
                    class="px-3 py-2 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs text-secondary-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </Show>
            </div>

            {/* Expiration / Auto Take-Down Option */}
            <div class="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 space-y-3">
              <div class="text-xs font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                ⏱️ Batas Waktu Pengumuman Live
              </div>

              <div class="flex flex-col sm:flex-row gap-3">
                <label class="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex-1 text-xs">
                  <input
                    type="radio"
                    name="expiresMode"
                    value="forever"
                    checked={expiresMode() === 'forever'}
                    onChange={() => {
                      setExpiresMode('forever');
                      setExpiresAt('');
                      triggerAutoSave();
                    }}
                    class="text-[#0066cc]"
                  />
                  <div>
                    <div class="font-bold text-secondary-900 dark:text-white">Tayang Seterusnya (Takedown Manual)</div>
                    <div class="text-secondary-500 text-[11px]">
                      Tetap live sampai Anda menekan tombol Tarik Pengumuman
                    </div>
                  </div>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex-1 text-xs">
                  <input
                    type="radio"
                    name="expiresMode"
                    value="scheduled"
                    checked={expiresMode() === 'scheduled'}
                    onChange={() => {
                      setExpiresMode('scheduled');
                      triggerAutoSave();
                    }}
                    class="text-[#0066cc]"
                  />
                  <div>
                    <div class="font-bold text-secondary-900 dark:text-white">Sampai Batas Waktu Tertentu</div>
                    <div class="text-secondary-500 text-[11px]">
                      Otomatis hilang dari feed publik setelah batas waktu tercapai
                    </div>
                  </div>
                </label>
              </div>

              <Show when={expiresMode() === 'scheduled'}>
                <div class="pt-2">
                  <label class="block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">
                    Pilih Batas Akhir Tayang (Kadaluarsa):
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt()}
                    onInput={(e) => {
                      setExpiresAt(e.currentTarget.value);
                      triggerAutoSave();
                    }}
                    class="px-3 py-2 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs text-secondary-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </Show>
            </div>

            {/* Modal Actions */}
            <div class="border-t border-secondary-200 dark:border-secondary-800 pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={async () => {
                  await pengumumanController.saveDraft({
                    id: currentId(),
                    judul: judul().trim() || 'Draf Pengumuman',
                    konten: konten(),
                    targetRole: targetRole(),
                    targetProdiType: targetProdiType(),
                    targetProdiIds: targetProdiIds(),
                    targetScopeType: targetScopeType(),
                    targetKelasIds: targetKelasIds(),
                    targetRombelIds: targetRombelIds(),
                    isPinned: isPinned(),
                    thumbnailUrl: thumbnailUrl(),
                    expiresAt:
                      expiresMode() === 'scheduled' && expiresAt() ? new Date(expiresAt()).toISOString() : null,
                    lampiran: lampiran(),
                  });
                  props.onSuccess();
                  props.onClose();
                }}
                class="px-4 py-2.5 rounded-xl text-xs font-semibold text-secondary-700 dark:text-secondary-200 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 transition-colors"
              >
                Simpan Sebagai Draf
              </button>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={props.onClose}
                  class="px-4 py-2.5 rounded-xl text-xs font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting()}
                  class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0066cc] hover:bg-[#0071e3] active:scale-95 shadow-md transition-all"
                >
                  {isSubmitting()
                    ? 'Memproses...'
                    : publishMode() === 'scheduled'
                      ? '🕒 Jadwalkan Pengumuman'
                      : '🚀 Publikasikan Sekarang'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
}
