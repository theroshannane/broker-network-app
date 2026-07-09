import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./token.js";

const secret = "test-secret";

describe("auth token", () => {
  it("signs and verifies a payload round-trip", () => {
    const token = signToken({ brokerId: "b1", phone: "9990000000" }, secret, 3600);
    const payload = verifyToken(token, secret);
    expect(payload?.brokerId).toBe("b1");
    expect(payload?.phone).toBe("9990000000");
  });

  it("rejects a tampered token", () => {
    const token = signToken({ phone: "9990000000" }, secret, 3600);
    const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");
    expect(verifyToken(tampered, secret)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signToken({ phone: "9990000000" }, secret, 3600);
    expect(verifyToken(token, "other-secret")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signToken({ phone: "9990000000" }, secret, -1);
    expect(verifyToken(token, secret)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyToken("not-a-token", secret)).toBeNull();
    expect(verifyToken("", secret)).toBeNull();
  });
});
