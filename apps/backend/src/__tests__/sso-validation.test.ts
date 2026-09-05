import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { SsoService } from '../services/sso.service';

describe('Google Workspace SSO Fail-Fast Validation (/auth/google/url)', () => {
  const originalEnv = process.env.GOOGLE_CLIENT_ID;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GOOGLE_CLIENT_ID = originalEnv;
    } else {
      delete process.env.GOOGLE_CLIENT_ID;
    }
  });

  it('harus melempar error pada SsoService.getGoogleAuthUrl jika GOOGLE_CLIENT_ID kosong', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(() => SsoService.getGoogleAuthUrl()).toThrow(
      'Google OAuth Client ID belum dikonfigurasi pada server (GOOGLE_CLIENT_ID).',
    );
  });

  it('harus melempar error pada SsoService.getGoogleAuthUrl jika GOOGLE_CLIENT_ID bernilai dummy placeholder', () => {
    process.env.GOOGLE_CLIENT_ID = 'dummy-client-id.apps.googleusercontent.com';
    expect(() => SsoService.getGoogleAuthUrl()).toThrow(
      'Google OAuth Client ID belum dikonfigurasi pada server (GOOGLE_CLIENT_ID).',
    );
  });

  it('harus berhasil mengembalikan Auth URL jika GOOGLE_CLIENT_ID terisi valid', () => {
    process.env.GOOGLE_CLIENT_ID = '123456789-validclientid.apps.googleusercontent.com';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8080/auth/google/callback';

    const url = SsoService.getGoogleAuthUrl();
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=123456789-validclientid.apps.googleusercontent.com');
  });

  it('harus mengembalikan HTTP status 400 dari GET /auth/google/url jika GOOGLE_CLIENT_ID belum diset', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const response = await app.handle(
      new Request('http://localhost/auth/google/url', {
        method: 'GET',
      }),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain('GOOGLE_CLIENT_ID');
  });

  it('harus mengembalikan HTTP status 200 dan URL dari GET /auth/google/url jika GOOGLE_CLIENT_ID valid', async () => {
    process.env.GOOGLE_CLIENT_ID = 'valid-test-client-id';

    const response = await app.handle(
      new Request('http://localhost/auth/google/url', {
        method: 'GET',
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { url: string };
    expect(body.url).toContain('client_id=valid-test-client-id');
  });
});
