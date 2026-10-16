import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { inArray } from 'drizzle-orm';
import { app } from '../app';
import { userRoles, users } from '../models/schema';
import { db } from '../utils/db';
import { getAuthToken } from './test-helper';

interface UserListRow {
  id: number;
  email: string;
  nama: string;
  role: string;
  isActive: boolean;
  roles: string[];
}

interface UserListResponse {
  data: UserListRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

describe('User List API — filter role/status, search, dan sort server-side', () => {
  const ALPHA_EMAIL = 'userlist-alpha@simak.ac.id';
  const BETA_EMAIL = 'userlist-beta@simak.ac.id';
  const GAMMA_EMAIL = 'userlist-gamma@simak.ac.id';
  const SEED_EMAILS = [ALPHA_EMAIL, BETA_EMAIL, GAMMA_EMAIL];
  let token = '';
  let gammaId = 0;

  async function fetchUsers(params: string): Promise<UserListResponse> {
    const res = await app.handle(
      new Request(`http://localhost/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    expect(res.status).toBe(200);
    return (await res.json()) as UserListResponse;
  }

  beforeAll(async () => {
    token = await getAuthToken('admin-userlist-test@simak.ac.id', 'super_admin');

    const existing = await db.select({ id: users.id }).from(users).where(inArray(users.email, SEED_EMAILS));
    if (existing.length > 0) {
      const ids = existing.map((r) => r.id);
      await db.delete(userRoles).where(inArray(userRoles.userId, ids));
      await db.delete(users).where(inArray(users.id, ids));
    }

    await db.insert(users).values([
      {
        email: ALPHA_EMAIL,
        password: 'hashed-password-test',
        nama: 'Zeta Alpha Userlist',
        role: 'mahasiswa',
        isActive: true,
      },
      {
        email: BETA_EMAIL,
        password: 'hashed-password-test',
        nama: 'Alpha Beta Userlist',
        role: 'dosen',
        isActive: false,
      },
    ]);
    const [gamma] = await db
      .insert(users)
      .values({
        email: GAMMA_EMAIL,
        password: 'hashed-password-test',
        nama: 'Mid Gamma Userlist',
        role: 'dosen',
        isActive: true,
      })
      .returning({ id: users.id });

    gammaId = gamma.id;
    await db.insert(userRoles).values([{ userId: gammaId, role: 'kaprodi' }]);
  });

  afterAll(async () => {
    const ids = (await db.select({ id: users.id }).from(users).where(inArray(users.email, SEED_EMAILS))).map(
      (r) => r.id,
    );
    if (ids.length > 0) {
      await db.delete(userRoles).where(inArray(userRoles.userId, ids));
      await db.delete(users).where(inArray(users.id, ids));
    }
  });

  it('1. search menyaring nama/email dan sortBy=desc urut server-side', async () => {
    const res = await fetchUsers('search=userlist-&sortBy=nama&sortOrder=desc&limit=50');
    const found = res.data.filter((u) => SEED_EMAILS.includes(u.email));
    expect(found.map((u) => u.email)).toEqual([ALPHA_EMAIL, GAMMA_EMAIL, BETA_EMAIL]);
    expect(res.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('2. filterStatus=inactive hanya mengembalikan akun non-aktif', async () => {
    const res = await fetchUsers('search=userlist-&filterStatus=inactive&limit=50');
    const emails = res.data.map((u) => u.email);
    expect(emails).toContain(BETA_EMAIL);
    expect(emails).not.toContain(ALPHA_EMAIL);
    expect(emails).not.toContain(GAMMA_EMAIL);
    expect(res.data.every((u) => u.isActive === false)).toBe(true);
  });

  it('3. filterStatus=active hanya mengembalikan akun aktif', async () => {
    const res = await fetchUsers('search=userlist-&filterStatus=active&limit=50');
    const emails = res.data.map((u) => u.email);
    expect(emails).toContain(ALPHA_EMAIL);
    expect(emails).toContain(GAMMA_EMAIL);
    expect(emails).not.toContain(BETA_EMAIL);
    expect(res.data.every((u) => u.isActive === true)).toBe(true);
  });

  it('4. filterRole cocok via role utama maupun userRoles (EXISTS)', async () => {
    const dosenRes = await fetchUsers('search=userlist-&filterRole=dosen&limit=50');
    const dosenEmails = dosenRes.data.map((u) => u.email);
    expect(dosenEmails).toContain(BETA_EMAIL);
    expect(dosenEmails).toContain(GAMMA_EMAIL);
    expect(dosenEmails).not.toContain(ALPHA_EMAIL);

    const kaprodiRes = await fetchUsers('search=userlist-&filterRole=kaprodi&limit=50');
    const kaprodiEmails = kaprodiRes.data.map((u) => u.email);
    expect(kaprodiEmails).toEqual([GAMMA_EMAIL]);
    const gammaRow = kaprodiRes.data.find((u) => u.email === GAMMA_EMAIL);
    expect(gammaRow?.roles).toContain('kaprodi');
  });

  it('5. filterRole tidak valid diabaikan tanpa error SQL', async () => {
    const res = await fetchUsers('search=userlist-&filterRole=bukan-role-valid&limit=50');
    expect(res.data.map((u) => u.email)).toEqual(expect.arrayContaining([ALPHA_EMAIL, BETA_EMAIL, GAMMA_EMAIL]));
  });

  it('6. sortBy tidak valid jatuh fallback ke nama tanpa error', async () => {
    const res = await fetchUsers('search=userlist-&sortBy=kolom_tidak_ada&sortOrder=asc&limit=50');
    const found = res.data.filter((u) => SEED_EMAILS.includes(u.email));
    expect(found.map((u) => u.nama)).toEqual(['Alpha Beta Userlist', 'Mid Gamma Userlist', 'Zeta Alpha Userlist']);
  });

  it('7. search mencocokkan role via cast ::text', async () => {
    const res = await fetchUsers('search=userlist-alpha&limit=50');
    const found = res.data.find((u) => u.email === ALPHA_EMAIL);
    expect(found).toBeDefined();
    expect(found?.role).toBe('mahasiswa');
    const roleRes = await fetchUsers('search=kemahasiswaan&limit=50');
    expect(Array.isArray(roleRes.data)).toBe(true);
    expect(roleRes.meta).toHaveProperty('total');
  });

  it('8. sortBy berupa prototype key jatuh fallback ke nama tanpa error', async () => {
    for (const sortBy of ['constructor', 'toString', '__proto__']) {
      const res = await fetchUsers(`search=userlist-&sortBy=${sortBy}&sortOrder=asc&limit=50`);
      const found = res.data.filter((u) => SEED_EMAILS.includes(u.email));
      expect(found.map((u) => u.nama)).toEqual(['Alpha Beta Userlist', 'Mid Gamma Userlist', 'Zeta Alpha Userlist']);
    }
  });

  it('9. search juga menjangkau role tambahan (user_roles)', async () => {
    const exact = await fetchUsers('search=kaprodi&limit=50');
    expect(exact.data.map((u) => u.email)).toContain(GAMMA_EMAIL);

    const partial = await fetchUsers('search=kapr&limit=50');
    expect(partial.data.map((u) => u.email)).toContain(GAMMA_EMAIL);

    const gammaRow = partial.data.find((u) => u.email === GAMMA_EMAIL);
    expect(gammaRow?.role).toBe('dosen');
    expect(gammaRow?.roles).toContain('kaprodi');
  });
});
