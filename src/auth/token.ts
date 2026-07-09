import { createHmac, timingSafeEqual } from "node:crypto";

export interface TokenPayload {
  brokerId?: string;
  phone: string;
  exp?: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

// Compact HMAC-SHA256 token (JWT-like, no external dep). ttlSeconds sets expiry.
export function signToken(
  payload: Omit<TokenPayload, "exp">,
  secret: string,
  ttlSeconds: number,
): string {
  const body: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const data = b64url(JSON.stringify(body));
  return `${data}.${sign(data, secret)}`;
}

export function verifyToken(token: string, secret: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = sign(data, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
