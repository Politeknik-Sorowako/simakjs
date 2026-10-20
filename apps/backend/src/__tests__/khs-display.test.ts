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
    const lockJson = await lockRes.json();
    console.log('LOCK RESP:', JSON.stringify(lockJson, null, 2));
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

    // Transkrip harus mengembalikan bentuk nested sesuai kontrak frontend,
    // lengkap dengan nilai, periodeId, semester, dan mataKuliah.
    expect(Array.isArray(transData.transkripList)).toBe(true);
    expect(transData.transkripList.length).toBeGreaterThan(0);
    const first = transData.transkripList[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('periodeId', '20252');
    expect(first).toHaveProperty('semester');
    expect(first.mataKuliah?.nama).toBe('Mata Kuliah 1');
    expect(first.mataKuliah?.sksTotal).toBe(3);
    expect(first.nilaiHuruf ?? first.nilaiIndeks).not.toBeNull();
  });

  it('harus menyembunyikan nilai (status draft) bagi mahasiswa jika kelas belum dikunci', async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-test2@test.com', 'admin');
    const studentToken = await getAuthToken('student-draft@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TM',
        nama: 'Teknik Mesin',
        jenjang: 'D3',
      })
      .returning();

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '198201012010121002',
        nama: 'Dosen Mesin',
        email: 'dosenmesin@test.com',
        programStudiId: prodi.id,
        nik: '1234567890123457',
        jenisKelamin: 'L',
        tanggalLahir: '1982-01-01',
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '654321',
        nama: 'Mahasiswa Draft',
        email: 'student-draft@test.com',
        programStudiId: prodi.id,
        namaIbuKandung: 'Ibu',
        nik: '1234567890123458',
        jenisKelamin: 'L',
        tanggalLahir: '2001-01-01',
        dosenPaId: dsn.id,
      })
      .returning();

    const [periode] = await db
      .insert(periodeAkademik)
      .values({
        id: '20253',
        nama: 'Semester Ganjil 2025/2026',
        tahunMulai: 2025,
        tahunSelesai: 2026,
        aktif: true,
      })
      .returning();

    const [mk] = await db
      .insert(mataKuliah)
      .values({
        kode: 'MK2',
        nama: 'Kinematika',
        sksTotal: 3,
        programStudiId: prodi.id,
        semesterDefault: 1,
      })
      .returning();

    // Kelas dibuat dengan isLocked: false (DRAFT)
    const [kelas] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mk.id,
        periodeId: periode.id,
        namaKelas: 'Kelas B',
        isLocked: false,
      })
      .returning();

    const [krsRecord] = await db
      .insert(krs)
      .values({
        mahasiswaId: mhs.id,
        kelasKuliahId: kelas.id,
        isApproved: true,
      })
      .returning();

    const [comp] = await db
      .insert(komponenNilai)
      .values({
        kelasKuliahId: kelas.id,
        nama: 'UAS',
        bobot: 100,
      })
      .returning();

    await db.insert(konversiNilai).values({
      programStudiId: prodi.id,
      nilaiHuruf: 'A',
      bobotIndeks: '4.00',
      nilaiMin: '80.00',
      nilaiMax: '100.00',
      predikat: 'Dengan Pujian',
    });

    // Dosen menginput nilai tetapi belum mengunci kelas
    await app.handle(
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
              nilaiKomponenList: [{ komponenNilaiId: comp.id, nilai: 90.0 }],
            },
          ],
        }),
      }),
    );

    // 1. Dosen / Admin melihat KHS (harus melihat nilai asli & isFinal: false)
    const adminKhsRes = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhs.id}/periode/${periode.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(adminKhsRes.status).toBe(200);
    const adminKhs = await adminKhsRes.json();
    expect(adminKhs.krsList[0].isFinal).toBe(false);
    expect(adminKhs.krsList[0].nilaiHuruf).toBe('A');

    // 2. Mahasiswa melihat KHS (harus dimask, nilaiHuruf = null, isFinal = false)
    const studentKhsRes = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhs.id}/periode/${periode.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      }),
    );
    expect(studentKhsRes.status).toBe(200);
    const studentKhs = await studentKhsRes.json();
    expect(studentKhs.krsList[0].isFinal).toBe(false);
    expect(studentKhs.krsList[0].nilaiHuruf).toBeNull();
    expect(studentKhs.krsList[0].nilaiAngka).toBeNull();

    // 3. Mahasiswa melihat Rincian Komponen (isReleased = false, nilai komponen = null)
    const rincianRes = await app.handle(
      new Request(`http://localhost/khs/rincian-komponen?kelasKuliahId=${kelas.id}&mahasiswaId=${mhs.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      }),
    );
    expect(rincianRes.status).toBe(200);
    const rincian = await rincianRes.json();
    expect(rincian.isReleased).toBe(false);
    expect(rincian.komponen[0].nilai).toBeNull();

    // 4. Mahasiswa melihat Transkrip (karena masih draft, transkrip belum memuat MK ini)
    const transkripRes = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhs.id}/transkrip`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      }),
    );
    expect(transkripRes.status).toBe(200);
    const transkrip = await transkripRes.json();
    expect(transkrip.transkripList.length).toBe(0);

    // 5. Setelah kelas dikunci (FINAL), mahasiswa melihat nilai utuh
    await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelas.id}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    const releasedKhsRes = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhs.id}/periode/${periode.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      }),
    );
    const releasedKhs = await releasedKhsRes.json();
    expect(releasedKhs.krsList[0].isFinal).toBe(true);
    expect(releasedKhs.krsList[0].nilaiHuruf).toBe('A');
  });
});
