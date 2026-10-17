import { SettingsService } from '../services/settings.service';
import { type KopSuratConfig, SECRET_PARAM_KEYS, SystemParameterService } from '../services/system-parameter.service';
import { findKopLogoFile, removeKopLogo, saveKopLogo } from '../utils/kop-storage';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class SettingsController {
  // Public setting status (no auth needed)
  static async getPublicSettings({ set }: { set: { status?: number | string } }): Promise<{
    data: { featureFeedbackEnabled: boolean; krsMandiriEnabled: boolean; maxBimbinganAttachmentMb: number };
  }> {
    try {
      const [feedbackEnabled, krsMandiriEnabled, maxBimbinganAttachmentMb] = await Promise.all([
        SettingsService.isFeedbackEnabled(),
        SystemParameterService.isKrsMandiriEnabled(),
        SystemParameterService.getNumber('MAX_BIMBINGAN_ATTACHMENT_MB'),
      ]);
      return {
        data: {
          featureFeedbackEnabled: feedbackEnabled,
          krsMandiriEnabled,
          maxBimbinganAttachmentMb: maxBimbinganAttachmentMb || 2,
        },
      };
    } catch {
      return {
        data: {
          featureFeedbackEnabled: true,
          krsMandiriEnabled: true,
          maxBimbinganAttachmentMb: 2,
        },
      };
    }
  }

  // Admin settings management
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getAll({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, ['admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Hanya Admin atau Prodi yang dapat mengakses pengaturan sistem' };
      }

      const settings = await SettingsService.getAll();
      // Parameter rahasia (mis. FEEDER_PASSWORD) tidak pernah dikembalikan mentah,
      // selaras dengan /system/parameters & /system/settings.
      const data = settings.map((s) => (SECRET_PARAM_KEYS.has(s.key) ? { ...s, value: '' } : s));
      return { data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil pengaturan sistem' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateSetting({ getCurrentUser, body, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, ['admin'])) {
        set.status = 403;
        return { error: 'Hanya Admin yang dapat mengubah pengaturan sistem' };
      }

      const { key, value, description } = body as { key: string; value: string; description?: string };
      if (!key || typeof key !== 'string') {
        set.status = 400;
        return { error: 'key wajib diisi' };
      }
      if (!/^[A-Za-z0-9_]+$/.test(key)) {
        set.status = 400;
        return { error: 'key hanya boleh mengandung huruf, angka, dan underscore' };
      }
      if (value === null || value === undefined) {
        set.status = 400;
        return { error: 'value wajib diisi' };
      }
      // Validasi & normalisasi sama seperti endpoint utama `PUT /system/parameters/:key`
      // (mis. URL/timeout/write guard Feeder) agar parameter tidak bisa diset sebarang.
      const validated = SystemParameterService.validateParamValue(key, String(value));
      if (!validated.ok) {
        set.status = 400;
        return { error: validated.error };
      }
      if (validated.keepExisting) {
        // Password rahasia dikosongkan → pertahankan nilai tersimpan (tak ditimpa).
        return {
          message: 'Pengaturan berhasil diperbarui',
          data: { key, value: '', description: description ?? null, updatedAt: null },
        };
      }
      // Tulis via SystemParameterService (bukan SettingsService langsung) agar nilai
      // rahasia dienkripsi at-rest dan cache parameter ikut diinvalidasi.
      const updated = await SystemParameterService.set(key, validated.value, undefined, description);
      return {
        message: 'Pengaturan berhasil diperbarui',
        data: SECRET_PARAM_KEYS.has(key) ? { ...updated, value: '' } : updated,
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui pengaturan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getFeedbackConfig({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (hasRole(user, ['guest'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const config = await SettingsService.getFeedbackAccessConfig();
      return { data: config };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil konfigurasi akses feedback' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateFeedbackConfig({ getCurrentUser, body, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Hanya Admin atau Super Admin yang dapat mengubah pengaturan akses feedback' };
      }

      const { mode, allowedRoles } = body as { mode?: string; allowedRoles?: unknown };
      const normalizedMode: 'full' | 'restricted' = mode === 'restricted' ? 'restricted' : 'full';
      const roles = Array.isArray(allowedRoles)
        ? allowedRoles.filter((role): role is string => typeof role === 'string')
        : [];

      const config = await SettingsService.setFeedbackAccessConfig(normalizedMode, roles);
      return { message: 'Pengaturan akses feedback berhasil diperbarui', data: config };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui konfigurasi akses feedback' };
    }
  }

  // ─── Kop surat global (semua dokumen cetak) ────────────────────────────────

  /** Helper: gabung patch ke konfigurasi kop lalu simpan (atomic 1 baris). */
  private static async patchKop(patch: Partial<KopSuratConfig>): Promise<KopSuratConfig> {
    const current = await SystemParameterService.getKopSurat();
    const next: KopSuratConfig = {
      ...current,
      ...patch,
      alamat: patch.alamat ?? current.alamat,
    };
    await SystemParameterService.set('surat_kop_global', JSON.stringify(next));
    return next;
  }

  /**
   * Ambil konfigurasi kop surat global — semua role terautentikasi (kop tampil
   * di dokumen cetak milik mahasiswa/dosen; tidak bersifat sensitif).
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getKop({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    try {
      const kop = await SystemParameterService.getKopSurat();
      const logo = kop.logoCustom ? await findKopLogoFile() : null;
      return { data: { ...kop, logoUrl: logo ? `/settings/kop-logo?v=${Math.floor(logo.mtimeMs)}` : null } };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil konfigurasi kop surat' };
    }
  }

  /** Simpan konfigurasi kop surat global — khusus admin. */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateKop({ getCurrentUser, body, set }: AuthContext<any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'super_admin'])) {
      set.status = 403;
      return { error: 'Hanya Admin/Super Admin yang dapat mengubah kop surat global.' };
    }
    try {
      // Body tervalidasi TypeBox di route; merge ke nilai saat ini (field opsional
      // yang tidak dikirim tidak menimpa).
      const saved = await SettingsController.patchKop(body as Partial<KopSuratConfig>);
      return { message: 'Kop surat global berhasil diperbarui', data: saved };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui kop surat global' };
    }
  }

  /** Unggah logo kop kustom (PNG/JPG ≤2MB) — khusus admin. */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async uploadKopLogo({ getCurrentUser, body, set }: AuthContext<any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'super_admin'])) {
      set.status = 403;
      return { error: 'Hanya Admin/Super Admin yang dapat mengubah logo kop surat.' };
    }
    const file = body?.file;
    if (!(file instanceof File)) {
      set.status = 400;
      return { error: 'File logo tidak ditemukan (field "file").' };
    }
    try {
      const { storageKey, updatedAt } = await saveKopLogo(file);
      const saved = await SettingsController.patchKop({ logoCustom: true });
      return {
        message: 'Logo kop surat berhasil diunggah',
        data: { storageKey, updatedAt, ...saved },
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengunggah logo kop surat' };
    }
  }

  /** Kembalikan ke logo bawaan (hapus unggahan) — khusus admin. */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async deleteKopLogo({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'super_admin'])) {
      set.status = 403;
      return { error: 'Hanya Admin/Super Admin yang dapat mengubah logo kop surat.' };
    }
    try {
      await removeKopLogo();
      const saved = await SettingsController.patchKop({ logoCustom: false });
      return { message: 'Logo kustom dihapus — memakai logo bawaan', data: saved };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus logo kop surat' };
    }
  }

  /** Sajikan berkas logo kop kustom (semua role login; 404 bila belum ada). */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getKopLogo({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const logo = await findKopLogoFile();
    if (!logo) {
      set.status = 404;
      return { error: 'Logo kustom tidak ditemukan.' };
    }
    const file = Bun.file(logo.path);
    set.headers['Content-Type'] = logo.ext === '.png' ? 'image/png' : 'image/jpeg';
    set.headers['Cache-Control'] = 'private, max-age=300';
    return file;
  }
}
