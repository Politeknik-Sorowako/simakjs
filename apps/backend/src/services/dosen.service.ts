import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { dosen } from '../models/schema';
import { db } from '../utils/db';
import { parseNamaGelar } from '../utils/nama-gelar';

export interface CreateDosenDto {
  nip: string;
  gelarDepan?: string | null;
  nama: string;
  gelarBelakang?: string | null;
  email: string;
  programStudiId?: number;
  idPddikti?: string;
  nidn?: string;
  nuptk?: string;
  pohonIlmu?: string;
  cabangIlmu?: string;
  nik?: string;
  jenisKelamin?: 'L' | 'P';
  tanggalLahir?: string;
  tempatLahir?: string;
}

export class DosenService {
  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    programStudiId?: number,
    sortBy = 'nama',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(dosen.nama, `%${search}%`),
          ilike(dosen.gelarDepan, `%${search}%`),
          ilike(dosen.gelarBelakang, `%${search}%`),
          ilike(dosen.nip, `%${search}%`),
          ilike(dosen.email, `%${search}%`),
          ilike(dosen.nuptk, `%${search}%`),
          ilike(dosen.nidn, `%${search}%`),
          ilike(dosen.pohonIlmu, `%${search}%`),
          ilike(dosen.cabangIlmu, `%${search}%`),
        ),
      );
    }
    if (programStudiId !== undefined) {
      conditions.push(eq(dosen.programStudiId, programStudiId));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db.select({ total: count() }).from(dosen).where(whereClause);

    const total = totalResult?.total || 0;

    const sortColumnMap = {
      nip: dosen.nip,
      nama: dosen.nama,
      email: dosen.email,
      nidn: dosen.nidn,
      nuptk: dosen.nuptk,
      programStudiId: dosen.programStudiId,
    } as const;
    const sortColumn = sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? dosen.nama;

    const data = await db.query.dosen.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: sortOrder === 'desc' ? [desc(sortColumn)] : [asc(sortColumn)],
      with: {
        programStudi: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getById(id: number) {
    const data = await db.query.dosen.findFirst({
      where: eq(dosen.id, id),
      with: {
        programStudi: true,
      },
    });
    return data || null;
  }

  static async create(data: CreateDosenDto) {
    let cleanNama = data.nama?.trim() ?? '';
    let gelarDepan = data.gelarDepan?.trim() ? data.gelarDepan.trim() : null;
    let gelarBelakang = data.gelarBelakang?.trim() ? data.gelarBelakang.trim() : null;

    // Fallback auto-split bila pengguna memasukkan nama bergelar lengkap tanpa mengisi gelar terpisah
    if (!gelarDepan && !gelarBelakang && cleanNama) {
      const parsed = parseNamaGelar(cleanNama);
      if (parsed.gelarDepan || parsed.gelarBelakang) {
        gelarDepan = parsed.gelarDepan;
        cleanNama = parsed.nama;
        gelarBelakang = parsed.gelarBelakang;
      }
    }

    const sanitized = {
      ...data,
      nama: cleanNama,
      gelarDepan,
      gelarBelakang,
      nik: data.nik?.trim() ? data.nik : null,
      tanggalLahir: data.tanggalLahir?.trim() ? data.tanggalLahir : null,
      tempatLahir: data.tempatLahir?.trim() ? data.tempatLahir : null,
      nidn: data.nidn?.trim() ? data.nidn : null,
      nuptk: data.nuptk?.trim() ? data.nuptk : null,
      pohonIlmu: data.pohonIlmu?.trim() ? data.pohonIlmu : null,
      cabangIlmu: data.cabangIlmu?.trim() ? data.cabangIlmu : null,
      idPddikti: data.idPddikti?.trim() ? data.idPddikti : null,
    };
    const [newDosen] = await db.insert(dosen).values(sanitized).returning();
    return newDosen;
  }

  static async update(id: number, data: Partial<CreateDosenDto>) {
    const sanitized: Record<string, unknown> = { ...data };

    if ('nama' in data) {
      let cleanNama = data.nama?.trim() ?? '';
      let gelarDepan =
        data.gelarDepan !== undefined ? (data.gelarDepan?.trim() ? data.gelarDepan.trim() : null) : undefined;
      let gelarBelakang =
        data.gelarBelakang !== undefined ? (data.gelarBelakang?.trim() ? data.gelarBelakang.trim() : null) : undefined;

      if (gelarDepan === undefined && gelarBelakang === undefined && cleanNama) {
        const parsed = parseNamaGelar(cleanNama);
        if (parsed.gelarDepan || parsed.gelarBelakang) {
          sanitized.gelarDepan = parsed.gelarDepan;
          sanitized.nama = parsed.nama;
          sanitized.gelarBelakang = parsed.gelarBelakang;
        } else {
          sanitized.nama = cleanNama;
        }
      } else {
        sanitized.nama = cleanNama;
        if (gelarDepan !== undefined) sanitized.gelarDepan = gelarDepan;
        if (gelarBelakang !== undefined) sanitized.gelarBelakang = gelarBelakang;
      }
    } else {
      if ('gelarDepan' in data) sanitized.gelarDepan = data.gelarDepan?.trim() ? data.gelarDepan.trim() : null;
      if ('gelarBelakang' in data)
        sanitized.gelarBelakang = data.gelarBelakang?.trim() ? data.gelarBelakang.trim() : null;
    }

    if ('nik' in data) sanitized.nik = data.nik?.trim() ? data.nik : null;
    if ('tanggalLahir' in data) sanitized.tanggalLahir = data.tanggalLahir?.trim() ? data.tanggalLahir : null;
    if ('tempatLahir' in data) sanitized.tempatLahir = data.tempatLahir?.trim() ? data.tempatLahir : null;
    if ('nidn' in data) sanitized.nidn = data.nidn?.trim() ? data.nidn : null;
    if ('nuptk' in data) sanitized.nuptk = data.nuptk?.trim() ? data.nuptk : null;
    if ('pohonIlmu' in data) sanitized.pohonIlmu = data.pohonIlmu?.trim() ? data.pohonIlmu : null;
    if ('cabangIlmu' in data) sanitized.cabangIlmu = data.cabangIlmu?.trim() ? data.cabangIlmu : null;
    if ('idPddikti' in data) sanitized.idPddikti = data.idPddikti?.trim() ? data.idPddikti : null;

    const [updatedDosen] = await db.update(dosen).set(sanitized).where(eq(dosen.id, id)).returning();
    return updatedDosen || null;
  }

  static async delete(id: number) {
    const [deletedDosen] = await db.delete(dosen).where(eq(dosen.id, id)).returning();
    return deletedDosen || null;
  }
}
