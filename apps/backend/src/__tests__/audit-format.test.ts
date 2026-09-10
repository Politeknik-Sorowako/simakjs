import { describe, expect, it } from 'bun:test';
import {
  formatAuditDateTime,
  formatAuditUser,
  formatDescription,
  formatDetail,
  resolveTableName,
} from '../utils/audit-format';

describe('audit-format', () => {
  describe('resolveTableName', () => {
    it('maps known URL modules to physical table names', () => {
      expect(resolveTableName('mahasiswa')).toBe('mahasiswa');
      expect(resolveTableName('mata-kuliah')).toBe('mata_kuliah');
      expect(resolveTableName('kelas-kuliah')).toBe('kelas_kuliah');
      expect(resolveTableName('kompensasi-bayar')).toBe('kompensasi_bayar');
      expect(resolveTableName('program-studi')).toBe('program_studi');
    });

    it('falls back to snake_case for unknown modules', () => {
      expect(resolveTableName('some-new-feature')).toBe('some_new_feature');
      expect(resolveTableName('')).toBe('unknown');
    });
  });

  describe('formatAuditUser', () => {
    it('renders name with role when role is present', () => {
      expect(formatAuditUser('Budi', 'admin')).toBe('Budi (admin)');
    });

    it('renders name only when role is absent', () => {
      expect(formatAuditUser('Budi', null)).toBe('Budi');
    });

    it('falls back to Sistem when name is empty', () => {
      expect(formatAuditUser(null, 'admin')).toBe('Sistem (admin)');
    });
  });

  describe('formatDescription', () => {
    it('formats CREATE as tambah', () => {
      const result = formatDescription({
        waktu: '2026-09-10 14:00:00',
        userName: 'Budi',
        userRole: 'admin',
        actionType: 'CREATE',
        tableName: 'mahasiswa',
        recordId: '123',
      });
      expect(result).toBe(
        '[2026-09-10 14:00:00] Budi (admin) melakukan tambah data pada tabel mahasiswa record id 123.',
      );
    });

    it('formats UPDATE as update', () => {
      const result = formatDescription({
        waktu: '2026-09-10 14:00:00',
        userName: 'Budi',
        userRole: 'admin',
        actionType: 'UPDATE',
        tableName: 'mata_kuliah',
        recordId: '9',
      });
      expect(result).toContain('melakukan update data pada tabel mata_kuliah record id 9.');
    });

    it('formats DELETE as delete', () => {
      const result = formatDescription({
        waktu: '2026-09-10 14:00:00',
        userName: 'Budi',
        actionType: 'DELETE',
        tableName: 'krs',
        recordId: '55',
      });
      expect(result).toContain('melakukan delete data pada tabel krs record id 55.');
    });

    it('omits record id when unknown', () => {
      const result = formatDescription({
        waktu: '2026-09-10 14:00:00',
        userName: 'Budi',
        actionType: 'CREATE',
        tableName: 'mahasiswa',
        recordId: null,
      });
      expect(result).toBe('[2026-09-10 14:00:00] Budi melakukan tambah data pada tabel mahasiswa.');
    });

    it('matches the required description regex', () => {
      const result = formatDescription({
        waktu: '2026-09-10 14:00:00',
        userName: 'Budi',
        userRole: 'admin',
        actionType: 'CREATE',
        tableName: 'mahasiswa',
        recordId: '123',
      });
      expect(result).toMatch(
        /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] .+ melakukan (tambah|update|delete) data pada tabel .+ record id .+\.$/,
      );
    });

    it('handles LOGIN and LOGOUT fallbacks', () => {
      expect(formatDescription({ waktu: 'x', userName: 'Budi', actionType: 'LOGIN', tableName: 'users' })).toBe(
        'Budi masuk (login)',
      );
      expect(formatDescription({ waktu: 'x', userName: 'Budi', actionType: 'LOGOUT', tableName: 'users' })).toBe(
        'Budi keluar (logout)',
      );
    });
  });

  describe('formatDetail', () => {
    it('builds module + url and skips empty parts', () => {
      const result = formatDetail({
        module: 'mahasiswa',
        url: '/api/mahasiswa/1',
        parts: ['NIM: 12345', null, 'Nama: Budi', undefined, 'Prodi: D3 Elektronika', 'User: admin'],
      });
      expect(result).toBe(
        'Modul mahasiswa url /api/mahasiswa/1. Entitas yang terdampak: NIM: 12345 Nama: Budi Prodi: D3 Elektronika User: admin',
      );
    });

    it('omits the affected-entity suffix when no parts exist', () => {
      const result = formatDetail({ module: 'system', url: '/api/system/x', parts: [] });
      expect(result).toBe('Modul system url /api/system/x.');
    });

    it('always contains Modul and url segments', () => {
      const result = formatDetail({
        module: 'krs',
        url: '/api/krs/10',
        parts: ['NIM: 1', 'Mata Kuliah: Algoritma (TIF101)'],
      });
      expect(result).toContain('Modul krs url /api/krs/10.');
      expect(result).toContain('Mata Kuliah: Algoritma (TIF101)');
    });
  });

  describe('formatAuditDateTime', () => {
    it('formats a date into YYYY-MM-DD HH:mm:ss in the given timezone', () => {
      const date = new Date('2026-09-10T06:00:00.000Z');
      expect(formatAuditDateTime(date, 'Asia/Makassar')).toBe('2026-09-10 14:00:00');
    });
  });
});
