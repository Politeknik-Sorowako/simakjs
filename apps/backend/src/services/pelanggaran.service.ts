import { and, count, desc, eq, SQL, sql, sum } from 'drizzle-orm';
import { mahasiswa, pasalPelanggaran, pelanggaran, programStudi } from '../models/schema';
import { db } from '../utils/db';

export function hitungPredikatTxly(totalPoin: number): string {
  const x = Math.floor(totalPoin / 4);
  const y = totalPoin % 4;
  return `T${x}L${y}`;
}

export class PelanggaranService {
  static async createPelanggaran(data: {
    mahasiswaId: number;
    tanggal: string;
    jenisPelanggaran?: string;
    keterangan: string;
    pasalId?: number | null;
    jenisSanksi?: number;
    dibuatOleh?: number;
  }) {
    const [mhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, data.mahasiswaId));
    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    let pasalId = data.pasalId ?? null;
    let jenisSanksi = data.jenisSanksi ?? 1;
    let jenisPelanggaran = data.jenisPelanggaran ?? '';

    // Auto-fill jenis pelanggaran & jenis sanksi dari master pasal BPA bila pasal dipilih.
    if (pasalId) {
      const [pasal] = await db.select().from(pasalPelanggaran).where(eq(pasalPelanggaran.id, pasalId));
      if (!pasal) {
        throw new Error('Pasal pelanggaran tidak ditemukan.');
      }
      jenisPelanggaran = `${pasal.nomorPasal} - ${pasal.bunyiPasal}`.slice(0, 255);
      jenisSanksi = pasal.jenisSanksi;
    }

    if (!jenisPelanggaran) {
      throw new Error(
        'Jenis pelanggaran tidak boleh kosong. Pilih pasal BPA atau tulis jenis pelanggaran secara manual.',
      );
    }
    if (jenisSanksi !== 1 && jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }

    const [newPelanggaran] = await db
      .insert(pelanggaran)
      .values({
        mahasiswaId: data.mahasiswaId,
        tanggal: data.tanggal,
        jenisPelanggaran,
        keterangan: data.keterangan,
        pasalId,
        jenisSanksi,
        dibuatOleh: data.dibuatOleh,
      })
      .returning();
    return newPelanggaran;
  }

  static async getPelanggaranByMahasiswa(mahasiswaId: number) {
    const list = await db
      .select({
        id: pelanggaran.id,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: sql<number>`COALESCE(${pelanggaran.jenisSanksi}, 1)`,
        keterangan: pelanggaran.keterangan,
        pasalId: pelanggaran.pasalId,
        jenisSanksi: pelanggaran.jenisSanksi,
        nomorPasal: pasalPelanggaran.nomorPasal,
        bunyiPasal: pasalPelanggaran.bunyiPasal,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .leftJoin(pasalPelanggaran, eq(pelanggaran.pasalId, pasalPelanggaran.id))
      .where(eq(pelanggaran.mahasiswaId, mahasiswaId))
      .orderBy(desc(pelanggaran.tanggal));

    const totalPoin = list.reduce((acc, item) => acc + Number(item.bobotPoin), 0);

    return {
      pelanggaranList: list.map((item) => ({ ...item, bobotPoin: Number(item.bobotPoin) })),
      totalPoin,
      predikat: hitungPredikatTxly(totalPoin),
    };
  }

  static async getAllPelanggaran() {
    const rows = await db
      .select({
        id: pelanggaran.id,
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        prodiNama: programStudi.nama,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: sql<number>`COALESCE(${pelanggaran.jenisSanksi}, 1)`,
        keterangan: pelanggaran.keterangan,
        pasalId: pelanggaran.pasalId,
        jenisSanksi: pelanggaran.jenisSanksi,
        nomorPasal: pasalPelanggaran.nomorPasal,
        bunyiPasal: pasalPelanggaran.bunyiPasal,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(pasalPelanggaran, eq(pelanggaran.pasalId, pasalPelanggaran.id))
      .orderBy(desc(pelanggaran.tanggal));

    return rows.map((item) => ({ ...item, bobotPoin: Number(item.bobotPoin) }));
  }

  static async getRekap(programStudiId?: number) {
    const { mahasiswa: mhs, programStudi: ps } = await import('../models/schema');

    const conditions: SQL<unknown>[] = [];
    if (programStudiId) conditions.push(eq(mhs.programStudiId, programStudiId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db
      .select({ totalPelanggaran: count(), totalMahasiswa: sql<number>`count(distinct ${pelanggaran.mahasiswaId})` })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause);

    const perJenis = await db
      .select({
        jenis: pelanggaran.jenisPelanggaran,
        jumlah: count(),
        totalPoin: sum(sql`COALESCE(${pelanggaran.jenisSanksi}, 1)`),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause)
      .groupBy(pelanggaran.jenisPelanggaran)
      .orderBy(sql`count(*) DESC`);

    const perProdi = await db
      .select({
        prodiId: mhs.programStudiId,
        prodiNama: ps.nama,
        totalPelanggaran: count(),
        totalPoin: sum(sql`COALESCE(${pelanggaran.jenisSanksi}, 1)`),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .leftJoin(ps, eq(mhs.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(mhs.programStudiId, ps.nama);

    const topPelanggar = await db
      .select({
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mhs.nim,
        nama: mhs.nama,
        prodiNama: ps.nama,
        totalPoin: sum(sql`COALESCE(${pelanggaran.jenisSanksi}, 1)`),
        jumlahPelanggaran: count(),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .leftJoin(ps, eq(mhs.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(pelanggaran.mahasiswaId, mhs.nim, mhs.nama, ps.nama)
      .orderBy(sql`SUM(COALESCE(${pelanggaran.jenisSanksi}, 1)) DESC`)
      .limit(10);

    return {
      totalPelanggaran: Number(totals?.totalPelanggaran || 0),
      totalMahasiswa: Number(totals?.totalMahasiswa || 0),
      perJenis: perJenis.map((j) => ({
        jenis: j.jenis,
        jumlah: Number(j.jumlah),
        totalPoin: Number(j.totalPoin || 0),
      })),
      perProdi: perProdi.map((p) => ({
        prodiId: p.prodiId,
        prodiNama: p.prodiNama || '-',
        totalPelanggaran: Number(p.totalPelanggaran),
        totalPoin: Number(p.totalPoin || 0),
      })),
      topPelanggar: topPelanggar.map((t) => ({
        mahasiswaId: t.mahasiswaId,
        nim: t.nim,
        nama: t.nama,
        prodiNama: t.prodiNama || '-',
        totalPoin: Number(t.totalPoin || 0),
        jumlahPelanggaran: Number(t.jumlahPelanggaran),
        predikat: hitungPredikatTxly(Number(t.totalPoin || 0)),
      })),
    };
  }

  static async updatePelanggaran(
    id: number,
    data: Partial<{
      tanggal: string;
      jenisPelanggaran: string;
      keterangan: string;
      pasalId?: number | null;
      jenisSanksi?: number;
    }>,
  ) {
    if (data.jenisSanksi !== undefined && data.jenisSanksi !== 1 && data.jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }
    if (data.pasalId !== undefined) {
      if (data.pasalId === null) {
        // Unlink pasal: only clear pasalId. Keep existing jenisPelanggaran/jenisSanksi
        // unless the caller explicitly overrides them via the update payload.
      } else {
        const [pasal] = await db.select().from(pasalPelanggaran).where(eq(pasalPelanggaran.id, data.pasalId));
        if (!pasal) {
          throw new Error('Pasal pelanggaran tidak ditemukan.');
        }
        data.jenisPelanggaran = `${pasal.nomorPasal} - ${pasal.bunyiPasal}`.slice(0, 255);
        data.jenisSanksi = pasal.jenisSanksi;
      }
    }
    const [updated] = await db.update(pelanggaran).set(data).where(eq(pelanggaran.id, id)).returning();
    return updated || null;
  }
}
