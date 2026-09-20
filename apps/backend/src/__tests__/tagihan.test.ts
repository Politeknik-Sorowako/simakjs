import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('9. Tagihan (/tagihan)', () => {
  let prodiId: number;
  let mhsId: number;
  let mkId: number;
  let kelasId: number;

  beforeEach(async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-tagihan-setup@test.com', 'admin');

    // Create Prodi
    const prodiRes = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-TAGIHAN-SETUP',
          nama: 'Teknik Informatika Tagihan Setup',
          jenjang: 'D4',
        }),
      }),
    );
    const prodiData = (await prodiRes.json()) as { id: number };
    prodiId = prodiData.id;

    // Create Mahasiswa
    const mhsRes = await app.handle(
      new Request('http://localhost/mahasiswa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nim: '88888888',
          nama: 'Mahasiswa Tagihan',
          email: 'mhs-tagihan@test.com',
          programStudiId: prodiId,
          namaIbuKandung: 'Ibu Tagihan',
          nik: '8888888888888888',
          jenisKelamin: 'L',
          tanggalLahir: '2002-01-01',
        }),
      }),
    );
    const mhsData = (await mhsRes.json()) as { id: number };
    mhsId = mhsData.id;

    // Create MK
    const mkRes = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKTAG001',
          nama: 'Aljabar Linear',
          sksTotal: 3,
          programStudiId: prodiId,
        }),
      }),
    );
    const mkData = (await mkRes.json()) as { id: number };
    mkId = mkData.id;

    // Create Periode
    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20231',
          nama: '2023/2024 Ganjil',
          aktif: true,
        }),
      }),
    );

    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20251',
          nama: '2025/2026 Ganjil',
          aktif: false,
        }),
      }),
    );

    // Create Kelas
    const kelasRes = await app.handle(
      new Request('http://localhost/kelas-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mataKuliahId: mkId,
          periodeId: '20231',
          namaKelas: 'TI-TAG-A',
        }),
      }),
    );
    const kelasData = (await kelasRes.json()) as { id: number };
    kelasId = kelasData.id;
  });

  const createTarif = async (
    adminToken: string,
    angkatan: string,
    nominal: number,
    extra?: Record<string, unknown>,
  ) => {
    const res = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          angkatan,
          programStudiId: prodiId,
          nominal,
          termin1JatuhTempo: '2026-01-01',
          termin2JatuhTempo: '2026-03-01',
          ...extra,
        }),
      }),
    );
    return res;
  };

  it('harus sukses generate tagihan secara massal oleh Admin', async () => {
    const adminToken = await getAuthToken('admin-tagihan@test.com', 'admin');

    // Buat skema tarif dengan tanggal termin terlebih dahulu
    await createTarif(adminToken, '8888', 5000000);

    const generateRes = await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      }),
    );

    expect(generateRes.status).toBe(201);
    const genBody = await generateRes.json();
    expect(genBody.count).toBeGreaterThan(0);

    // Check that student status has become non_aktif
    const checkMhsRes = await app.handle(
      new Request(`http://localhost/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    const mhsBody = await checkMhsRes.json();
    expect(mhsBody.status).toBe('non_aktif');
  });

  it('mahasiswa non_aktif tidak boleh mengisi KRS', async () => {
    const adminToken = await getAuthToken('admin-tagihan@test.com', 'admin');

    // Buat skema tarif dengan tanggal termin terlebih dahulu
    await createTarif(adminToken, '8888', 5000000);

    // Generate tagihan to set student to non_aktif
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      }),
    );

    // Try creating KRS, should fail
    const krsRes = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          kelasKuliahId: kelasId,
        }),
      }),
    );

    expect(krsRes.status).toBe(400);
    const krsBody = await krsRes.json();
    expect(krsBody.error).toContain('Silakan selesaikan pembayaran SPP/UKT');
  });

  it('setelah tagihan dibayar, mahasiswa aktif kembali dan bisa mengisi KRS serta disetujui Dosen PA', async () => {
    const adminToken = await getAuthToken('admin-tagihan@test.com', 'admin');
    const dosenToken = await getAuthToken('dosen-tagihan@test.com', 'dosen');

    // Create Dosen PA
    await app.handle(
      new Request('http://localhost/dosen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nip: '987654321',
          nama: 'Dosen Wali',
          email: 'dosen-tagihan@test.com',
          programStudiId: prodiId,
        }),
      }),
    );

    // Buat skema tarif dengan tanggal termin terlebih dahulu
    await createTarif(adminToken, '8888', 5000000);

    // Generate tagihan
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      }),
    );

    // Get tagihan list to find the tagihan ID
    const listRes = await app.handle(
      new Request('http://localhost/tagihan?limit=1', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    const listBody = await listRes.json();
    const tagihanId = listBody.data[0].id;

    // Pay tagihan
    const payRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/bayar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(payRes.status).toBe(200);

    // Create KRS now (should succeed)
    const krsRes = await app.handle(
      new Request('http://localhost/krs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          kelasKuliahId: kelasId,
        }),
      }),
    );
    expect(krsRes.status).toBe(201);

    // Dosen PA approves KRS
    const approveRes = await app.handle(
      new Request('http://localhost/krs/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          periodeId: '20231',
        }),
      }),
    );
    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.count).toBeGreaterThan(0);
  });

  it('harus mendukung konfigurasi skema tarif, log transaksi, void, dan tarif khusus mahasiswa pasca-cuti', async () => {
    const adminToken = await getAuthToken('admin-tagihan-new@test.com', 'admin');

    // 1. Create Skema Tarif
    const tarifRes = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          angkatan: '8888', // Diambil dari 4 digit NIM mahasiswa ("88888888")
          programStudiId: prodiId,
          nominal: 3500000, // Tarif khusus angkatan 8888
          termin1JatuhTempo: '2026-01-01',
          termin2JatuhTempo: '2026-03-01',
        }),
      }),
    );
    expect(tarifRes.status).toBe(200);

    // 2. Generate Tagihan - Harus memakai nominal tarif khusus angkatan 8888 (3.500.000)
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20231',
        }),
      }),
    );

    // Dapatkan tagihan yang di-generate
    const listRes = await app.handle(
      new Request('http://localhost/tagihan?limit=1', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    const listBody = await listRes.json();
    const tag = listBody.data[0];
    expect(tag.nominal).toBe(3500000); // Terbukti menggunakan tarif angkatan 8888!

    const tagihanId = tag.id;

    // 3. Bayar Cicilan Pertama (1.500.000)
    const bayar1Res = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/bayar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nominalBayar: 1500000,
        }),
      }),
    );
    expect(bayar1Res.status).toBe(200);
    const bayar1Body = await bayar1Res.json();
    expect(bayar1Body.tagihan.status).toBe('cicilan');

    // 4. Periksa Log Transaksi Pembayaran
    const logRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/transaksi`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(logRes.status).toBe(200);
    const logBody = await logRes.json();
    expect(logBody.data.length).toBe(1);
    expect(logBody.data[0].nominalBayar).toBe(1500000);
    expect(logBody.data[0].isVoid).toBe(false);

    const transaksiId = logBody.data[0].id;

    // 5. Batalkan Transaksi Pembayaran (Void)
    const voidRes = await app.handle(
      new Request(`http://localhost/tagihan/transaksi/${transaksiId}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          catatan: 'Salah input nominal',
        }),
      }),
    );
    expect(voidRes.status).toBe(200);
    const voidBody = await voidRes.json();
    expect(voidBody.tagihan.nominalTerbayar).toBe(0);
    expect(voidBody.tagihan.status).toBe('belum_bayar');

    // 6. Test Tarif Mahasiswa Pasca-Cuti
    // Ubah status mahasiswa menjadi 'cuti'
    await app.handle(
      new Request(`http://localhost/mahasiswa/${mhsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'cuti',
        }),
      }),
    );

    // Daftarkan periode akademik 20251 terlebih dahulu
    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20251',
          nama: '2025/2026 Ganjil',
          aktif: true,
        }),
      }),
    );

    // Buat tarif untuk angkatan berjalan (misal periode 20251 -> angkatan 2025)
    await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          angkatan: '2025',
          programStudiId: prodiId,
          nominal: 4000000,
          termin1JatuhTempo: '2026-01-01',
          termin2JatuhTempo: '2026-03-01',
        }),
      }),
    );

    // Set status mahasiswa kembali ke aktif agar tagihan periode 20251 tergenerate
    await app.handle(
      new Request(`http://localhost/mahasiswa/${mhsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: 'aktif',
        }),
      }),
    );

    // Generate tagihan periode 20251 untuk mahasiswa
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          periodeId: '20251',
        }),
      }),
    );

    // Dapatkan tagihan mahasiswa cuti di periode 20251
    const cutiTagihanRes = await app.handle(
      new Request(`http://localhost/tagihan?search=Mahasiswa Tagihan`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    const cutiTagihanBody = await cutiTagihanRes.json();
    const tag2025 = cutiTagihanBody.data?.find((t: Record<string, unknown>) => t.periodeId === '20251');
    expect(tag2025).toBeDefined();
    expect(tag2025.nominal).toBe(3500000);

    // 7. Test Edit Nominal Tagihan secara Manual (PUT /tagihan/:id)
    const editRes = await app.handle(
      new Request(`http://localhost/tagihan/${tag2025.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          nominal: 4500000,
        }),
      }),
    );
    expect(editRes.status).toBe(200);
    const editBody = await editRes.json();
    expect(editBody.tagihan.nominal).toBe(4500000);
  });

  it('generate tagihan membuat 2 angsuran termin dengan fallback 50/50 & FIFO pembayaran', async () => {
    const adminToken = await getAuthToken('admin-tagihan-ang@test.com', 'admin');

    // Tarif 5jt tanpa nominal termin -> fallback 50/50; tanggal eksplisit
    await createTarif(adminToken, '8888', 5000000, {
      termin1JatuhTempo: '2026-01-01',
      termin2JatuhTempo: '2026-03-02',
    });

    const generateRes = await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ periodeId: '20231', nominal: 5000000 }),
      }),
    );
    expect(generateRes.status).toBe(201);

    const listRes = await app.handle(
      new Request('http://localhost/tagihan?limit=1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const listBody = await listRes.json();
    const tag = listBody.data[0];
    const tagihanId = tag.id;

    // Angsuran: 2 termin, 50/50
    const angRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/angsuran`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(angRes.status).toBe(200);
    const angBody = await angRes.json();
    expect(angBody.data.length).toBe(2);
    expect(angBody.data[0].terminKe).toBe(1);
    expect(angBody.data[0].nominal).toBe(2500000);
    expect(angBody.data[1].terminKe).toBe(2);
    expect(angBody.data[1].nominal).toBe(2500000);
    // Jatuh tempo diambil dari tanggal tarif (bukan selisih hari)
    expect(angBody.data[0].jatuhTempo).toBe('2026-01-01');
    expect(angBody.data[1].jatuhTempo).toBe('2026-03-02');

    // Bayar 2.500.000 (lunasi Termin I saja) -> tagihan status cicilan
    const payRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/bayar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ nominalBayar: 2500000 }),
      }),
    );
    expect(payRes.status).toBe(200);
    expect((await payRes.json()).tagihan.status).toBe('cicilan');

    // Cek angsuran: Termin I lunas, Termin II belum bayar
    const angAfterRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/angsuran`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const angAfter = await angAfterRes.json();
    expect(angAfter.data[0].status).toBe('lunas');
    expect(angAfter.data[0].nominalTerbayar).toBe(2500000);
    expect(angAfter.data[1].status).toBe('belum_bayar');
  });

  it('skema tarif custom mengatur nominal & tanggal angsuran termin', async () => {
    const adminToken = await getAuthToken('admin-tagihan-custom@test.com', 'admin');

    // Buat tarif custom: T1=3jt tanggal 2026-01-10, T2=2jt tanggal 2026-04-10
    const tarifRes = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          angkatan: '8888',
          programStudiId: prodiId,
          nominal: 5000000,
          termin1Nominal: 3000000,
          termin1JatuhTempo: '2026-01-10',
          termin2Nominal: 2000000,
          termin2JatuhTempo: '2026-04-10',
        }),
      }),
    );
    expect(tarifRes.status).toBe(200);

    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ periodeId: '20231' }),
      }),
    );

    const listRes = await app.handle(
      new Request('http://localhost/tagihan?limit=1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const listBody = await listRes.json();
    const tagihanId = listBody.data[0].id;

    const angRes = await app.handle(
      new Request(`http://localhost/tagihan/${tagihanId}/angsuran`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const angBody = await angRes.json();
    expect(angBody.data.length).toBe(2);
    expect(angBody.data[0].nominal).toBe(3000000);
    expect(angBody.data[1].nominal).toBe(2000000);
    expect(angBody.data[0].jatuhTempo).toBe('2026-01-10');
    expect(angBody.data[1].jatuhTempo).toBe('2026-04-10');
  });

  it('endpoint overdue read-only menampilkan angsuran lewat jatuh tempo yang belum lunas', async () => {
    const adminToken = await getAuthToken('admin-tagihan-overdue@test.com', 'admin');

    // Termin I jatuh tempo sudah lewat (kemarin), Termin II masa depan
    const tarifRes = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          angkatan: '8888',
          programStudiId: prodiId,
          nominal: 5000000,
          termin1Nominal: 2500000,
          termin1JatuhTempo: '2020-01-01',
          termin2Nominal: 2500000,
          termin2JatuhTempo: '2026-03-01',
        }),
      }),
    );
    expect(tarifRes.status).toBe(200);

    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ periodeId: '20231' }),
      }),
    );

    const overdueRes = await app.handle(
      new Request('http://localhost/tagihan/overdue?periodeId=20231', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(overdueRes.status).toBe(200);
    const overdueBody = await overdueRes.json();
    expect(overdueBody.data.length).toBeGreaterThan(0);
    expect(overdueBody.data[0].terminKe).toBe(1);
    expect(overdueBody.data[0].status).not.toBe('lunas');
  });

  it('membangun termin plan parsial: satu nominal terisi, pasangannya otomatis', async () => {
    const adminToken = await getAuthToken('admin-tagihan-parsial@test.com', 'admin');

    // Hanya Termin I nominal diisi 2jt; Termin II otomatis 3jt (5jt total)
    const tarifRes = await createTarif(adminToken, '8888', 5000000, {
      termin1Nominal: 2000000,
      termin2Nominal: null,
    });
    expect(tarifRes.status).toBe(200);

    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ periodeId: '20231' }),
      }),
    );

    const listRes = await app.handle(
      new Request('http://localhost/tagihan?limit=1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const listBody = await listRes.json();
    const angRes = await app.handle(
      new Request(`http://localhost/tagihan/${listBody.data[0].id}/angsuran`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const angBody = await angRes.json();
    expect(angBody.data[0].nominal).toBe(2000000);
    expect(angBody.data[1].nominal).toBe(3000000);
  });

  it('menolak tarif tanpa tanggal termin dan tarif dengan total nominal tidak sesuai', async () => {
    const adminToken = await getAuthToken('admin-tagihan-validasi@test.com', 'admin');

    // Tanpa tanggal -> 400
    const noTanggal = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          angkatan: '8888',
          programStudiId: prodiId,
          nominal: 5000000,
        }),
      }),
    );
    expect(noTanggal.status).toBe(400);

    // Jumlah termin tidak sesuai nominal -> 400
    const badTotal = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          angkatan: '8888',
          programStudiId: prodiId,
          nominal: 5000000,
          termin1Nominal: 4000000,
          termin1JatuhTempo: '2026-01-01',
          termin2Nominal: 2000000,
          termin2JatuhTempo: '2026-03-01',
        }),
      }),
    );
    expect(badTotal.status).toBe(400);

    // Termin II lebih awal dari Termin I -> 400
    const badOrder = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          angkatan: '8888',
          programStudiId: prodiId,
          nominal: 5000000,
          termin1JatuhTempo: '2026-05-01',
          termin2JatuhTempo: '2026-01-01',
        }),
      }),
    );
    expect(badOrder.status).toBe(400);

    // Termin nominal <= 0 -> 400
    const zeroTermin = await app.handle(
      new Request('http://localhost/tagihan/tarif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          angkatan: '8888',
          programStudiId: prodiId,
          nominal: 5000000,
          termin1Nominal: 0,
          termin1JatuhTempo: '2026-01-01',
          termin2Nominal: 5000000,
          termin2JatuhTempo: '2026-03-01',
        }),
      }),
    );
    expect(zeroTermin.status).toBe(400);
  });

  it('admin dapat mengedit skema tarif via PUT /tagihan/tarif/:id', async () => {
    const adminToken = await getAuthToken('admin-tagihan-edit@test.com', 'admin');

    const createRes = await createTarif(adminToken, '8888', 5000000);
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()).data as { id: number };

    // Update nominal & tanggal
    const updRes = await app.handle(
      new Request(`http://localhost/tagihan/tarif/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          nominal: 6000000,
          termin1Nominal: 3000000,
          termin1JatuhTempo: '2026-02-01',
          termin2Nominal: 3000000,
          termin2JatuhTempo: '2026-04-01',
        }),
      }),
    );
    expect(updRes.status).toBe(200);
    const updBody = await updRes.json();
    expect(updBody.data.nominal).toBe(6000000);
    expect(updBody.data.termin1JatuhTempo).toBe('2026-02-01');

    // PUT dengan total tidak sesuai -> 400
    const badUpd = await app.handle(
      new Request(`http://localhost/tagihan/tarif/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          nominal: 6000000,
          termin1Nominal: 1000000,
          termin1JatuhTempo: '2026-02-01',
          termin2Nominal: 1000000,
          termin2JatuhTempo: '2026-04-01',
        }),
      }),
    );
    expect(badUpd.status).toBe(400);
  });

  it('generate melewatkan mahasiswa yang skema tarifnya tanpa tanggal dan melaporkannya', async () => {
    const adminToken = await getAuthToken('admin-tagihan-skip@test.com', 'admin');

    // Tarif valid utk angkatan 8888
    await createTarif(adminToken, '8888', 5000000);

    // Tarif tanpa tanggal utk angkatan lain yg tidak terpakai — pastikan tak menggagalkan batch
    const genRes = await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ periodeId: '20231' }),
      }),
    );
    expect(genRes.status).toBe(201);
    const genBody = await genRes.json();
    expect(genBody.count).toBeGreaterThan(0);
    expect(genBody.skippedTanpaTanggal).toBeDefined();
  });

  it('getAll mendukung filter periodeId dan programStudiId', async () => {
    const adminToken = await getAuthToken('admin-tagihan-filter@test.com', 'admin');

    await createTarif(adminToken, '8888', 5000000);
    await app.handle(
      new Request('http://localhost/tagihan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ periodeId: '20231' }),
      }),
    );

    const res = await app.handle(
      new Request(`http://localhost/tagihan?periodeId=20231&programStudiId=${prodiId}&limit=1`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].periodeId).toBe('20231');

    // Filter prodi yang berbeda -> kosong
    const resOther = await app.handle(
      new Request(`http://localhost/tagihan?programStudiId=99999`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const bodyOther = await resOther.json();
    expect(bodyOther.data.length).toBe(0);
  });
});
