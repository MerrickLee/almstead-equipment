// Runtime-agnostic session helpers (used by both proxy.ts and the Node server).
import { SignJWT, jwtVerify } from "jose";
import { SESSION_DAYS } from "./constants";
import type { SessionUser } from "./types";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set to a long random string.");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, role: user.role, branch: user.branch })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.name !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      name: payload.name,
      role: payload.role as SessionUser["role"],
      branch: (payload.branch as string | null | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
