import { describe, it, expect } from "vitest";
import {
  stubProvider,
  createSurepassProvider,
  getVerificationProvider,
} from "./verification.js";

describe("verification providers", () => {
  it("stub verifies when RERA id present, pending otherwise", async () => {
    expect(await stubProvider.verify({ reraId: "RERA-MH-1" })).toBe("verified");
    expect(await stubProvider.verify({})).toBe("pending");
  });

  it("getVerificationProvider falls back to stub without a token", () => {
    expect(getVerificationProvider({}).name).toBe("stub");
  });

  it("getVerificationProvider selects surepass when token is set", () => {
    expect(
      getVerificationProvider({ SUREPASS_API_TOKEN: "t" }).name,
    ).toBe("surepass");
  });

  it("surepass verifies on a successful RERA lookup", async () => {
    const fakeFetch = async () =>
      ({ ok: true, json: async () => ({ success: true }) }) as Response;
    const p = createSurepassProvider("token", fakeFetch);
    expect(await p.verify({ reraId: "RERA-MH-1" })).toBe("verified");
  });

  it("surepass rejects when RERA lookup fails", async () => {
    const fakeFetch = async () =>
      ({ ok: true, json: async () => ({ success: false }) }) as Response;
    const p = createSurepassProvider("token", fakeFetch);
    expect(await p.verify({ reraId: "RERA-MH-1" })).toBe("rejected");
  });

  it("surepass stays pending when no RERA id is supplied", async () => {
    const fakeFetch = async () => {
      throw new Error("should not be called");
    };
    const p = createSurepassProvider("token", fakeFetch);
    expect(await p.verify({})).toBe("pending");
  });
});
