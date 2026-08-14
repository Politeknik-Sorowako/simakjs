import { and, count, desc, eq, inArray, or, SQL, sql, sum } from 'drizzle-orm';
import {
  dosen,
  mahasiswa,
  notifications,
  pasalPelanggaran,
  pelanggaran,
  programStudi,
  userProdiScopes,
  userRoles,
  users,
} from '../models/schema';
import { db } from '../utils/db';

export function hitungPredikatTxly(totalPoin: number): string {
  const x = Math.floor(totalPoin / 4);
  const y = totalPoin % 4;
  return `T${x}L${y}`;
}

export function hitungDegradasiNilaiSikap(totalPoin: number): number {
  const t = Math.floor(totalPoin / 4);
  const l = totalPoin % 4;
  // Sesuai BPA Politeknik Sorowako: Lisan = -0.25, Tertulis = -1.00
  return Number((t * 1.0 + l * 0.25).toFixed(2));
}

export class PelanggaranService {
  static async createPelanggaran(data: {
    mahasiswaId: number;
    tanggal: string;
    jenisPelanggaran?: string;
    keterangan: string;
    pasalId?: number | null;
    jenisSanksi?: number;
    pelapor?: string | null;
    dibuatOleh?: number;
  }) {
    const [mhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, data.mahasiswaId));
    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    const rawPasalId = data.pasalId !== undefined && data.pasalId !== null ? Number(data.pasalId) : null;
    const pasalId = rawPasalId && rawPasalId > 0 ? rawPasalId : null;
    let jenisSanksi = data.jenisSanksi ?? 1;
    let jenisPelanggaran = data.jenisPelanggaran ?? '';
    let namaPasal = jenisPelanggaran;

    // Auto-fill jenis pelanggaran & jenis sanksi dari master pasal BPA bila pasal dipilih.
    if (pasalId) {
      const [pasal] = await db.select().from(pasalPelanggaran).where(eq(pasalPelanggaran.id, pasalId));
      if (!pasal) {
        throw new Error('Pasal pelanggaran tidak ditemukan.');
      }
      namaPasal = `${pasal.nomorPasal} - ${pasal.bunyiPasal}`;
      jenisPelanggaran = namaPasal.slice(0, 255);
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

    let namaPelapor = data.pelapor?.trim();
    if (!namaPelapor && data.dibuatOleh) {
      const [creator] = await db.select({ nama: users.nama }).from(users).where(eq(users.id, data.dibuatOleh));
      namaPelapor = creator?.nama || 'Petugas Kedisiplinan';
    } else if (!namaPelapor) {
      namaPelapor = 'Petugas Kedisiplinan';
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
        pelapor: namaPelapor,
        dibuatOleh: data.dibuatOleh,
      })
      .returning();

    // Trigger notifikasi peringatan pelanggaran (SP) ke Dosen PA & Kaprodi / Admin Prodi
    try {
      await this.sendPeringatanNotification({
        mahasiswa: mhs,
        pelanggaran: newPelanggaran,
        namaPasal,
        namaPelapor,
      });
    } catch (notifErr) {
      console.error('[PelanggaranService] Gagal mengirim notifikasi peringatan:', notifErr);
    }

    return newPelanggaran;
  }

  static async sendPeringatanNotification(ctx: {
    mahasiswa: typeof mahasiswa.$inferSelect;
    pelanggaran: typeof pelanggaran.$inferSelect;
    namaPasal: string;
    namaPelapor: string;
  }) {
    const { mahasiswa: mhs, pelanggaran: pel, namaPasal, namaPelapor } = ctx;

    // Hitung total poin pelanggaran mahasiswa
    const allViolations = await db
      .select({ jenisSanksi: pelanggaran.jenisSanksi })
      .from(pelanggaran)
      .where(eq(pelanggaran.mahasiswaId, mhs.id));

    const totalPoin = allViolations.reduce((acc, v) => acc + (v.jenisSanksi || 1), 0);

    // Tentukan Tingkat Peringatan / SP sesuai ketentuan BPA
    let tingkatSp = 'Peringatan Lisan';
    if (totalPoin >= 75) {
      tingkatSp = 'Surat Peringatan 3 (SP-3 / Diberhentikan)';
    } else if (totalPoin >= 50) {
      tingkatSp = 'Surat Peringatan 2 (SP-2 / Skorsing)';
    } else if (totalPoin >= 25) {
      tingkatSp = 'Surat Peringatan 1 (SP-1)';
    } else if (pel.jenisSanksi === 4) {
      tingkatSp = 'Peringatan Tertulis';
    }

    const title = `Notifikasi Peringatan Pelanggaran - ${mhs.nama} (${mhs.nim})`;
    const message = `Telah diterbitkan ${tingkatSp} untuk mahasiswa ${mhs.nama} (NIM: ${mhs.nim}) atas pasal pelanggaran ${namaPasal}. Dilaporkan oleh: ${namaPelapor}.`;
    const link = '/pelanggaran';

    const recipientUserIds = new Set<number>();

    // 1. Dosen PA
    if (mhs.dosenPaId) {
      const [dosenRow] = await db.select({ email: dosen.email }).from(dosen).where(eq(dosen.id, mhs.dosenPaId));
      if (dosenRow?.email) {
        const [dosenUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, dosenRow.email));
        if (dosenUser) {
          recipientUserIds.add(dosenUser.id);
        }
      }
    }

    // 2. Kaprodi & Admin Prodi yang memiliki scope program studi sama
    if (mhs.programStudiId) {
      // Ambil user yang memiliki role kaprodi atau prodi (baik via multi-role user_roles maupun primary users.role)
      const prodiRoleUserIds = await db
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .where(inArray(userRoles.role, ['kaprodi', 'prodi']));

      const candidateIds = prodiRoleUserIds.map((r) => r.userId);

      const prodiStaffUsers = await db
        .select({
          id: users.id,
          role: users.role,
          isGlobalScope: users.isGlobalScope,
          prodiIds: users.prodiIds,
        })
        .from(users)
        .where(
          candidateIds.length > 0
            ? or(inArray(users.id, candidateIds), inArray(users.role, ['kaprodi', 'prodi']))
            : inArray(users.role, ['kaprodi', 'prodi']),
        );

      // Ambil data userProdiScopes untuk prodi ini
      const scopedRows = await db
        .select({ userId: userProdiScopes.userId })
        .from(userProdiScopes)
        .where(eq(userProdiScopes.programStudiId, mhs.programStudiId));

      const scopedUserIds = new Set(scopedRows.map((s) => s.userId));

      for (const u of prodiStaffUsers) {
        const isGlobal = u.isGlobalScope;
        const inProdiIds = Array.isArray(u.prodiIds) && u.prodiIds.includes(mhs.programStudiId);
        const inScopedTable = scopedUserIds.has(u.id);

        if (isGlobal || inProdiIds || inScopedTable) {
          recipientUserIds.add(u.id);
        }
      }
    }

    // Insert notifikasi ke database
    for (const userId of recipientUserIds) {
      await db.insert(notifications).values({
        userId,
        title,
        message,
        link,
      });
    }
  }

  static async getPelanggaranByMahasiswa(mahasiswaId: number) {
    const list = await db
      .select({
        id: pelanggaran.id,
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        prodiNama: programStudi.nama,
        programStudiId: mahasiswa.programStudiId,
        jenjang: programStudi.jenjang,
        dosenPaId: mahasiswa.dosenPaId,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: sql<number>`COALESCE(${pelanggaran.jenisSanksi}, 1)`,
        keterangan: pelanggaran.keterangan,
        pasalId: pelanggaran.pasalId,
        jenisSanksi: pelanggaran.jenisSanksi,
        pelapor: pelanggaran.pelapor,
        nomorPasal: pasalPelanggaran.nomorPasal,
        bunyiPasal: pasalPelanggaran.bunyiPasal,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(pasalPelanggaran, eq(pelanggaran.pasalId, pasalPelanggaran.id))
      .where(eq(pelanggaran.mahasiswaId, mahasiswaId))
      .orderBy(desc(pelanggaran.tanggal));

    const totalPoin = list.reduce((acc, item) => acc + Number(item.bobotPoin), 0);

    return {
      pelanggaranList: list.map((item) => ({ ...item, bobotPoin: Number(item.bobotPoin) })),
      totalPoin,
      predikat: hitungPredikatTxly(totalPoin),
      degradasiNilaiSikap: hitungDegradasiNilaiSikap(totalPoin),
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
        programStudiId: mahasiswa.programStudiId,
        jenjang: programStudi.jenjang,
        dosenPaId: mahasiswa.dosenPaId,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: sql<number>`COALESCE(${pelanggaran.jenisSanksi}, 1)`,
        keterangan: pelanggaran.keterangan,
        pasalId: pelanggaran.pasalId,
        jenisSanksi: pelanggaran.jenisSanksi,
        pelapor: pelanggaran.pelapor,
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
        degradasiNilaiSikap: hitungDegradasiNilaiSikap(Number(t.totalPoin || 0)),
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
      pelapor?: string | null;
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
