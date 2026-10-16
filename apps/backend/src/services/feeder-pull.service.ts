import { eq } from 'drizzle-orm';
import { dosen, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { FeederService } from './feeder.service';
import { type FeederConfig, SystemParameterService } from './system-parameter.service';

export type PullEntityKey = 'semester' | 'prodi' | 'matkul' | 'dosen' | 'mahasiswa';
export type PullEntityCategory = 'referensi' | 'master';
export type PullDiffStatus = 'baru' | 'link_id' | 'konflik' | 'sama';
export type ConflictResolution = 'feeder' | 'lokal';

export interface PullEntityMeta {
  key: PullEntityKey;
  label: string;
  category: PullEntityCategory;
  feederAct: string;
  description: string;
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

function normalizeGender(raw: unknown): 'L' | 'P' | null {
  const s = asStr(raw).toUpperCase();
  if (s === 'L') return 'L';
  if (s === 'P') return 'P';
  return null;
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
    for (let page = 0; page < maxPages; page++) {
      const offset = page * pageSize;
      const chunk = await FeederService.request<unknown>(config, act, {
        filter,
        limit: pageSize,
        offset,
      });
      if (!Array.isArray(chunk) || chunk.length === 0) break;
      for (const item of chunk) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          out.push(item as Record<string, unknown>);
        }
      }
      if (chunk.length < pageSize) break;
    }
    return out;
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

      const local =
        byPddikti.get(idMatkul.toLowerCase()) ??
        (mappedProdi ? byProdiKode.get(`${mappedProdi.id}:${kode.toLowerCase()}`) : undefined) ??
        byKodeOnly.get(kode.toLowerCase()) ??
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

    let items: PullPreviewItem[] = [];
    if (entity === 'semester') {
      const localRows = await db.select().from(periodeAkademik);
      items = FeederPullService.diffSemester(feederRows, localRows);
    } else if (entity === 'prodi') {
      const localRows = await db.select().from(programStudi);
      items = FeederPullService.diffProdi(feederRows, localRows);
    } else if (entity === 'matkul') {
      const [localRows, prodiRows] = await Promise.all([db.select().from(mataKuliah), db.select().from(programStudi)]);
      items = FeederPullService.diffMatkul(feederRows, localRows, prodiRows);
    } else if (entity === 'dosen') {
      const localRows = await db.select().from(dosen);
      items = FeederPullService.diffDosen(feederRows, localRows);
    } else if (entity === 'mahasiswa') {
      const [localRows, prodiRows] = await Promise.all([db.select().from(mahasiswa), db.select().from(programStudi)]);
      items = FeederPullService.diffMahasiswa(feederRows, localRows, prodiRows);
    }

    const summary = {
      totalFeeder: items.length,
      baru: items.filter((i) => i.status === 'baru').length,
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
            await db
              .insert(periodeAkademik)
              .values({
                id,
                nama,
                aktif: false,
                idPddikti: id,
                isSynced: true,
                lastSyncAt: now,
              })
              .onConflictDoNothing();
            inserted++;
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
