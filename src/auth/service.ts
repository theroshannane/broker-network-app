import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { brokers, otpChallenges } from "../db/schema.js";
import { generateCode, getOtpProvider, hashCode } from "./otp.js";
import { signToken } from "./token.js";

const OTP_TTL_SECONDS = 5 * 60;
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("AUTH_SECRET not configured");
  }
  return secret;
}

export async function requestOtp(phone: string): Promise<void> {
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  await db.insert(otpChallenges).values({ phone, codeHash, expiresAt });
  await getOtpProvider().send(phone, code);
}

// Verifies an OTP for phone. On success, consumes the challenge and returns a
// signed auth token. Links to an existing broker by phone if one exists;
// otherwise the token carries phone only (broker record created on POST /brokers).
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<string | null> {
  const now = new Date();
  const [challenge] = await db
    .select()
    .from(otpChallenges)
    .where(
      and(
        eq(otpChallenges.phone, phone),
        eq(otpChallenges.codeHash, hashCode(code)),
        isNull(otpChallenges.consumedAt),
        gt(otpChallenges.expiresAt, now),
      ),
    )
    .orderBy(desc(otpChallenges.createdAt))
    .limit(1);
  if (!challenge) return null;

  await db
    .update(otpChallenges)
    .set({ consumedAt: now })
    .where(eq(otpChallenges.id, challenge.id));

  const [broker] = await db.select().from(brokers).where(eq(brokers.phone, phone));
  return signToken({ brokerId: broker?.id, phone }, getAuthSecret(), TOKEN_TTL_SECONDS);
}
