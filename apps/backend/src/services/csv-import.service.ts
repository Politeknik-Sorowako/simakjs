import { and, eq, sql } from 'drizzle-orm';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  kompensasiBayar,
  kompensasiManual,
  krs,
  mahasiswa,
  mataKuliah,
  pasalPelanggaran,
  pelanggaran,
  programStudi,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { JENIS_FULL_DAY, JENIS_KOMPEN } from './kompensasi-manual.service';
import { PelanggaranService } from './pelanggaran.service';
import { SystemParameterService } from './system-parameter.service';

export interface ImportResult {
  successCount: number;
  errors: { line: number; error: string }[];
}

export class CsvImportService {
  private static parseCsvLines(csvText: string): string[][] {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentToken = '';

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentToken += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentToken.trim());
        currentToken = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        row.push(currentToken.trim());
        if (row.length > 0 && row.some((cell) => cell !== '')) {
          lines.push(row);
        }
        row = [];
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    if (currentToken || row.length > 0) {
      row.push(currentToken.trim());
      if (row.some((cell) => cell !== '')) {
        lines.push(row);
      }
    }
    return lines;
  }

  static async importMahasiswa(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
    const batchData: any[] = [];

    // Caching prodi
    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map((p) => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      // biome-ignore lint/suspicious/noExplicitAny: CSV record dynamic keys
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx];
      });

      const lineNum = i + 1;

      // Validasi field wajib
      if (!record.nim || !record.nama || !record.email) {
        result.errors.push({ line: lineNum, error: 'Kolom NIM, Nama, dan Email wajib diisi.' });
        continue;
      }

      const prodiKode = record.programstudikode || '';
      const prodiId = prodiMap.get(prodiKode.toLowerCase());
      if (!prodiId) {
        result.errors.push({ line: lineNum, error: `Program Studi dengan kode "${prodiKode}" tidak ditemukan.` });
        continue;
      }

      // Parse agama (integer ID or text string)
      let parsedIdAgama: number | null = null;
      if (record.idagama) {
        const strAgama = String(record.idagama).trim().toLowerCase();
        if (!isNaN(parseInt(strAgama))) {
          parsedIdAgama = parseInt(strAgama);
        } else if (strAgama.includes('islam')) {
          parsedIdAgama = 1;
        } else if (strAgama.includes('protestan') || strAgama.includes('kristen')) {
          parsedIdAgama = 2;
        } else if (strAgama.includes('katolik')) {
          parsedIdAgama = 3;
        } else if (strAgama.includes('hindu')) {
          parsedIdAgama = 4;
        } else if (strAgama.includes('buddha') || strAgama.includes('budha')) {
          parsedIdAgama = 5;
        } else if (strAgama.includes('khonghucu') || strAgama.includes('konghucu')) {
          parsedIdAgama = 6;
        }
      }

      const rawStatus = (record.status || 'aktif').trim().toLowerCase();
      const validStatus = ['aktif', 'cuti', 'lulus', 'drop_out'].includes(rawStatus) ? rawStatus : 'aktif';

      let kwg = record.kewarganegaraan ? String(record.kewarganegaraan).trim() : 'ID';
      if (kwg.toLowerCase() === 'indonesia') {
        kwg = 'ID';
      } else if (kwg.length > 5) {
        kwg = kwg.substring(0, 5).toUpperCase();
      }

      batchData.push({
        line: lineNum,
        data: {
          nim: record.nim,
          nama: record.nama,
          email: record.email,
          programStudiId: prodiId,
          status: validStatus,
          namaIbuKandung: record.namaibukandung || null,
          nik: record.nik || null,
          jenisKelamin:
            String(record.jeniskelamin || '')
              .trim()
              .toUpperCase() === 'P'
              ? 'P'
              : 'L',
          tanggalLahir: record.tanggallahir || null,
          tempatLahir: record.tempatlahir || null,
          idAgama: parsedIdAgama,
          jalan: record.jalan || null,
          rt: record.rt || null,
          rw: record.rw || null,
          kodePos: record.kodepos || null,
          kewarganegaraan: kwg,
        },
      });
    }

    if (batchData.length > 0) {
      const formatErrorMsg = (err: unknown, nim: string): string => {
        const raw = err instanceof Error ? `${err.message} ${(err as { cause?: unknown }).cause || ''}` : String(err);
        if (
          raw.includes('mahasiswa_nim_unique') ||
          (raw.includes('duplicate key value violates unique constraint') && raw.includes('nim'))
        ) {
          return `NIM "${nim}" sudah terdaftar di sistem.`;
        }
        if (
          raw.includes('mahasiswa_email_unique') ||
          (raw.includes('duplicate key value violates unique constraint') && raw.includes('email'))
        ) {
          return `Email pada NIM "${nim}" sudah digunakan oleh mahasiswa lain.`;
        }
        if (
          raw.includes('mahasiswa_nik_unique') ||
          (raw.includes('duplicate key value violates unique constraint') && raw.includes('nik'))
        ) {
          return `NIK pada NIM "${nim}" sudah terdaftar di sistem.`;
        }
        if (raw.includes('violates foreign key constraint')) {
          return `Referensi Program Studi/Dosen PA untuk NIM "${nim}" tidak valid.`;
        }
        return `Gagal menyimpan data NIM "${nim}". Silakan periksa kembali format kolom data.`;
      };

      for (const item of batchData) {
        try {
          if (mode === 'update') {
            await db
              .insert(mahasiswa)
              .values(item.data)
              .onConflictDoUpdate({
                target: mahasiswa.nim,
                set: {
                  nama: item.data.nama,
                  email: item.data.email,
                  programStudiId: item.data.programStudiId,
                  status: item.data.status,
                  namaIbuKandung: item.data.namaIbuKandung,
                  nik: item.data.nik,
                  jenisKelamin: item.data.jenisKelamin,
                  tanggalLahir: item.data.tanggalLahir,
                  tempatLahir: item.data.tempatLahir,
                  idAgama: item.data.idAgama,
                  jalan: item.data.jalan,
                  rt: item.data.rt,
                  rw: item.data.rw,
                  kodePos: item.data.kodePos,
                  kewarganegaraan: item.data.kewarganegaraan,
                },
              });
          } else {
            await db.insert(mahasiswa).values(item.data).onConflictDoNothing({ target: mahasiswa.nim });
          }
          result.successCount++;
        } catch (err: unknown) {
          result.errors.push({
            line: item.line,
            error: formatErrorMsg(err, item.data.nim),
          });
        }
      }
    }

    return result;
  }

  static async importDosen(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
    const batchData: any[] = [];

    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map((p) => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      // biome-ignore lint/suspicious/noExplicitAny: CSV record dynamic keys
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx];
      });

      const lineNum = i + 1;

      if (!record.nip || !record.nama || !record.email) {
        result.errors.push({ line: lineNum, error: 'Kolom NIP, Nama, dan Email wajib diisi.' });
        continue;
      }

      const prodiKode = record.programstudikode || '';
      const prodiId = prodiMap.get(prodiKode.toLowerCase());

      batchData.push({
        nip: record.nip,
        nama: record.nama,
        email: record.email,
        programStudiId: prodiId || null,
        nidn: record.nidn || null,
        nik: record.nik || null,
        jenisKelamin: record.jeniskelamin === 'P' ? 'P' : 'L',
        tanggalLahir: record.tanggallahir || null,
        tempatLahir: record.tempatlahir || null,
        idAgama: record.idagama && !isNaN(parseInt(record.idagama)) ? parseInt(record.idagama) : null,
      });
    }

    if (batchData.length > 0) {
      if (mode === 'update') {
        for (const item of batchData) {
          try {
            await db
              .insert(dosen)
              .values(item)
              .onConflictDoUpdate({
                target: dosen.nip,
                set: {
                  nama: item.nama,
                  email: item.email,
                  programStudiId: item.programStudiId,
                  nidn: item.nidn,
                  nik: item.nik,
                  jenisKelamin: item.jenisKelamin,
                  tanggalLahir: item.tanggalLahir,
                  tempatLahir: item.tempatLahir,
                  idAgama: item.idAgama,
                },
              });
            result.successCount++;
          } catch (err: unknown) {
            result.errors.push({
              line: 0,
              error: `Gagal menyimpan data Dosen NIP ${item.nip}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        }
      } else {
        try {
          await db.insert(dosen).values(batchData).onConflictDoNothing({ target: dosen.nip });
          result.successCount = batchData.length;
        } catch (err: unknown) {
          result.errors.push({
            line: 0,
            error: `Gagal menyimpan data batch: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      }
    }

    return result;
  }

  static async importMataKuliah(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV is empty' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
    const batchData: any[] = [];

    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map((p) => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      // biome-ignore lint/suspicious/noExplicitAny: CSV record dynamic keys
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx];
      });

      const lineNum = i + 1;

      if (!record.kode || !record.nama || !record.skstotal) {
        result.errors.push({ line: lineNum, error: 'Kolom Kode, Nama, dan SKS Total wajib diisi.' });
        continue;
      }

      const prodiKode = record.programstudikode || '';
      const prodiId = prodiMap.get(prodiKode.toLowerCase());

      const parseSks = (val: string) => {
        const parsed = parseInt(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      batchData.push({
        kode: record.kode,
        nama: record.nama,
        sksTotal: parseSks(record.skstotal),
        sksTatapMuka: record.skstatapmuka ? parseSks(record.skstatapmuka) : 0,
        sksPraktek: record.skspraktek ? parseSks(record.skspraktek) : 0,
        sksPraktekLapangan: record.sksprakteklapangan ? parseSks(record.sksprakteklapangan) : 0,
        sksSimulasi: record.skssimulasi ? parseSks(record.skssimulasi) : 0,
      });
    }

    if (batchData.length > 0) {
      if (mode === 'update') {
        for (const item of batchData) {
          try {
            await db
              .insert(mataKuliah)
              .values(item)
              .onConflictDoUpdate({
                target: mataKuliah.kode,
                set: {
                  nama: item.nama,
                  sksTotal: item.sksTotal,
                  sksTatapMuka: item.sksTatapMuka,
                  sksPraktek: item.sksPraktek,
                  sksPraktekLapangan: item.sksPraktekLapangan,
                  sksSimulasi: item.sksSimulasi,
                },
              });
            result.successCount++;
          } catch (err: unknown) {
            result.errors.push({
              line: 0,
              error: `Gagal menyimpan data Mata Kuliah Kode ${item.kode}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        }
      } else {
        try {
          await db.insert(mataKuliah).values(batchData).onConflictDoNothing({ target: mataKuliah.kode });
          result.successCount = batchData.length;
        } catch (err: unknown) {
          result.errors.push({
            line: 0,
            error: `Gagal menyimpan data batch: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      }
    }

    return result;
  }

  static async importProgramStudi(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV is empty' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
    const batchData: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      // biome-ignore lint/suspicious/noExplicitAny: CSV record dynamic keys
      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx];
      });

      const lineNum = i + 1;

      if (!record.kode || !record.nama || !record.jenjang) {
        result.errors.push({ line: lineNum, error: 'Kolom Kode, Nama, dan Jenjang wajib diisi.' });
        continue;
      }

      batchData.push({
        kode: record.kode,
        nama: record.nama,
        jenjang: record.jenjang,
      });
    }

    if (batchData.length > 0) {
      if (mode === 'update') {
        for (const item of batchData) {
          try {
            await db
              .insert(programStudi)
              .values(item)
              .onConflictDoUpdate({
                target: programStudi.kode,
                set: {
                  nama: item.nama,
                  jenjang: item.jenjang,
                },
              });
            result.successCount++;
          } catch (err: unknown) {
            result.errors.push({
              line: 0,
              error: `Gagal menyimpan data Program Studi Kode ${item.kode}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        }
      } else {
        try {
          await db.insert(programStudi).values(batchData).onConflictDoNothing({ target: programStudi.kode });
          result.successCount = batchData.length;
        } catch (err: unknown) {
          result.errors.push({
            line: 0,
            error: `Gagal menyimpan data batch: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      }
    }

    return result;
  }

  static async importDosenPaMapping(csvText: string): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const nimIdx = headers.indexOf('nim');
    let nipIdx = headers.indexOf('nip_dosen_pa');
    if (nipIdx === -1) nipIdx = headers.indexOf('nip_dosen');
    if (nipIdx === -1) nipIdx = headers.indexOf('nip');

    if (nimIdx === -1 || nipIdx === -1) {
      return {
        successCount: 0,
        errors: [
          { line: 1, error: 'CSV harus memiliki kolom header "nim" dan "nip_dosen_pa" (atau "nip_dosen" / "nip").' },
        ],
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < Math.max(nimIdx, nipIdx) + 1) continue;

      const nimVal = row[nimIdx].trim();
      const nipVal = row[nipIdx].trim();
      const lineNum = i + 1;

      if (!nimVal) {
        result.errors.push({ line: lineNum, error: 'Kolom NIM tidak boleh kosong.' });
        continue;
      }

      const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.nim, nimVal));
      if (!mhs) {
        result.errors.push({ line: lineNum, error: `Mahasiswa dengan NIM "${nimVal}" tidak ditemukan.` });
        continue;
      }

      let dosenId: number | null = null;
      if (nipVal) {
        const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.nip, nipVal));
        if (!dsn) {
          result.errors.push({ line: lineNum, error: `Dosen dengan NIP "${nipVal}" tidak ditemukan.` });
          continue;
        }
        dosenId = dsn.id;
      }

      try {
        await db.update(mahasiswa).set({ dosenPaId: dosenId }).where(eq(mahasiswa.id, mhs.id));
        result.successCount++;
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: `Gagal memperbarui relasi Dosen PA untuk NIM "${nimVal}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  static async importUsers(csvText: string): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const emailIdx = headers.indexOf('email');
    const namaIdx = headers.indexOf('nama');
    const roleIdx = headers.indexOf('role');
    const passwordIdx = headers.indexOf('password');

    if (emailIdx === -1 || namaIdx === -1 || roleIdx === -1) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'CSV harus memiliki kolom header: email, nama, role' }],
      };
    }

    const validRoles = ['admin', 'dosen', 'mahasiswa', 'prodi', 'keuangan', 'guest'];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      if (row.length < headers.length) continue;

      const emailVal = row[emailIdx].trim().toLowerCase();
      const namaVal = row[namaIdx].trim();
      const roleVal = row[roleIdx].trim().toLowerCase();
      let passwordVal = emailVal;
      if (passwordIdx !== -1 && row[passwordIdx] && row[passwordIdx].trim()) {
        passwordVal = row[passwordIdx].trim();
      }

      if (!emailVal || !namaVal || !roleVal) {
        result.errors.push({ line: lineNum, error: 'Kolom email, nama, dan role wajib diisi.' });
        continue;
      }

      if (!validRoles.includes(roleVal)) {
        result.errors.push({
          line: lineNum,
          error: `Role "${roleVal}" tidak valid. Role yang diizinkan: ${validRoles.join(', ')}`,
        });
        continue;
      }

      try {
        const [existingUser] = await db.select().from(users).where(eq(users.email, emailVal)).limit(1);

        if (existingUser) {
          result.errors.push({ line: lineNum, error: `Email "${emailVal}" sudah terdaftar.` });
          continue;
        }

        const defaultPassword = `${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}Aa1`;
        const finalPassword = passwordVal === emailVal ? defaultPassword : passwordVal;

        const hashedPassword = await Bun.password.hash(finalPassword, {
          algorithm: 'bcrypt',
          cost: 12,
        });

        await db.insert(users).values({
          email: emailVal,
          password: hashedPassword,
          nama: namaVal,
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
          role: roleVal as any,
          isActive: false,
          mustChangePassword: true,
        });
        result.successCount++;
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: err instanceof Error ? err.message : 'Gagal menyimpan data.',
        });
      }
    }

    return result;
  }

  static async generateAccounts(
    targetType: 'mahasiswa' | 'dosen',
    ids: number[],
  ): Promise<{ successCount: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    if (!ids || ids.length === 0) {
      return { successCount: 0, errors: ['Tidak ada data terpilih.'] };
    }

    await db.transaction(async (tx) => {
      for (const id of ids) {
        let email = '';
        let nama = '';
        let role: 'mahasiswa' | 'dosen' = 'mahasiswa';

        if (targetType === 'mahasiswa') {
          const [mhs] = await tx.select().from(mahasiswa).where(eq(mahasiswa.id, id)).limit(1);
          if (!mhs) {
            errors.push(`Mahasiswa dengan ID ${id} tidak ditemukan.`);
            continue;
          }
          email = mhs.email;
          nama = mhs.nama;
          role = 'mahasiswa';
        } else {
          const [dsn] = await tx.select().from(dosen).where(eq(dosen.id, id)).limit(1);
          if (!dsn) {
            errors.push(`Dosen dengan ID ${id} tidak ditemukan.`);
            continue;
          }
          email = dsn.email;
          nama = dsn.nama;
          role = 'dosen';
        }

        if (!email) {
          errors.push(`Gagal membuat akun untuk ${nama} (${targetType} ID: ${id}): Email kosong.`);
          continue;
        }

        // Check if user already exists
        const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          errors.push(`Akun dengan email "${email}" (${nama}) sudah terdaftar.`);
          continue;
        }

        const hashedPassword = await Bun.password.hash(email, {
          algorithm: 'bcrypt',
          cost: 12,
        });

        await tx.insert(users).values({
          email,
          password: hashedPassword,
          nama,
          role,
          isActive: true,
          mustChangePassword: true,
        });
        successCount++;
      }
    });

    return { successCount, errors };
  }

  static async importKrs(csvText: string): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const nimIdx = headers.indexOf('nim');
    const kodeMkIdx = headers.indexOf('kode_mata_kuliah');
    const namaKelasIdx = headers.indexOf('nama_kelas');
    const periodeIdx = headers.indexOf('periode_id');

    if (nimIdx === -1 || kodeMkIdx === -1 || namaKelasIdx === -1 || periodeIdx === -1) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'CSV harus memiliki kolom header: nim, kode_mata_kuliah, nama_kelas, periode_id' }],
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      if (row.length < headers.length) continue;

      const nimVal = row[nimIdx].trim();
      const kodeMkVal = row[kodeMkIdx].trim();
      const namaKelasVal = row[namaKelasIdx].trim();
      const periodeVal = row[periodeIdx].trim();

      if (!nimVal || !kodeMkVal || !namaKelasVal || !periodeVal) {
        result.errors.push({
          line: lineNum,
          error: 'Semua kolom (nim, kode_mata_kuliah, nama_kelas, periode_id) wajib diisi.',
        });
        continue;
      }

      try {
        const [mhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.nim, nimVal)).limit(1);
        if (!mhs) {
          throw new Error(`Mahasiswa dengan NIM "${nimVal}" tidak ditemukan.`);
        }

        if (mhs.status !== 'aktif') {
          throw new Error(`Mahasiswa dengan NIM "${nimVal}" tidak berstatus aktif.`);
        }

        const [mk] = await db.select().from(mataKuliah).where(eq(mataKuliah.kode, kodeMkVal)).limit(1);
        if (!mk) {
          throw new Error(`Mata Kuliah dengan kode "${kodeMkVal}" tidak ditemukan.`);
        }

        const [kelas] = await db
          .select()
          .from(kelasKuliah)
          .where(
            and(
              eq(kelasKuliah.mataKuliahId, mk.id),
              eq(kelasKuliah.namaKelas, namaKelasVal),
              eq(kelasKuliah.periodeId, periodeVal),
            ),
          )
          .limit(1);

        if (!kelas) {
          throw new Error(
            `Kelas Kuliah "${namaKelasVal}" untuk MK "${kodeMkVal}" pada Periode "${periodeVal}" tidak ditemukan.`,
          );
        }

        const [exactDuplicate] = await db
          .select({ id: krs.id })
          .from(krs)
          .where(and(eq(krs.mahasiswaId, mhs.id), eq(krs.kelasKuliahId, kelas.id)))
          .limit(1);

        if (exactDuplicate) {
          continue;
        }

        const [existingSameCourse] = await db
          .select({ id: krs.id, namaKelas: kelasKuliah.namaKelas })
          .from(krs)
          .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
          .where(
            and(
              eq(krs.mahasiswaId, mhs.id),
              eq(kelasKuliah.mataKuliahId, mk.id),
              eq(kelasKuliah.periodeId, periodeVal),
            ),
          )
          .limit(1);

        if (existingSameCourse) {
          throw new Error(
            `Mahasiswa sudah mengontrak mata kuliah "${kodeMkVal}" pada kelas "${existingSameCourse.namaKelas}" di periode "${periodeVal}".`,
          );
        }

        await db.insert(krs).values({
          mahasiswaId: mhs.id,
          kelasKuliahId: kelas.id,
          isApproved: false,
        });

        result.successCount++;
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  static async importPelanggaran(csvText: string, mode: string = 'skip', userId?: number): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const nimIdx = headers.indexOf('nim');
    const tanggalIdx = headers.indexOf('tanggal');
    const jenisIdx = headers.indexOf('jenis_pelanggaran');
    const keteranganIdx = headers.indexOf('keterangan');
    const pasalIdx = headers.indexOf('nomor_pasal');
    const sanksiIdx = headers.indexOf('jenis_sanksi');
    let pelaporIdx = headers.indexOf('pelapor');
    if (pelaporIdx === -1) pelaporIdx = headers.indexOf('reported_by');

    if (nimIdx === -1 || tanggalIdx === -1 || jenisIdx === -1) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'CSV harus memiliki kolom header: nim, tanggal, jenis_pelanggaran' }],
      };
    }

    const pasalCache = new Map<string, { id: number; jenisSanksi: number }>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      if (row.length < headers.length) continue;

      const nimVal = row[nimIdx].trim();
      const tanggalVal = row[tanggalIdx].trim();
      const jenisVal = row[jenisIdx].trim();
      const keteranganVal = keteranganIdx !== -1 ? row[keteranganIdx].trim() : '';
      const pasalVal = pasalIdx !== -1 ? row[pasalIdx].trim() : '';
      const sanksiRaw = sanksiIdx !== -1 ? row[sanksiIdx].trim().toUpperCase() : '';
      const pelaporVal = pelaporIdx !== -1 ? row[pelaporIdx].trim() : '';

      if (!nimVal || !tanggalVal || !jenisVal) {
        result.errors.push({
          line: lineNum,
          error: 'Kolom NIM, Tanggal, dan Jenis Pelanggaran wajib diisi.',
        });
        continue;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalVal)) {
        result.errors.push({ line: lineNum, error: `Format tanggal "${tanggalVal}" tidak valid (harus YYYY-MM-DD).` });
        continue;
      }

      let sanksi = sanksiRaw;
      if (sanksi && sanksi !== '1' && sanksi !== 'L' && sanksi !== '4' && sanksi !== 'T') {
        result.errors.push({
          line: lineNum,
          error: 'Jenis sanksi tidak valid. Gunakan L (Lisan=1) atau T (Tertulis=4).',
        });
        continue;
      }

      let jenisSanksi = 1;
      if (sanksi === '4' || sanksi === 'T') jenisSanksi = 4;

      let pasalId: number | null = null;
      if (pasalVal) {
        const cacheKey = pasalVal.toLowerCase();
        const cached = pasalCache.get(cacheKey);
        if (cached) {
          pasalId = cached.id;
          jenisSanksi = cached.jenisSanksi;
        } else {
          const [pasal] = await db
            .select({
              id: pasalPelanggaran.id,
              jenisSanksi: pasalPelanggaran.jenisSanksi,
            })
            .from(pasalPelanggaran)
            .where(sql`LOWER(${pasalPelanggaran.nomorPasal}) = LOWER(${pasalVal})`)
            .limit(1);
          if (!pasal) {
            result.errors.push({ line: lineNum, error: `Pasal "${pasalVal}" tidak ditemukan di master BPA.` });
            continue;
          }
          pasalId = pasal.id;
          jenisSanksi = pasal.jenisSanksi;
          pasalCache.set(cacheKey, { id: pasal.id, jenisSanksi: pasal.jenisSanksi });
        }
      }

      try {
        const [mhs] = await db
          .select({
            id: mahasiswa.id,
            nama: mahasiswa.nama,
            nim: mahasiswa.nim,
            dosenPaId: mahasiswa.dosenPaId,
            programStudiId: mahasiswa.programStudiId,
          })
          .from(mahasiswa)
          .where(eq(mahasiswa.nim, nimVal))
          .limit(1);
        if (!mhs) {
          result.errors.push({ line: lineNum, error: `Mahasiswa dengan NIM "${nimVal}" tidak ditemukan.` });
          continue;
        }

        if (mode === 'update') {
          const [existing] = await db
            .select({ id: pelanggaran.id })
            .from(pelanggaran)
            .where(and(eq(pelanggaran.mahasiswaId, mhs.id), eq(pelanggaran.tanggal, tanggalVal)))
            .orderBy(sql`${pelanggaran.id} DESC`)
            .limit(1);
          if (existing) {
            await db
              .update(pelanggaran)
              .set({
                jenisPelanggaran: jenisVal,
                keterangan: keteranganVal || '-',
                pasalId,
                jenisSanksi,
                pelapor: pelaporVal || undefined,
              })
              .where(eq(pelanggaran.id, existing.id));
            result.successCount++;
            continue;
          }
        }

        const [newPelanggaran] = await db
          .insert(pelanggaran)
          .values({
            mahasiswaId: mhs.id,
            tanggal: tanggalVal,
            jenisPelanggaran: jenisVal,
            keterangan: keteranganVal || '-',
            pasalId,
            jenisSanksi,
            pelapor: pelaporVal || 'Petugas Kedisiplinan',
            dibuatOleh: userId ?? null,
          })
          .returning();
        result.successCount++;

        // Kirim notifikasi peringatan SP ke Dosen PA & Kaprodi / Admin Prodi (setara jalur create per baris)
        try {
          await PelanggaranService.sendPeringatanNotification({
            mahasiswa: mhs,
            pelanggaran: newPelanggaran,
            namaPasal: pasalVal || '-',
            namaPelapor: pelaporVal || 'Petugas Kedisiplinan',
          });
        } catch (notifErr) {
          console.error('[CsvImportService] Gagal mengirim notifikasi peringatan saat impor:', notifErr);
        }
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: `Gagal menyimpan pelanggaran NIM "${nimVal}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  static async importPasalPelanggaran(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const nomorIdx = headers.indexOf('nomor_pasal');
    const bunyiIdx = headers.indexOf('bunyi_pasal');
    const sanksiIdx = headers.indexOf('jenis_sanksi');

    if (nomorIdx === -1 || bunyiIdx === -1) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'CSV harus memiliki kolom header: nomor_pasal, bunyi_pasal' }],
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      if (row.length < headers.length) continue;

      const nomorVal = row[nomorIdx].trim();
      const bunyiVal = row[bunyiIdx].trim();
      const sanksiRaw = sanksiIdx !== -1 ? row[sanksiIdx].trim().toUpperCase() : '';

      if (!nomorVal || !bunyiVal) {
        result.errors.push({ line: lineNum, error: 'Kolom nomor_pasal dan bunyi_pasal wajib diisi.' });
        continue;
      }

      let jenisSanksi = 1;
      if (sanksiRaw) {
        if (sanksiRaw === '4' || sanksiRaw === 'T') jenisSanksi = 4;
        else if (sanksiRaw === '1' || sanksiRaw === 'L') jenisSanksi = 1;
        else {
          result.errors.push({
            line: lineNum,
            error: 'Jenis sanksi tidak valid. Gunakan L (Lisan=1) atau T (Tertulis=4).',
          });
          continue;
        }
      }

      try {
        const [existing] = await db
          .select({ id: pasalPelanggaran.id })
          .from(pasalPelanggaran)
          .where(sql`LOWER(${pasalPelanggaran.nomorPasal}) = LOWER(${nomorVal})`)
          .limit(1);

        if (existing) {
          if (mode === 'update') {
            await db
              .update(pasalPelanggaran)
              .set({ bunyiPasal: bunyiVal, jenisSanksi, isActive: true })
              .where(eq(pasalPelanggaran.id, existing.id));
            result.successCount++;
          } else {
            result.errors.push({
              line: lineNum,
              error: `Pasal "${nomorVal}" sudah ada. Gunakan mode Update untuk menimpa.`,
            });
          }
          continue;
        }

        await db.insert(pasalPelanggaran).values({ nomorPasal: nomorVal, bunyiPasal: bunyiVal, jenisSanksi });
        result.successCount++;
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: `Gagal menyimpan pasal "${nomorVal}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  static async importKompensasiManual(csvText: string, mode: string = 'skip', userId?: number): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const nimIdx = headers.indexOf('nim');
    const tanggalIdx = headers.indexOf('tanggal');
    const jenisIdx = headers.indexOf('jenis_kompen');
    const durasiIdx = headers.indexOf('durasi_menit');
    const keteranganIdx = headers.indexOf('keterangan');

    if (nimIdx === -1 || tanggalIdx === -1 || jenisIdx === -1 || durasiIdx === -1) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'CSV harus memiliki kolom header: nim, tanggal, jenis_kompen, durasi_menit' }],
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      if (row.length < headers.length) continue;

      const nimVal = row[nimIdx].trim();
      const tanggalVal = row[tanggalIdx].trim();
      const jenisVal = row[jenisIdx].trim().toLowerCase();
      const durasiRaw = row[durasiIdx].trim();
      const keteranganVal = keteranganIdx !== -1 ? row[keteranganIdx].trim() : null;

      if (!nimVal || !tanggalVal || !jenisVal || !durasiRaw) {
        result.errors.push({ line: lineNum, error: 'Kolom NIM, Tanggal, Jenis Kompen, dan Durasi Menit wajib diisi.' });
        continue;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalVal)) {
        result.errors.push({ line: lineNum, error: `Format tanggal "${tanggalVal}" tidak valid (harus YYYY-MM-DD).` });
        continue;
      }

      // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type requirement
      if (!JENIS_KOMPEN.includes(jenisVal as any)) {
        result.errors.push({
          line: lineNum,
          error: `Jenis kompen "${jenisVal}" tidak valid. Pilihan: ${JENIS_KOMPEN.join(', ')}`,
        });
        continue;
      }

      const durasiMenit = parseInt(durasiRaw);
      const isFullDay = (JENIS_FULL_DAY as readonly string[]).includes(jenisVal);
      if (isNaN(durasiMenit) && !isFullDay) {
        result.errors.push({ line: lineNum, error: 'Durasi menit harus berupa angka positif.' });
        continue;
      }
      if (!isFullDay && durasiMenit <= 0) {
        result.errors.push({ line: lineNum, error: 'Durasi menit harus berupa angka positif.' });
        continue;
      }

      try {
        const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.nim, nimVal)).limit(1);
        if (!mhs) {
          result.errors.push({ line: lineNum, error: `Mahasiswa dengan NIM "${nimVal}" tidak ditemukan.` });
          continue;
        }

        const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');
        const resolvedDurasi = (JENIS_FULL_DAY as readonly string[]).includes(jenisVal)
          ? maksHarian
          : Math.min(durasiMenit, maksHarian);

        await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`kompen_import_${mhs.id}_${tanggalVal}`}))`);

        const [sumRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)` })
          .from(kompensasiManual)
          .where(and(eq(kompensasiManual.mahasiswaId, mhs.id), eq(kompensasiManual.tanggal, tanggalVal)));
        const totalHariIni = Number(sumRow?.total || 0);

        if (totalHariIni + resolvedDurasi > maksHarian) {
          result.errors.push({
            line: lineNum,
            error: `Total durasi kompensasi ${tanggalVal} mencapai ${totalHariIni} menit, tidak dapat menambah ${resolvedDurasi} menit (maks ${maksHarian} menit/hari).`,
          });
          continue;
        }

        if (mode === 'update') {
          const [existing] = await db
            .select({ id: kompensasiManual.id })
            .from(kompensasiManual)
            .where(
              and(
                eq(kompensasiManual.mahasiswaId, mhs.id),
                eq(kompensasiManual.tanggal, tanggalVal),
                eq(kompensasiManual.jenisKompen, jenisVal),
              ),
            )
            .limit(1);
          if (existing) {
            await db
              .update(kompensasiManual)
              .set({ durasiMenit: resolvedDurasi, keterangan: keteranganVal })
              .where(eq(kompensasiManual.id, existing.id));
            result.successCount++;
            continue;
          }
        }

        await db.insert(kompensasiManual).values({
          mahasiswaId: mhs.id,
          tanggal: tanggalVal,
          jenisKompen: jenisVal,
          durasiMenit: resolvedDurasi,
          keterangan: keteranganVal,
          createdBy: userId ?? null,
        });
        result.successCount++;
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: `Gagal menyimpan kompensasi NIM "${nimVal}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }

  static async importKompensasiBayar(csvText: string, mode: string = 'skip', userId?: number): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const result: ImportResult = { successCount: 0, errors: [] };

    const nimIdx = headers.indexOf('nim');
    const tanggalIdx = headers.indexOf('tanggal');
    const jumlahIdx = headers.indexOf('jumlah_menit');
    const keteranganIdx = headers.indexOf('keterangan');

    if (nimIdx === -1 || tanggalIdx === -1 || jumlahIdx === -1) {
      return {
        successCount: 0,
        errors: [{ line: 1, error: 'CSV harus memiliki kolom header: nim, tanggal, jumlah_menit' }],
      };
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;
      if (row.length < headers.length) continue;

      const nimVal = row[nimIdx].trim();
      const tanggalVal = row[tanggalIdx].trim();
      const jumlahRaw = row[jumlahIdx].trim();
      const keteranganVal = keteranganIdx !== -1 ? row[keteranganIdx].trim() : '-';

      if (!nimVal || !tanggalVal || !jumlahRaw) {
        result.errors.push({ line: lineNum, error: 'Kolom NIM, Tanggal, dan Jumlah Menit wajib diisi.' });
        continue;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalVal)) {
        result.errors.push({ line: lineNum, error: `Format tanggal "${tanggalVal}" tidak valid (harus YYYY-MM-DD).` });
        continue;
      }

      const jumlahMenit = parseInt(jumlahRaw);
      if (isNaN(jumlahMenit) || jumlahMenit <= 0) {
        result.errors.push({ line: lineNum, error: 'Jumlah menit harus berupa angka positif.' });
        continue;
      }

      try {
        const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.nim, nimVal)).limit(1);
        if (!mhs) {
          result.errors.push({ line: lineNum, error: `Mahasiswa dengan NIM "${nimVal}" tidak ditemukan.` });
          continue;
        }

        if (mode === 'update') {
          const [existing] = await db
            .select({ id: kompensasiBayar.id })
            .from(kompensasiBayar)
            .where(
              and(
                eq(kompensasiBayar.mahasiswaId, mhs.id),
                eq(kompensasiBayar.tanggal, tanggalVal),
                eq(kompensasiBayar.jumlahMenit, jumlahMenit),
              ),
            )
            .limit(1);
          if (existing) {
            await db
              .update(kompensasiBayar)
              .set({ keterangan: keteranganVal })
              .where(eq(kompensasiBayar.id, existing.id));
            result.successCount++;
            continue;
          }
        }

        await db.insert(kompensasiBayar).values({
          mahasiswaId: mhs.id,
          jumlahMenit,
          tanggal: tanggalVal,
          keterangan: keteranganVal,
          petugasId: userId ?? null,
        });
        result.successCount++;
      } catch (err: unknown) {
        result.errors.push({
          line: lineNum,
          error: `Gagal menyimpan pembayaran kompensasi NIM "${nimVal}": ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    return result;
  }
}
