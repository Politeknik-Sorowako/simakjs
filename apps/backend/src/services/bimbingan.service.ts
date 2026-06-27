import { db } from '../utils/db';
import { bimbingan, bimbinganThread, mahasiswa, dosen, periodeAkademik } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';

export class BimbinganService {
  static async getActivePeriode() {
    const [active] = await db
      .select()
      .from(periodeAkademik)
      .where(eq(periodeAkademik.aktif, true));
    return active;
  }

  static async getOrCreateBimbingan(mahasiswaId: number) {
    const activePeriode = await this.getActivePeriode();
    if (!activePeriode) {
      throw new Error('Tidak ada periode akademik aktif.');
    }

    // Cari bimbingan untuk periode aktif
    const [existing] = await db
      .select()
      .from(bimbingan)
      .where(
        and(
          eq(bimbingan.mahasiswaId, mahasiswaId),
          eq(bimbingan.periodeId, activePeriode.id)
        )
      );

    if (existing) {
      // Ambil thread chat
      const threadMessages = await db
        .select()
        .from(bimbinganThread)
        .where(eq(bimbinganThread.bimbinganId, existing.id))
        .orderBy(desc(bimbinganThread.createdAt));

      return {
        ...existing,
        thread: threadMessages,
      };
    }

    // Jika belum ada, buat bimbingan baru
    const [mhs] = await db
      .select({
        id: mahasiswa.id,
        dosenPaId: mahasiswa.dosenPaId,
      })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId));

    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    const [newBimbingan] = await db
      .insert(bimbingan)
      .values({
        mahasiswaId,
        dosenId: mhs.dosenPaId,
        periodeId: activePeriode.id,
        ringkasan: null,
        isApproved: false,
      })
      .returning();

    return {
      ...newBimbingan,
      thread: [],
    };
  }

  static async addThreadMessage(bimbinganId: number, senderRole: 'dosen' | 'mahasiswa' | 'admin', pesan: string) {
    const [newMsg] = await db
      .insert(bimbinganThread)
      .values({
        bimbinganId,
        senderRole,
        pesan,
      })
      .returning();
    return newMsg;
  }

  static async updateBimbingan(bimbinganId: number, data: { ringkasan?: string; isApproved?: boolean }) {
    const [updated] = await db
      .update(bimbingan)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(bimbingan.id, bimbinganId))
      .returning();
    return updated;
  }

  static async getBimbinganById(id: number) {
    const [record] = await db.select().from(bimbingan).where(eq(bimbingan.id, id));
    return record;
  }

  static async getMonitoringBimbingan() {
    const activePeriode = await this.getActivePeriode();
    if (!activePeriode) {
      return [];
    }

    // Ambil daftar mahasiswa
    const listMahasiswa = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        dosenPaNama: dosen.nama,
      })
      .from(mahasiswa)
      .leftJoin(dosen, eq(mahasiswa.dosenPaId, dosen.id));

    // Ambil semua bimbingan untuk periode aktif
    const listBimbingan = await db
      .select()
      .from(bimbingan)
      .where(eq(bimbingan.periodeId, activePeriode.id));

    const mapBimbingan = new Map<number, typeof bimbingan.$inferSelect>();
    for (const b of listBimbingan) {
      mapBimbingan.set(b.mahasiswaId, b);
    }

    return listMahasiswa.map((mhs) => {
      const bimb = mapBimbingan.get(mhs.id);
      return {
        ...mhs,
        bimbinganId: bimb?.id || null,
        ringkasan: bimb?.ringkasan || null,
        isApproved: bimb?.isApproved || false,
        createdAt: bimb?.createdAt || null,
      };
    });
  }
}
