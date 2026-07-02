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

  static async getOrCreateBimbingan(mahasiswaId: number, targetPeriodeId?: string) {
    const activePeriode = await this.getActivePeriode();
    if (!activePeriode) {
      throw new Error('Tidak ada periode akademik aktif.');
    }
    const reqPeriodeId = targetPeriodeId || activePeriode.id;

    // Ambil daftar semua periode yang memiliki bimbingan untuk mahasiswa ini
    const rawPeriodes = await db
      .select({ periodeId: bimbingan.periodeId })
      .from(bimbingan)
      .where(eq(bimbingan.mahasiswaId, mahasiswaId));
    const availablePeriodes = rawPeriodes.map(p => p.periodeId);

    // Tambahkan periode aktif jika belum ada di list
    if (activePeriode && !availablePeriodes.includes(activePeriode.id)) {
      availablePeriodes.push(activePeriode.id);
    }

    // Cari bimbingan untuk periode terpilih
    const [existing] = await db
      .select()
      .from(bimbingan)
      .where(
        and(
          eq(bimbingan.mahasiswaId, mahasiswaId),
          eq(bimbingan.periodeId, reqPeriodeId)
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
        availablePeriodes,
      };
    }

    // Jika belum ada, buat bimbingan baru (hanya untuk periode aktif)
    if (reqPeriodeId !== activePeriode.id) {
      return {
        id: 0,
        mahasiswaId,
        dosenId: null,
        periodeId: reqPeriodeId,
        ringkasan: null,
        isApproved: false,
        permasalahan: null,
        solusi: null,
        tanggalBimbingan: null,
        statusBkd: false,
        thread: [],
        availablePeriodes,
      };
    }

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
        permasalahan: null,
        solusi: null,
        tanggalBimbingan: null,
        statusBkd: false,
      })
      .returning();

    return {
      ...newBimbingan,
      thread: [],
      availablePeriodes,
    };
  }

  static async addThreadMessage(bimbinganId: number, senderRole: 'dosen' | 'mahasiswa' | 'admin', pesan: string, tipe?: string) {
    const [newMsg] = await db
      .insert(bimbinganThread)
      .values({
        bimbinganId,
        senderRole,
        pesan,
        tipe: tipe || 'uts'
      })
      .returning();
    return newMsg;
  }

  static async updateBimbingan(bimbinganId: number, data: { ringkasan?: string; isApproved?: boolean; permasalahan?: string; solusi?: string; tanggalBimbingan?: Date; statusBkd?: boolean }) {
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
        dosenPaId: mahasiswa.dosenPaId,
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
        permasalahan: bimb?.permasalahan || null,
        solusi: bimb?.solusi || null,
        tanggalBimbingan: bimb?.tanggalBimbingan || null,
        statusBkd: bimb?.statusBkd || false,
        createdAt: bimb?.createdAt || null,
      };
    });
  }

  static async getRekapBimbinganDosen(dosenId: number, periodeId?: string) {
    const filterPeriodeId = periodeId || (await this.getActivePeriode())?.id;
    if (!filterPeriodeId) {
      return [];
    }

    return await db
      .select({
        id: bimbingan.id,
        mahasiswaId: bimbingan.mahasiswaId,
        dosenId: bimbingan.dosenId,
        periodeId: bimbingan.periodeId,
        ringkasan: bimbingan.ringkasan,
        isApproved: bimbingan.isApproved,
        permasalahan: bimbingan.permasalahan,
        solusi: bimbingan.solusi,
        tanggalBimbingan: bimbingan.tanggalBimbingan,
        statusBkd: bimbingan.statusBkd,
        mahasiswa: {
          nim: mahasiswa.nim,
          nama: mahasiswa.nama
        }
      })
      .from(bimbingan)
      .innerJoin(mahasiswa, eq(bimbingan.mahasiswaId, mahasiswa.id))
      .where(
        and(
          eq(bimbingan.dosenId, dosenId),
          eq(bimbingan.periodeId, filterPeriodeId)
        )
      );
  }
}
