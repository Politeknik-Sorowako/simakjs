import { describe, expect, it } from 'bun:test';
import { app } from '../app';
import {
  dosen,
  kelasKuliah,
  komponenNilai,
  konversiNilai,
  krs,
  mahasiswa,
  mataKuliah,
  nilaiKomponenMahasiswa,
  periodeAkademik,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('KHS Display Test', () => {
  it('harus menampilkan KHS jika KRS sudah approve dan kelas dikunci', async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-test@test.com', 'admin');

    // Create Prodi
    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TI',
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();

    // Create Dosen
    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '198001012010121001',
        nama: 'Dosen Pembimbing',
        email: 'dosen@test.com',
        programStudiId: prodi.id,
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '1980-01-01',
      })
      .returning();

    // Create Mahasiswa
    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '123456',
        nama: 'Test Student',
        email: 'student@test.com',
        programStudiId: prodi.id,
        namaIbuKandung: 'Ibu',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
        dosenPaId: dsn.id,
      })
      .returning();

    // Create Periode
    await db.insert(periodeAkademik).values({
      id: '20252',
      nama: 'Genap 2025/2026',
      aktif: true,
    });

    // Create Mata Kuliah
    const [mk] = await db
      .insert(mataKuliah)
      .values({
        kode: 'MK1',
        nama: 'Mata Kuliah 1',
        sksTotal: 3,
        programStudiId: prodi.id,
      })
      .returning();

    // Create Kelas Kuliah
    const [kelas] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mk.id,
        periodeId: '20252',
        namaKelas: 'Kelas A',
        isLocked: false,
      })
      .returning();

    // Create KRS approved
    const [krsRecord] = await db
      .insert(krs)
      .values({
        mahasiswaId: mhs.id,
        kelasKuliahId: kelas.id,
        isApproved: true,
        approvedById: dsn.id,
        approvedAt: new Date(),
      })
      .returning();

    // Create Grade Components
    const [comp] = await db
      .insert(komponenNilai)
      .values({
        kelasKuliahId: kelas.id,
        nama: 'UAS',
        bobot: 100,
      })
      .returning();

    // Create Student Component Grade
    await db.insert(nilaiKomponenMahasiswa).values({
      krsId: krsRecord.id,
      komponenNilaiId: comp.id,
      nilai: '85.00',
    });

    // Create Conversion Rule
    await db.insert(konversiNilai).values({
      programStudiId: prodi.id,
      nilaiHuruf: 'A',
      bobotIndeks: '4.00',
      nilaiMin: '80.00',
      nilaiMax: '100.00',
      predikat: 'Dengan Pujian',
    });

    // Call save/calculate grades (done via endpoint or service)
    const saveGradeRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kelasKuliahId: kelas.id,
          nilaiList: [
            {
              krsId: krsRecord.id,
              nilaiKomponenList: [{ komponenNilaiId: comp.id, nilai: 85.0 }],
            },
          ],
        }),
      }),
    );
    const saveGradeJson = await saveGradeRes.json();
    console.log('SAVE GRADE ERROR RESP:', JSON.stringify(saveGradeJson, null, 2));
    expect(saveGradeRes.status).toBe(200);

    // Lock the class
    const lockRes = await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelas.id}/lock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(lockRes.status).toBe(200);

    // Call GET KHS
    const khsRes = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhs.id}/periode/20252`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(khsRes.status).toBe(200);
    const khsData = await khsRes.json();
    console.log('KHS DATA RESP:', JSON.stringify(khsData, null, 2));

    expect(khsData.krsList.length).toBe(1);
    expect(khsData.krsList[0].nilaiHuruf).toBe('A');

    // Call GET Transkrip
    const transRes = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhs.id}/transkrip`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(transRes.status).toBe(200);
    const transData = await transRes.json();
    console.log('TRANSKRIP DATA RESP:', JSON.stringify(transData, null, 2));
  });
});
