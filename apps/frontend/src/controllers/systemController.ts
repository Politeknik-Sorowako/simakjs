import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';

export interface VersionInfo {
  name?: string;
  version: string;
  buildNumber: string;
  gitCommitHash?: string | null;
  environment: string;
  lastUpdated: string;
  source?: string | null;
  parameters?: Record<string, unknown>;
}

export interface HealthStatus {
  status: string;
  uptime?: number;
  database?: string;
  memory?: number;
}

export interface SystemParameter {
  key: string;
  value: string | number | boolean;
  paramType: string;
  description: string;
  defaultValue: string | number | boolean;
  updatedAt?: string;
  updatedBy?: number | null;
  /** Parameter rahasia (mis. password Feeder) — nilainya tidak pernah dikirim. */
  masked?: boolean;
  /** Khusus parameter rahasia: apakah nilainya sudah terisi di server. */
  hasValue?: boolean;
}

export interface FeederTestResult {
  ok: boolean;
  url: string;
  username: string;
  latencyMs: number;
  profilKode?: string;
  profilNama?: string;
  error?: string;
  checkedAt: string;
}

export interface ChangelogItem {
  text: string;
  children: string[];
}

export interface ChangelogGroup {
  heading: string;
  items: ChangelogItem[];
}

export interface ChangelogSection {
  version: string;
  date: string | null;
  groups: ChangelogGroup[];
}

/** Konfigurasi kop surat global (backend: `surat_kop_global`). */
export interface KopSurat {
  nama: string;
  alamat: string[];
  kontak: string;
  website: string;
  email: string;
  tampilkanLogo: boolean;
  logoCustom: boolean;
  /** Path relatif logo kustom (`/settings/kop-logo?v=...`); null = logo bawaan. */
  logoUrl: string | null;
}

// Cache objectURL logo kustom (satu sesi browser) agar tiap kop tidak fetch ulang.
let kopLogoObjectUrl: string | null = null;

type SystemParamsEden = Promise<{ data?: { data: SystemParameter[] } | null; error?: unknown }>;

export const systemController = {
  async getVersion(): Promise<VersionInfo> {
    return unwrap<VersionInfo>(eden.system.version.get());
  },

  async getHealth(): Promise<HealthStatus> {
    return unwrap<HealthStatus>(eden.system.health.get());
  },

  async getChangelog(): Promise<ChangelogSection[]> {
    const res = await fetchApi<{ sections: ChangelogSection[] }>('/system/changelog');
    return res.sections || [];
  },

  async getRegistrationStatus(): Promise<{ enabled: boolean }> {
    return fetchApi<{ enabled: boolean }>('/system/registration-status');
  },

  async getLoginTurnstileStatus(): Promise<{ enabled: boolean }> {
    return fetchApi<{ enabled: boolean }>('/system/login-turnstile-status');
  },

  async getParameters(): Promise<SystemParameter[]> {
    const res = await unwrap<{ data: SystemParameter[] }>(eden.system.parameters.get() as unknown as SystemParamsEden);
    return res.data || [];
  },

  async updateParameter(key: string, value: string, description?: string): Promise<{ key: string; value: string }> {
    return fetchApi<{ key: string; value: string }>(`/system/parameters/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  },

  async bumpSessionEpoch(): Promise<{ message: string; sessionEpoch: number }> {
    return fetchApi<{ message: string; sessionEpoch: number }>('/system/session-epoch/bump', {
      method: 'POST',
    });
  },

  /**
   * Uji koneksi Web Service Neo Feeder PDDIKTI. Override opsional (url/username/
   * password) memungkinkan admin mengetes sebelum menyimpan.
   */
  async testFeederConnection(override?: {
    url?: string;
    username?: string;
    password?: string;
  }): Promise<FeederTestResult> {
    return fetchApi<FeederTestResult>('/pddikti/test-connection', {
      method: 'POST',
      body: JSON.stringify(override ?? {}),
    });
  },

  // ─── Kop surat global ─────────────────────────────────────────────────────

  async getKop(): Promise<KopSurat> {
    const res = await fetchApi<{ data: KopSurat }>('/settings/kop');
    return res.data;
  },

  async updateKop(kop: {
    nama: string;
    alamat: string[];
    kontak: string;
    website: string;
    email: string;
    tampilkanLogo: boolean;
  }): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/settings/kop', {
      method: 'PUT',
      body: JSON.stringify(kop),
    });
  },

  async uploadKopLogo(file: File): Promise<{ message: string }> {
    const { API_URL } = await import('../utils/api');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/settings/kop-logo`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'Gagal mengunggah logo kop surat');
    }
    systemController.invalidateKopLogoCache();
    return res.json() as Promise<{ message: string }>;
  },

  async deleteKopLogo(): Promise<{ message: string }> {
    const out = await fetchApi<{ message: string }>('/settings/kop-logo', { method: 'DELETE' });
    systemController.invalidateKopLogoCache();
    return out;
  },

  /** Bersihkan cache objectURL logo (dipanggil setelah upload/hapus). */
  invalidateKopLogoCache(): void {
    if (kopLogoObjectUrl) {
      URL.revokeObjectURL(kopLogoObjectUrl);
      kopLogoObjectUrl = null;
    }
  },

  /**
   * Sumber gambar logo kustom: blob objectURL bila `logoCustom` (di-cache),
   * null bila logo bawaan — pemanggil pakai logo statis repo sebagai fallback.
   */
  async kopLogoObjectUrl(kop: KopSurat): Promise<string | null> {
    if (!kop.logoCustom || !kop.logoUrl) return null;
    if (kopLogoObjectUrl) return kopLogoObjectUrl;
    const { API_URL } = await import('../utils/api');
    const res = await fetch(`${API_URL}${kop.logoUrl}`, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    kopLogoObjectUrl = URL.createObjectURL(blob);
    return kopLogoObjectUrl;
  },
};
