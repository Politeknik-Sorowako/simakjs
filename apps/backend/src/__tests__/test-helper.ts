import { app } from '../index';
import { db } from '../utils/db';
import { eq } from 'drizzle-orm';
import { users, programStudi, mahasiswa, dosen, krs, kelasKuliah, mataKuliah, periodeAkademik, dosenPengajarKelas, cpmk, bap, presensi, kompensasiBayar, bimbingan, bimbinganThread, pelanggaran, komponenNilai, nilaiKomponenMahasiswa, pengajuanYudisium } from '../models/schema';

export interface UserResponse {
  id: number;
  email: string;
  role: 'admin' | 'dosen' | 'mahasiswa';
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
}

// Helper function to register and login a user, returning their JWT authorization token
export async function getAuthToken(email: string, role: 'admin' | 'dosen' | 'mahasiswa') {
  const registerResponse = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', nama: 'Test User', role }),
    })
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
    })
  );

  if (response.status !== 200) {
    const errorText = await response.text();
    throw new Error(`getAuthToken login failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json() as LoginSuccessResponse;
  return data.token;
}
