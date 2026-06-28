import { Elysia } from 'elysia';
import { db } from '../utils/db';
import {
  users,
  programStudi,
  mahasiswa,
  dosen,
  krs,
  kelasKuliah,
  mataKuliah,
  periodeAkademik,
  dosenPengajarKelas,
  cpmk,
  bap,
  presensi,
  kompensasiBayar,
  bimbingan,
  bimbinganThread,
  pelanggaran,
  komponenNilai,
  nilaiKomponenMahasiswa,
  pengajuanYudisium,
} from '../models/schema';

export const e2eRoutes = new Elysia({ prefix: '/e2e' })
  .post('/reset', async ({ set }) => {
    try {
      // 1. Clean Database
      await db.delete(pengajuanYudisium);
      await db.delete(nilaiKomponenMahasiswa);
      await db.delete(komponenNilai);
      await db.delete(bimbinganThread);
      await db.delete(bimbingan);
      await db.delete(pelanggaran);
      await db.delete(kompensasiBayar);
      await db.delete(presensi);
      await db.delete(bap);
      await db.delete(cpmk);
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
        role: 'admin',
      });

      // Dosen User
      const [dosenUser] = await db.insert(users).values({
        email: 'dosen@simak.id',
        password: hashedPassword,
        role: 'dosen',
      }).returning();

      // Mahasiswa User
      const [mhsUser] = await db.insert(users).values({
        email: 'mahasiswa@simak.id',
        password: hashedPassword,
        role: 'mahasiswa',
      }).returning();

      // 3. Seed Program Studi
      const [prodi] = await db.insert(programStudi).values({
        kode: 'TI',
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      }).returning();

      // 4. Seed Dosen Profile
      const [dsnProfile] = await db.insert(dosen).values({
        nip: '199001012020011001',
        nama: 'Dosen Wali',
        email: 'dosen@simak.id',
        programStudiId: prodi.id,
      }).returning();

      // 5. Seed Mahasiswa Profile
      const [mhsProfile] = await db.insert(mahasiswa).values({
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
      }).returning();

      // 6. Seed Periode Akademik
      await db.insert(periodeAkademik).values({
        id: '20231',
        nama: 'Ganjil 2023/2024',
        aktif: true,
      });

      // 7. Seed Mata Kuliah
      const [matkul] = await db.insert(mataKuliah).values({
        kode: 'MK001',
        nama: 'Pemrograman Web',
        sksTotal: 4,
        sksTatapMuka: 2,
        sksPraktek: 2,
        programStudiId: prodi.id,
      }).returning();

      // 8. Seed CPMK
      const [cpmkItem] = await db.insert(cpmk).values({
        mataKuliahId: matkul.id,
        kode: 'CPMK1',
        deskripsi: 'Menguasai Pemrograman Web',
      }).returning();

      // 9. Seed Kelas Kuliah
      const [kelas] = await db.insert(kelasKuliah).values({
        mataKuliahId: matkul.id,
        periodeId: '20231',
        namaKelas: '1A',
        isLocked: false,
      }).returning();

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
        }
      };
    } catch (error: any) {
      console.error('Failed to reset database:', error);
      set.status = 500;
      return { error: 'Failed to reset database', details: error.message };
    }
  });
