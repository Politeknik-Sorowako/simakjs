import { describe, expect, it } from 'bun:test';
import {
  hitungStatusPelanggaranAkumulatif,
  hitungStatusPelanggaranSemester,
  konversiPoinKeSanksi,
} from '../services/pelanggaran.service';

describe('Klasifikasi Status Pelanggaran Berjenjang', () => {
  describe('hitungStatusPelanggaranSemester (Per Semester)', () => {
    it('mengembalikan "-" jika poin semester 0 (tidak ada pelanggaran)', () => {
      expect(hitungStatusPelanggaranSemester(0)).toBe('-');
    });

    it('mengembalikan "Waspada" jika poin semester 1 - 3', () => {
      expect(hitungStatusPelanggaranSemester(1)).toBe('Waspada');
      expect(hitungStatusPelanggaranSemester(2)).toBe('Waspada');
      expect(hitungStatusPelanggaranSemester(3)).toBe('Waspada');
    });

    it('mengembalikan "Awas" jika poin semester 4 - 7 (setara 1 peringatan tertulis)', () => {
      expect(hitungStatusPelanggaranSemester(4)).toBe('Awas');
      expect(hitungStatusPelanggaranSemester(5)).toBe('Awas');
      expect(hitungStatusPelanggaranSemester(7)).toBe('Awas');
    });

    it('mengembalikan "Coaching" jika poin semester 8 - 15 (setara 2 peringatan tertulis)', () => {
      expect(hitungStatusPelanggaranSemester(8)).toBe('Coaching');
      expect(hitungStatusPelanggaranSemester(12)).toBe('Coaching');
      expect(hitungStatusPelanggaranSemester(15)).toBe('Coaching');
    });

    it('mengembalikan "Skorsing" jika poin semester >= 16 (setara >= 4 peringatan tertulis)', () => {
      expect(hitungStatusPelanggaranSemester(16)).toBe('Skorsing');
      expect(hitungStatusPelanggaranSemester(20)).toBe('Skorsing');
      expect(hitungStatusPelanggaranSemester(32)).toBe('Skorsing');
    });
  });

  describe('hitungStatusPelanggaranAkumulatif (Total Poin)', () => {
    it('mengembalikan "Siaga" jika total poin < 8', () => {
      expect(hitungStatusPelanggaranAkumulatif(0)).toBe('Siaga');
      expect(hitungStatusPelanggaranAkumulatif(1)).toBe('Siaga');
      expect(hitungStatusPelanggaranAkumulatif(4)).toBe('Siaga');
      expect(hitungStatusPelanggaranAkumulatif(7)).toBe('Siaga');
    });

    it('mengembalikan "Waspada" jika 8 <= total poin < 16', () => {
      expect(hitungStatusPelanggaranAkumulatif(8)).toBe('Waspada');
      expect(hitungStatusPelanggaranAkumulatif(12)).toBe('Waspada');
      expect(hitungStatusPelanggaranAkumulatif(15)).toBe('Waspada');
    });

    it('mengembalikan "Awas" jika 16 <= total poin < 24', () => {
      expect(hitungStatusPelanggaranAkumulatif(16)).toBe('Awas');
      expect(hitungStatusPelanggaranAkumulatif(20)).toBe('Awas');
      expect(hitungStatusPelanggaranAkumulatif(23)).toBe('Awas');
    });

    it('mengembalikan "Gawat" jika 24 <= total poin < 28 (setara 6 tertulis)', () => {
      expect(hitungStatusPelanggaranAkumulatif(24)).toBe('Gawat');
      expect(hitungStatusPelanggaranAkumulatif(26)).toBe('Gawat');
      expect(hitungStatusPelanggaranAkumulatif(27)).toBe('Gawat');
    });

    it('mengembalikan "Darurat" jika total poin >= 28 (setara >= 7 tertulis)', () => {
      expect(hitungStatusPelanggaranAkumulatif(28)).toBe('Darurat');
      expect(hitungStatusPelanggaranAkumulatif(32)).toBe('Darurat');
      expect(hitungStatusPelanggaranAkumulatif(50)).toBe('Darurat');
    });
  });

  describe('konversiPoinKeSanksi (Konversi 4 Lisan = 1 Tertulis)', () => {
    it('mengonversi 4 poin lisan menjadi 1 tertulis dan 0 lisan (sesuai predikat T1)', () => {
      const sanksi = konversiPoinKeSanksi(4);
      expect(sanksi.tertulis).toBe(1);
      expect(sanksi.lisan).toBe(0);
    });

    it('mengonversi 7 poin menjadi 1 tertulis dan 3 lisan (sesuai predikat T1L3)', () => {
      const sanksi = konversiPoinKeSanksi(7);
      expect(sanksi.tertulis).toBe(1);
      expect(sanksi.lisan).toBe(3);
    });

    it('mengonversi 14 poin menjadi 3 tertulis dan 2 lisan (sesuai predikat T3L2)', () => {
      const sanksi = konversiPoinKeSanksi(14);
      expect(sanksi.tertulis).toBe(3);
      expect(sanksi.lisan).toBe(2);
    });

    it('mengonversi 0 poin menjadi 0 tertulis dan 0 lisan', () => {
      const sanksi = konversiPoinKeSanksi(0);
      expect(sanksi.tertulis).toBe(0);
      expect(sanksi.lisan).toBe(0);
    });

    it('mengonversi 16 poin menjadi 4 tertulis (batas skorsing)', () => {
      const sanksi = konversiPoinKeSanksi(16);
      expect(sanksi.tertulis).toBe(4);
      expect(sanksi.lisan).toBe(0);
    });
  });
});
