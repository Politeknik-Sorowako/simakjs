import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { BahanKajianService } from '../services/bahan-kajian.service';
import { BahanKajianCplMappingService } from '../services/bahan-kajian-cpl-mapping.service';
import { CplService } from '../services/cpl.service';
import { CplMappingService } from '../services/cpl-mapping.service';
import { ObeReportService } from '../services/obe-report.service';
import { ProfilLulusanService } from '../services/profil-lulusan.service';
import { VisiMisiService } from '../services/visi-misi.service';
import { clearDatabase, getAuthToken } from './test-helper';

describe('OBE Services', () => {
  let prodiId: number;
  let prodiId2: number;

  beforeEach(async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-obe@test.com', 'admin');

    const response1 = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-OBE-1',
          nama: 'Teknik Informatika OBE',
          jenjang: 'D4',
        }),
      }),
    );
    const data1 = (await response1.json()) as { id: number };
    prodiId = data1.id;

    const response2 = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-OBE-2',
          nama: 'Sistem Informasi OBE',
          jenjang: 'D4',
        }),
      }),
    );
    const data2 = (await response2.json()) as { id: number };
    prodiId2 = data2.id;
  });

  describe('BahanKajianCplMappingService', () => {
    it('should filter mappings by prodiId correctly', async () => {
      const cpl1 = await CplService.create({
        programStudiId: prodiId,
        kode: 'CPL-001',
        deskripsi: 'CPL Prodi 1',
        urutan: 1,
      });

      const cpl2 = await CplService.create({
        programStudiId: prodiId2,
        kode: 'CPL-001',
        deskripsi: 'CPL Prodi 2',
        urutan: 1,
      });

      const bk1 = await BahanKajianService.create({
        programStudiId: prodiId,
        kode: 'BK-001',
        nama: 'Bahan Kajian Prodi 1',
        urutan: 1,
      });

      const bk2 = await BahanKajianService.create({
        programStudiId: prodiId2,
        kode: 'BK-001',
        nama: 'Bahan Kajian Prodi 2',
        urutan: 1,
      });

      await BahanKajianCplMappingService.create({ bahanKajianId: bk1.id, cplId: cpl1.id, bobot: 50 });
      await BahanKajianCplMappingService.create({ bahanKajianId: bk2.id, cplId: cpl2.id, bobot: 50 });

      const mappingsProdi1 = await BahanKajianCplMappingService.getAll(undefined, undefined, prodiId);
      const mappingsProdi2 = await BahanKajianCplMappingService.getAll(undefined, undefined, prodiId2);

      expect(mappingsProdi1.length).toBe(1);
      expect(mappingsProdi1[0].bahanKajianId).toBe(bk1.id);
      expect(mappingsProdi2.length).toBe(1);
      expect(mappingsProdi2[0].bahanKajianId).toBe(bk2.id);
    });

    it('should return empty array when prodi has no bahan kajian', async () => {
      const mappings = await BahanKajianCplMappingService.getAll(undefined, undefined, prodiId);
      expect(mappings).toEqual([]);
    });
  });

  describe('CplMappingService', () => {
    it('should filter mappings by prodiId correctly', async () => {
      const cpl1 = await CplService.create({
        programStudiId: prodiId,
        kode: 'CPL-001',
        deskripsi: 'CPL Prodi 1',
        urutan: 1,
      });

      const cpl2 = await CplService.create({
        programStudiId: prodiId2,
        kode: 'CPL-001',
        deskripsi: 'CPL Prodi 2',
        urutan: 1,
      });

      const pl1 = await ProfilLulusanService.create({
        programStudiId: prodiId,
        kode: 'PL-001',
        deskripsi: 'Profil Lulusan Prodi 1',
        urutan: 1,
      });

      const pl2 = await ProfilLulusanService.create({
        programStudiId: prodiId2,
        kode: 'PL-001',
        deskripsi: 'Profil Lulusan Prodi 2',
        urutan: 1,
      });

      await CplMappingService.create({ cplId: cpl1.id, profilLulusanId: pl1.id, bobot: 50 });
      await CplMappingService.create({ cplId: cpl2.id, profilLulusanId: pl2.id, bobot: 50 });

      const mappingsProdi1 = await CplMappingService.getAll(prodiId);
      const mappingsProdi2 = await CplMappingService.getAll(prodiId2);

      expect(mappingsProdi1.length).toBe(1);
      expect(mappingsProdi1[0].cplId).toBe(cpl1.id);
      expect(mappingsProdi2.length).toBe(1);
      expect(mappingsProdi2[0].cplId).toBe(cpl2.id);
    });
  });

  describe('VisiMisiService.setAktif', () => {
    it('should set only one visi misi as active per prodi', async () => {
      const vm1 = await VisiMisiService.create({
        programStudiId: prodiId,
        visi: 'Visi 1',
        misi: 'Misi 1',
        tahunBerlaku: '2020',
        isAktif: true,
      });

      const vm2 = await VisiMisiService.create({
        programStudiId: prodiId,
        visi: 'Visi 2',
        misi: 'Misi 2',
        tahunBerlaku: '2024',
        isAktif: false,
      });

      await VisiMisiService.setAktif(vm2.id);

      const aktif = await VisiMisiService.getAktif(prodiId);
      expect(aktif?.id).toBe(vm2.id);
    });
  });

  describe('ObeReportService.getCplCpmkCoverage', () => {
    it('should correctly calculate cpmkCount per CPL', async () => {
      const cpl1 = await CplService.create({
        programStudiId: prodiId,
        kode: 'CPL-001',
        deskripsi: 'CPL 1',
        urutan: 1,
      });

      const cpl2 = await CplService.create({
        programStudiId: prodiId,
        kode: 'CPL-002',
        deskripsi: 'CPL 2',
        urutan: 2,
      });

      const mkResponse = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAuthToken('admin-coverage@test.com', 'admin')}`,
          },
          body: JSON.stringify({
            kode: 'MK-TEST',
            nama: 'Mata Kuliah Test',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        }),
      );
      const mk = (await mkResponse.json()) as { id: number };

      const cpmk1 = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mk.id}/cpmk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAuthToken('admin-coverage@test.com', 'admin')}`,
          },
          body: JSON.stringify({
            kode: 'CPMK-001',
            deskripsi: 'CPMK 1',
          }),
        }),
      );
      const cpmk1Data = (await cpmk1.json()) as { id: number };

      const cpmk2 = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mk.id}/cpmk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAuthToken('admin-coverage@test.com', 'admin')}`,
          },
          body: JSON.stringify({
            kode: 'CPMK-002',
            deskripsi: 'CPMK 2',
          }),
        }),
      );
      const cpmk2Data = (await cpmk2.json()) as { id: number };

      const kurikulumResponse = await app.handle(
        new Request('http://localhost/kurikulum', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAuthToken('admin-coverage@test.com', 'admin')}`,
          },
          body: JSON.stringify({
            kode: 'KUR-TEST',
            nama: 'Kurikulum Test',
            programStudiId: prodiId,
            semesterMulai: '20241',
            jumlahSksLulus: 144,
            jumlahSksWajib: 120,
            jumlahSksPilihan: 24,
          }),
        }),
      );
      const kurikulum = (await kurikulumResponse.json()) as { id: number };

      await app.handle(
        new Request(`http://localhost/kurikulum/${kurikulum.id}/mata-kuliah`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getAuthToken('admin-coverage@test.com', 'admin')}`,
          },
          body: JSON.stringify({
            mataKuliahId: mk.id,
            semester: 1,
            sksMataKuliah: 3,
          }),
        }),
      );

      const { CpmkCplMappingService } = await import('../services/cpmk-cpl-mapping.service');
      await CpmkCplMappingService.create({ cpmkId: cpmk1Data.id, cplId: cpl1.id, bobot: 50 });
      await CpmkCplMappingService.create({ cpmkId: cpmk2Data.id, cplId: cpl1.id, bobot: 50 });

      const coverage = await ObeReportService.getCplCpmkCoverage(kurikulum.id);

      expect(coverage.totalCpl).toBe(2);
      expect(coverage.coveredCpl).toBe(1);
      expect(coverage.uncoveredCpl).toBe(1);

      const cpl1Coverage = coverage.uncovered.find((c: { id: number }) => c.id === cpl2.id);
      expect(cpl1Coverage).toBeDefined();
    });
  });
});
