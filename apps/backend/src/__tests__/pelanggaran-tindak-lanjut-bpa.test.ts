import { describe, expect, it } from 'bun:test';
import { type BpaTindakLanjutConfig, hitungKasusTindakLanjut } from '../services/pelanggaran-tindak-lanjut.service';

describe('PelanggaranTindakLanjutService - hitungKasusTindakLanjut (BPA)', () => {
  const defaultConfig: BpaTindakLanjutConfig = {
    spNotifAdminEnabled: true,
    lv1SemesterT: 1,
    lv2SemesterT: 2,
    lv2AkumulasiT: 5,
    lv3SemesterT: 3,
    lv3AkumulasiTList: [6, 8],
    lv4SemesterT: 4,
    lv4AkumulasiTList: [7, 9],
  };

  it('Kasus 0 T: Tidak ada eskalasi', () => {
    const hasil = hitungKasusTindakLanjut(0, 0, defaultConfig);
    expect(hasil).toEqual([]);
  });

  it('T1 Semester (misal 4 poin semester): Memicu Level 1 Coaching MHS (disetujui Kaprodi)', () => {
    const hasil = hitungKasusTindakLanjut(1, 1, defaultConfig);
    expect(hasil.length).toBe(1);
    expect(hasil[0]).toEqual({
      tingkat: 'LEVEL_1',
      pemicuTipe: 'SEMESTER',
      pemicuTNilai: 1,
    });
  });

  it('T2 Semester: Memicu Level 1 dan Level 2 Coaching MHS + Pemanggilan Ortu (Kaprodi, Wadir 1, Wadir 3)', () => {
    const hasil = hitungKasusTindakLanjut(2, 2, defaultConfig);
    expect(hasil).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 1 },
      { tingkat: 'LEVEL_2', pemicuTipe: 'SEMESTER', pemicuTNilai: 2 },
    ]);
  });

  it('T5 Akumulasi (dengan T semester 1): Memicu Level 1 semester dan Level 2 akumulasi', () => {
    const hasil = hitungKasusTindakLanjut(1, 5, defaultConfig);
    expect(hasil).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 1 },
      { tingkat: 'LEVEL_2', pemicuTipe: 'AKUMULASI', pemicuTNilai: 5 },
    ]);
  });

  it('T3 Semester atau T6/T8 Akumulasi: Memicu Level 3 Coaching MHS (Kaprodi, Wadir 1, Wadir 3, Direktur)', () => {
    // Kasus T3 semester
    const hasilSem3 = hitungKasusTindakLanjut(3, 3, defaultConfig);
    expect(hasilSem3).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 1 },
      { tingkat: 'LEVEL_2', pemicuTipe: 'SEMESTER', pemicuTNilai: 2 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'SEMESTER', pemicuTNilai: 3 },
    ]);

    // Kasus T6 akumulasi (semester 1)
    const hasilAkum6 = hitungKasusTindakLanjut(1, 6, defaultConfig);
    expect(hasilAkum6).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 1 },
      { tingkat: 'LEVEL_2', pemicuTipe: 'AKUMULASI', pemicuTNilai: 5 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'AKUMULASI', pemicuTNilai: 6 },
    ]);

    // Kasus T8 akumulasi (semester 1)
    const hasilAkum8 = hitungKasusTindakLanjut(1, 8, defaultConfig);
    expect(hasilAkum8).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 1 },
      { tingkat: 'LEVEL_2', pemicuTipe: 'AKUMULASI', pemicuTNilai: 5 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'AKUMULASI', pemicuTNilai: 6 },
      { tingkat: 'LEVEL_4', pemicuTipe: 'AKUMULASI', pemicuTNilai: 7 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'AKUMULASI', pemicuTNilai: 8 },
    ]);
  });

  it('T4 Semester atau T7/T9 Akumulasi: Memicu Level 4 Sidang Komisi Disiplin (Kaprodi, Wadir 1, Wadir 3, Direktur)', () => {
    // T4 semester
    const hasilSem4 = hitungKasusTindakLanjut(4, 4, defaultConfig);
    expect(hasilSem4).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 1 },
      { tingkat: 'LEVEL_2', pemicuTipe: 'SEMESTER', pemicuTNilai: 2 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'SEMESTER', pemicuTNilai: 3 },
      { tingkat: 'LEVEL_4', pemicuTipe: 'SEMESTER', pemicuTNilai: 4 },
    ]);

    // T7 akumulasi
    const hasilAkum7 = hitungKasusTindakLanjut(0, 7, defaultConfig);
    expect(hasilAkum7).toEqual([
      { tingkat: 'LEVEL_2', pemicuTipe: 'AKUMULASI', pemicuTNilai: 5 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'AKUMULASI', pemicuTNilai: 6 },
      { tingkat: 'LEVEL_4', pemicuTipe: 'AKUMULASI', pemicuTNilai: 7 },
    ]);

    // T9 akumulasi
    const hasilAkum9 = hitungKasusTindakLanjut(0, 9, defaultConfig);
    expect(hasilAkum9).toEqual([
      { tingkat: 'LEVEL_2', pemicuTipe: 'AKUMULASI', pemicuTNilai: 5 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'AKUMULASI', pemicuTNilai: 6 },
      { tingkat: 'LEVEL_4', pemicuTipe: 'AKUMULASI', pemicuTNilai: 7 },
      { tingkat: 'LEVEL_3', pemicuTipe: 'AKUMULASI', pemicuTNilai: 8 },
      { tingkat: 'LEVEL_4', pemicuTipe: 'AKUMULASI', pemicuTNilai: 9 },
    ]);
  });

  it('Dinamisasi Config: Jika aturan BPA diubah, ambang mengikuti config baru', () => {
    const customConfig: BpaTindakLanjutConfig = {
      spNotifAdminEnabled: false,
      lv1SemesterT: 2, // Misal revisi: LV1 baru mulai di T2
      lv2SemesterT: 3,
      lv2AkumulasiT: 6,
      lv3SemesterT: 4,
      lv3AkumulasiTList: [7],
      lv4SemesterT: 5,
      lv4AkumulasiTList: [8],
    };

    // T1 semester dengan aturan baru tidak memicu kasus
    expect(hitungKasusTindakLanjut(1, 1, customConfig)).toEqual([]);

    // T2 semester memicu LV1
    expect(hitungKasusTindakLanjut(2, 2, customConfig)).toEqual([
      { tingkat: 'LEVEL_1', pemicuTipe: 'SEMESTER', pemicuTNilai: 2 },
    ]);
  });
});
