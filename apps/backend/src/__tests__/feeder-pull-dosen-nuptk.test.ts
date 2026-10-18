import { describe, expect, it } from 'bun:test';
import type { dosen } from '../models/schema';
import { FeederPullService } from '../services/feeder-pull.service';

describe('FeederPullService - diffDosen with NUPTK and Gelar', () => {
  const dummyLocalBase: typeof dosen.$inferSelect = {
    id: 10,
    nip: '198501012010011001',
    gelarDepan: 'Dr.',
    nama: 'Budi Santoso',
    gelarBelakang: 'S.T., M.T.',
    email: 'budi@politekniksorowako.ac.id',
    programStudiId: 1,
    idPddikti: null,
    isSynced: false,
    lastSyncAt: null,
    nidn: null,
    nuptk: '1234567890123456',
    pohonIlmu: null,
    cabangIlmu: null,
    nik: null,
    jenisKelamin: 'L',
    tanggalLahir: '1985-01-01',
    tempatLahir: null,
    idAgama: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('harus mencocokkan dosen Feeder tanpa NIDN tetapi memiliki NUPTK yang sama ke baris lokal (link_id)', () => {
    const feederRows = [
      {
        id_dosen: 'uuid-dosen-nuptk-1',
        nama_dosen: 'Dr. Budi Santoso, S.T., M.T.',
        nidn: '',
        nuptk: '1234567890123456',
        nip: '198501012010011001',
        jenis_kelamin: 'L',
        tanggal_lahir: '1985-01-01',
        id_agama: 1,
      },
    ];

    const localRows = [{ ...dummyLocalBase }];
    const items = FeederPullService.diffDosen(feederRows, localRows);

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item.status).toBe('link_id');
    expect(item.localId).toBe(10);
    expect(item.feederData.nuptk).toBe('1234567890123456');
    expect(item.feederData.gelarDepan).toBe('Dr.');
    expect(item.feederData.nama).toBe('Budi Santoso');
    expect(item.feederData.gelarBelakang).toBe('S.T., M.T.');
    expect(item.label).toContain('(NUPTK: 1234567890123456)');
  });

  it('harus mencocokkan dosen bila Feeder NUPTK cocok dengan NIP dosen lokal', () => {
    const feederRows = [
      {
        id_dosen: 'uuid-dosen-nuptk-2',
        nama_dosen: 'Ahmad Fauzi, M.Kom.',
        nidn: null,
        nuptk: '9988776655443322',
        nip: null,
      },
    ];

    const localRows = [
      {
        ...dummyLocalBase,
        id: 20,
        nip: '9988776655443322', // diinput di NIP lokal
        nuptk: null,
        nama: 'Ahmad Fauzi',
        gelarDepan: null,
        gelarBelakang: 'M.Kom.',
      },
    ];

    const items = FeederPullService.diffDosen(feederRows, localRows);
    expect(items.length).toBe(1);
    expect(items[0].status).toBe('link_id');
    expect(items[0].localId).toBe(20);
  });

  it('harus mendeteksi konflik bila NUPTK lokal berbeda dengan NUPTK Feeder', () => {
    const feederRows = [
      {
        id_dosen: 'uuid-dosen-nuptk-3',
        nama_dosen: 'Budi Santoso',
        nidn: null,
        nuptk: '8888888888888888',
        nip: '198501012010011001',
      },
    ];

    const localRows = [{ ...dummyLocalBase, nuptk: '1234567890123456' }];
    const items = FeederPullService.diffDosen(feederRows, localRows);

    expect(items.length).toBe(1);
    expect(items[0].status).toBe('konflik');
    const diffNuptk = items[0].diffs.find((d) => d.field === 'nuptk');
    expect(diffNuptk).toBeDefined();
    expect(diffNuptk?.feederValue).toBe('8888888888888888');
    expect(diffNuptk?.localValue).toBe('1234567890123456');
  });

  it('harus menandai sebagai baru jika dosen tidak ditemukan di lokal dan menyertakan NUPTK & gelar', () => {
    const feederRows = [
      {
        id_dosen: 'uuid-dosen-baru',
        nama_dosen: 'Prof. Ir. Siti Aminah, Ph.D.',
        nidn: null,
        nuptk: '5555666677778888',
        nip: null,
      },
    ];

    const items = FeederPullService.diffDosen(feederRows, []);

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item.status).toBe('baru');
    expect(item.localId).toBeNull();
    expect(item.feederData.nuptk).toBe('5555666677778888');
    expect(item.feederData.gelarDepan).toBe('Prof. Ir.');
    expect(item.feederData.nama).toBe('Siti Aminah');
    expect(item.feederData.gelarBelakang).toBe('Ph.D.');
    expect(item.label).toBe('Prof. Ir. Siti Aminah, Ph.D. (NUPTK: 5555666677778888)');
  });
});
