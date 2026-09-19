import { describe, expect, it } from 'bun:test';
import {
  MAX_ADMISSION_FILE_BYTES,
  sanitizeContentDispositionName,
  validateAdmissionFile,
  validateAdmissionFileMagic,
} from '../utils/file-validation';

function mockFile(name: string, size: number): { name: string; size: number; type: string } {
  return { name, size, type: '' };
}

const buf = (bytes: number[]) => new Uint8Array(bytes);

describe('file-validation (upload admisi)', () => {
  it('menolak file tanpa nama atau ukuran nol', () => {
    expect(validateAdmissionFile(mockFile('', 0))).toBe('File wajib diisi');
    expect(validateAdmissionFile(mockFile('', 100))).toBe('File wajib diisi');
  });

  it('menolak file melebihi batas 5 MB', () => {
    const err = validateAdmissionFile(mockFile('dok.pdf', MAX_ADMISSION_FILE_BYTES + 1));
    expect(err).toContain('maksimal 5 MB');
  });

  it('menolak ekstensi di luar allowlist', () => {
    expect(validateAdmissionFile(mockFile('virus.exe', 1000))).toContain('Tipe file tidak diizinkan');
    expect(validateAdmissionFile(mockFile('doc.txt', 1000))).toContain('Tipe file tidak diizinkan');
  });

  it('menerima ekstensi pdf/jpg/png/webp dalam batas ukuran', () => {
    for (const ext of ['pdf', 'jpg', 'jpeg', 'png', 'webp']) {
      expect(validateAdmissionFile(mockFile(`dok.${ext}`, 1000))).toBeNull();
    }
  });

  it('validasi magic bytes menolak konten tidak dikenali', () => {
    const err = validateAdmissionFileMagic('pdf', buf([0x4d, 0x5a, 0x90, 0x00]));
    expect(err).toContain('tidak dikenali');
  });

  it('validasi magic bytes menolak rename ekstensi (png sebagai pdf)', () => {
    const err = validateAdmissionFileMagic('pdf', buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]));
    expect(err).toContain('tidak sesuai dengan ekstensi');
  });

  it('validasi magic bytes menerima pdf', () => {
    expect(validateAdmissionFileMagic('pdf', buf([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBeNull();
  });

  it('menerima jpeg dengan ekstensi .jpeg', () => {
    expect(validateAdmissionFileMagic('jpeg', buf([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
  });

  it('sanitize menghapus karakter berbahaya pada Content-Disposition', () => {
    expect(sanitizeContentDispositionName('file"x"\r\n.png')).toBe('filex.png');
    expect(sanitizeContentDispositionName('')).toBe('dokumen');
    expect(sanitizeContentDispositionName('   ')).toBe('dokumen');
    expect(sanitizeContentDispositionName('normal.pdf')).toBe('normal.pdf');
  });
});
