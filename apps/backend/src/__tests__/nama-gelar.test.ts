import { describe, expect, it } from 'bun:test';
import { formatNamaGelar, parseNamaGelar } from '../utils/nama-gelar';

describe('nama-gelar utility', () => {
  describe('parseNamaGelar', () => {
    it('harus mem-parse nama bergelar lengkap depan dan belakang', () => {
      const parsed = parseNamaGelar('Prof. Dr. Ir. Budi Santoso, S.T., M.T.');
      expect(parsed.gelarDepan).toBe('Prof. Dr. Ir.');
      expect(parsed.nama).toBe('Budi Santoso');
      expect(parsed.gelarBelakang).toBe('S.T., M.T.');
    });

    it('harus mem-parse nama hanya dengan gelar depan', () => {
      const parsed = parseNamaGelar('Dr. Siti Aminah');
      expect(parsed.gelarDepan).toBe('Dr.');
      expect(parsed.nama).toBe('Siti Aminah');
      expect(parsed.gelarBelakang).toBeNull();
    });

    it('harus mem-parse nama hanya dengan gelar belakang', () => {
      const parsed = parseNamaGelar('Ahmad Fauzi, M.Kom.');
      expect(parsed.gelarDepan).toBeNull();
      expect(parsed.nama).toBe('Ahmad Fauzi');
      expect(parsed.gelarBelakang).toBe('M.Kom.');
    });

    it('harus mem-parse nama polos tanpa gelar', () => {
      const parsed = parseNamaGelar('Joko Widodo');
      expect(parsed.gelarDepan).toBeNull();
      expect(parsed.nama).toBe('Joko Widodo');
      expect(parsed.gelarBelakang).toBeNull();
    });

    it('harus aman menangani input kosong / null', () => {
      const p1 = parseNamaGelar('');
      expect(p1.nama).toBe('');
      expect(p1.gelarDepan).toBeNull();
      expect(p1.gelarBelakang).toBeNull();

      const p2 = parseNamaGelar(null);
      expect(p2.nama).toBe('');
      expect(p2.gelarDepan).toBeNull();
      expect(p2.gelarBelakang).toBeNull();
    });
  });

  describe('formatNamaGelar', () => {
    it('harus merangkai gelar depan, nama, dan gelar belakang', () => {
      expect(formatNamaGelar('Budi Santoso', 'Dr.', 'S.T., M.T.')).toBe('Dr. Budi Santoso, S.T., M.T.');
    });

    it('harus merangkai nama dengan hanya gelar depan', () => {
      expect(formatNamaGelar('Budi Santoso', 'Dr.', null)).toBe('Dr. Budi Santoso');
    });

    it('harus merangkai nama dengan hanya gelar belakang', () => {
      expect(formatNamaGelar('Budi Santoso', null, 'M.Kom.')).toBe('Budi Santoso, M.Kom.');
    });

    it('harus merangkai nama tanpa gelar', () => {
      expect(formatNamaGelar('Budi Santoso', null, null)).toBe('Budi Santoso');
    });

    it('harus mengembalikan string kosong jika nama kosong', () => {
      expect(formatNamaGelar('', 'Dr.', 'M.T.')).toBe('');
      expect(formatNamaGelar(null, 'Dr.', 'M.T.')).toBe('');
    });
  });
});
