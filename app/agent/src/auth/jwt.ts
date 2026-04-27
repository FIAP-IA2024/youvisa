import { jwtVerify, SignJWT } from 'jose';

export interface PortalJWTPayload {
  user_id: string;
  /** Issued-at, iso8601 — auto-set by jose */
  iat?: number;
  /** Expires-at, iso8601 — auto-set by jose */
  exp?: number;
}

/**
 * Sign a portal-access token with HS256.
 * The token grants read access to /portal/[token] for the given user.
 */
export async function signPortalJWT(
  payload: { user_id: string },
  secret: string,
  ttlMinutes: number,
): Promise<string> {
  if (secret.length < 32) {
    throw new Error('PORTAL_SECRET must be at least 32 chars (HS256)');
  }
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ user_id: payload.user_id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(key);
}

/**
 * Verify a portal token. Throws if the signature is invalid or the token
 * is expired; otherwise returns the payload.
 */
export async function verifyPortalJWT(
  token: string,
  secret: string,
): Promise<PortalJWTPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
  if (typeof payload.user_id !== 'string') {
    throw new Error('jwt missing user_id claim');
  }
  return payload as PortalJWTPayload;
}
