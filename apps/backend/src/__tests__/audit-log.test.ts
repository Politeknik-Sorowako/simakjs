import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { AuditService } from '../services/audit.service';
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
        description: 'Admin created a user',
      });

      const response = await app.handle(
        new Request('http://localhost/audit-logs', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { data: Array<{ module: string }>; meta: { total: number } };
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
