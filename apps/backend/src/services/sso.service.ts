export class SsoService {
  static getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.trim() === '' || clientId.includes('dummy-client-id')) {
      throw new Error('Google OAuth Client ID belum dikonfigurasi pada server (GOOGLE_CLIENT_ID).');
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';
    const scope = encodeURIComponent('openid email profile');
    const responseType = 'code';
    const prompt = 'select_account';

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId.trim(),
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&prompt=${prompt}`;
  }
}
