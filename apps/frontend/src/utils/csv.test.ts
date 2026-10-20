import { describe, expect, it } from 'bun:test';
import { detectDelimiter, isHeaderRow, parseCsv } from './csv';

describe('csv utils', () => {
  it('detects comma delimiter correctly', () => {
    const text = 'nim,nama,nilai\n2024001,Ahmad,85';
    expect(detectDelimiter(text)).toBe(',');
  });

  it('detects semicolon delimiter correctly', () => {
    const text = 'nim;nama;nilai\n2024001;Ahmad;85';
    expect(detectDelimiter(text)).toBe(';');
  });

  it('detects tab delimiter correctly', () => {
    const text = 'nim\tnama\tnilai\n2024001\tAhmad\t85';
    expect(detectDelimiter(text)).toBe('\t');
  });

  it('strips UTF-8 BOM correctly and parses semicolon delimited text', () => {
    const bomText = '\uFEFFnim;nama;nilai\r\n2024001;Budi;90';
    const rows = parseCsv(bomText);
    expect(rows).toEqual([
      ['nim', 'nama', 'nilai'],
      ['2024001', 'Budi', '90'],
    ]);
  });

  it('handles quotes containing delimiters', () => {
    const text = 'nim;nama;keterangan\n2024001;"Andi, S.Kom";"Lulus; Sangat Baik"';
    const rows = parseCsv(text);
    expect(rows).toEqual([
      ['nim', 'nama', 'keterangan'],
      ['2024001', 'Andi, S.Kom', 'Lulus; Sangat Baik'],
    ]);
  });

  it('isHeaderRow detects keywords correctly', () => {
    expect(isHeaderRow('NIM Mahasiswa', ['nim'])).toBe(true);
    expect(isHeaderRow('Nilai Akhir', ['nilai_akhir', 'nilai'])).toBe(true);
    expect(isHeaderRow('2024001', ['nim', 'nama'])).toBe(false);
  });
});
