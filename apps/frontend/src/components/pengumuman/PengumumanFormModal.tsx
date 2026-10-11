import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import {
  LampiranItem,
  PengumumanItem,
  pengumumanController,
  TargetOptions,
} from '../../controllers/pengumumanController';
import { MarkdownEditor } from '../ui/MarkdownEditor';

interface PengumumanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: PengumumanItem | null;
  targetOptions: TargetOptions;
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
  const [publishMode, setPublishMode] = createSignal<'now' | 'scheduled'>('now');
  const [scheduledPublishAt, setScheduledPublishAt] = createSignal('');
  const [lampiran, setLampiran] = createSignal<LampiranItem[]>([]);

  // Link input states
  const [linkNama, setLinkNama] = createSignal('');
  const [linkUrl, setLinkUrl] = createSignal('');

  // Auto-save status states
  const [autoSaveStatus, setAutoSaveStatus] = createSignal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = createSignal<string>('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  let autoSaveTimeout: ReturnType<typeof setTimeout> | undefined;
  let fileUploadInput: HTMLInputElement | undefined;

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
        setLampiran(props.initialData.lampiran || []);
        if (props.initialData.status === 'scheduled' && props.initialData.publishedAt) {
          setPublishMode('scheduled');
          setScheduledPublishAt(props.initialData.publishedAt.slice(0, 16));
        } else {
          setPublishMode('now');
          setScheduledPublishAt('');
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
        setPublishMode('now');
        setScheduledPublishAt('');
        setLampiran([]);
      }
      setAutoSaveStatus('idle');
      setLastSavedTime('');
    }
  });

  // Debounced auto-save function
  const triggerAutoSave = () => {
    if (!props.isOpen || isSubmitting()) return;
    if (!judul().trim() && !konten().trim()) return;

    clearTimeout(autoSaveTimeout);
    setAutoSaveStatus('saving');

    autoSaveTimeout = setTimeout(async () => {
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
      }
    }, 2500); // 2.5 second debounce
  };

  onCleanup(() => {
    clearTimeout(autoSaveTimeout);
  });

  const handleAddLink = () => {
    if (!linkNama().trim() || !linkUrl().trim()) return;
    setLampiran([
      ...lampiran(),
      {
        tipe: 'link',
        nama: linkNama().trim(),
        url: linkUrl().trim(),
      },
    ]);
    setLinkNama('');
    setLinkUrl('');
    triggerAutoSave();
  };

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const res = await pengumumanController.uploadAttachment(file);
      setLampiran([...lampiran(), res]);
      triggerAutoSave();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah lampiran');
    } finally {
      if (input) input.value = '';
    }
  };

  const removeLampiran = (index: number) => {
    setLampiran(lampiran().filter((_, i) => i !== index));
    triggerAutoSave();
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
        publishMode: publishMode(),
        scheduledPublishAt: publishMode() === 'scheduled' ? new Date(scheduledPublishAt()).toISOString() : null,
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

  const toggleKelas = (id: number) => {
    if (targetKelasIds().includes(id)) {
      setTargetKelasIds(targetKelasIds().filter((kId) => kId !== id));
    } else {
      setTargetKelasIds([...targetKelasIds(), id]);
    }
    triggerAutoSave();
  };

  const toggleRombel = (id: number) => {
    if (targetRombelIds().includes(id)) {
      setTargetRombelIds(targetRombelIds().filter((rId) => rId !== id));
    } else {
      setTargetRombelIds([...targetRombelIds(), id]);
    }
    triggerAutoSave();
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Modal Header & Auto-Save Status Bar */}
          <div class="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-800 px-6 py-4 bg-secondary-50/50 dark:bg-secondary-800/20">
            <div>
              <h2 class="text-lg font-bold text-secondary-900 dark:text-white">
                {currentId() ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </h2>
              <div class="flex items-center gap-2 mt-0.5 text-xs">
                <Show when={autoSaveStatus() === 'saving'}>
                  <span class="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Menyimpan draf otomatis...
                  </span>
                </Show>
                <Show when={autoSaveStatus() === 'saved'}>
                  <span class="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    ✓ Draf tersimpan ({lastSavedTime()})
                  </span>
                </Show>
                <Show when={autoSaveStatus() === 'error'}>
                  <span class="text-rose-500 font-medium">Gagal menyimpan draf otomatis</span>
                </Show>
                <Show when={autoSaveStatus() === 'idle'}>
                  <span class="text-secondary-400">Penyimpanan draf otomatis aktif</span>
                </Show>
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

          {/* Modal Scrollable Body */}
          <form onSubmit={handlePublishSubmit} class="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Judul & Pin */}
            <div class="space-y-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                Judul Pengumuman *
              </label>
              <div class="flex items-center gap-3">
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jadwal Pelaksanaan Ujian Akhir Semester Genap..."
                  value={judul()}
                  onInput={(e) => {
                    setJudul(e.currentTarget.value);
                    triggerAutoSave();
                  }}
                  class="flex-1 px-4 py-2.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0066cc]"
                />
                <label class="flex items-center gap-2 cursor-pointer select-none px-3 py-2 border border-amber-300 dark:border-amber-600/50 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={isPinned()}
                    onChange={(e) => {
                      setIsPinned(e.currentTarget.checked);
                      triggerAutoSave();
                    }}
                    class="rounded text-amber-500 focus:ring-amber-400"
                  />
                  📌 Sematkan (Pin)
                </label>
              </div>
            </div>

            {/* Target Sasaran (Role, Prodi, Scope) */}
            <div class="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 space-y-4">
              <div class="text-xs font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                🎯 Target Audiens Pengumuman
              </div>

              {/* Target Role */}
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-secondary-600 dark:text-secondary-400">Ditujukan Untuk:</label>
                <div class="flex flex-wrap gap-2">
                  <For each={['semua', 'mahasiswa', 'dosen', 'admin'] as const}>
                    {(r) => (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRole(r);
                          triggerAutoSave();
                        }}
                        class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          targetRole() === r
                            ? 'bg-[#0066cc] text-white shadow-xs'
                            : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700'
                        }`}
                      >
                        {r === 'semua'
                          ? 'Semua Sivitas'
                          : r === 'mahasiswa'
                            ? 'Mahasiswa'
                            : r === 'dosen'
                              ? 'Dosen / Pengajar'
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

                <Show when={targetScopeType() === 'kelas'}>
                  <div class="p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    <For each={props.targetOptions.kelas}>
                      {(kl) => (
                        <button
                          type="button"
                          onClick={() => toggleKelas(kl.id)}
                          class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            targetKelasIds().includes(kl.id)
                              ? 'bg-brand-600 text-white'
                              : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300'
                          }`}
                        >
                          {kl.namaKelas}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>

                <Show when={targetScopeType() === 'rombel'}>
                  <div class="p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    <For each={props.targetOptions.rombel}>
                      {(rm) => (
                        <button
                          type="button"
                          onClick={() => toggleRombel(rm.id)}
                          class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            targetRombelIds().includes(rm.id)
                              ? 'bg-brand-600 text-white'
                              : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300'
                          }`}
                        >
                          {rm.namaGroup}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </div>

            {/* Markdown Rich Text Editor */}
            <div class="space-y-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                Isi Pengumuman (Format Markdown) *
              </label>
              <MarkdownEditor
                value={konten()}
                onChange={(val) => {
                  setKonten(val);
                  triggerAutoSave();
                }}
                rows={12}
              />
            </div>

            {/* Lampiran File, Gambar, & Link */}
            <div class="p-4 rounded-2xl bg-secondary-50 dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-800 space-y-4">
              <div class="text-xs font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                📎 Lampiran Berkas & Tautan Eksternal
              </div>

              {/* Existing attachments list */}
              <Show when={lampiran().length > 0}>
                <div class="space-y-2">
                  <For each={lampiran()}>
                    {(l, idx) => (
                      <div class="flex items-center justify-between p-2.5 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl text-xs">
                        <div class="flex items-center gap-2 truncate">
                          <span>{l.tipe === 'link' ? '🔗' : l.tipe === 'gambar' ? '🖼️' : '📄'}</span>
                          <span class="font-medium text-secondary-800 dark:text-secondary-200 truncate">{l.nama}</span>
                          <span class="text-secondary-400 truncate max-w-[200px]">({l.url})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLampiran(idx())}
                          class="text-rose-500 hover:text-rose-700 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>

              {/* Upload file or add link controls */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* Upload File */}
                <div class="p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl space-y-2">
                  <div class="text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                    Unggah Berkas/Dokumen
                  </div>
                  <input
                    type="file"
                    ref={fileUploadInput}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.xlsx,.pptx,.zip,image/*"
                    class="block w-full text-xs text-secondary-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-secondary-100 file:text-secondary-700 hover:file:bg-secondary-200"
                  />
                  <p class="text-[11px] text-secondary-400">PDF, Word, Excel, ZIP, atau Gambar (Maks 25MB)</p>
                </div>

                {/* Add External Link */}
                <div class="p-3 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl space-y-2">
                  <div class="text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                    Tambah Tautan / Link
                  </div>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      placeholder="Judul Link"
                      value={linkNama()}
                      onInput={(e) => setLinkNama(e.currentTarget.value)}
                      class="flex-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs bg-transparent"
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={linkUrl()}
                      onInput={(e) => setLinkUrl(e.currentTarget.value)}
                      class="flex-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700 text-xs bg-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      class="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary-800 text-white hover:bg-secondary-900 dark:bg-secondary-700 transition-colors"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              </div>
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
