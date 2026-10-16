import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { pengumuman, users } from '../models/schema';
import { PengumumanService } from '../services/pengumuman.service';
import { db } from '../utils/db';
import type { UserPayload } from '../utils/types';

describe('Pengumuman Service & API Lifecycle', () => {
  let adminUser: UserPayload;
  let testPengumumanId: number | undefined;

  beforeAll(async () => {
    let [adminRow] = await db
      .select({ id: users.id, email: users.email, nama: users.nama })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (!adminRow) {
      const [newAdmin] = await db
        .insert(users)
        .values({
          email: 'admin-pengumuman-test@simak.ac.id',
          password: 'hashed-password-test',
          nama: 'Admin Pengumuman Test',
          role: 'super_admin',
          isActive: true,
        })
        .returning({ id: users.id, email: users.email, nama: users.nama });
      adminRow = newAdmin;
    }

    adminUser = {
      id: adminRow.id,
      email: adminRow.email,
      nama: adminRow.nama,
      role: 'super_admin',
      roles: ['super_admin'],
    };
  });

  afterAll(async () => {
    if (testPengumumanId) {
      await db.delete(pengumuman).where(eq(pengumuman.id, testPengumumanId));
    }
  });

  it('1. dapat menyimpan draft pengumuman secara berkala (Auto-Save)', async () => {
    const draftRes = await PengumumanService.saveDraft(adminUser, {
      judul: 'Draf Pengumuman Libur Akademik',
      konten: '# Libur Semester\n\nSeluruh aktivitas perkuliahan diliburkan mulai **20 Oktober**.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      thumbnailUrl: 'https://minio.simak.ac.id/attachments/sample-thumb.png',
      lampiran: [
        {
          tipe: 'link',
          nama: 'Pedoman Akademik',
          url: 'https://politekniksorowako.ac.id/pedoman',
        },
      ],
    });

    expect(draftRes.id).toBeDefined();
    testPengumumanId = draftRes.id;
    expect(draftRes.lastAutoSavedAt).toBeDefined();

    const detail = await PengumumanService.getDetail(testPengumumanId!, adminUser);
    expect(detail.status).toBe('draft');
    expect(detail.judul).toBe('Draf Pengumuman Libur Akademik');
    expect(detail.thumbnailUrl).toBe('https://minio.simak.ac.id/attachments/sample-thumb.png');
    expect(detail.lampiran.length).toBe(1);

    // Pengumuman draft tidak boleh tampil di feed pembaca
    const feed = await PengumumanService.getFeed(adminUser, { search: 'Libur Semester' });
    const foundInFeed = feed.data.find((p) => p.id === testPengumumanId);
    expect(foundInFeed).toBeUndefined();
  });

  it('2. dapat menjadwalkan rilis pengumuman di masa depan (Scheduled Release)', async () => {
    expect(testPengumumanId).toBeDefined();
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Besok

    const scheduleRes = await PengumumanService.publish(adminUser, {
      id: testPengumumanId,
      judul: 'Pengumuman Terjadwal Besok',
      konten: 'Isi pengumuman yang akan live besok.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      publishMode: 'scheduled',
      scheduledPublishAt: futureDate.toISOString(),
    });

    expect(scheduleRes.status).toBe('scheduled');

    const detail = await PengumumanService.getDetail(testPengumumanId!, adminUser);
    expect(detail.status).toBe('scheduled');

    // Pengumuman scheduled di masa depan TIDAK boleh tampil di feed publik
    const feed = await PengumumanService.getFeed(adminUser, { search: 'Terjadwal Besok' });
    const foundInFeed = feed.data.find((p) => p.id === testPengumumanId);
    expect(foundInFeed).toBeUndefined();
  });

  it('3. dapat mempublikasikan pengumuman sekarang (Live)', async () => {
    expect(testPengumumanId).toBeDefined();

    const publishRes = await PengumumanService.publish(adminUser, {
      id: testPengumumanId,
      judul: 'Pengumuman Live Sekarang',
      konten: 'Pengumuman penting yang sudah tayang.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      publishMode: 'now',
    });

    expect(publishRes.status).toBe('published');

    // Sekarang harus muncul di feed pembaca
    const feed = await PengumumanService.getFeed(adminUser, { search: 'Live Sekarang' });
    const foundInFeed = feed.data.find((p) => p.id === testPengumumanId);
    expect(foundInFeed).toBeDefined();
    expect(foundInFeed?.judul).toBe('Pengumuman Live Sekarang');
  });

  it('4. dapat menarik / membatalkan pengumuman yang sedang tayang (Withdraw)', async () => {
    expect(testPengumumanId).toBeDefined();

    const withdrawRes = await PengumumanService.withdraw(
      testPengumumanId!,
      adminUser,
      'Revisi tanggal kegiatan mendadak',
    );

    expect(withdrawRes.status).toBe('withdrawn');
    expect(withdrawRes.withdrawnAt).toBeDefined();

    // Begitu ditarik, pengumuman seketika lenyap dari feed
    const feed = await PengumumanService.getFeed(adminUser, { search: 'Live Sekarang' });
    const foundInFeed = feed.data.find((p) => p.id === testPengumumanId);
    expect(foundInFeed).toBeUndefined();

    // Namun tetap terlihat di tab kelola
    const manageList = await PengumumanService.getManageList(adminUser, { status: 'withdrawn' });
    const foundInManage = manageList.data.find((p) => p.id === testPengumumanId);
    expect(foundInManage).toBeDefined();
    expect(foundInManage?.status).toBe('withdrawn');
    expect(foundInManage?.withdrawnReason).toBe('Revisi tanggal kegiatan mendadak');
  });

  it('5. pengumuman scheduled otomatis tayang di feed saat waktu publishedAt telah lewat', async () => {
    const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 menit yang lalu
    const [pRow] = await db
      .insert(pengumuman)
      .values({
        judul: 'Pengumuman Jadwal Masa Lalu',
        konten: 'Isi pengumuman yang dijadwalkan dan sudah lewat waktunya.',
        authorId: adminUser.id,
        authorRole: 'super_admin',
        status: 'scheduled',
        targetRole: 'semua',
        targetProdiType: 'semua',
        targetScopeType: 'umum',
        publishedAt: pastDate,
      })
      .returning({ id: pengumuman.id });

    try {
      const feed = await PengumumanService.getFeed(adminUser, { search: 'Jadwal Masa Lalu' });
      const item = feed.data.find((p) => p.id === pRow.id);
      expect(item).toBeDefined();
      expect(item?.judul).toBe('Pengumuman Jadwal Masa Lalu');
    } finally {
      await db.delete(pengumuman).where(eq(pengumuman.id, pRow.id));
    }
  });

  it('6. getDetail membatasi akses pengumuman draft / bukan hak pembaca', async () => {
    // 1. Buat draf oleh admin
    const draft = await PengumumanService.saveDraft(adminUser, {
      judul: 'Draf Rahasia Internal',
      konten: 'Hanya boleh dilihat pembuat.',
    });

    const otherUser: UserPayload = {
      id: 999999,
      email: 'mahasiswa-luar@simak.ac.id',
      nama: 'Mahasiswa Luar',
      role: 'mahasiswa',
      roles: ['mahasiswa'],
    };

    // User lain yang mengakses draf harus ditolak
    await expect(PengumumanService.getDetail(draft.id!, otherUser)).rejects.toThrow();

    // Pembuat (admin) tetap boleh mengakses
    const detailOwner = await PengumumanService.getDetail(draft.id!, adminUser);
    expect(detailOwner.id).toBe(draft.id);

    await db.delete(pengumuman).where(eq(pengumuman.id, draft.id!));
  });

  it('7. getManageList menolak query status yang tidak valid', async () => {
    await expect(PengumumanService.getManageList(adminUser, { status: 'invalid_status_xyz' })).rejects.toThrow(
      /Status tidak valid/,
    );
  });

  it('8. pengumuman yang melewati expiresAt otomatis tidak muncul di feed audiens', async () => {
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString(); // 1 menit yang lalu
    const published = await PengumumanService.publish(adminUser, {
      judul: 'Pengumuman Sudah Kadaluarsa',
      konten: 'Isi pengumuman yang sudah expired.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      publishMode: 'now',
      expiresAt: pastExpiry,
    });

    const feed = await PengumumanService.getFeed(adminUser, { limit: 50 });
    const foundInFeed = feed.data.some((p) => p.id === published.id);
    expect(foundInFeed).toBe(false);

    // Namun tetap ada di manage list untuk admin
    const manageList = await PengumumanService.getManageList(adminUser, { limit: 50 });
    const foundInManage = manageList.data.some((p) => p.id === published.id);
    expect(foundInManage).toBe(true);

    await db.delete(pengumuman).where(eq(pengumuman.id, published.id));
  });

  it('9. sortBy=publishedAt menaruh draft tanpa tanggal terbit di akhir (NULLS LAST)', async () => {
    const tag = `SORTTEST-${Date.now()}`;
    const draft = await PengumumanService.saveDraft(adminUser, {
      judul: `${tag} Draft Tanpa Terbit`,
      konten: 'Draft tanpa published_at.',
    });
    const published = await PengumumanService.publish(adminUser, {
      judul: `${tag} Sudah Terbit`,
      konten: 'Sudah memiliki published_at.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      publishMode: 'now',
    });

    try {
      const descRes = await PengumumanService.getManageList(adminUser, {
        search: tag,
        sortBy: 'publishedAt',
        sortOrder: 'desc',
        limit: 50,
      });
      const descIds = descRes.data.map((p) => p.id);
      expect(descIds).toHaveLength(2);
      expect(descIds[0]).toBe(published.id);
      expect(descIds[descIds.length - 1]).toBe(draft.id);

      const ascRes = await PengumumanService.getManageList(adminUser, {
        search: tag,
        sortBy: 'publishedAt',
        sortOrder: 'asc',
        limit: 50,
      });
      const ascIds = ascRes.data.map((p) => p.id);
      expect(ascIds[0]).toBe(published.id);
      expect(ascIds[ascIds.length - 1]).toBe(draft.id);
    } finally {
      await db.delete(pengumuman).where(eq(pengumuman.id, draft.id!));
      await db.delete(pengumuman).where(eq(pengumuman.id, published.id));
    }
  });

  it('10. endpoint storage pengumuman menolak path traversal dan berkas non-eksis', async () => {
    // Path traversal attempt
    const resTraversal = await app.handle(new Request('http://localhost/storage/pengumuman/..%2F..%2Fpackage.json'));
    expect(resTraversal.status).toBe(404);

    // Non-existent file
    const resNonExistent = await app.handle(new Request('http://localhost/storage/pengumuman/file-tidak-ada.jpg'));
    expect(resNonExistent.status).toBe(404);
  });

  it('11. endpoint storage pengumuman dapat diakses publik tanpa token & menyajikan header cache', async () => {
    const storageDir = join(process.cwd(), 'storage', 'pengumuman');
    await mkdir(storageDir, { recursive: true });
    const testFileName = `test-img-${Date.now()}.png`;
    const testFilePath = join(storageDir, testFileName);
    await writeFile(testFilePath, Buffer.from('fake-png-binary-content'));

    try {
      // 1. Direct /storage/pengumuman/:filename
      const res = await app.handle(new Request(`http://localhost/storage/pengumuman/${testFileName}`));
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('public');
      expect(res.headers.get('Content-Type')).toContain('image');

      // 2. Alias /api/storage/pengumuman/:filename
      const resApi = await app.handle(new Request(`http://localhost/api/storage/pengumuman/${testFileName}`));
      expect(resApi.status).toBe(200);
      expect(resApi.headers.get('Cache-Control')).toContain('public');
    } finally {
      await unlink(testFilePath).catch(() => {});
    }
  });
});
