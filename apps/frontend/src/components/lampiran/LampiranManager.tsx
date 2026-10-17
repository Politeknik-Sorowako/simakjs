import { createSignal, For, Show } from 'solid-js';
import { LampiranStatus } from '../../controllers/cutiController';
import { Button } from '../ui/Button';

export interface PendingLampiranFiles {
  sk: File | null;
  pendukung: File[];
}

export interface LampiranManagerProps {
  items: LampiranStatus[];
  readonly?: boolean;
  pendingFiles?: PendingLampiranFiles;
  onPendingChange?: (files: PendingLampiranFiles) => void;
  onUpload?: (file: File, jenis: 'sk' | 'pendukung', keterangan?: string) => Promise<void>;
  onDelete?: (lampiranId: number) => Promise<void>;
  onOpen: (lampiranId: number) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function LampiranManager(props: LampiranManagerProps) {
  const [uploadingSk, setUploadingSk] = createSignal(false);
  const [uploadingPendukung, setUploadingPendukung] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  const skItem = () => props.items.find((item) => item.jenis === 'sk');
  const pendukungItems = () => props.items.filter((item) => item.jenis === 'pendukung');

  let skInputRef: HTMLInputElement | undefined;
  let pendukungInputRef: HTMLInputElement | undefined;

  // Kontrol tambah/unggah hanya tampil bila memang ada handler yang menerima
  // berkas. Modal view-only (tanpa onUpload/onPendingChange) tidak boleh
  // menampilkan tombol unggah yang tidak melakukan apa-apa.
  const canAdd = () => !props.readonly && (props.onUpload !== undefined || props.onPendingChange !== undefined);

  const handleSkFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file Surat SK maksimal 10 MB');
      input.value = '';
      return;
    }

    setErrorMsg('');
    if (props.onUpload) {
      setUploadingSk(true);
      try {
        await props.onUpload(file, 'sk');
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal mengunggah Surat SK');
      } finally {
        setUploadingSk(false);
        input.value = '';
      }
    } else if (props.onPendingChange && props.pendingFiles) {
      props.onPendingChange({
        ...props.pendingFiles,
        sk: file,
      });
      input.value = '';
    }
  };

  const handlePendukungFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        setErrorMsg(`File ${f.name} melebihi batas 10 MB`);
        input.value = '';
        return;
      }
    }

    setErrorMsg('');
    if (props.onUpload) {
      setUploadingPendukung(true);
      try {
        for (const file of files) {
          await props.onUpload(file, 'pendukung');
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal mengunggah berkas pendukung');
      } finally {
        setUploadingPendukung(false);
        input.value = '';
      }
    } else if (props.onPendingChange && props.pendingFiles) {
      props.onPendingChange({
        ...props.pendingFiles,
        pendukung: [...props.pendingFiles.pendukung, ...files],
      });
      input.value = '';
    }
  };

  const removePendingSk = () => {
    if (props.onPendingChange && props.pendingFiles) {
      props.onPendingChange({
        ...props.pendingFiles,
        sk: null,
      });
    }
  };

  const removePendingPendukung = (index: number) => {
    if (props.onPendingChange && props.pendingFiles) {
      const updated = [...props.pendingFiles.pendukung];
      updated.splice(index, 1);
      props.onPendingChange({
        ...props.pendingFiles,
        pendukung: updated,
      });
    }
  };

  return (
    <div class="flex flex-col gap-4 text-sm">
      <Show when={errorMsg()}>
        <div class="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900">
          {errorMsg()}
        </div>
      </Show>

      {/* SEKSI 1: SURAT SK */}
      <div class="p-4 rounded-2xl border border-secondary-200/80 dark:border-secondary-800 bg-secondary-50/40 dark:bg-secondary-900/40">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="font-semibold text-secondary-900 dark:text-white flex items-center gap-1.5">
              <span>Surat Keputusan (SK)</span>
              <span class="text-xs font-normal text-secondary-400">(Opsional, maks. 10MB)</span>
            </div>
            <p class="text-xs text-secondary-500">Unggah salinan dokumen resmi SK izin/yudisium.</p>
          </div>
          <Show when={canAdd()}>
            <input
              type="file"
              ref={skInputRef}
              class="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleSkFileSelect}
            />
          </Show>
        </div>

        {/* Existing uploaded SK */}
        <Show
          when={skItem()}
          fallback={
            /* Pending SK (local state during create) */
            <Show
              when={props.pendingFiles?.sk}
              fallback={
                <Show when={canAdd()}>
                  <button
                    type="button"
                    disabled={uploadingSk()}
                    onClick={() => skInputRef?.click()}
                    class="w-full py-3 px-4 border border-dashed border-secondary-300 dark:border-secondary-700 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-secondary-600 hover:text-action hover:border-brand-400 dark:text-secondary-300 transition-colors"
                  >
                    <span>+ Pilih Surat SK (PDF / Gambar)</span>
                  </button>
                </Show>
              }
            >
              <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700">
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <div class="w-8 h-8 rounded-lg bg-action-50 text-action dark:bg-brand-950/60 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <div class="truncate">
                    <div class="font-medium text-xs text-secondary-900 dark:text-white truncate">
                      {props.pendingFiles?.sk?.name}
                    </div>
                    <div class="text-[11px] text-secondary-400">
                      {props.pendingFiles?.sk && formatBytes(props.pendingFiles.sk.size)} &bull; Menunggu simpan
                    </div>
                  </div>
                </div>
                <Show when={!props.readonly}>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => skInputRef?.click()}
                      class="text-xs text-action hover:underline px-2 py-1 font-medium"
                    >
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={removePendingSk}
                      class="text-xs text-red-600 hover:underline px-2 py-1 font-medium"
                    >
                      Batal
                    </button>
                  </div>
                </Show>
              </div>
            </Show>
          }
        >
          <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-action-50 text-action dark:bg-brand-950/60 dark:text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                SK
              </div>
              <div class="truncate">
                <div class="font-medium text-xs text-secondary-900 dark:text-white truncate">{skItem()?.fileName}</div>
                <div class="text-[11px] text-secondary-400">
                  {formatBytes(skItem()?.fileSize || 0)} &bull; Tersimpan
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => skItem() && props.onOpen(skItem()!.id)}
                type="button"
              >
                Lihat SK
              </Button>
              <Show when={!props.readonly && props.onUpload}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={uploadingSk()}
                  onClick={() => skInputRef?.click()}
                  type="button"
                >
                  {uploadingSk() ? 'Mengganti...' : 'Ganti'}
                </Button>
              </Show>
              <Show when={!props.readonly && props.onDelete}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Hapus dokumen Surat SK ini?')) {
                      skItem() && props.onDelete!(skItem()!.id);
                    }
                  }}
                  type="button"
                >
                  Hapus
                </Button>
              </Show>
            </div>
          </div>
        </Show>
      </div>

      {/* SEKSI 2: BERKAS PENDUKUNG */}
      <div class="p-4 rounded-2xl border border-secondary-200/80 dark:border-secondary-800 bg-secondary-50/40 dark:bg-secondary-900/40">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="font-semibold text-secondary-900 dark:text-white flex items-center gap-1.5">
              <span>Berkas Pendukung</span>
              <span class="text-xs font-normal text-secondary-400">(Opsional, multi-file)</span>
            </div>
            <p class="text-xs text-secondary-500">Surat permohonan, bukti pembayaran, surat keterangan dokter, dll.</p>
          </div>
          <Show when={canAdd()}>
            <div>
              <input
                type="file"
                ref={pendukungInputRef}
                multiple
                class="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handlePendukungFileSelect}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={uploadingPendukung()}
                onClick={() => pendukungInputRef?.click()}
                type="button"
              >
                {uploadingPendukung() ? 'Mengunggah...' : '+ Tambah Berkas'}
              </Button>
            </div>
          </Show>
        </div>

        <div class="flex flex-col gap-2">
          {/* Uploaded items */}
          <For each={pendukungItems()}>
            {(item) => (
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700">
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <div class="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                    DOC
                  </div>
                  <div class="truncate">
                    <div class="font-medium text-xs text-secondary-900 dark:text-white truncate">{item.fileName}</div>
                    <div class="text-[11px] text-secondary-400">{formatBytes(item.fileSize)}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => props.onOpen(item.id)} type="button">
                    Buka
                  </Button>
                  <Show when={!props.readonly && props.onDelete}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Hapus berkas"${item.fileName}"?`)) {
                          props.onDelete!(item.id);
                        }
                      }}
                      type="button"
                    >
                      Hapus
                    </Button>
                  </Show>
                </div>
              </div>
            )}
          </For>

          {/* Pending files (create mode) */}
          <For each={props.pendingFiles?.pendukung || []}>
            {(file, idx) => (
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700">
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                    NEW
                  </div>
                  <div class="truncate">
                    <div class="font-medium text-xs text-secondary-900 dark:text-white truncate">{file.name}</div>
                    <div class="text-[11px] text-secondary-400">{formatBytes(file.size)} &bull; Menunggu simpan</div>
                  </div>
                </div>
                <Show when={!props.readonly}>
                  <button
                    type="button"
                    onClick={() => removePendingPendukung(idx())}
                    class="text-xs text-red-600 hover:underline px-2 py-1 font-medium"
                  >
                    Batal
                  </button>
                </Show>
              </div>
            )}
          </For>

          <Show when={pendukungItems().length === 0 && (props.pendingFiles?.pendukung.length || 0) === 0}>
            <div class="text-center py-4 text-xs text-secondary-400">Belum ada berkas pendukung dilampirkan.</div>
          </Show>
        </div>
      </div>
    </div>
  );
}
