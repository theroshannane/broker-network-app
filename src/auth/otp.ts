import { randomInt, createHash } from "node:crypto";

export interface OtpProvider {
  name: string;
  // `to` is the delivery destination: an email address for the email provider,
  // or a phone number for the console/SMS providers.
  send(to: string, code: string): Promise<void>;
}

// Default provider: logs to console. Used in dev/tests and as a safe fallback
// whenever no email transport is configured.
export const consoleOtpProvider: OtpProvider = {
  name: "console",
  async send(to, code) {
    console.log(`[otp] ${to}: ${code}`);
  },
};

// Env-gated email provider. Delivers the OTP over SMTP via nodemailer. Selected
// by getOtpProvider() whenever SMTP_HOST is set, mirroring the verification and
// parser adapter pattern. nodemailer is imported dynamically so it never loads
// (and is never required) unless email delivery is actually configured.
export function createEmailOtpProvider(
  env: NodeJS.ProcessEnv = process.env,
): OtpProvider {
  const host = env.SMTP_HOST as string;
  const port = Number(env.SMTP_PORT ?? 587);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM ?? user ?? "no-reply@cobroker.in";
  return {
    name: "email",
    async send(to, code) {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      await transport.sendMail({
        from,
        to,
        subject: `Your CoBroker verification code: ${code}`,
        text: `Your CoBroker login code is ${code}. It expires in 5 minutes. If you did not request this, ignore this email.`,
        html: `<p>Your CoBroker login code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 5 minutes. If you did not request this, ignore this email.</p>`,
      });
    },
  };
}

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function getOtpProvider(
  env: NodeJS.ProcessEnv = process.env,
): OtpProvider {
  if (env.SMTP_HOST && env.SMTP_HOST.trim().length > 0) {
    return createEmailOtpProvider(env);
  }
  return consoleOtpProvider;
}
