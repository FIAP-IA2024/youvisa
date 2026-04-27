import { describe, expect, it } from 'vitest';
import { signPortalJWT, verifyPortalJWT } from '@/auth/jwt';

const SECRET = 'a'.repeat(32);

describe('portal JWT', () => {
  it('round-trips payload', async () => {
    const token = await signPortalJWT({ user_id: 'u1' }, SECRET, 60);
    const payload = await verifyPortalJWT(token, SECRET);
    expect(payload.user_id).toBe('u1');
    expect(typeof payload.exp).toBe('number');
  });

  it('rejects tampered signature', async () => {
    const token = await signPortalJWT({ user_id: 'u1' }, SECRET, 60);
    // Flip the last char of the signature segment
    const tampered = `${token.slice(0, -1)}${token.at(-1) === 'A' ? 'B' : 'A'}`;
    await expect(verifyPortalJWT(tampered, SECRET)).rejects.toThrow();
  });

  it('rejects token signed with a different secret', async () => {
    const token = await signPortalJWT({ user_id: 'u1' }, SECRET, 60);
    const otherSecret = 'b'.repeat(32);
    await expect(verifyPortalJWT(token, otherSecret)).rejects.toThrow();
  });

  it('rejects expired token', async () => {
    // Issue a token that expired 1 minute ago
    const token = await signPortalJWT({ user_id: 'u1' }, SECRET, -1);
    await expect(verifyPortalJWT(token, SECRET)).rejects.toThrow();
  });

  it('refuses to sign with a too-short secret', async () => {
    await expect(
      signPortalJWT({ user_id: 'u1' }, 'short', 60),
    ).rejects.toThrow(/at least 32 chars/);
  });

  it('rejects malformed token', async () => {
    await expect(verifyPortalJWT('not.a.token', SECRET)).rejects.toThrow();
    await expect(verifyPortalJWT('garbage', SECRET)).rejects.toThrow();
  });
});
