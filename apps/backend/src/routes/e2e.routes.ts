import { Elysia } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  admissionSessionProdis,
  admissionSessions,
  announcements,
  applicantDocuments,
  applicationLogs,
  applications,
  bahanKajian,
  bahanKajianCpl,
  bap,
  bimbingan,
  bimbinganThread,
  cpl,
  cplProfilLulusan,
  cpmk,
  cpmkCpl,
  documentRequirements,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  kompensasiBayar,
  komponenNilai,
  krs,
  mahasiswa,
  mataKuliah,
  mataKuliahBahanKajian,
  nilaiKomponenMahasiswa,
  paymentVirtualAccounts,
  pelanggaran,
  pengajuanYudisium,
  periodeAkademik,
  presensi,
  profilLulusan,
  programStudi,
  reRegistrationPayments,
  selectionComponents,
  selectionScores,
  subCpmk,
  users,
  visiMisiProdi,
} from '../models/schema';
import { resetE2eSchema } from '../schemas/e2e.schema';
import { db } from '../utils/db';

export const e2eRoutes = new Elysia({ prefix: '/e2e' }).use(authMiddleware).post(
  '/reset',
  async ({ set, getCurrentUser }) => {
    if (process.env.NODE_ENV === 'production') {
      set.status = 403;
      return { error: 'Endpoint ini tidak dapat dijalankan di mode production.' };
    }
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya admin yang dapat mereset database.' };
    }
    try {
      // 1. Clean Database - Admisi tables first
      await db.delete(paymentVirtualAccounts);
      await db.delete(selectionScores);
      await db.delete(selectionComponents);
      await db.delete(applicationLogs);
      await db.delete(applicantDocuments);
      await db.delete(reRegistrationPayments);
      await db.delete(documentRequirements);
      await db.delete(admissionSessionProdis);
      await db.delete(admissionSessions);
      await db.delete(announcements);
      await db.delete(applications);

      // OBE tables
      await db.delete(cpmkCpl);
      await db.delete(subCpmk);
      await db.delete(cpmk);
      await db.delete(mataKuliahBahanKajian);
      await db.delete(bahanKajianCpl);
      await db.delete(bahanKajian);
      await db.delete(cplProfilLulusan);
      await db.delete(cpl);
      await db.delete(profilLulusan);
      await db.delete(visiMisiProdi);

      // Core academic tables
      await db.delete(pengajuanYudisium);
      await db.delete(nilaiKomponenMahasiswa);
      await db.delete(komponenNilai);
      await db.delete(bimbinganThread);
      await db.delete(bimbingan);
      await db.delete(pelanggaran);
      await db.delete(kompensasiBayar);
      await db.delete(presensi);
      await db.delete(bap);
      await db.delete(krs);
      await db.delete(dosenPengajarKelas);
      await db.delete(kelasKuliah);
      await db.delete(mataKuliah);
      await db.delete(mahasiswa);
      await db.delete(dosen);
      await db.delete(periodeAkademik);
      await db.delete(programStudi);
      await db.delete(users);

      // 2. Seed Default Users
      const hashedPassword = await Bun.password.hash('password123', {
        algorithm: 'bcrypt',
        cost: 10,
      });

      // Admin User
      await db.insert(users).values({
        email: 'admin@simak.id',
        password: hashedPassword,
        nama: 'Admin SIMAK',
        role: 'admin',
        isActive: true,
      });

      // Dosen User
      const [dosenUser] = await db
        .insert(users)
        .values({
          email: 'dosen@simak.id',
          password: hashedPassword,
          nama: 'Dosen Wali',
          role: 'dosen',
          isActive: true,
        })
        .returning();

      // Mahasiswa User
      const [mhsUser] = await db
        .insert(users)
        .values({
          email: 'mahasiswa@simak.id',
          password: hashedPassword,
          nama: 'Mahasiswa Bimbingan',
          role: 'mahasiswa',
          isActive: true,
        })
        .returning();

      // 3. Seed Program Studi
      const [prodi] = await db
        .insert(programStudi)
        .values({
          kode: 'TI',
          nama: 'Teknik Informatika',
          jenjang: 'D4',
        })
        .returning();

      // 4. Seed Dosen Profile
      const [dsnProfile] = await db
        .insert(dosen)
        .values({
          nip: '199001012020011001',
          nama: 'Dosen Wali',
          email: 'dosen@simak.id',
          programStudiId: prodi.id,
        })
        .returning();

      // 5. Seed Mahasiswa Profile
      const [mhsProfile] = await db
        .insert(mahasiswa)
        .values({
          nim: '20200001',
          nama: 'Mahasiswa Bimbingan',
          email: 'mahasiswa@simak.id',
          programStudiId: prodi.id,
          dosenPaId: dsnProfile.id,
          status: 'aktif',
          namaIbuKandung: 'Ibu Kandung',
          nik: '1234567890123456',
          jenisKelamin: 'L',
          tanggalLahir: '2000-01-01',
        })
        .returning();

      // 6. Seed Periode Akademik
      await db.insert(periodeAkademik).values({
        id: '20231',
        nama: 'Ganjil 2023/2024',
        aktif: true,
      });

      // 7. Seed Mata Kuliah
      const [matkul] = await db
        .insert(mataKuliah)
        .values({
          kode: 'MK001',
          nama: 'Pemrograman Web',
          sksTotal: 4,
          sksTatapMuka: 2,
          sksPraktek: 2,
        })
        .returning();

      // 8. Seed CPMK
      const [cpmkItem] = await db
        .insert(cpmk)
        .values({
          mataKuliahId: matkul.id,
          kode: 'CPMK1',
          deskripsi: 'Menguasai Pemrograman Web',
        })
        .returning();

      // 9. Seed Kelas Kuliah
      const [kelas] = await db
        .insert(kelasKuliah)
        .values({
          mataKuliahId: matkul.id,
          periodeId: '20231',
          namaKelas: '1A',
          isLocked: false,
        })
        .returning();

      // 10. Seed Dosen Pengajar
      await db.insert(dosenPengajarKelas).values({
        dosenId: dsnProfile.id,
        kelasKuliahId: kelas.id,
        sksBebanMengajar: 4,
      });

      return {
        message: 'Database reset and seeded successfully',
        data: {
          prodiId: prodi.id,
          dosenId: dsnProfile.id,
          mahasiswaId: mhsProfile.id,
          kelasId: kelas.id,
          cpmkId: cpmkItem.id,
        },
      };
    } catch (error: any) {
      console.error('Failed to reset database:', error);
      set.status = 500;
      return { error: 'Gagal mereset database' };
    }
  },
  resetE2eSchema,
);
