import { and, eq } from 'drizzle-orm';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  krs,
  mahasiswa,
  mataKuliah,
  programStudi,
  users,
} from '../models/schema';
import { db } from '../utils/db';

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
    const batchData: any[] = [];

    // Caching prodi
    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map((p) => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

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

      batchData.push({
        nim: record.nim,
        nama: record.nama,
        email: record.email,
        programStudiId: prodiId,
        status: record.status || 'aktif',
        namaIbuKandung: record.namaibukandung || null,
        nik: record.nik || null,
        jenisKelamin: record.jeniskelamin === 'P' ? 'P' : 'L',
        tanggalLahir: record.tanggallahir || new Date().toISOString().split('T')[0],
        tempatLahir: record.tempatlahir || null,
        idAgama: record.idagama && !isNaN(parseInt(record.idagama)) ? parseInt(record.idagama) : null,
        jalan: record.jalan || null,
        rt: record.rt || null,
        rw: record.rw || null,
        kodePos: record.kodepos || null,
        kewarganegaraan: record.kewarganegaraan || 'ID',
      });
    }

    if (batchData.length > 0) {
      if (mode === 'update') {
        for (const item of batchData) {
          try {
            await db
              .insert(mahasiswa)
              .values(item)
              .onConflictDoUpdate({
                target: mahasiswa.nim,
                set: {
                  nama: item.nama,
                  email: item.email,
                  programStudiId: item.programStudiId,
                  status: item.status,
                  namaIbuKandung: item.namaIbuKandung,
                  nik: item.nik,
                  jenisKelamin: item.jenisKelamin,
                  tanggalLahir: item.tanggalLahir,
                  tempatLahir: item.tempatLahir,
                  idAgama: item.idAgama,
                  jalan: item.jalan,
                  rt: item.rt,
                  rw: item.rw,
                  kodePos: item.kodePos,
                  kewarganegaraan: item.kewarganegaraan,
                },
              });
            result.successCount++;
          } catch (err: any) {
            result.errors.push({ line: 0, error: `Gagal menyimpan data NIM ${item.nim}: ${err.message}` });
          }
        }
      } else {
        try {
          // default is skip (ON CONFLICT DO NOTHING)
          await db.insert(mahasiswa).values(batchData).onConflictDoNothing({ target: mahasiswa.nim });
          result.successCount = batchData.length;
        } catch (err: any) {
          result.errors.push({ line: 0, error: `Gagal menyimpan data batch: ${err.message}` });
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
    const batchData: any[] = [];

    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map((p) => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

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
          } catch (err: any) {
            result.errors.push({ line: 0, error: `Gagal menyimpan data Dosen NIP ${item.nip}: ${err.message}` });
          }
        }
      } else {
        try {
          await db.insert(dosen).values(batchData).onConflictDoNothing({ target: dosen.nip });
          result.successCount = batchData.length;
        } catch (err: any) {
          result.errors.push({ line: 0, error: `Gagal menyimpan data batch: ${err.message}` });
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
    const batchData: any[] = [];

    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map((p) => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

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
          } catch (err: any) {
            result.errors.push({
              line: 0,
              error: `Gagal menyimpan data Mata Kuliah Kode ${item.kode}: ${err.message}`,
            });
          }
        }
      } else {
        try {
          await db.insert(mataKuliah).values(batchData).onConflictDoNothing({ target: mataKuliah.kode });
          result.successCount = batchData.length;
        } catch (err: any) {
          result.errors.push({ line: 0, error: `Gagal menyimpan data batch: ${err.message}` });
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
    const batchData: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

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
          } catch (err: any) {
            result.errors.push({
              line: 0,
              error: `Gagal menyimpan data Program Studi Kode ${item.kode}: ${err.message}`,
            });
          }
        }
      } else {
        try {
          await db.insert(programStudi).values(batchData).onConflictDoNothing({ target: programStudi.kode });
          result.successCount = batchData.length;
        } catch (err: any) {
          result.errors.push({ line: 0, error: `Gagal menyimpan data batch: ${err.message}` });
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
      } catch (err: any) {
        result.errors.push({
          line: lineNum,
          error: `Gagal memperbarui relasi Dosen PA untuk NIM "${nimVal}": ${err.message}`,
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

        const defaultPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 12) + 'Aa1';
        const finalPassword = passwordVal === emailVal ? defaultPassword : passwordVal;

        const hashedPassword = await Bun.password.hash(finalPassword, {
          algorithm: 'bcrypt',
          cost: 12,
        });

        await db.insert(users).values({
          email: emailVal,
          password: hashedPassword,
          nama: namaVal,
          role: roleVal as any,
          isActive: false,
        });
        result.successCount++;
      } catch (err: any) {
        result.errors.push({ line: lineNum, error: err.message || 'Gagal menyimpan data.' });
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
          cost: 10,
        });

        await tx.insert(users).values({
          email,
          password: hashedPassword,
          nama,
          role,
          isActive: true,
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
      } catch (err: any) {
        result.errors.push({ line: lineNum, error: err.message });
      }
    }

    return result;
  }
}
