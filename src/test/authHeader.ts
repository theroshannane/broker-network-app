import { signToken } from "../auth/token.js";

// Test helper: mints a valid bearer token for protected-route tests.
export function authHeader(phone = "9999999999"): [string, string] {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set for tests");
  return ["Authorization", `Bearer ${signToken({ phone }, secret, 3600)}`];
}
