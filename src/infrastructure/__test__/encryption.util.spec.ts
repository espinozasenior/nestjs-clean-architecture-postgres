import {
  createBlindIndex,
  decrypt,
  encrypt,
} from '@infrastructure/utils/encryption.util';

describe('encryption.util', () => {
  it('encrypts and decrypts text roundtrip', () => {
    const input = 'user@example.com';
    const encrypted = encrypt(input);
    expect(encrypted).toContain(':');
    expect(encrypted).not.toBe(input);
    expect(decrypt(encrypted)).toBe(input);
  });

  it('returns original input for malformed encrypted payload shape', () => {
    const plain = 'not-encrypted-value';
    expect(decrypt(plain)).toBe(plain);
  });

  it('returns original input when decryption fails in catch path', () => {
    const invalidCipher = 'zz:zz';
    expect(decrypt(invalidCipher)).toBe(invalidCipher);
  });

  it('creates deterministic blind index for same input', () => {
    const first = createBlindIndex('user@example.com');
    const second = createBlindIndex('user@example.com');
    const third = createBlindIndex('other@example.com');

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });
});
