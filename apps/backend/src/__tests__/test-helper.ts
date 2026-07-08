import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  angkatanKurikulum,
  bap,
  bimbingan,
  bimbinganThread,
  cpmk,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  kompensasiBayar,
  komponenNilai,
  konversiNilai,
  krs,
  kurikulum,
  kurikulumMataKuliah,
  mahasiswa,
  mahasiswaKeluar,
  mataKuliah,
  nilaiKomponenMahasiswa,
  pelanggaran,
  pengajuanCuti,
  pengajuanYudisium,
  periodeAkademik,
  presensi,
  programStudi,
  rencanaEvaluasi,
  rps,
  rpsTopik,
  sesiBimbingan,
  skalaPredikatKelulusan,
  skemaTarif,
  tagihan,
  transaksiPembayaran,
  users,
} from '../models/schema';
import { db } from '../utils/db';

const ELEVATED_ROLES = ['admin', 'prodi', 'keuangan'];

export interface UserResponse {
  id: number;
  email: string;
  role: 'admin' | 'dosen' | 'mahasiswa' | 'keuangan';
}

export interface RegisterSuccessResponse {
  message: string;
  user: UserResponse;
}

export interface ErrorResponse {
  error: string;
}

export interface LoginSuccessResponse {
  message: string;
  token: string;
  user: {
    email: string;
  };
}

export interface ProdiSuccessResponse {
  id: number;
  kode: string;
  nama: string;
  jenjang: string;
}

export interface MahasiswaSuccessResponse {
  id: number;
  nim: string;
  nama: string;
  email: string;
  programStudiId: number;
}

// Helper function to clear all database tables to ensure test independence
export async function clearDatabase() {
  await db.delete(pengajuanCuti);
  await db.delete(mahasiswaKeluar);
  await db.delete(tagihan);
  await db.delete(transaksiPembayaran);
  await db.delete(skemaTarif);
  await db.delete(konversiNilai);
  await db.delete(skalaPredikatKelulusan);
  await db.delete(pengajuanYudisium);
  await db.delete(nilaiKomponenMahasiswa);
  await db.delete(komponenNilai);
  await db.delete(rencanaEvaluasi);
  await db.delete(rpsTopik);
  await db.delete(rps);
  await db.delete(sesiBimbingan);
  await db.delete(bimbinganThread);
  await db.delete(bimbingan);
  await db.delete(pelanggaran);
  await db.delete(kompensasiBayar);
  await db.delete(presensi);
  await db.delete(bap);
  await db.delete(cpmk);
  await db.delete(krs);
  await db.delete(angkatanKurikulum);
  await db.delete(kurikulumMataKuliah);
  await db.delete(kurikulum);
  await db.delete(dosenPengajarKelas);
  await db.delete(kelasKuliah);
  await db.delete(mataKuliah);
  await db.delete(mahasiswa);
  await db.delete(dosen);
  await db.delete(periodeAkademik);
  await db.delete(programStudi);
  await db.delete(users);
}

// Helper function to register and login a user, returning their JWT authorization token
export async function getAuthToken(email: string, role: 'admin' | 'dosen' | 'mahasiswa' | 'keuangan') {
  // Elevated roles (admin, prodi, keuangan) must be created directly in DB
  if (ELEVATED_ROLES.includes(role)) {
    const hashedPassword = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
    await db
      .insert(users)
      .values({ email, password: hashedPassword, nama: 'Test User', role, isActive: true })
      .onConflictDoNothing();

    // Admin also needs a dosen record for KRS approval flow
    if (role === 'admin') {
      const ts = Date.now();
      await db
        .insert(dosen)
        .values({
          nip: `ADM${String(ts).slice(0, 13)}`,
          nama: 'Test User',
          email,
          nik: `NIK${String(ts).slice(0, 12)}`,
          jenisKelamin: 'L',
          tanggalLahir: '1980-01-01',
        })
        .onConflictDoNothing();
    }

    const response = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      }),
    );

    if (response.status !== 200) {
      const errorText = await response.text();
      throw new Error(`getAuthToken login failed with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as LoginSuccessResponse;
    return data.token;
  }

  const registerResponse = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', nama: 'Test User', role }),
    }),
  );

  if (registerResponse.status !== 201 && registerResponse.status !== 400) {
    const errorText = await registerResponse.text();
    throw new Error(`getAuthToken registration failed with status ${registerResponse.status}: ${errorText}`);
  }

  // Activate user directly in DB for test authorization
  await db.update(users).set({ isActive: true }).where(eq(users.email, email));

  const response = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    }),
  );

  if (response.status !== 200) {
    const errorText = await response.text();
    throw new Error(`getAuthToken login failed with status ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as LoginSuccessResponse;
  return data.token;
}
