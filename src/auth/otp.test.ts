import { describe, it, expect } from "vitest";
import { generateCode, hashCode, getOtpProvider } from "./otp.js";

describe("otp", () => {
  it("generates a 6-digit numeric code", () => {
    const code = generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("hashes deterministically", () => {
    expect(hashCode("123456")).toBe(hashCode("123456"));
    expect(hashCode("123456")).not.toBe(hashCode("654321"));
  });

  it("getOtpProvider returns a usable provider", async () => {
    const p = getOtpProvider();
    await expect(p.send("9990000000", "123456")).resolves.toBeUndefined();
  });

  it("selects the console provider when SMTP_HOST is unset", () => {
    expect(getOtpProvider({}).name).toBe("console");
  });

  it("selects the email provider when SMTP_HOST is set", () => {
    expect(getOtpProvider({ SMTP_HOST: "smtp.example.com" }).name).toBe("email");
  });
});
