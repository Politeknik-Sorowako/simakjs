import { beforeEach, describe, expect, it } from 'bun:test';
import { desc, eq } from 'drizzle-orm';
import { app } from '../app';
import { auditLogs } from '../models/schema';
import { AuditService } from '../services/audit.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Audit Log & Backup System', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('AuditService', () => {
    it('should log system activities correctly', async () => {
      const logEntry = await AuditService.log({
        userId: null,
        userRole: 'system',
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent',
        actionType: 'CREATE',
        module: 'prodi',
        entityId: '1',
        description: 'Test create prodi log',
        metadata: { key: 'value' },
      });

      expect(logEntry).not.toBeNull();
      expect(logEntry?.module).toBe('prodi');
      expect(logEntry?.actionType).toBe('CREATE');
      expect(logEntry?.description).toBe('Test create prodi log');

      const logs = await AuditService.getAll(1, 10, 'prodi');
      expect(logs.data.length).toBe(1);
      expect(logs.meta.total).toBe(1);
    });

    it('should filter audit logs by actionType and search keyword', async () => {
      await AuditService.log({
        actionType: 'UPDATE',
        module: 'mahasiswa',
        description: 'Mengubah data mahasiswa NIM 12345',
      });

      await AuditService.log({
        actionType: 'DELETE',
        module: 'mahasiswa',
        description: 'Menghapus data mahasiswa NIM 67890',
      });

      const updateLogs = await AuditService.getAll(1, 10, undefined, 'UPDATE');
      expect(updateLogs.data.length).toBe(1);
      expect(updateLogs.data[0].actionType).toBe('UPDATE');

      const searchLogs = await AuditService.getAll(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '12345',
      );
      expect(searchLogs.data.length).toBe(1);
      expect(searchLogs.data[0].description).toContain('12345');
    });

    it('should persist user name, table name and detail', async () => {
      const logEntry = await AuditService.log({
        userId: null,
        userName: 'Budi',
        userRole: 'admin',
        actionType: 'CREATE',
        module: 'mahasiswa',
        tableName: 'mahasiswa',
        entityId: '123',
        entityName: 'Budi Santoso (12345)',
        description: '[2026-09-10 14:00:00] Budi (admin) melakukan tambah data pada tabel mahasiswa record id 123.',
        detail: 'Modul mahasiswa url /api/mahasiswa. Entitas yang terdampak: NIM: 12345 Nama: Budi Santoso',
      });

      expect(logEntry).not.toBeNull();
      expect(logEntry?.userName).toBe('Budi');
      expect(logEntry?.tableName).toBe('mahasiswa');
      expect(logEntry?.detail).toContain('Entitas yang terdampak');

      const logs = await AuditService.getAll(1, 10, 'mahasiswa');
      expect(logs.data[0].userName).toBe('Budi');
      expect(logs.data[0].tableName).toBe('mahasiswa');
    });

    it('should filter by tableName and search detail', async () => {
      await AuditService.log({
        actionType: 'UPDATE',
        module: 'mata-kuliah',
        tableName: 'mata_kuliah',
        detail: 'Modul mata-kuliah url /api/mata-kuliah/9. Entitas yang terdampak: Mata Kuliah: Algoritma',
        description: 'Mengubah mata kuliah',
      });

      const byTable = await AuditService.getAll(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'mata_kuliah',
      );
      expect(byTable.data.length).toBe(1);

      const byDetail = await AuditService.getAll(
        1,
        10,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'Algoritma',
      );
      expect(byDetail.data.length).toBe(1);
    });

    it('should export CSV with the required 9-column header', async () => {
      await AuditService.log({
        actionType: 'DELETE',
        module: 'krs',
        tableName: 'krs',
        description: 'Menghapus krs',
      });

      const csv = await AuditService.exportCsv();
      const header = csv.split('\r\n')[0];
      expect(header).toBe('Waktu,User,Role,Aksi,Module,Entitas,Deskripsi,IP,Detail');
    });
  });

  describe('Audit Log API Endpoints', () => {
    it('should reject non-admin users with 403 Forbidden', async () => {
      const token = await getAuthToken('mahasiswa_audit@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/audit-logs', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      expect(response.status).toBe(403);
    });

    it('should allow admin users to retrieve audit logs', async () => {
      const token = await getAuthToken('admin_audit@test.com', 'admin');

      await AuditService.log({
        actionType: 'CREATE',
        module: 'users',
        userName: 'Admin Audit',
        tableName: 'users',
        description: 'Admin created a user',
      });

      const response = await app.handle(
        new Request('http://localhost/audit-logs', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        data: Array<{ module: string; userName?: string | null }>;
        meta: { total: number };
      };
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data.some((row) => row.userName === 'Admin Audit')).toBe(true);
    });

    it('should log a bulk import result with success/failure summary', async () => {
      const token = await getAuthToken('admin_import_audit@test.com', 'admin');

      const csvContent = 'nim,nama,email,programStudiKode\n1234567890,Nama Satu,import1@test.com,PRODI-TIDAK-ADA\n';
      const formData = new FormData();
      formData.append('file', new File([csvContent], 'import.csv', { type: 'text/csv' }));

      const response = await app.handle(
        new Request('http://localhost/mahasiswa/import', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }),
      );

      expect(response.status).toBe(200);
      const result = (await response.json()) as { successCount: number; errors: unknown[] };
      expect(result.successCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);

      // onAfterResponse berjalan asinkron dan tidak di-await oleh app.handle;
      // tunggu/poll sampai baris log tertulis.
      let row: typeof auditLogs.$inferSelect | undefined;
      for (let i = 0; i < 20; i++) {
        [row] = await db
          .select()
          .from(auditLogs)
          .where(eq(auditLogs.module, 'mahasiswa'))
          .orderBy(desc(auditLogs.timestamp))
          .limit(1);
        if (row) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      expect(row).toBeDefined();
      expect(row!.tableName).toBe('mahasiswa');
      expect(row!.description).toContain('tabel mahasiswa');
      expect(row!.description).toContain('0 sukses');
      expect(row!.detail).toContain('Ringkasan');
    });
  });
});
