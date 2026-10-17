import { and, eq, inArray, or, type SQL, sql } from 'drizzle-orm';
import { dosen, kelasKuliah, krs, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { FeederService } from './feeder.service';
import { type FeederConfig, SystemParameterService } from './system-parameter.service';

export type PullEntityKey =
  | 'semester'
  | 'prodi'
  | 'matkul'
  | 'dosen'
  | 'mahasiswa'
  | 'kelas'
  | 'krs-nilai'
  | 'transkrip'
  | 'aktivitas-mahasiswa';
export type PullEntityCategory = 'referensi' | 'master' | 'transaksional';
/**
 * `isi`  → baris lokal sudah ada (dicocokkan lewat kunci alami) tetapi field target
 *          masih kosong sehingga nilainya diisi dari Feeder (bukan overwrite).
 * `link_id` → hanya menautkan id_pddikti; nilai lokal dipertahankan.
 */
export type PullDiffStatus = 'baru' | 'isi' | 'link_id' | 'konflik' | 'sama';
export type ConflictResolution = 'feeder' | 'lokal';

export interface PullEntityMeta {
  key: PullEntityKey;
  label: string;
  category: PullEntityCategory;
  feederAct: string;
  description: string;
  /** true = entitas hanya pratinjau (tidak ada tabel lokal untuk diterapkan). */
  previewOnly?: boolean;
}

export interface PullFieldDiff {
  field: string;
  feederValue: string | number | boolean | null;
  localValue: string | number | boolean | null;
}

export interface PullPreviewItem {
  feederId: string;
  naturalKey: string;
  label: string;
  status: PullDiffStatus;
  localId: string | number | null;
  localIdPddikti: string | null;
  feederData: Record<string, string | number | boolean | null>;
  localData: Record<string, string | number | boolean | null> | null;
  diffs: PullFieldDiff[];
  canApply: boolean;
  note?: string;
}

export interface PullPreviewResult {
  entity: PullEntityKey;
  feederAct: string;
  writeGuard: boolean;
  summary: {
    totalFeeder: number;
    baru: number;
    isi: number;
    linkId: number;
    konflik: number;
    sama: number;
  };
  items: PullPreviewItem[];
  fetchedAt: string;
}

export interface PullApplyResult {
  entity: PullEntityKey;
  conflictResolution: ConflictResolution;
  inserted: number;
  updated: number;
  linkedOnly: number;
  skipped: number;
  errors: Array<{ feederId: string; error: string }>;
}

export const PULL_ENTITY_CATALOG: ReadonlyArray<PullEntityMeta> = [
  {
    key: 'semester',
    label: 'Periode / Semester Akademik',
    category: 'referensi',
    feederAct: 'GetSemester',
    description: 'Menarik daftar kode semester (5 digit, mis. 20241) dari Feeder ke tabel periode_akademik.',
  },
  {
    key: 'prodi',
    label: 'Program Studi',
    category: 'referensi',
    feederAct: 'GetProdi',
    description: 'Menautkan UUID id_prodi & kode PDDIKTI ke Program Studi lokal atau menambah prodi yang belum ada.',
  },
  {
    key: 'matkul',
    label: 'Mata Kuliah',
    category: 'master',
    feederAct: 'GetListMataKuliah',
    description: 'Menarik master mata kuliah (kode, nama, SKS, prodi) dan menautkan id_matkul PDDIKTI.',
  },
  {
    key: 'dosen',
    label: 'Dosen',
    category: 'master',
    feederAct: 'GetListDosen',
    description: 'Menarik data master dosen (NIDN, NIP, nama, tgl lahir, gender) dan menautkan id_dosen PDDIKTI.',
  },
  {
    key: 'mahasiswa',
    label: 'Mahasiswa',
    category: 'master',
    feederAct: 'GetListMahasiswa',
    description: 'Menarik daftar mahasiswa (NIM, nama, angkatan, prodi, tgl lahir) dan menautkan ID PDDIKTI.',
  },
  // ─── Data transaksional: butuh Referensi + Master sudah tertaut lebih dulu ──────
  {
    key: 'kelas',
    label: 'Kelas Kuliah',
    category: 'transaksional',
    feederAct: 'GetListKelasKuliah',
    description:
      'Menarik kelas kuliah per semester dan menautkannya ke mata kuliah + periode lokal. Membutuhkan Referensi (Semester, Prodi) dan Master Mata Kuliah sudah ditarik.',
  },
  {
    key: 'krs-nilai',
    label: 'KRS & Nilai Mahasiswa',
    category: 'transaksional',
    feederAct: 'GetRiwayatNilaiMahasiswa',
    description:
      'Menarik KRS & nilai mahasiswa yang sudah dilaporkan ke Feeder. KRS baru dibuat sebagai "sudah disetujui"; nilai hanya diisi bila kosong (atau ditimpa bila resolusi konflik = Feeder). Butuh Mahasiswa + Kelas Kuliah tertaut.',
  },
  {
    key: 'transkrip',
    label: 'Transkrip / IPK Mahasiswa',
    category: 'transaksional',
    feederAct: 'GetTranskripMahasiswa',
    description:
      'Pratinjau ringkasan transkrip (IPK, SKS lulus, jumlah MK) per mahasiswa. Read-only — tidak ada tabel lokal untuk diterapkan.',
    previewOnly: true,
  },
  {
    key: 'aktivitas-mahasiswa',
    label: 'Aktivitas MBKM Mahasiswa',
    category: 'transaksional',
    feederAct: 'GetListAktivitasMahasiswa',
    description:
      'Pratinjau aktivitas MBKM/kegiatan mahasiswa (judul, jenis, SKS). Read-only — modul aktivitas lokal belum tersedia.',
    previewOnly: true,
  },
];

const MAX_PULL_PAGES = 10;

function asStr(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function asInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/** Normalisasi tanggal Feeder (`YYYY-MM-DD` atau `DD-MM-YYYY`) ke `'YYYY-MM-DD'` atau `null`. */
export function normalizeFeederDate(raw: unknown): string | null {
  const s = asStr(raw);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const iso = /^(\d{4}-\d{2}-\d{2})T/.exec(s);
  if (iso) return iso[1];
  return null;
}

function normalizeGender(_raw: unknown): 'L' | 'P' | null {
  const s = asStr(_raw).toUpperCase();
  if (s === 'L') return 'L';
  if (s === 'P') return 'P';
  return null;
}

/**
 * Normalisasi nilai Feeder (angka/indeks/ipk) menjadi string 2-desimal — sesuai
 * cara penulisan kolom `numeric` Drizzle di proyek ini (`String(nilai.toFixed(2))`),
 * sehingga pembanding dengan nilai lokal (string) akurat.
 */
function normalizeNilai(raw: unknown): string | null {
  const s = asStr(raw);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(2);
}

function sanitizeEmailLocal(input: string, fallback: string): string {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return cleaned.length > 0 ? cleaned : fallback;
}

export class FeederPullService {
  static getCatalog(): ReadonlyArray<PullEntityMeta> {
    return PULL_ENTITY_CATALOG;
  }

  static getEntityMeta(entity: string): PullEntityMeta | null {
    return PULL_ENTITY_CATALOG.find((e) => e.key === entity) ?? null;
  }

  /**
   * Tarik seluruh halaman untuk satu aksi `Get*` dari Feeder (dibatasi `maxPages`
   * agar tidak membebani server). Selalu lewat `FeederService.request` (read-only).
   */
  static async fetchFeederRows(
    config: FeederConfig,
    act: string,
    options?: { filter?: string; maxPages?: number },
  ): Promise<Array<Record<string, unknown>>> {
    if (!config.url || !config.username || !config.password) {
      throw new Error('Konfigurasi Feeder belum lengkap. Isi alamat, username, dan password terlebih dahulu.');
    }
    const pageSize = Math.min(500, Math.max(50, config.pageSize || 200));
    const maxPages = Math.min(MAX_PULL_PAGES, Math.max(1, options?.maxPages ?? 5));
    const filter = options?.filter ?? '';

    // GetSemester dan GetProdi umumnya mengembalikan seluruh baris dalam 1 halaman,
    // namun kita tetap mendukung paginasi bertahap untuk master berukuran besar.
    const out: Array<Record<string, unknown>> = [];
    // Guard dedup: sebagian aksi Feeder mengabaikan `offset`. Tanpa ini, halaman
    // yang berulang akan terhitung ganda (preview duplikat & insert duplikat).
    const seen = new Set<string>();
    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      const chunk = await FeederService.request<unknown>(config, act, {
        filter,
        limit: pageSize,
        offset,
      });
      if (!Array.isArray(chunk) || chunk.length === 0) break;
      let added = 0;
      for (const item of chunk) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const fingerprint = JSON.stringify(item);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        out.push(item as Record<string, unknown>);
        added++;
      }
      if (chunk.length < pageSize) break;
      // Seluruh isi halaman ini duplikat → server mengabaikan `offset`; hentikan.
      if (added === 0) break;
    }
    return out;
  }

  /** Nilai unik non-kosong (huruf kecil) dari baris Feeder — dasar scoping query lokal. */
  private static uniqueLower(
    rows: Array<Record<string, unknown>>,
    pick: (r: Record<string, unknown>) => string[],
  ): string[] {
    const set = new Set<string>();
    for (const r of rows) {
      for (const raw of pick(r)) {
        const value = (raw ?? '').trim().toLowerCase();
        if (value) set.add(value);
      }
    }
    return [...set];
  }

  /** WHERE dari kumpulan predikat; `undefined` bila tidak ada (query dilewati). */
  private static combinePredicates(predicates: SQL[]): SQL | undefined {
    return predicates.length > 0 ? or(...predicates) : undefined;
  }

  /** Baris Program Studi yang cocok dengan id_prodi Feeder (dipakai diff matkul/mahasiswa). */
  private static async loadProdiByFeederIds(prodiIds: string[]): Promise<Array<typeof programStudi.$inferSelect>> {
    if (prodiIds.length === 0) return [];
    return await db
      .select()
      .from(programStudi)
      .where(inArray(sql`lower(${programStudi.idPddikti})`, prodiIds));
  }

  private static computeDiffs(
    fields: string[],
    feederData: Record<string, string | number | boolean | null>,
    localData: Record<string, string | number | boolean | null>,
  ): PullFieldDiff[] {
    const diffs: PullFieldDiff[] = [];
    for (const field of fields) {
      const fv = feederData[field] ?? null;
      const lv = localData[field] ?? null;
      const fNorm = typeof fv === 'string' ? fv.trim() : fv;
      const lNorm = typeof lv === 'string' ? lv.trim() : lv;
      if (fNorm !== null && fNorm !== '' && fNorm !== lNorm) {
        diffs.push({ field, feederValue: fv, localValue: lv });
      }
    }
    return diffs;
  }

  /** Bandingkan baris `GetSemester` dengan `periode_akademik` lokal. */
  static diffSemester(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof periodeAkademik.$inferSelect>,
  ): PullPreviewItem[] {
    const byPddikti = new Map<string, typeof periodeAkademik.$inferSelect>();
    const byId = new Map<string, typeof periodeAkademik.$inferSelect>();
    for (const r of localRows) {
      if (r.idPddikti) byPddikti.set(r.idPddikti.trim(), r);
      byId.set(r.id.trim(), r);
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const idSemester = asStr(raw.id_semester);
      const namaSemester = asStr(raw.nama_semester) || idSemester;
      if (!/^\d{5}$/.test(idSemester)) continue;

      const feederData = {
        id: idSemester,
        nama: namaSemester,
      };

      const local = byPddikti.get(idSemester) ?? byId.get(idSemester) ?? null;
      if (!local) {
        items.push({
          feederId: idSemester,
          naturalKey: idSemester,
          label: `${idSemester} — ${namaSemester}`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: true,
        });
        continue;
      }

      const localData = {
        id: local.id,
        nama: local.nama,
      };
      const diffs = FeederPullService.computeDiffs(['nama'], feederData, localData);
      const idLinked = local.idPddikti === idSemester;
      const status: PullDiffStatus = diffs.length > 0 ? 'konflik' : idLinked ? 'sama' : 'link_id';

      items.push({
        feederId: idSemester,
        naturalKey: idSemester,
        label: `${idSemester} — ${namaSemester}`,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
      });
    }
    return items;
  }

  /** Bandingkan baris `GetProdi` dengan `program_studi` lokal. */
  static diffProdi(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof programStudi.$inferSelect>,
  ): PullPreviewItem[] {
    const byPddikti = new Map<string, typeof programStudi.$inferSelect>();
    const byKodePddikti = new Map<string, typeof programStudi.$inferSelect>();
    const byKode = new Map<string, typeof programStudi.$inferSelect>();
    const byNama = new Map<string, typeof programStudi.$inferSelect>();

    for (const r of localRows) {
      if (r.idPddikti) byPddikti.set(r.idPddikti.trim().toLowerCase(), r);
      if (r.kodeProdiPddikti) byKodePddikti.set(r.kodeProdiPddikti.trim().toLowerCase(), r);
      byKode.set(r.kode.trim().toLowerCase(), r);
      byNama.set(r.nama.trim().toLowerCase(), r);
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const idProdi = asStr(raw.id_prodi);
      const kode = asStr(raw.kode_program_studi);
      const nama = asStr(raw.nama_program_studi);
      const jenjang = asStr(raw.nama_jenjang_pendidikan) || 'D3';
      if (!idProdi || !nama) continue;

      const feederData = {
        kode: kode || idProdi.slice(0, 8),
        kodeProdiPddikti: kode || null,
        nama,
        jenjang,
      };

      const local =
        byPddikti.get(idProdi.toLowerCase()) ??
        (kode ? (byKodePddikti.get(kode.toLowerCase()) ?? byKode.get(kode.toLowerCase())) : undefined) ??
        byNama.get(nama.toLowerCase()) ??
        null;

      if (!local) {
        items.push({
          feederId: idProdi,
          naturalKey: kode || idProdi.slice(0, 8),
          label: `${kode ? `[${kode}] ` : ''}${nama} (${jenjang})`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: Boolean(kode),
          note: kode ? undefined : 'Kode prodi Feeder kosong; tidak dapat dibuat otomatis.',
        });
        continue;
      }

      const localData = {
        kode: local.kode,
        kodeProdiPddikti: local.kodeProdiPddikti ?? null,
        nama: local.nama,
        jenjang: local.jenjang,
      };
      const diffs = FeederPullService.computeDiffs(['nama', 'jenjang'], feederData, localData);
      const idLinked =
        (local.idPddikti ?? '').toLowerCase() === idProdi.toLowerCase() &&
        (!kode || (local.kodeProdiPddikti ?? '') === kode);
      const status: PullDiffStatus = diffs.length > 0 ? 'konflik' : idLinked ? 'sama' : 'link_id';

      items.push({
        feederId: idProdi,
        naturalKey: kode || local.kode,
        label: `${kode || local.kode} — ${nama} (${jenjang})`,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
      });
    }
    return items;
  }

  /** Bandingkan baris `GetListMataKuliah` dengan `mata_kuliah` lokal. */
  static diffMatkul(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof mataKuliah.$inferSelect>,
    prodiRows: Array<typeof programStudi.$inferSelect>,
  ): PullPreviewItem[] {
    const prodiByPddikti = new Map<string, typeof programStudi.$inferSelect>();
    for (const p of prodiRows) {
      if (p.idPddikti) prodiByPddikti.set(p.idPddikti.trim().toLowerCase(), p);
    }

    const byPddikti = new Map<string, typeof mataKuliah.$inferSelect>();
    const byProdiKode = new Map<string, typeof mataKuliah.$inferSelect>();
    const byKodeOnly = new Map<string, typeof mataKuliah.$inferSelect>();
    for (const mk of localRows) {
      if (mk.idPddikti) byPddikti.set(mk.idPddikti.trim().toLowerCase(), mk);
      byProdiKode.set(`${mk.programStudiId}:${mk.kode.trim().toLowerCase()}`, mk);
      if (!byKodeOnly.has(mk.kode.trim().toLowerCase())) {
        byKodeOnly.set(mk.kode.trim().toLowerCase(), mk);
      }
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const idMatkul = asStr(raw.id_matkul);
      const kode = asStr(raw.kode_mata_kuliah);
      const nama = asStr(raw.nama_mata_kuliah);
      const idProdiFeeder = asStr(raw.id_prodi);
      if (!idMatkul || !kode || !nama) continue;

      const sksTotal = asInt(raw.sks_mata_kuliah, 0);
      const sksTatapMuka = asInt(raw.sks_tatap_muka, 0);
      const sksPraktek = asInt(raw.sks_praktek, 0);
      const sksPraktekLapangan = asInt(raw.sks_praktek_lapangan, 0);
      const sksSimulasi = asInt(raw.sks_simulasi, 0);

      const mappedProdi = idProdiFeeder ? (prodiByPddikti.get(idProdiFeeder.toLowerCase()) ?? null) : null;

      // Bila prodi pengampu ter-resolve, HANYA cocokkan dalam prodi tersebut. Fallback
      // global per-kode (byKodeOnly) dapat menautkan MK dari prodi lain karena `kode`
      // hanya unik per (prodi, kode), sehingga berisiko menuliskan id_pddikti ke baris salah.
      const local =
        byPddikti.get(idMatkul.toLowerCase()) ??
        (mappedProdi
          ? byProdiKode.get(`${mappedProdi.id}:${kode.toLowerCase()}`)
          : byKodeOnly.get(kode.toLowerCase())) ??
        null;

      const feederData = {
        kode,
        nama,
        sksTotal,
        sksTatapMuka,
        sksPraktek,
        sksPraktekLapangan,
        sksSimulasi,
        programStudiId: mappedProdi?.id ?? local?.programStudiId ?? null,
      };

      if (!local) {
        items.push({
          feederId: idMatkul,
          naturalKey: kode,
          label: `${kode} — ${nama} (${sksTotal} SKS)`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: Boolean(mappedProdi),
          note: mappedProdi
            ? undefined
            : 'Prodi pengampu belum tertaut ke id_prodi PDDIKTI. Tarik & terapkan Program Studi terlebih dahulu.',
        });
        continue;
      }

      const localData = {
        kode: local.kode,
        nama: local.nama,
        sksTotal: local.sksTotal,
        sksTatapMuka: local.sksTatapMuka ?? 0,
        sksPraktek: local.sksPraktek ?? 0,
        sksPraktekLapangan: local.sksPraktekLapangan ?? 0,
        sksSimulasi: local.sksSimulasi ?? 0,
        programStudiId: local.programStudiId,
      };

      const diffs = FeederPullService.computeDiffs(['nama', 'sksTotal'], feederData, localData);
      const idLinked = (local.idPddikti ?? '').toLowerCase() === idMatkul.toLowerCase();
      const status: PullDiffStatus = diffs.length > 0 ? 'konflik' : idLinked ? 'sama' : 'link_id';

      items.push({
        feederId: idMatkul,
        naturalKey: kode,
        label: `${kode} — ${nama} (${sksTotal} SKS)`,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
      });
    }
    return items;
  }

  /** Bandingkan baris `GetListDosen` dengan `dosen` lokal. */
  static diffDosen(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof dosen.$inferSelect>,
  ): PullPreviewItem[] {
    const byPddikti = new Map<string, typeof dosen.$inferSelect>();
    const byNidn = new Map<string, typeof dosen.$inferSelect>();
    const byNip = new Map<string, typeof dosen.$inferSelect>();
    const byNama = new Map<string, typeof dosen.$inferSelect>();

    for (const d of localRows) {
      if (d.idPddikti) byPddikti.set(d.idPddikti.trim().toLowerCase(), d);
      if (d.nidn) byNidn.set(d.nidn.trim().toLowerCase(), d);
      if (d.nip) byNip.set(d.nip.trim().toLowerCase(), d);
      byNama.set(d.nama.trim().toLowerCase(), d);
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const idDosen = asStr(raw.id_dosen);
      const nama = asStr(raw.nama_dosen);
      const nidn = asStr(raw.nidn) || null;
      const nip = asStr(raw.nip) || nidn || idDosen.slice(0, 18);
      const jenisKelamin = normalizeGender(raw.jenis_kelamin);
      const tanggalLahir = normalizeFeederDate(raw.tanggal_lahir);
      const idAgama =
        raw.id_agama !== undefined && raw.id_agama !== null && asStr(raw.id_agama) !== '' ? asInt(raw.id_agama) : null;
      if (!idDosen || !nama) continue;

      const feederData = {
        nip,
        nidn,
        nama,
        jenisKelamin,
        tanggalLahir,
        idAgama,
      };

      const local =
        byPddikti.get(idDosen.toLowerCase()) ??
        (nidn ? byNidn.get(nidn.toLowerCase()) : undefined) ??
        (nip ? byNip.get(nip.toLowerCase()) : undefined) ??
        byNama.get(nama.toLowerCase()) ??
        null;

      if (!local) {
        items.push({
          feederId: idDosen,
          naturalKey: nidn || nip,
          label: `${nama}${nidn ? ` (NIDN: ${nidn})` : ''}`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: true,
        });
        continue;
      }

      const localData = {
        nip: local.nip,
        nidn: local.nidn ?? null,
        nama: local.nama,
        jenisKelamin: local.jenisKelamin ?? null,
        tanggalLahir: local.tanggalLahir ?? null,
        idAgama: local.idAgama ?? null,
      };

      const diffs = FeederPullService.computeDiffs(['nama', 'nidn'], feederData, localData);
      const idLinked = (local.idPddikti ?? '').toLowerCase() === idDosen.toLowerCase();
      const status: PullDiffStatus = diffs.length > 0 ? 'konflik' : idLinked ? 'sama' : 'link_id';

      items.push({
        feederId: idDosen,
        naturalKey: nidn || local.nip,
        label: `${nama}${nidn ? ` (NIDN: ${nidn})` : ''}`,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
      });
    }
    return items;
  }

  /** Bandingkan baris `GetListMahasiswa` dengan `mahasiswa` lokal. */
  static diffMahasiswa(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof mahasiswa.$inferSelect>,
    prodiRows: Array<typeof programStudi.$inferSelect>,
  ): PullPreviewItem[] {
    const prodiByPddikti = new Map<string, typeof programStudi.$inferSelect>();
    for (const p of prodiRows) {
      if (p.idPddikti) prodiByPddikti.set(p.idPddikti.trim().toLowerCase(), p);
    }

    const byPddikti = new Map<string, typeof mahasiswa.$inferSelect>();
    const byNim = new Map<string, typeof mahasiswa.$inferSelect>();
    for (const m of localRows) {
      if (m.idPddikti) byPddikti.set(m.idPddikti.trim().toLowerCase(), m);
      byNim.set(m.nim.trim().toLowerCase(), m);
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const idMhs = asStr(raw.id_mahasiswa) || asStr(raw.id_registrasi_mahasiswa);
      const nim = asStr(raw.nim) || asStr(raw.nipd);
      const nama = asStr(raw.nama_mahasiswa);
      const idProdiFeeder = asStr(raw.id_prodi);
      const periodeRaw = asStr(raw.id_periode) || asStr(raw.nama_periode_masuk);
      const angkatanMatch = /^(\d{4})/.exec(periodeRaw);
      const angkatan = angkatanMatch ? angkatanMatch[1] : null;
      const jenisKelamin = normalizeGender(raw.jenis_kelamin) ?? 'L';
      const tanggalLahir = normalizeFeederDate(raw.tanggal_lahir);
      const idAgama =
        raw.id_agama !== undefined && raw.id_agama !== null && asStr(raw.id_agama) !== '' ? asInt(raw.id_agama) : null;

      if (!idMhs || !nim || !nama) continue;

      const mappedProdi = idProdiFeeder ? (prodiByPddikti.get(idProdiFeeder.toLowerCase()) ?? null) : null;
      const local = byPddikti.get(idMhs.toLowerCase()) ?? byNim.get(nim.toLowerCase()) ?? null;

      const feederData = {
        nim,
        nama,
        angkatan,
        programStudiId: mappedProdi?.id ?? local?.programStudiId ?? null,
        jenisKelamin,
        tanggalLahir,
        idAgama,
      };

      if (!local) {
        items.push({
          feederId: idMhs,
          naturalKey: nim,
          label: `${nim} — ${nama}${angkatan ? ` (${angkatan})` : ''}`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: true,
        });
        continue;
      }

      const localData = {
        nim: local.nim,
        nama: local.nama,
        angkatan: local.angkatan ?? null,
        programStudiId: local.programStudiId ?? null,
        jenisKelamin: local.jenisKelamin,
        tanggalLahir: local.tanggalLahir ?? null,
        idAgama: local.idAgama ?? null,
      };

      const diffs = FeederPullService.computeDiffs(['nama', 'angkatan'], feederData, localData);
      const idLinked = (local.idPddikti ?? '').toLowerCase() === idMhs.toLowerCase();
      const status: PullDiffStatus = diffs.length > 0 ? 'konflik' : idLinked ? 'sama' : 'link_id';

      items.push({
        feederId: idMhs,
        naturalKey: nim,
        label: `${nim} — ${nama}${angkatan ? ` (${angkatan})` : ''}`,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
      });
    }
    return items;
  }

  /** Baris Mahasiswa lokal yang cocok dengan nim dari baris Feeder. */
  private static async loadMahasiswaByNims(nims: string[]): Promise<Array<typeof mahasiswa.$inferSelect>> {
    if (nims.length === 0) return [];
    return await db
      .select()
      .from(mahasiswa)
      .where(inArray(sql`lower(${mahasiswa.nim})`, nims));
  }

  /** Baris Kelas Kuliah lokal yang cocok dengan id_kelas_kuliah atau nama kelas Feeder. */
  private static async loadKelasScoped(
    ids: string[],
    namas: string[],
  ): Promise<Array<typeof kelasKuliah.$inferSelect>> {
    const where = FeederPullService.combinePredicates([
      ...(ids.length ? [inArray(sql`lower(${kelasKuliah.idPddikti})`, ids)] : []),
      ...(namas.length ? [inArray(sql`lower(${kelasKuliah.namaKelas})`, namas)] : []),
    ]);
    return where ? await db.select().from(kelasKuliah).where(where) : [];
  }

  /** Baris Periode Akemik lokal yang cocok dengan id_semester Feeder. */
  private static async loadPeriodeByIdSemester(ids: string[]): Promise<Array<typeof periodeAkademik.$inferSelect>> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(periodeAkademik)
      .where(
        FeederPullService.combinePredicates([
          inArray(sql`lower(${periodeAkademik.id})`, ids),
          inArray(sql`lower(${periodeAkademik.idPddikti})`, ids),
        ]) as SQL,
      );
  }

  /** Baris Mata Kuliah lokal yang cocok dengan id_matkul atau kode Feeder. */
  private static async loadMataKuliahScoped(
    ids: string[],
    kodes: string[],
  ): Promise<Array<typeof mataKuliah.$inferSelect>> {
    const where = FeederPullService.combinePredicates([
      ...(ids.length ? [inArray(sql`lower(${mataKuliah.idPddikti})`, ids)] : []),
      ...(kodes.length ? [inArray(sql`lower(${mataKuliah.kode})`, kodes)] : []),
    ]);
    return where ? await db.select().from(mataKuliah).where(where) : [];
  }

  /** Baris KRS lokal untuk kombinasi mahasiswa & kelas yang disebut baris Feeder. */
  private static async loadKrsScoped(
    mahasiswaIds: number[],
    kelasKuliahIds: number[],
  ): Promise<Array<typeof krs.$inferSelect>> {
    if (mahasiswaIds.length === 0 || kelasKuliahIds.length === 0) return [];
    return await db
      .select()
      .from(krs)
      .where(and(inArray(krs.mahasiswaId, mahasiswaIds), inArray(krs.kelasKuliahId, kelasKuliahIds)));
  }

  /** Bandingkan baris `GetListKelasKuliah` dengan `kelas_kuliah` lokal. */
  static diffKelas(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof kelasKuliah.$inferSelect>,
    localPeriode: Array<typeof periodeAkademik.$inferSelect>,
    localMataKuliah: Array<typeof mataKuliah.$inferSelect>,
  ): PullPreviewItem[] {
    const periodeByPddikti = new Map<string, typeof periodeAkademik.$inferSelect>();
    const periodeById = new Map<string, typeof periodeAkademik.$inferSelect>();
    for (const p of localPeriode) {
      if (p.idPddikti) periodeByPddikti.set(p.idPddikti.trim().toLowerCase(), p);
      periodeById.set(p.id.trim().toLowerCase(), p);
    }
    const mkByPddikti = new Map<string, typeof mataKuliah.$inferSelect>();
    for (const mk of localMataKuliah) {
      if (mk.idPddikti) mkByPddikti.set(mk.idPddikti.trim().toLowerCase(), mk);
    }
    const kelasByPddikti = new Map<string, typeof kelasKuliah.$inferSelect>();
    const kelasByPeriodeMkNama = new Map<string, typeof kelasKuliah.$inferSelect>();
    for (const k of localRows) {
      if (k.idPddikti) kelasByPddikti.set(k.idPddikti.trim().toLowerCase(), k);
      kelasByPeriodeMkNama.set(`${k.periodeId}:${k.mataKuliahId}:${k.namaKelas.trim().toLowerCase()}`, k);
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const idKelas = asStr(raw.id_kelas_kuliah);
      const idSemester = asStr(raw.id_semester);
      const idMatkul = asStr(raw.id_matkul);
      const nama = asStr(raw.nama_kelas);
      const kodeMk = asStr(raw.kode_mata_kuliah) || asStr(raw.kode_matkul);
      if (!idKelas || !nama || !idSemester) continue;

      const periode =
        periodeByPddikti.get(idSemester.toLowerCase()) ?? periodeById.get(idSemester.toLowerCase()) ?? null;
      const mk = idMatkul ? (mkByPddikti.get(idMatkul.toLowerCase()) ?? null) : null;
      if (!periode) {
        items.push({
          feederId: idKelas,
          naturalKey: `${idSemester}|${kodeMk}|${nama}`,
          label: `${kodeMk ? `[${kodeMk}] ` : ''}${nama} — ${idSemester}`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData: { namaKelas: nama, idSemester },
          localData: null,
          diffs: [],
          canApply: false,
          note: `Periode ${idSemester} belum ada di aplikasi — tarik Referensi (Semester) terlebih dahulu.`,
        });
        continue;
      }
      if (!mk) {
        items.push({
          feederId: idKelas,
          naturalKey: `${idSemester}|${kodeMk}|${nama}`,
          label: `${kodeMk ? `[${kodeMk}] ` : ''}${nama} — ${idSemester}`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData: { namaKelas: nama, idMatkul },
          localData: null,
          diffs: [],
          canApply: false,
          note: `Mata kuliah ${idMatkul || kodeMk} belum tertaut di aplikasi — tarik Master (Mata Kuliah) terlebih dahulu.`,
        });
        continue;
      }

      const tMulai = normalizeFeederDate(raw.tanggal_mulai_efektif);
      const tAkhir = normalizeFeederDate(raw.tanggal_akhir_efektif);
      const feederData = {
        namaKelas: nama,
        periodeId: periode.id,
        mataKuliahId: mk.id,
        tanggalMulaiEfektif: tMulai,
        tanggalAkhirEfektif: tAkhir,
      };
      const local =
        kelasByPddikti.get(idKelas.toLowerCase()) ??
        kelasByPeriodeMkNama.get(`${periode.id}:${mk.id}:${nama.toLowerCase()}`) ??
        null;

      if (!local) {
        items.push({
          feederId: idKelas,
          naturalKey: `${periode.id}|${mk.id}|${nama}`,
          label: `${kodeMk ? `[${kodeMk}] ` : ''}${nama} — ${periode.id}`,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: true,
        });
        continue;
      }

      const localData = {
        namaKelas: local.namaKelas,
        periodeId: local.periodeId,
        mataKuliahId: local.mataKuliahId,
        tanggalMulaiEfektif: local.tanggalMulaiEfektif ?? null,
        tanggalAkhirEfektif: local.tanggalAkhirEfektif ?? null,
      };
      const diffs = FeederPullService.computeDiffs(
        ['namaKelas', 'tanggalMulaiEfektif', 'tanggalAkhirEfektif'],
        feederData,
        localData,
      );
      const idLinked = (local.idPddikti ?? '').toLowerCase() === idKelas.toLowerCase();
      const status: PullDiffStatus = diffs.length > 0 ? 'konflik' : idLinked ? 'sama' : 'link_id';

      items.push({
        feederId: idKelas,
        naturalKey: `${local.periodeId}|${local.mataKuliahId}|${local.namaKelas}`,
        label: `${kodeMk ? `[${kodeMk}] ` : ''}${nama} — ${periode.id}`,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
      });
    }
    return items;
  }

  /** Bandingkan baris `GetRiwayatNilaiMahasiswa` (KRS + nilai) dengan tabel `krs` lokal. */
  static diffKrsNilai(
    feederRows: Array<Record<string, unknown>>,
    localRows: Array<typeof krs.$inferSelect>,
    localMahasiswa: Array<typeof mahasiswa.$inferSelect>,
    localKelas: Array<typeof kelasKuliah.$inferSelect>,
  ): PullPreviewItem[] {
    const mhsByNim = new Map<string, typeof mahasiswa.$inferSelect>();
    for (const m of localMahasiswa) {
      mhsByNim.set(m.nim.trim().toLowerCase(), m);
    }
    const kelasByPddikti = new Map<string, typeof kelasKuliah.$inferSelect>();
    for (const k of localKelas) {
      if (k.idPddikti) kelasByPddikti.set(k.idPddikti.trim().toLowerCase(), k);
    }
    const krsByMhsKelas = new Map<string, typeof krs.$inferSelect>();
    for (const r of localRows) {
      krsByMhsKelas.set(`${r.mahasiswaId}:${r.kelasKuliahId}`, r);
    }

    const items: PullPreviewItem[] = [];
    for (const raw of feederRows) {
      const nim = asStr(raw.nim) || asStr(raw.nipd);
      const idKelas = asStr(raw.id_kelas_kuliah);
      const kodeMk = asStr(raw.kode_mata_kuliah) || asStr(raw.kode_matkul);
      const idSemester = asStr(raw.id_semester);
      if (!nim || !idKelas) continue;

      const label = `${nim}${kodeMk ? ` — [${kodeMk}]` : ''}${idSemester ? ` (${idSemester})` : ''}`;
      const mhs = mhsByNim.get(nim.toLowerCase()) ?? null;
      const kelas = kelasByPddikti.get(idKelas.toLowerCase()) ?? null;

      if (!mhs) {
        items.push({
          feederId: `${nim}|${idKelas}`,
          naturalKey: nim,
          label,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData: { nim },
          localData: null,
          diffs: [],
          canApply: false,
          note: `Mahasiswa dengan NIM ${nim} belum ada di aplikasi — tarik Master (Mahasiswa) terlebih dahulu.`,
        });
        continue;
      }
      if (!kelas) {
        items.push({
          feederId: `${nim}|${idKelas}`,
          naturalKey: nim,
          label,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData: { nim, idKelas },
          localData: null,
          diffs: [],
          canApply: false,
          note: `Kelas kuliah ${idKelas} belum tertaut di aplikasi — tarik Transaksional (Kelas Kuliah) terlebih dahulu.`,
        });
        continue;
      }

      const nilaiAngka = normalizeNilai(raw.nilai_angka);
      const nilaiHuruf = asStr(raw.nilai_huruf) || null;
      const nilaiIndeks = normalizeNilai(raw.nilai_indeks);
      const feederData = {
        mahasiswaId: mhs.id,
        kelasKuliahId: kelas.id,
        nilaiAngka,
        nilaiHuruf,
        nilaiIndeks,
      };
      const local = krsByMhsKelas.get(`${mhs.id}:${kelas.id}`) ?? null;

      if (!local) {
        items.push({
          feederId: `${nim}|${idKelas}`,
          naturalKey: `${nim}|${kelas.id}`,
          label,
          status: 'baru',
          localId: null,
          localIdPddikti: null,
          feederData,
          localData: null,
          diffs: [],
          canApply: true,
          note: 'KRS tidak ada di aplikasi — akan dibuat sebagai KRS sudah disetujui beserta nilainya.',
        });
        continue;
      }

      const localData = {
        mahasiswaId: local.mahasiswaId,
        kelasKuliahId: local.kelasKuliahId,
        nilaiAngka: local.nilaiAngka ?? null,
        nilaiHuruf: local.nilaiHuruf ?? null,
        nilaiIndeks: local.nilaiIndeks ?? null,
      };
      const diffs = FeederPullService.computeDiffs(['nilaiAngka', 'nilaiHuruf', 'nilaiIndeks'], feederData, localData);
      const localKosong = local.nilaiAngka === null && local.nilaiHuruf === null && local.nilaiIndeks === null;
      const status: PullDiffStatus = localKosong && diffs.length > 0 ? 'isi' : diffs.length > 0 ? 'konflik' : 'sama';

      items.push({
        feederId: `${nim}|${idKelas}`,
        naturalKey: `${nim}|${local.kelasKuliahId}`,
        label,
        status,
        localId: local.id,
        localIdPddikti: local.idPddikti ?? null,
        feederData,
        localData,
        diffs,
        canApply: status !== 'sama',
        note:
          status === 'isi'
            ? 'Nilai lokal masih kosong — akan diisi dari nilai yang sudah dilaporkan ke Feeder.'
            : undefined,
      });
    }
    return items;
  }

  /** Pratinjau ringkasan transkrip (`GetTranskripMahasiswa`) — tidak diterapkan ke DB. */
  static diffTranskrip(
    feederRows: Array<Record<string, unknown>>,
    localMahasiswa: Array<typeof mahasiswa.$inferSelect>,
  ): PullPreviewItem[] {
    const mhsByNim = new Map<string, typeof mahasiswa.$inferSelect>();
    for (const m of localMahasiswa) {
      mhsByNim.set(m.nim.trim().toLowerCase(), m);
    }
    return feederRows
      .map((raw): PullPreviewItem | null => {
        const nim = asStr(raw.nim) || asStr(raw.nipd);
        if (!nim) return null;
        const nama = asStr(raw.nama_mahasiswa);
        const ipk = normalizeNilai(raw.ipk);
        const totalSks = asInt(raw.jumlah_sks_diakui ?? raw.sks_total, 0);
        const local = mhsByNim.get(nim.toLowerCase()) ?? null;
        return {
          feederId: nim,
          naturalKey: nim,
          label: `${nim}${nama ? ` — ${nama}` : ''}`,
          status: local ? ('sama' as PullDiffStatus) : ('baru' as PullDiffStatus),
          localId: local?.id ?? null,
          localIdPddikti: local?.idPddikti ?? null,
          feederData: { nim, nama: nama || null, ipk, totalSks },
          localData: null,
          diffs: [],
          canApply: false,
          note: 'Entitas pratinjau — ringkasan transkrip tidak ditulis ke database lokal.',
        };
      })
      .filter((x): x is PullPreviewItem => x !== null);
  }

  /** Pratinjau aktivitas MBKM (`GetListAktivitasMahasiswa`) — tidak diterapkan ke DB. */
  static diffAktivitas(feederRows: Array<Record<string, unknown>>): PullPreviewItem[] {
    return feederRows
      .map((raw): PullPreviewItem | null => {
        const idAktivitas = asStr(raw.id_aktivitas);
        const judul = asStr(raw.judul);
        if (!idAktivitas || !judul) return null;
        const idJenis = asStr(raw.id_jenis_aktivitas);
        const idSemester = asStr(raw.id_semester);
        return {
          feederId: idAktivitas,
          naturalKey: idAktivitas,
          label: `${judul}${idSemester ? ` (${idSemester})` : ''}`,
          status: 'baru' as PullDiffStatus,
          localId: null,
          localIdPddikti: null,
          feederData: {
            idAktivitas,
            judul,
            idJenis: idJenis || null,
            idSemester: idSemester || null,
            idProdi: asStr(raw.id_prodi) || null,
          },
          localData: null,
          diffs: [],
          canApply: false,
          note: 'Entitas pratinjau — modul aktivitas MBKM lokal belum tersedia.',
        };
      })
      .filter((x): x is PullPreviewItem => x !== null);
  }

  /** Buat preview diff antara data Feeder (`Get*`) dan tabel lokal tanpa mengubah DB. */
  static async preview(entity: PullEntityKey, options?: { filter?: string }): Promise<PullPreviewResult> {
    const meta = FeederPullService.getEntityMeta(entity);
    if (!meta) {
      throw new Error(`Entitas pull "${entity}" tidak didukung`);
    }
    const config = await SystemParameterService.getFeederConfig();
    const feederRows = await FeederPullService.fetchFeederRows(config, meta.feederAct, {
      filter: options?.filter,
    });

    // Query lokal dibatasi (scoped) hanya pada kunci yang muncul di data Feeder —
    // bukan SELECT seluruh tabel. Pencocokan memakai lower() agar konsisten dengan
    // normalisasi map di masing-masing fungsi diff.
    let items: PullPreviewItem[] = [];
    if (entity === 'semester') {
      const ids = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_semester)]);
      const where = FeederPullService.combinePredicates([
        ...(ids.length ? [inArray(sql`lower(${periodeAkademik.id})`, ids)] : []),
        ...(ids.length ? [inArray(sql`lower(${periodeAkademik.idPddikti})`, ids)] : []),
      ]);
      const localRows = where ? await db.select().from(periodeAkademik).where(where) : [];
      items = FeederPullService.diffSemester(feederRows, localRows);
    } else if (entity === 'prodi') {
      const ids = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_prodi)]);
      const kodes = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.kode_program_studi)]);
      const namas = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nama_program_studi)]);
      const where = FeederPullService.combinePredicates([
        ...(ids.length ? [inArray(sql`lower(${programStudi.idPddikti})`, ids)] : []),
        ...(kodes.length
          ? [
              inArray(sql`lower(${programStudi.kodeProdiPddikti})`, kodes),
              inArray(sql`lower(${programStudi.kode})`, kodes),
            ]
          : []),
        ...(namas.length ? [inArray(sql`lower(${programStudi.nama})`, namas)] : []),
      ]);
      const localRows = where ? await db.select().from(programStudi).where(where) : [];
      items = FeederPullService.diffProdi(feederRows, localRows);
    } else if (entity === 'matkul') {
      const ids = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_matkul)]);
      const kodes = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.kode_mata_kuliah)]);
      const prodiIds = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_prodi)]);
      const where = FeederPullService.combinePredicates([
        ...(ids.length ? [inArray(sql`lower(${mataKuliah.idPddikti})`, ids)] : []),
        ...(kodes.length ? [inArray(sql`lower(${mataKuliah.kode})`, kodes)] : []),
      ]);
      const localRows = where ? await db.select().from(mataKuliah).where(where) : [];
      const prodiRows = await FeederPullService.loadProdiByFeederIds(prodiIds);
      items = FeederPullService.diffMatkul(feederRows, localRows, prodiRows);
    } else if (entity === 'dosen') {
      const ids = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_dosen)]);
      const nidns = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nidn)]);
      const nips = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nip)]);
      const namas = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nama_dosen)]);
      const where = FeederPullService.combinePredicates([
        ...(ids.length ? [inArray(sql`lower(${dosen.idPddikti})`, ids)] : []),
        ...(nidns.length ? [inArray(sql`lower(${dosen.nidn})`, nidns)] : []),
        ...(nips.length ? [inArray(sql`lower(${dosen.nip})`, nips)] : []),
        ...(namas.length ? [inArray(sql`lower(${dosen.nama})`, namas)] : []),
      ]);
      const localRows = where ? await db.select().from(dosen).where(where) : [];
      items = FeederPullService.diffDosen(feederRows, localRows);
    } else if (entity === 'mahasiswa') {
      const ids = FeederPullService.uniqueLower(feederRows, (r) => [
        asStr(r.id_mahasiswa) || asStr(r.id_registrasi_mahasiswa),
      ]);
      const nims = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nim) || asStr(r.nipd)]);
      const prodiIds = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_prodi)]);
      const where = FeederPullService.combinePredicates([
        ...(ids.length ? [inArray(sql`lower(${mahasiswa.idPddikti})`, ids)] : []),
        ...(nims.length ? [inArray(sql`lower(${mahasiswa.nim})`, nims)] : []),
      ]);
      const localRows = where ? await db.select().from(mahasiswa).where(where) : [];
      const prodiRows = await FeederPullService.loadProdiByFeederIds(prodiIds);
      items = FeederPullService.diffMahasiswa(feederRows, localRows, prodiRows);
    } else if (entity === 'kelas') {
      const ids = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_kelas_kuliah)]);
      const namas = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nama_kelas)]);
      const periodeIds = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_semester)]);
      const mkIds = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_matkul)]);
      const mkKodes = FeederPullService.uniqueLower(feederRows, (r) => [
        asStr(r.kode_mata_kuliah) || asStr(r.kode_matkul),
      ]);
      const [localRows, localPeriode, localMk] = await Promise.all([
        FeederPullService.loadKelasScoped(ids, namas),
        FeederPullService.loadPeriodeByIdSemester(periodeIds),
        FeederPullService.loadMataKuliahScoped(mkIds, mkKodes),
      ]);
      items = FeederPullService.diffKelas(feederRows, localRows, localPeriode, localMk);
    } else if (entity === 'krs-nilai') {
      const nims = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nim) || asStr(r.nipd)]);
      const kelasIds = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.id_kelas_kuliah)]);
      const localMhs = await FeederPullService.loadMahasiswaByNims(nims);
      const localKelas = await FeederPullService.loadKelasScoped(kelasIds, []);
      const localKrs = await FeederPullService.loadKrsScoped(
        localMhs.map((m) => m.id),
        localKelas.map((k) => k.id),
      );
      items = FeederPullService.diffKrsNilai(feederRows, localKrs, localMhs, localKelas);
    } else if (entity === 'transkrip') {
      const nims = FeederPullService.uniqueLower(feederRows, (r) => [asStr(r.nim) || asStr(r.nipd)]);
      const localMhs = await FeederPullService.loadMahasiswaByNims(nims);
      items = FeederPullService.diffTranskrip(feederRows, localMhs);
    } else if (entity === 'aktivitas-mahasiswa') {
      // Tidak ada tabel lokal aktivitas MBKM → seluruh baris tampil sebagai pratinjau.
      items = FeederPullService.diffAktivitas(feederRows);
    }

    const summary = {
      totalFeeder: items.length,
      baru: items.filter((i) => i.status === 'baru').length,
      isi: items.filter((i) => i.status === 'isi').length,
      linkId: items.filter((i) => i.status === 'link_id').length,
      konflik: items.filter((i) => i.status === 'konflik').length,
      sama: items.filter((i) => i.status === 'sama').length,
    };

    return {
      entity,
      feederAct: meta.feederAct,
      writeGuard: config.writeGuard,
      summary,
      items,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Terapkan baris Feeder yang dipilih (`feederIds`) ke tabel lokal.
   * Hanya membaca dari Feeder (`Get*`) lalu menulis ke PostgreSQL lokal.
   */
  static async apply(
    entity: PullEntityKey,
    feederIds: string[],
    conflictResolution: ConflictResolution = 'lokal',
    options?: { filter?: string },
  ): Promise<PullApplyResult> {
    const meta = FeederPullService.getEntityMeta(entity);
    if (!meta) throw new Error(`Entitas pull "${entity}" tidak didukung`);
    if (meta.previewOnly) {
      throw new Error(
        `Entitas "${entity}" (${meta.label}) hanya pratinjau dan tidak dapat diterapkan ke database lokal.`,
      );
    }

    const selectedSet = new Set(feederIds.map((id) => id.trim()).filter(Boolean));
    if (selectedSet.size === 0) {
      return {
        entity,
        conflictResolution,
        inserted: 0,
        updated: 0,
        linkedOnly: 0,
        skipped: 0,
        errors: [],
      };
    }

    const previewResult = await FeederPullService.preview(entity, options);
    const chosen = previewResult.items.filter((item) => selectedSet.has(item.feederId));

    let inserted = 0;
    let updated = 0;
    let linkedOnly = 0;
    let skipped = 0;
    const errors: Array<{ feederId: string; error: string }> = [];
    const now = new Date();

    for (const item of chosen) {
      if (!item.canApply || item.status === 'sama') {
        skipped++;
        continue;
      }

      try {
        if (entity === 'semester') {
          const id = String(item.feederData.id ?? item.feederId);
          const nama = String(item.feederData.nama ?? id);
          if (item.status === 'baru') {
            const insertedRows = await db
              .insert(periodeAkademik)
              .values({
                id,
                nama,
                aktif: false,
                idPddikti: id,
                isSynced: true,
                lastSyncAt: now,
              })
              .onConflictDoNothing()
              .returning({ id: periodeAkademik.id });
            if (insertedRows.length > 0) inserted++;
            else skipped++;
          } else if (item.localId) {
            const setPayload: Partial<typeof periodeAkademik.$inferInsert> = {
              idPddikti: id,
              isSynced: true,
              lastSyncAt: now,
            };
            if (item.status === 'konflik' && conflictResolution === 'feeder') {
              setPayload.nama = nama;
              await db
                .update(periodeAkademik)
                .set(setPayload)
                .where(eq(periodeAkademik.id, String(item.localId)));
              updated++;
            } else {
              await db
                .update(periodeAkademik)
                .set(setPayload)
                .where(eq(periodeAkademik.id, String(item.localId)));
              linkedOnly++;
            }
          }
        } else if (entity === 'prodi') {
          const kode = String(item.feederData.kode ?? '');
          const kodeProdiPddikti = item.feederData.kodeProdiPddikti ? String(item.feederData.kodeProdiPddikti) : null;
          const nama = String(item.feederData.nama ?? '');
          const jenjang = String(item.feederData.jenjang ?? 'D3');

          if (item.status === 'baru') {
            await db.insert(programStudi).values({
              kode,
              kodeProdiPddikti,
              nama,
              jenjang,
              status: 'aktif',
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            });
            inserted++;
          } else if (typeof item.localId === 'number') {
            const setPayload: Partial<typeof programStudi.$inferInsert> = {
              idPddikti: item.feederId,
              kodeProdiPddikti: kodeProdiPddikti ?? undefined,
              isSynced: true,
              lastSyncAt: now,
            };
            if (item.status === 'konflik' && conflictResolution === 'feeder') {
              setPayload.nama = nama;
              setPayload.jenjang = jenjang;
              await db.update(programStudi).set(setPayload).where(eq(programStudi.id, item.localId));
              updated++;
            } else {
              await db.update(programStudi).set(setPayload).where(eq(programStudi.id, item.localId));
              linkedOnly++;
            }
          }
        } else if (entity === 'matkul') {
          const kode = String(item.feederData.kode ?? '');
          const nama = String(item.feederData.nama ?? '');
          const sksTotal = Number(item.feederData.sksTotal ?? 0);
          const sksTatapMuka = Number(item.feederData.sksTatapMuka ?? 0);
          const sksPraktek = Number(item.feederData.sksPraktek ?? 0);
          const sksPraktekLapangan = Number(item.feederData.sksPraktekLapangan ?? 0);
          const sksSimulasi = Number(item.feederData.sksSimulasi ?? 0);
          const programStudiId =
            typeof item.feederData.programStudiId === 'number' ? item.feederData.programStudiId : null;

          if (item.status === 'baru') {
            if (!programStudiId) {
              skipped++;
              continue;
            }
            await db.insert(mataKuliah).values({
              programStudiId,
              kode,
              nama,
              sksTotal,
              sksTatapMuka,
              sksPraktek,
              sksPraktekLapangan,
              sksSimulasi,
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            });
            inserted++;
          } else if (typeof item.localId === 'number') {
            const setPayload: Partial<typeof mataKuliah.$inferInsert> = {
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            };
            if (item.status === 'konflik' && conflictResolution === 'feeder') {
              setPayload.nama = nama;
              setPayload.sksTotal = sksTotal;
              setPayload.sksTatapMuka = sksTatapMuka;
              setPayload.sksPraktek = sksPraktek;
              setPayload.sksPraktekLapangan = sksPraktekLapangan;
              setPayload.sksSimulasi = sksSimulasi;
              await db.update(mataKuliah).set(setPayload).where(eq(mataKuliah.id, item.localId));
              updated++;
            } else {
              await db.update(mataKuliah).set(setPayload).where(eq(mataKuliah.id, item.localId));
              linkedOnly++;
            }
          }
        } else if (entity === 'dosen') {
          const nip = String(item.feederData.nip ?? item.feederId.slice(0, 18));
          const nidn = item.feederData.nidn ? String(item.feederData.nidn) : null;
          const nama = String(item.feederData.nama ?? '');
          const jenisKelamin = (item.feederData.jenisKelamin as 'L' | 'P' | null) ?? null;
          const tanggalLahir = item.feederData.tanggalLahir ? String(item.feederData.tanggalLahir) : null;
          const idAgama = typeof item.feederData.idAgama === 'number' ? item.feederData.idAgama : null;

          if (item.status === 'baru') {
            const emailLocal = sanitizeEmailLocal(nidn || nip, item.feederId.slice(0, 10));
            await db.insert(dosen).values({
              nip,
              nidn,
              nama,
              email: `${emailLocal}@feeder.politekniksorowako.ac.id`,
              jenisKelamin,
              tanggalLahir,
              idAgama,
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            });
            inserted++;
          } else if (typeof item.localId === 'number') {
            const setPayload: Partial<typeof dosen.$inferInsert> = {
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            };
            if (!item.localData?.nidn && nidn) setPayload.nidn = nidn;
            if (!item.localData?.jenisKelamin && jenisKelamin) setPayload.jenisKelamin = jenisKelamin;
            if (!item.localData?.tanggalLahir && tanggalLahir) setPayload.tanggalLahir = tanggalLahir;
            if (item.localData?.idAgama === null && idAgama !== null) setPayload.idAgama = idAgama;

            if (item.status === 'konflik' && conflictResolution === 'feeder') {
              setPayload.nama = nama;
              if (nidn) setPayload.nidn = nidn;
              await db.update(dosen).set(setPayload).where(eq(dosen.id, item.localId));
              updated++;
            } else {
              await db.update(dosen).set(setPayload).where(eq(dosen.id, item.localId));
              linkedOnly++;
            }
          }
        } else if (entity === 'mahasiswa') {
          const nim = String(item.feederData.nim ?? '');
          const nama = String(item.feederData.nama ?? '');
          const angkatan = item.feederData.angkatan ? String(item.feederData.angkatan) : null;
          const programStudiId =
            typeof item.feederData.programStudiId === 'number' ? item.feederData.programStudiId : null;
          const jenisKelamin = ((item.feederData.jenisKelamin as 'L' | 'P' | null) ?? 'L') as 'L' | 'P';
          const tanggalLahir = item.feederData.tanggalLahir ? String(item.feederData.tanggalLahir) : null;
          const idAgama = typeof item.feederData.idAgama === 'number' ? item.feederData.idAgama : null;

          if (item.status === 'baru') {
            const emailLocal = sanitizeEmailLocal(nim, item.feederId.slice(0, 10));
            await db.insert(mahasiswa).values({
              nim,
              nama,
              email: `${emailLocal}@student.politekniksorowako.ac.id`,
              angkatan,
              programStudiId,
              jenisKelamin,
              tanggalLahir,
              idAgama,
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            });
            inserted++;
          } else if (typeof item.localId === 'number') {
            const setPayload: Partial<typeof mahasiswa.$inferInsert> = {
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            };
            if (!item.localData?.angkatan && angkatan) setPayload.angkatan = angkatan;
            if (!item.localData?.programStudiId && programStudiId) setPayload.programStudiId = programStudiId;
            if (!item.localData?.tanggalLahir && tanggalLahir) setPayload.tanggalLahir = tanggalLahir;
            if (item.localData?.idAgama === null && idAgama !== null) setPayload.idAgama = idAgama;

            if (item.status === 'konflik' && conflictResolution === 'feeder') {
              setPayload.nama = nama;
              if (angkatan) setPayload.angkatan = angkatan;
              if (programStudiId) setPayload.programStudiId = programStudiId;
              await db.update(mahasiswa).set(setPayload).where(eq(mahasiswa.id, item.localId));
              updated++;
            } else {
              await db.update(mahasiswa).set(setPayload).where(eq(mahasiswa.id, item.localId));
              linkedOnly++;
            }
          }
        } else if (entity === 'kelas') {
          const nama = String(item.feederData.namaKelas ?? '');
          const periodeId = typeof item.feederData.periodeId === 'string' ? item.feederData.periodeId : '';
          const mataKuliahId = typeof item.feederData.mataKuliahId === 'number' ? item.feederData.mataKuliahId : 0;
          const tMulai = item.feederData.tanggalMulaiEfektif ? String(item.feederData.tanggalMulaiEfektif) : null;
          const tAkhir = item.feederData.tanggalAkhirEfektif ? String(item.feederData.tanggalAkhirEfektif) : null;
          if (!periodeId || !mataKuliahId) {
            skipped++;
            continue;
          }

          if (item.status === 'baru') {
            const insertedRows = await db
              .insert(kelasKuliah)
              .values({
                mataKuliahId,
                periodeId,
                namaKelas: nama,
                tanggalMulaiEfektif: tMulai,
                tanggalAkhirEfektif: tAkhir,
                idPddikti: item.feederId,
                isSynced: true,
                lastSyncAt: now,
              })
              .onConflictDoNothing()
              .returning({ id: kelasKuliah.id });
            if (insertedRows.length > 0) inserted++;
            else skipped++;
          } else if (typeof item.localId === 'number') {
            const setPayload: Partial<typeof kelasKuliah.$inferInsert> = {
              idPddikti: item.feederId,
              isSynced: true,
              lastSyncAt: now,
            };
            if (item.status === 'konflik' && conflictResolution === 'feeder') {
              setPayload.namaKelas = nama;
              setPayload.tanggalMulaiEfektif = tMulai;
              setPayload.tanggalAkhirEfektif = tAkhir;
              await db.update(kelasKuliah).set(setPayload).where(eq(kelasKuliah.id, item.localId));
              updated++;
            } else {
              await db.update(kelasKuliah).set(setPayload).where(eq(kelasKuliah.id, item.localId));
              linkedOnly++;
            }
          }
        } else if (entity === 'krs-nilai') {
          const mahasiswaId = typeof item.feederData.mahasiswaId === 'number' ? item.feederData.mahasiswaId : 0;
          const kelasKuliahId = typeof item.feederData.kelasKuliahId === 'number' ? item.feederData.kelasKuliahId : 0;
          const nilaiAngka = typeof item.feederData.nilaiAngka === 'string' ? item.feederData.nilaiAngka : null;
          const nilaiHuruf = item.feederData.nilaiHuruf ? String(item.feederData.nilaiHuruf) : null;
          const nilaiIndeks = typeof item.feederData.nilaiIndeks === 'string' ? item.feederData.nilaiIndeks : null;
          if (!mahasiswaId || !kelasKuliahId) {
            skipped++;
            continue;
          }

          if (item.status === 'baru') {
            // KRS dari Feeder = KRS yang sudah dilaporkan (approved) beserta nilainya.
            await db.insert(krs).values({
              mahasiswaId,
              kelasKuliahId,
              nilaiAngka,
              nilaiHuruf,
              nilaiIndeks,
              useInGpa: true,
              isApproved: true,
              approvedAt: now,
              isSynced: true,
              lastSyncAt: now,
            });
            inserted++;
          } else if (typeof item.localId === 'number') {
            const setPayload: Partial<typeof krs.$inferInsert> = {
              isSynced: true,
              lastSyncAt: now,
            };
            // 'isi' (nilai lokal masih kosong) atau konflik yang dipilih mengikuti Feeder → tulis nilai.
            const tulisNilai = item.status === 'isi' || (item.status === 'konflik' && conflictResolution === 'feeder');
            if (tulisNilai) {
              setPayload.nilaiAngka = nilaiAngka;
              setPayload.nilaiHuruf = nilaiHuruf;
              setPayload.nilaiIndeks = nilaiIndeks;
              setPayload.isApproved = true;
              setPayload.approvedAt = now;
            }
            await db.update(krs).set(setPayload).where(eq(krs.id, item.localId));
            if (tulisNilai) updated++;
            else linkedOnly++;
          }
        }
      } catch (e: unknown) {
        errors.push({
          feederId: item.feederId,
          error: e instanceof Error ? e.message : 'Gagal menerapkan baris Feeder',
        });
      }
    }

    return {
      entity,
      conflictResolution,
      inserted,
      updated,
      linkedOnly,
      skipped,
      errors,
    };
  }
}
