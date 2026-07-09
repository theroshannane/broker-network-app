import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "./token.js";

export interface AuthedRequest extends Request {
  auth?: TokenPayload;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("AUTH_SECRET not configured");
  }
  return secret;
}

// Requires a valid `Authorization: Bearer <token>` header. On success attaches
// the decoded payload to req.auth. Responds 401 otherwise.
// Generic over route param/body/query types so it stays compatible with any
// route's inferred literal param type (e.g. { id: string } for "/foo/:id").
export function requireAuth<P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown>(
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  const token = header.slice("Bearer ".length);
  const payload = verifyToken(token, getAuthSecret());
  if (!payload) {
    res.status(401).json({ error: "invalid or expired token" });
    return;
  }
  (req as unknown as AuthedRequest).auth = payload;
  next();
}
