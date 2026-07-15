import { and, eq, inArray } from 'drizzle-orm';
import {
  capaianCpmk,
  cpmk,
  kelasKuliah,
  komponenNilai,
  krs,
  nilaiKomponenMahasiswa,
  subCpmk,
} from '../models/schema';
import { db } from '../utils/db';

export class CapaianCpmkService {
  static async getByKelas(kelasKuliahId: number) {
    return db.query.capaianCpmk.findMany({
      where: eq(capaianCpmk.kelasKuliahId, kelasKuliahId),
      with: {
        mahasiswa: { columns: { id: true, nim: true, nama: true } },
        cpmk: { columns: { id: true, kode: true, deskripsi: true } },
      },
    });
  }

  static async getByMahasiswa(mahasiswaId: number) {
    return db.query.capaianCpmk.findMany({
      where: eq(capaianCpmk.mahasiswaId, mahasiswaId),
      with: {
        cpmk: {
          columns: { id: true, kode: true, deskripsi: true },
          with: { mataKuliah: { columns: { id: true, kode: true, nama: true } } },
        },
        kelasKuliah: {
          columns: { id: true, namaKelas: true },
          with: {
            mataKuliah: { columns: { id: true, kode: true, nama: true } },
            periode: { columns: { id: true, nama: true } },
          },
        },
      },
    });
  }

  static async hitungPerKelas(kelasKuliahId: number) {
    const kelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
      with: {
        mataKuliah: true,
        periode: true,
      },
    });
    if (!kelas) throw new Error('Kelas tidak ditemukan');

    const krsRecords = await db.query.krs.findMany({
      where: eq(krs.kelasKuliahId, kelasKuliahId),
      with: { mahasiswa: true },
    });

    const komponenList = await db.query.komponenNilai.findMany({
      where: eq(komponenNilai.kelasKuliahId, kelasKuliahId),
      with: { subCpmk: { with: { cpmk: true } } },
    });

    const cpmkInMk = await db.query.cpmk.findMany({
      where: eq(cpmk.mataKuliahId, kelas.mataKuliahId),
    });

    return await db.transaction(async (tx) => {
      // Clear existing capaian_cpmk for this kelas
      await tx.delete(capaianCpmk).where(eq(capaianCpmk.kelasKuliahId, kelasKuliahId));

      const results = [];

      for (const krsItem of krsRecords) {
        const mahasiswaId = krsItem.mahasiswaId;

        // Get all component grades for this student
        const compIds = komponenList.map((c) => c.id);
        let studentGrades: typeof nilaiKomponenMahasiswa.$inferSelect[] = [];
        if (compIds.length > 0) {
          studentGrades = await tx
            .select()
            .from(nilaiKomponenMahasiswa)
            .where(and(eq(nilaiKomponenMahasiswa.krsId, krsItem.id), inArray(nilaiKomponenMahasiswa.komponenNilaiId, compIds)));
        }

        const gradeMap = new Map<number, number>();
        for (const g of studentGrades) {
          gradeMap.set(g.komponenNilaiId, parseFloat(g.nilai));
        }

        for (const cpmkItem of cpmkInMk) {
          // Find all komponen that map to sub-cpmk under this CPMK
          const relevantKomponen = komponenList.filter(
            (k) => k.subCpmk && k.subCpmk.cpmkId === cpmkItem.id,
          );

          if (relevantKomponen.length === 0) continue;

          // Calculate average score for this CPMK
          let totalScore = 0;
          let count = 0;
          for (const komp of relevantKomponen) {
            const score = gradeMap.get(komp.id);
            if (score !== undefined) {
              totalScore += score;
              count++;
            }
          }

          if (count === 0) continue;

          const nilaiCpmk = parseFloat((totalScore / count).toFixed(2));

          const [capaian] = await tx
            .insert(capaianCpmk)
            .values({
              mahasiswaId,
              cpmkId: cpmkItem.id,
              kelasKuliahId,
              kurikulumId: null,
              nilai: nilaiCpmk.toString(),
            })
            .returning();

          results.push(capaian);
        }
      }

      return results;
    });
  }

  static async getRekapPerCpmk(kelasKuliahId: number) {
    const capaian = await this.getByKelas(kelasKuliahId);

    const cpmkMap = new Map<number, { cpmk: any; scores: number[] }>();
    for (const c of capaian) {
      const key = c.cpmkId;
      if (!cpmkMap.has(key)) {
        cpmkMap.set(key, { cpmk: c.cpmk, scores: [] });
      }
      cpmkMap.get(key)!.scores.push(parseFloat(c.nilai));
    }

    const rekap = [];
    for (const [cpmkId, data] of cpmkMap) {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      rekap.push({
        cpmkId,
        kode: data.cpmk.kode,
        deskripsi: data.cpmk.deskripsi,
        rataRata: parseFloat(avg.toFixed(2)),
        jumlahMahasiswa: data.scores.length,
      });
    }

    return rekap;
  }
}
