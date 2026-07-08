// Phase 1 stub. Real Surepass RERA + Aadhaar/PAN KYC adapter wired in a later plan.
export interface VerificationInput {
  reraId?: string;
  pan?: string;
}

export type VerificationResult = "pending" | "verified" | "rejected";

export async function runVerification(
  input: VerificationInput,
): Promise<VerificationResult> {
  if (input.reraId && input.reraId.trim().length > 0) return "verified";
  return "pending";
}
