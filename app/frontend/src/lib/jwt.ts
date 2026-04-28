import { jwtVerify } from "jose";

export interface PortalTokenPayload {
  user_id: string;
  iat?: number;
  exp?: number;
}

const PORTAL_SECRET = process.env.PORTAL_SECRET;

export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  if (!PORTAL_SECRET || PORTAL_SECRET.length < 32) {
    console.error("PORTAL_SECRET is not set or too short on the frontend env");
    return null;
  }
  try {
    const key = new TextEncoder().encode(PORTAL_SECRET);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.user_id !== "string") return null;
    // jose's JWTPayload index type doesn't structurally overlap with
    // ours, but we just asserted the load-bearing field above.
    return payload as unknown as PortalTokenPayload;
  } catch (err) {
    console.warn("portal token verify failed:", (err as Error).message);
    return null;
  }
}
