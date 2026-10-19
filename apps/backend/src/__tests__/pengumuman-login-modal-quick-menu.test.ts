import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { UserController } from '../controllers/user.controller';
import { pengumuman, pengumumanDibaca, users } from '../models/schema';
import { PengumumanService } from '../services/pengumuman.service';
import { db } from '../utils/db';
import type { AuthContext, UserPayload } from '../utils/types';

describe('Fitur Pengumuman Pop-up Login & Quick Menu Dashboard', () => {
  let testUser: UserPayload;
  let testPengumumanId: number | undefined;
  let testNormalPengumumanId: number | undefined;

  beforeAll(async () => {
    let [userRow] = await db
      .select({ id: users.id, email: users.email, nama: users.nama })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (!userRow) {
      const [newAdmin] = await db
        .insert(users)
        .values({
          email: 'admin-modal-test@simak.ac.id',
          password: 'hashed-password-test',
          nama: 'Admin Modal Test',
          role: 'super_admin',
          isActive: true,
        })
        .returning({ id: users.id, email: users.email, nama: users.nama });
      userRow = newAdmin;
    }

    testUser = {
      id: userRow.id,
      email: userRow.email,
      nama: userRow.nama,
      role: 'super_admin',
      roles: ['super_admin'],
    };
  });

  afterAll(async () => {
    if (testPengumumanId) {
      await db.delete(pengumumanDibaca).where(eq(pengumumanDibaca.pengumumanId, testPengumumanId));
      await db.delete(pengumuman).where(eq(pengumuman.id, testPengumumanId));
    }
    if (testNormalPengumumanId) {
      await db.delete(pengumumanDibaca).where(eq(pengumumanDibaca.pengumumanId, testNormalPengumumanId));
      await db.delete(pengumuman).where(eq(pengumuman.id, testNormalPengumumanId));
    }
  });

  it('1. dapat mempublikasikan pengumuman dengan opsi showModalOnLogin: true', async () => {
    const res = await PengumumanService.publish(testUser, {
      judul: 'Pemberitahuan Wajib Registrasi Ulang',
      konten: 'Harap seluruh mahasiswa melakukan registrasi ulang semester genap.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      showModalOnLogin: true,
      publishMode: 'now',
    });

    testPengumumanId = res.id;
    expect(res.id).toBeDefined();

    const [row] = await db.select().from(pengumuman).where(eq(pengumuman.id, res.id)).limit(1);
    expect(row).toBeDefined();
    expect(row.showModalOnLogin).toBe(true);
    expect(row.status).toBe('published');
  });

  it('2. getLoginPopups mengembalikan pengumuman yang mengaktifkan showModalOnLogin selama batas aktif', async () => {
    // Buat pengumuman biasa tanpa modal login
    const normalRes = await PengumumanService.publish(testUser, {
      judul: 'Pengumuman Biasa Tanpa Modal',
      konten: 'Ini pengumuman biasa yang tidak berstatus pop-up modal login.',
      targetRole: 'semua',
      targetProdiType: 'semua',
      targetScopeType: 'umum',
      showModalOnLogin: false,
      publishMode: 'now',
    });
    testNormalPengumumanId = normalRes.id;

    const popups = await PengumumanService.getLoginPopups(testUser);
    expect(Array.isArray(popups)).toBe(true);

    const popupIds = popups.map((p) => p.id);
    expect(popupIds).toContain(testPengumumanId!);
    expect(popupIds).not.toContain(testNormalPengumumanId!);
  });

  it('3. markAsRead mencatat riwayat dibaca namun getLoginPopups tetap menampilkan pengumuman selama batas aktifnya belum lewat', async () => {
    if (!testPengumumanId) return;

    await PengumumanService.markAsRead(testPengumumanId, testUser.id);

    const popupsAfter = await PengumumanService.getLoginPopups(testUser);
    const targetPopup = popupsAfter.find((p) => p.id === testPengumumanId);
    expect(targetPopup).toBeDefined();
    expect(targetPopup?.isRead).toBe(true);
  });

  it('4. updateQuickMenu menyimpan preferensi menu cepat hingga 6 item', async () => {
    const mockCtx = {
      body: { quickMenu: ['krs', 'khs', 'bimbingan', 'pengumuman'] },
      set: { status: 200 },
      getCurrentUser: async () => testUser,
    } as unknown as AuthContext;

    const res = await UserController.updateQuickMenu(mockCtx);
    expect(res.quickMenu).toEqual(['krs', 'khs', 'bimbingan', 'pengumuman']);

    const getRes = await UserController.getQuickMenu(mockCtx);
    expect(getRes.quickMenu).toEqual(['krs', 'khs', 'bimbingan', 'pengumuman']);
  });

  it('5. updateQuickMenu menolak jika item melebihi 6 demi menjaga estetika', async () => {
    const mockCtx = {
      body: { quickMenu: ['1', '2', '3', '4', '5', '6', '7'] },
      set: { status: 200 },
      getCurrentUser: async () => testUser,
    } as unknown as AuthContext;

    const res = await UserController.updateQuickMenu(mockCtx);
    expect(mockCtx.set.status).toBe(400);
    expect(res.error).toContain('maksimal 6 item');
  });
});
