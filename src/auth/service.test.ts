import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb } from "../test/setup.js";
import { db } from "../db/client.js";
import { brokers } from "../db/schema.js";
import { requestOtp, verifyOtp } from "./service.js";
import { verifyToken } from "./token.js";

const PHONE = "9990000001";

function captureLoggedCode(): { get: () => string } {
  let code = "";
  vi.spyOn(console, "log").mockImplementation((msg: string) => {
    const m = String(msg).match(/(\d{6})$/);
    if (m) code = m[1];
  });
  return { get: () => code };
}

describe("auth service", () => {
  beforeEach(async () => {
    await resetDb();
    vi.restoreAllMocks();
  });

  it("issues a verifiable token on correct OTP", async () => {
    const capture = captureLoggedCode();
    await requestOtp(PHONE);
    const token = await verifyOtp(PHONE, capture.get());
    expect(token).not.toBeNull();
    const payload = verifyToken(token as string, process.env.AUTH_SECRET as string);
    expect(payload?.phone).toBe(PHONE);
  });

  it("rejects an incorrect OTP", async () => {
    const capture = captureLoggedCode();
    await requestOtp(PHONE);
    void capture;
    const token = await verifyOtp(PHONE, "000000");
    expect(token).toBeNull();
  });

  it("rejects reuse of an already-consumed OTP", async () => {
    const capture = captureLoggedCode();
    await requestOtp(PHONE);
    const code = capture.get();
    const first = await verifyOtp(PHONE, code);
    expect(first).not.toBeNull();
    const second = await verifyOtp(PHONE, code);
    expect(second).toBeNull();
  });

  it("links token to existing broker by phone", async () => {
    const [broker] = await db
      .insert(brokers)
      .values({ phone: PHONE, name: "Test Broker" })
      .returning();
    const capture = captureLoggedCode();
    await requestOtp(PHONE);
    const token = await verifyOtp(PHONE, capture.get());
    const payload = verifyToken(token as string, process.env.AUTH_SECRET as string);
    expect(payload?.brokerId).toBe(broker.id);
  });
});
