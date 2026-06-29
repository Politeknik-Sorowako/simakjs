import { db } from '../utils/db';
import { mahasiswa, dosen, mataKuliah, programStudi } from '../models/schema';
import { eq } from 'drizzle-orm';

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
        if (row.length > 0 && row.some(cell => cell !== '')) {
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
      if (row.some(cell => cell !== '')) {
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

    const headers = rows[0].map(h => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    const batchData: any[] = [];

    // Caching prodi
    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map(p => [p.kode.toLowerCase(), p.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;

      const record: any = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx];
      });

      const lineNum = i + 1;

      // Validasi field wajib
      if (!record.nim || !record.nama || !record.email || !record.nik || !record.namaibukandung) {
        result.errors.push({ line: lineNum, error: 'Kolom NIM, Nama, Email, NIK, dan Nama Ibu Kandung wajib diisi.' });
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
        namaIbuKandung: record.namaibukandung,
        nik: record.nik,
        jenisKelamin: record.jeniskelamin === 'P' ? 'P' : 'L',
        tanggalLahir: record.tanggallahir || new Date().toISOString().split('T')[0],
        tempatLahir: record.tempatlahir || null,
        idAgama: record.idagama ? parseInt(record.idagama) : null,
        jalan: record.jalan || null,
        rt: record.rt || null,
        rw: record.rw || null,
        kodePos: record.kodepos || null,
        kewarganegaraan: record.kewarganegaraan || 'ID',
      });
    }

    if (batchData.length > 0) {
      try {
        if (mode === 'update') {
          for (const item of batchData) {
            await db.insert(mahasiswa)
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
                }
              });
          }
        } else {
          // default is skip (ON CONFLICT DO NOTHING)
          await db.insert(mahasiswa)
            .values(batchData)
            .onConflictDoNothing({ target: mahasiswa.nim });
        }
        result.successCount = batchData.length;
      } catch (err: any) {
        result.errors.push({ line: 0, error: `Gagal menyimpan data: ${err.message}` });
      }
    }

    return result;
  }

  static async importDosen(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV file is empty or only has headers' }] };
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    const batchData: any[] = [];

    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map(p => [p.kode.toLowerCase(), p.id]));

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
        idAgama: record.idagama ? parseInt(record.idagama) : null,
      });
    }

    if (batchData.length > 0) {
      try {
        if (mode === 'update') {
          for (const item of batchData) {
            await db.insert(dosen)
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
                }
              });
          }
        } else {
          await db.insert(dosen)
            .values(batchData)
            .onConflictDoNothing({ target: dosen.nip });
        }
        result.successCount = batchData.length;
      } catch (err: any) {
        result.errors.push({ line: 0, error: `Gagal menyimpan data: ${err.message}` });
      }
    }

    return result;
  }

  static async importMataKuliah(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV is empty' }] };
    }

    const headers = rows[0].map(h => h.toLowerCase());
    const result: ImportResult = { successCount: 0, errors: [] };
    const batchData: any[] = [];

    const prodis = await db.select().from(programStudi);
    const prodiMap = new Map(prodis.map(p => [p.kode.toLowerCase(), p.id]));

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

      batchData.push({
        kode: record.kode,
        nama: record.nama,
        sksTotal: parseInt(record.skstotal),
        sksTatapMuka: record.skstatapmuka ? parseInt(record.skstatapmuka) : 0,
        sksPraktek: record.skspraktek ? parseInt(record.skspraktek) : 0,
        sksPraktekLapangan: record.sksprakteklapangan ? parseInt(record.sksprakteklapangan) : 0,
        sksSimulasi: record.skssimulasi ? parseInt(record.skssimulasi) : 0,
        programStudiId: prodiId || null,
      });
    }

    if (batchData.length > 0) {
      try {
        if (mode === 'update') {
          for (const item of batchData) {
            await db.insert(mataKuliah)
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
                  programStudiId: item.programStudiId,
                }
              });
          }
        } else {
          await db.insert(mataKuliah)
            .values(batchData)
            .onConflictDoNothing({ target: mataKuliah.kode });
        }
        result.successCount = batchData.length;
      } catch (err: any) {
        result.errors.push({ line: 0, error: `Gagal menyimpan data: ${err.message}` });
      }
    }

    return result;
  }

  static async importProgramStudi(csvText: string, mode: string = 'skip'): Promise<ImportResult> {
    const rows = this.parseCsvLines(csvText);
    if (rows.length <= 1) {
      return { successCount: 0, errors: [{ line: 1, error: 'CSV is empty' }] };
    }

    const headers = rows[0].map(h => h.toLowerCase());
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
      try {
        if (mode === 'update') {
          for (const item of batchData) {
            await db.insert(programStudi)
              .values(item)
              .onConflictDoUpdate({
                target: programStudi.kode,
                set: {
                  nama: item.nama,
                  jenjang: item.jenjang,
                }
              });
          }
        } else {
          await db.insert(programStudi)
            .values(batchData)
            .onConflictDoNothing({ target: programStudi.kode });
        }
        result.successCount = batchData.length;
      } catch (err: any) {
        result.errors.push({ line: 0, error: `Gagal menyimpan data: ${err.message}` });
      }
    }

    return result;
  }
}
