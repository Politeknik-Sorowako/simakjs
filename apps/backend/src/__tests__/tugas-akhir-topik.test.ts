import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, desc, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  mahasiswa,
  pembimbingMahasiswa,
  periodeAkademik,
  programStudi,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirPembimbing,
  tugasAkhirStatusLog,
  userRoles,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { getAuthToken } from './test-helper';

describe('Tugas Akhir - Milestone 1: Pengusulan Topik (Individu & Kelompok)', () => {
  let mhsToken: string;
  let mhs2Token: string;
  let prodiToken: string;
  let lppmToken: string;
  let dosenToken: string;

  let mhsId1: number;
  let mhsId2: number;
  let dosenId1: number;
  let dosenId2: number;
  let prodiId: number;
  let periodeId: string;

  beforeAll(async () => {
    // 1. Setup Periode Akademik
    periodeId = '20261';
    await db
      .insert(periodeAkademik)
      .values({
        id: periodeId,
        nama: '2026/2027 Ganjil',
        aktif: true,
      })
      .onConflictDoNothing();

    // 2. Setup Program Studi
    const [pRow] = await db
      .insert(programStudi)
      .values({
        kode: 'TMI',
        nama: 'Teknik Mekatronika Industri',
        jenjang: 'D3',
      })
      .onConflictDoNothing()
      .returning();

    prodiId = pRow ? pRow.id : (await db.query.programStudi.findFirst())!.id;

    // 3. Setup Users & Roles
    mhsToken = await getAuthToken('mhs-ta1@test.com', 'mahasiswa');
    mhs2Token = await getAuthToken('mhs-ta2@test.com', 'mahasiswa');
    prodiToken = await getAuthToken('prodi-ta@test.com', 'prodi');
    lppmToken = await getAuthToken('lppm-ta@test.com', 'lppm');
    dosenToken = await getAuthToken('dosen-ta1@test.com', 'dosen');

    const [uMhs1] = await db
      .select()
      .from(users)
      .where(users.email === 'mhs-ta1@test.com')
      .limit(1);
    const [uMhs2] = await db
      .select()
      .from(users)
      .where(users.email === 'mhs-ta2@test.com')
      .limit(1);
    const [uDosen1] = await db
      .select()
      .from(users)
      .where(users.email === 'dosen-ta1@test.com')
      .limit(1);

    // Dosen 2
    const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
    const [uDosen2] = await db
      .insert(users)
      .values({ email: 'dosen-ta2@test.com', password: hashed, nama: 'Dosen 2', role: 'dosen', isActive: true })
      .onConflictDoNothing()
      .returning();

    // Setup profil Mahasiswa 1
    const [m1] = await db
      .insert(mahasiswa)
      .values({
        nim: '2026001',
        nama: 'Mahasiswa TA 1',
        email: 'mhs-ta1@test.com',
        programStudiId: prodiId,
        angkatan: '2026',
        status: 'aktif',
        jenisKelamin: 'L',
      })
      .onConflictDoNothing()
      .returning();
    mhsId1 = m1
      ? m1.id
      : (await db.query.mahasiswa.findFirst({ where: (m, { eq }) => eq(m.email, 'mhs-ta1@test.com') }))!.id;

    // Setup profil Mahasiswa 2
    const [m2] = await db
      .insert(mahasiswa)
      .values({
        nim: '2026002',
        nama: 'Mahasiswa TA 2',
        email: 'mhs-ta2@test.com',
        programStudiId: prodiId,
        angkatan: '2026',
        status: 'aktif',
        jenisKelamin: 'P',
      })
      .onConflictDoNothing()
      .returning();
    mhsId2 = m2
      ? m2.id
      : (await db.query.mahasiswa.findFirst({ where: (m, { eq }) => eq(m.email, 'mhs-ta2@test.com') }))!.id;

    // Setup Dosen 1
    const [d1] = await db
      .insert(dosen)
      .values({
        nip: '198501012010011001',
        nama: 'Dr. Dosen Satu, M.T.',
        email: 'dosen-ta1@test.com',
        programStudiId: prodiId,
      })
      .onConflictDoNothing()
      .returning();
    dosenId1 = d1 ? d1.id : (await db.query.dosen.findFirst({ where: dosen.email === 'dosen-ta1@test.com' }))!.id;

    // Setup Dosen 2
    const [d2] = await db
      .insert(dosen)
      .values({
        nip: '198802022012012002',
        nama: 'Ir. Dosen Dua, M.Eng.',
        email: 'dosen-ta2@test.com',
        programStudiId: prodiId,
      })
      .onConflictDoNothing()
      .returning();
    dosenId2 = d2 ? d2.id : (await db.query.dosen.findFirst({ where: dosen.email === 'dosen-ta2@test.com' }))!.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(tugasAkhirStatusLog);
    await db.delete(tugasAkhirPembimbing);
    await db.delete(tugasAkhirAnggota);
    await db.delete(tugasAkhir);
  });

  it('1. Mahasiswa berhasil mengajukan usulan topik individu', async () => {
    const res = await app.handle(
      new Request('http://localhost/tugas-akhir', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: 'Rancang Bangun Sistem Sortir Otomatis Berbasis PLC dan Vision Sensor',
          judulInggris: 'Design and Build of Automatic Sorting System Based on PLC and Vision Sensor',
          tipe: 'individu',
          jenisKarya: 'prototipe',
          bidangKajian: 'Otomasi Industri',
          programStudiId: prodiId,
          latarBelakang: 'Peningkatan efisiensi lini manufaktur...',
          rumusanMasalah: 'Bagaimana akurasi pemilahan komponen?',
          tujuan: 'Mengembangkan prototipe terintegrasi...',
          usulanPembimbing: [{ peran: 'pembimbing_1', dosenId: dosenId1 }],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string; data: { id: number; kodeTa: string; status: string } };
    expect(body.data.status).toBe('diajukan');
    expect(body.data.kodeTa).toStartWith('TA-');

    // Pastikan mahasiswa tercatat sebagai ketua
    const anggota = await db.select().from(tugasAkhirAnggota).where(eq(tugasAkhirAnggota.tugasAkhirId, body.data.id));
    expect(anggota.length).toBe(1);
    expect(anggota[0].mahasiswaId).toBe(mhsId1);
    expect(anggota[0].peran).toBe('ketua');
  });

  it('2. Mahasiswa berhasil mengajukan usulan topik kelompok dengan rekan tim', async () => {
    const res = await app.handle(
      new Request('http://localhost/tugas-akhir', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: 'Rancang Bangun Robot AGV Industri dengan Navigasi LiDAR',
          tipe: 'kelompok',
          jenisKarya: 'proyek_rekayasa',
          programStudiId: prodiId,
          anggotaMahasiswaIds: [mhsId2],
          usulanPembimbing: [
            { peran: 'pembimbing_1', dosenId: dosenId1 },
            { peran: 'pembimbing_2', dosenId: dosenId2 },
          ],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: number; tipe: string } };
    expect(body.data.tipe).toBe('kelompok');

    const anggota = await db.select().from(tugasAkhirAnggota).where(eq(tugasAkhirAnggota.tugasAkhirId, body.data.id));
    expect(anggota.length).toBe(2);

    const ketua = anggota.find((a) => a.peran === 'ketua');
    const member = anggota.find((a) => a.peran === 'anggota');
    expect(ketua?.mahasiswaId).toBe(mhsId1);
    expect(ketua?.statusKonfirmasi).toBe('diterima');
    expect(member?.mahasiswaId).toBe(mhsId2);
    expect(member?.statusKonfirmasi).toBe('menunggu');
  });

  it('3. Anggota kelompok dapat merespon undangan tim', async () => {
    // Ambil TA kelompok terakhir
    const [taRow] = await db
      .select({ id: tugasAkhir.id })
      .from(tugasAkhir)
      .where(tugasAkhir.tipe === 'kelompok')
      .orderBy(desc(tugasAkhir.id))
      .limit(1);

    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taRow.id}/respon-undangan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhs2Token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusKonfirmasi: 'diterima' }),
      }),
    );

    expect(res.status).toBe(200);
    const [ang] = await db
      .select()
      .from(tugasAkhirAnggota)
      .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taRow.id), eq(tugasAkhirAnggota.mahasiswaId, mhsId2)));
    expect(ang.statusKonfirmasi).toBe('diterima');
  });

  it('4. Prodi menyetujui topik dan otomatis menetapkan pembimbing ke tabel pembimbing_mahasiswa', async () => {
    const [taRow] = await db
      .select({ id: tugasAkhir.id })
      .from(tugasAkhir)
      .where(eq(tugasAkhir.tipe, 'kelompok'))
      .orderBy(desc(tugasAkhir.id))
      .limit(1);

    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taRow.id}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${prodiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'disetujui',
          catatanProdi: 'Judul dan metodologi disetujui. Lanjutkan ke bimbingan.',
          pembimbing: [
            { peran: 'pembimbing_1', dosenId: dosenId1 },
            { peran: 'pembimbing_2', dosenId: dosenId2 },
          ],
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe('disetujui');

    // Verifikasi sinkronisasi ke tabel pembimbing_mahasiswa untuk kedua anggota
    const pembimbingList1 = await db
      .select()
      .from(pembimbingMahasiswa)
      .where(and(eq(pembimbingMahasiswa.mahasiswaId, mhsId1), eq(pembimbingMahasiswa.statusAktif, true)));

    expect(pembimbingList1.length).toBe(2);
    const utama = pembimbingList1.find((p) => p.jenis === 'TA_UTAMA');
    const pendamping = pembimbingList1.find((p) => p.jenis === 'TA_PENDAMPING');
    expect(utama?.dosenId).toBe(dosenId1);
    expect(pendamping?.dosenId).toBe(dosenId2);
  });

  it('5. Role LPPM dapat melakukan administrative override status tugas akhir', async () => {
    const [taRow] = await db
      .select({ id: tugasAkhir.id })
      .from(tugasAkhir)
      .where(eq(tugasAkhir.tipe, 'kelompok'))
      .orderBy(desc(tugasAkhir.id))
      .limit(1);

    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taRow.id}/override-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${lppmToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keStatus: 'bimbingan',
          alasan: 'Override LPPM: Validasi kemitraan industri selesai, diizinkan mulai bimbingan',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe('bimbingan');

    // Verifikasi catatan audit log override
    const logs = await db
      .select()
      .from(tugasAkhirStatusLog)
      .where(eq(tugasAkhirStatusLog.tugasAkhirId, taRow.id))
      .orderBy(desc(tugasAkhirStatusLog.createdAt));

    expect(logs[0].keStatus).toBe('bimbingan');
    expect(logs[0].alasan).toContain('Override LPPM');
  });

  it('6. Role Mahasiswa tidak diizinkan melakukan review atau override status', async () => {
    const [taRow] = await db.select({ id: tugasAkhir.id }).from(tugasAkhir).orderBy(desc(tugasAkhir.id)).limit(1);

    const res = await app.handle(
      new Request(`http://localhost/tugas-akhir/${taRow.id}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disetujui' }),
      }),
    );

    expect(res.status).toBe(400); // Service rejects unauthorized reviewer
  });

  it('7. Admin berhasil menambahkan tugas akhir atas nama mahasiswa', async () => {
    const adminToken = await getAuthToken('admin-ta-create@test.com', 'admin');

    const res = await app.handle(
      new Request('http://localhost/tugas-akhir', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: 'Rancang Bangun Mesin CNC Milling Mini Berbasis Open-Source Controller',
          tipe: 'individu',
          jenisKarya: 'rancang_bangun',
          programStudiId: prodiId,
          mahasiswaId: mhsId2,
          usulanPembimbing: [{ peran: 'pembimbing_1', dosenId: dosenId2 }],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: number; judul: string } };

    const anggota = await db.select().from(tugasAkhirAnggota).where(eq(tugasAkhirAnggota.tugasAkhirId, body.data.id));
    expect(anggota.length).toBe(1);
    expect(anggota[0].mahasiswaId).toBe(mhsId2);
    expect(anggota[0].peran).toBe('ketua');
  });

  it('8. Mahasiswa berhasil mengajukan topik dengan prodi otomatis dari profil dan nullable fields', async () => {
    const res = await app.handle(
      new Request('http://localhost/tugas-akhir', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: 'Sistem Deteksi Anomali Suhu Sensor Mesin Otomasi',
          tipe: 'individu',
          jenisKarya: 'skripsi',
          judulInggris: null,
          bidangKajian: null,
          latarBelakang: null,
          rumusanMasalah: null,
          tujuan: null,
          metodologi: null,
          mitraIndustri: null,
          programStudiId: null, // Harus otomatis resolve dari profil mhs (prodiId)
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: number; programStudiId: number } };
    expect(body.data.programStudiId).toBe(prodiId);
  });

  it('9. Validasi gagal mengembalikan status 422 dan pesan error detail field', async () => {
    const res = await app.handle(
      new Request('http://localhost/tugas-akhir', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: 'A', // Terlalu pendek (kurang dari 3 karakter)
          tipe: 'invalid_tipe',
        }),
      }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as { success: boolean; error: string; message: string };
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validasi gagal:');
    expect(body.error).toContain('judul');
  });
});
