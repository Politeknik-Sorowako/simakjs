import { describe, expect, it } from 'bun:test';
import { isScoreInEnvelope, resolveNilaiEnvelope } from '../utils/grade-calc';

describe('resolveNilaiEnvelope (rentang nilai global dari aturan konversi)', () => {
  it('menghitung envelope dari aturan konversi skala 0-100', () => {
    const envelope = resolveNilaiEnvelope([
      { nilaiMin: 80, nilaiMax: 100, nilaiHuruf: 'A', bobotIndeks: 4 },
      { nilaiMin: 0, nilaiMax: 49, nilaiHuruf: 'E', bobotIndeks: 0 },
    ]);
    expect(envelope).toEqual({ min: 0, max: 100 });
  });

  it('menghitung envelope dari aturan konversi skala 0.00-10.00', () => {
    const envelope = resolveNilaiEnvelope([
      { nilaiMin: 8, nilaiMax: 10, nilaiHuruf: 'A', bobotIndeks: 4 },
      { nilaiMin: 0, nilaiMax: 4.99, nilaiHuruf: 'E', bobotIndeks: 0 },
    ]);
    expect(envelope).toEqual({ min: 0, max: 10 });
  });

  it('fallback ke 0-100 saat tidak ada aturan valid', () => {
    expect(resolveNilaiEnvelope([])).toEqual({ min: 0, max: 100 });
    expect(resolveNilaiEnvelope([{ nilaiMin: 'x', nilaiMax: 'y', nilaiHuruf: 'A', bobotIndeks: 4 }])).toEqual({
      min: 0,
      max: 100,
    });
  });

  it('isScoreInEnvelope menolak nilai di luar rentang', () => {
    const envelope = { min: 0, max: 10 };
    expect(isScoreInEnvelope(10, envelope)).toBe(true);
    expect(isScoreInEnvelope(0, envelope)).toBe(true);
    expect(isScoreInEnvelope(10.01, envelope)).toBe(false);
    expect(isScoreInEnvelope(85, envelope)).toBe(false);
    expect(isScoreInEnvelope(Number.NaN, envelope)).toBe(false);
  });
});
