import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { type KopSurat as KopSuratData, systemController } from '../../controllers/systemController';
import KopSurat from '../cetak/KopSurat';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

const LOGO_MIME = ['image/png', 'image/jpeg'];
const LOGO_MAX_MB = 2;

/**
 * Tab"Kop Surat" — desain kop surat global yang diterapkan ke semua dokumen
 * cetak (KHS, SKPI, BKD, KRS, Surat Peringatan, dst.). Admin mengedit teks,
 * mengunggah logo kustom, dan melihat pratinjau langsung sebelum menyimpan.
 */
export default function TabKopSurat() {
  const toast = useToast();
  const [kop, { refetch }] = createResource(() => systemController.getKop());

  // Salinan lokal untuk diedit (di-reset dari server setelah simpan).
  const [form, setForm] = createSignal<{
    nama: string;
    alamatPerBaris: string;
    kontak: string;
    website: string;
    email: string;
    tampilkanLogo: boolean;
  } | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal('');

  // Sinkronkan form dari server saat data tiba (sekali — atau ulang setelah
  // refetch ketika admin belum mengedit, ditandai form() === null).
  createEffect(() => {
    const k = kop();
    if (k && form() === null) {
      setForm({
        nama: k.nama,
        alamatPerBaris: k.alamat.join('\n'),
        kontak: k.kontak,
        website: k.website,
        email: k.email,
        tampilkanLogo: k.tampilkanLogo,
      });
    }
  });

  const patch = (p: Partial<NonNullable<ReturnType<typeof form>>>) =>
    setForm((prev) => ({ ...(prev ?? ({} as NonNullable<ReturnType<typeof form>>)), ...p }));

  const dirty = () => {
    const f = form();
    const k = kop();
    if (!f || !k) return false;
    return (
      f.nama !== k.nama ||
      f.alamatPerBaris !== k.alamat.join('\n') ||
      f.kontak !== k.kontak ||
      f.website !== k.website ||
      f.email !== k.email ||
      f.tampilkanLogo !== k.tampilkanLogo
    );
  };

  /** Kop hasil edit untuk pratinjau live. */
  const previewKop = (): KopSuratData => {
    const f = form();
    const k = kop();
    const base: KopSuratData = k ?? {
      nama: 'POLITEKNIK SOROWAKO',
      alamat: [],
      kontak: '',
      website: '',
      email: '',
      tampilkanLogo: true,
      logoCustom: false,
      logoUrl: null,
    };
    if (!f) return base;
    return {
      ...base,
      nama: f.nama || base.nama,
      alamat: f.alamatPerBaris
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      kontak: f.kontak,
      website: f.website,
      email: f.email,
      tampilkanLogo: f.tampilkanLogo,
    };
  };

  const handleSave = async () => {
    const f = form();
    if (!f) return;
    if (!f.nama.trim()) {
      setNotice('Nama institusi wajib diisi.');
      return;
    }
    if (!f.alamatPerBaris.split('\n').some((s) => s.trim())) {
      setNotice('Minimal satu baris alamat wajib diisi.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      await systemController.updateKop({
        nama: f.nama.trim(),
        alamat: f.alamatPerBaris
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        kontak: f.kontak.trim(),
        website: f.website.trim(),
        email: f.email.trim(),
        tampilkanLogo: f.tampilkanLogo,
      });
      setForm(null); // reset dari server → sinkron state bersih
      await refetch();
      setNotice('Kop surat global berhasil disimpan — berlaku untuk semua dokumen cetak.');
      toast.showToast('Kop surat global diperbarui', 'success');
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal menyimpan kop surat global.');
    } finally {
      setSaving(false);
    }
  };

  // ── Logo kustom ───────────────────────────────────────────────────────────
  const [uploading, setUploading] = createSignal(false);
  const [removing, setRemoving] = createSignal(false);
  const [confirmRemove, setConfirmRemove] = createSignal(false);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!LOGO_MIME.includes(file.type)) {
      setNotice('Format logo harus PNG atau JPG.');
      return;
    }
    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      setNotice(`Ukuran logo maksimal ${LOGO_MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    setNotice('');
    try {
      await systemController.uploadKopLogo(file);
      await refetch();
      setNotice('Logo kustom berhasil diunggah.');
      toast.showToast('Logo kop diperbarui', 'success');
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal mengunggah logo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirmRemove()) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 4000);
      return;
    }
    setRemoving(true);
    setNotice('');
    try {
      await systemController.deleteKopLogo();
      await refetch();
      setConfirmRemove(false);
      setNotice('Logo kustom dihapus — kembali ke logo bawaan.');
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal menghapus logo kustom.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <Show when={notice()}>
        <div class="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-800 dark:bg-success-900/30 dark:text-success-400">
          {notice()}
        </div>
      </Show>

      {/* Pratinjau langsung */}
      <Card>
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-secondary-400">Pratinjau Kop Surat</p>
        <div class="rounded-2xl border border-secondary-100 bg-white p-6 dark:border-secondary-800 dark:bg-secondary-950">
          <KopSurat kop={previewKop()} />
          <p class="mt-3 text-center text-sm font-semibold uppercase tracking-widest text-secondary-700">
            Judul dokumen & nomor surat tampil di bawah garis ini (khusus tiap dokumen)
          </p>
        </div>
      </Card>

      {/* Form teks */}
      <Card>
        <Show when={form()} fallback={<p class="text-sm text-secondary-400">Memuat konfigurasi kop...</p>}>
          {(f) => (
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Nama Institusi
                <Input
                  value={f().nama}
                  onInput={(e) => patch({ nama: e.currentTarget.value })}
                  placeholder="POLITEKNIK SOROWAKO"
                  maxLength={120}
                />
              </label>

              <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Alamat <span class="text-xs font-normal text-secondary-400">(1 baris = 1 baris kop, maks 4)</span>
                <textarea
                  value={f().alamatPerBaris}
                  onInput={(e) => patch({ alamatPerBaris: e.currentTarget.value })}
                  rows={3}
                  maxLength={400}
                  class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-sm text-secondary-800 focus:outline-none focus:ring-2 focus:ring-action-focus dark:bg-secondary-900 dark:border-secondary-700 dark:text-white"
                />
              </label>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                  Telepon / Fax
                  <Input
                    value={f().kontak}
                    onInput={(e) => patch({ kontak: e.currentTarget.value })}
                    placeholder="Telepon [021] ... • Fax [021] ..."
                    maxLength={300}
                  />
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                  Email
                  <Input
                    value={f().email}
                    onInput={(e) => patch({ email: e.currentTarget.value })}
                    placeholder="info@politekniksorowako.ac.id"
                    maxLength={200}
                  />
                </label>
              </div>

              <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Website
                <Input
                  value={f().website}
                  onInput={(e) => patch({ website: e.currentTarget.value })}
                  placeholder="https://www.politekniksorowako.ac.id"
                  maxLength={200}
                />
              </label>

              <label class="flex items-center gap-2 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                <input
                  type="checkbox"
                  checked={f().tampilkanLogo}
                  onChange={(e) => patch({ tampilkanLogo: e.currentTarget.checked })}
                  class="h-4 w-4 rounded border-secondary-300 text-action focus:ring-action-focus"
                />
                Tampilkan logo pada kop surat
              </label>

              <div class="flex justify-end">
                <Button variant="primary" loading={saving()} disabled={!dirty()} onClick={handleSave}>
                  Simpan Kop Surat
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Card>

      {/* Logo kustom */}
      <Card>
        <p class="text-sm font-semibold text-secondary-800 dark:text-secondary-100">Logo Kop</p>
        <p class="mt-1 text-xs text-secondary-500">
          PNG atau JPG, maksimal {LOGO_MAX_MB} MB. Berlaku untuk semua dokumen cetak. Tanpa unggahan, memakai logo
          bawaan aplikasi.
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <label class="cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg"
              class="sr-only"
              onChange={(e) => handleUpload(e.currentTarget.files?.[0])}
            />
            <span class="inline-flex items-center rounded-full border border-secondary-300 bg-white px-4 py-2 text-xs font-semibold text-secondary-700 transition-all active:scale-95 dark:border-secondary-700 dark:bg-secondary-800 dark:text-secondary-200">
              {uploading() ? 'Mengunggah...' : 'Unggah Logo'}
            </span>
          </label>
          <Show when={kop()?.logoCustom}>
            <Button variant="danger" size="sm" loading={removing()} onClick={handleRemoveLogo}>
              {confirmRemove() ? 'Yakin? Klik lagi' : 'Kembalikan Logo Bawaan'}
            </Button>
          </Show>
        </div>
      </Card>
    </div>
  );
}
