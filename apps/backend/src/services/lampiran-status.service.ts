import { and, desc, eq } from 'drizzle-orm';
import { statusMahasiswaLampiran } from '../models/schema';
import { db } from '../utils/db';
import { removeLampiranFile, saveLampiranFile } from '../utils/lampiran-storage';

export type LampiranParent = { type: 'cuti' | 'keluar'; id: number };
export type LampiranJenis = 'sk' | 'pendukung';

const parentCond = (ref: LampiranParent) =>
  ref.type === 'cuti'
    ? eq(statusMahasiswaLampiran.pengajuanCutiId, ref.id)
    : eq(statusMahasiswaLampiran.mahasiswaKeluarId, ref.id);

export class LampiranStatusService {
  static async list(ref: LampiranParent) {
    return db
      .select({
        id: statusMahasiswaLampiran.id,
        jenis: statusMahasiswaLampiran.jenis,
        fileName: statusMahasiswaLampiran.fileName,
        fileSize: statusMahasiswaLampiran.fileSize,
        fileType: statusMahasiswaLampiran.fileType,
        keterangan: statusMahasiswaLampiran.keterangan,
        createdAt: statusMahasiswaLampiran.createdAt,
      })
      .from(statusMahasiswaLampiran)
      .where(parentCond(ref))
      .orderBy(desc(statusMahasiswaLampiran.createdAt));
  }

  static async add(
    ref: LampiranParent,
    file: File,
    jenis: LampiranJenis,
    keterangan: string | undefined,
    userId: number,
  ) {
    const storageKey = await saveLampiranFile(file, ref.type === 'cuti' ? `cuti-${ref.id}` : `keluar-${ref.id}`);
    try {
      return await db.transaction(async (tx) => {
        let oldKeys: string[] = [];
        if (jenis === 'sk') {
          const old = await tx
            .delete(statusMahasiswaLampiran)
            .where(and(parentCond(ref), eq(statusMahasiswaLampiran.jenis, 'sk')))
            .returning({ storageKey: statusMahasiswaLampiran.storageKey });
          oldKeys = old.map((o) => o.storageKey);
        }
        const [row] = await tx
          .insert(statusMahasiswaLampiran)
          .values({
            pengajuanCutiId: ref.type === 'cuti' ? ref.id : null,
            mahasiswaKeluarId: ref.type === 'keluar' ? ref.id : null,
            jenis,
            storageKey,
            fileName: file.name.slice(0, 255),
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
            keterangan: keterangan || null,
            uploadedBy: userId,
          })
          .returning({
            id: statusMahasiswaLampiran.id,
            jenis: statusMahasiswaLampiran.jenis,
            fileName: statusMahasiswaLampiran.fileName,
            fileSize: statusMahasiswaLampiran.fileSize,
            fileType: statusMahasiswaLampiran.fileType,
            keterangan: statusMahasiswaLampiran.keterangan,
            createdAt: statusMahasiswaLampiran.createdAt,
          });
        // Berkas lama dihapus setelah transaksi sukses (best effort).
        queueMicrotask(() => {
          for (const k of oldKeys) removeLampiranFile(k).catch(() => undefined);
        });
        return row;
      });
    } catch (e: unknown) {
      await removeLampiranFile(storageKey).catch(() => undefined);
      throw e;
    }
  }

  static async getOne(ref: LampiranParent, lampiranId: number) {
    const [row] = await db
      .select()
      .from(statusMahasiswaLampiran)
      .where(and(parentCond(ref), eq(statusMahasiswaLampiran.id, lampiranId)));
    return row || null;
  }

  static async remove(ref: LampiranParent, lampiranId: number) {
    const row = await LampiranStatusService.getOne(ref, lampiranId);
    if (!row) throw new Error('Lampiran tidak ditemukan.');
    await db.delete(statusMahasiswaLampiran).where(eq(statusMahasiswaLampiran.id, row.id));
    await removeLampiranFile(row.storageKey).catch(() => undefined);
  }

  /** Hapus semua berkas fisik milik parent (row ikut terhapus via CASCADE saat parent dihapus). */
  static async removeFilesForParent(ref: LampiranParent) {
    const rows = await db
      .select({ storageKey: statusMahasiswaLampiran.storageKey })
      .from(statusMahasiswaLampiran)
      .where(parentCond(ref));
    return async () => {
      for (const r of rows) await removeLampiranFile(r.storageKey).catch(() => undefined);
    };
  }
}
