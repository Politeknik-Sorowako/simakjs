import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
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
});
