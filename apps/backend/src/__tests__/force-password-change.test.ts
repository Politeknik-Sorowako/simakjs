import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Force Password Change Feature', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should allow admin to force password change for a user', async () => {
    const adminToken = await getAuthToken('admin_fpc@test.com', 'admin');
    const userToken = await getAuthToken('user_fpc@test.com', 'mahasiswa');

    // Get user list to get target user ID
    const getUsersRes = await app.handle(
      new Request('http://localhost/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const usersData = (await getUsersRes.json()) as { data: Array<{ id: number; email: string }> };
    const targetUser = usersData.data.find((u) => u.email === 'user_fpc@test.com');
    expect(targetUser).toBeDefined();

    // Admin forces password change
    const forceRes = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}/force-password-change`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mustChangePassword: true }),
      }),
    );

    expect(forceRes.status).toBe(200);
    const forceBody = (await forceRes.json()) as { user: { mustChangePassword: boolean } };
    expect(forceBody.user.mustChangePassword).toBe(true);

    // User logs in and receives mustChangePassword: true
    const loginRes = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user_fpc@test.com', password: 'password123' }),
      }),
    );

    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as { user: { mustChangePassword: boolean } };
    expect(loginBody.user.mustChangePassword).toBe(true);

    // User updates their password
    const updateRes = await app.handle(
      new Request('http://localhost/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'password123',
          password: 'newPassword123!',
        }),
      }),
    );

    expect(updateRes.status).toBe(200);
    const updateBody = (await updateRes.json()) as { user: { mustChangePassword: boolean } };
    expect(updateBody.user.mustChangePassword).toBe(false);
  });

  it('should automatically require password change when admin resets user password', async () => {
    const adminToken = await getAuthToken('admin_reset_fpc@test.com', 'admin');
    await getAuthToken('target_reset@test.com', 'dosen');

    const getUsersRes = await app.handle(
      new Request('http://localhost/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const usersData = (await getUsersRes.json()) as { data: Array<{ id: number; email: string }> };
    const targetUser = usersData.data.find((u) => u.email === 'target_reset@test.com');
    expect(targetUser).toBeDefined();

    const resetRes = await app.handle(
      new Request(`http://localhost/users/${targetUser!.id}/reset-password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: 'tempPassword123!' }),
      }),
    );

    expect(resetRes.status).toBe(200);

    // Login with new temp password
    const loginRes = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'target_reset@test.com', password: 'tempPassword123!' }),
      }),
    );

    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as { user: { mustChangePassword: boolean } };
    expect(loginBody.user.mustChangePassword).toBe(true);
  });
});
