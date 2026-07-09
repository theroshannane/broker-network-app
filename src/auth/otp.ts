import { randomInt, createHash } from "node:crypto";

export interface OtpProvider {
  name: string;
  send(phone: string, code: string): Promise<void>;
}

// Default provider: logs to console. Real SMS (Twilio/MSG91) is an env-gated
// follow-on that would slot in behind getOtpProvider() the same way the
// verification and parser adapters do.
export const consoleOtpProvider: OtpProvider = {
  name: "console",
  async send(phone, code) {
    console.log(`[otp] ${phone}: ${code}`);
  },
};

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function getOtpProvider(): OtpProvider {
  return consoleOtpProvider;
}
