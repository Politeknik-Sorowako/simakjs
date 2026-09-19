export const PASSWORD_MIN_LENGTH = 8;

/**
 * Error typed khusus untuk validasi password agar bisa dibedakan
 * dari error lain (e.g. unique constraint) di catch block.
 */
export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordValidationError';
  }
}

/**
 * Standar tunggal kebijakan password seluruh sistem (register, reset,
 * admin reset, admisi). Mengembalikan pesan error bila password tidak valid,
 * atau `null` bila valid.
 */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password minimal harus ${PASSWORD_MIN_LENGTH} karakter`;
  }
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password harus mengandung huruf kapital dan angka';
  }
  return null;
}

/**
 * Melempar PasswordValidationError bila password tidak valid.
 * Gunakan di service layer (register, reset) agar caller bisa
 * membedakan via instanceof tanpa string matching.
 */
export function assertValidPassword(password: string): void {
  const error = validatePassword(password);
  if (error) throw new PasswordValidationError(error);
}
