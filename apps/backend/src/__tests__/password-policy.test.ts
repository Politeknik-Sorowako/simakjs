import { describe, expect, it } from 'bun:test';
import { PASSWORD_MIN_LENGTH, validatePassword } from '../utils/password-policy';

describe('password-policy', () => {
  it('menolak password lebih pendek dari batas minimum', () => {
    expect(validatePassword('A1')).not.toBeNull();
    expect(validatePassword('A'.repeat(PASSWORD_MIN_LENGTH - 1))).not.toBeNull();
  });

  it('menolak password tanpa huruf kapital', () => {
    expect(validatePassword(`password${PASSWORD_MIN_LENGTH}`)).not.toBeNull();
  });

  it('menolak password tanpa angka', () => {
    expect(validatePassword('UPPERCASEONLY')).not.toBeNull();
  });

  it('menerima password valid (min length + kapital + angka)', () => {
    expect(validatePassword('Password123')).toBeNull();
    expect(validatePassword('X'.repeat(PASSWORD_MIN_LENGTH) + '1')).toBeNull();
  });

  it('pesan error menjelaskan aturan kompleksitas', () => {
    const msg = validatePassword('lowercaseonly');
    expect(msg).toContain('huruf kapital dan angka');
  });
});
