export interface VerificationInput {
  reraId?: string;
  pan?: string;
}

export type VerificationResult = "pending" | "verified" | "rejected";

export interface VerificationProvider {
  name: string;
  verify(input: VerificationInput): Promise<VerificationResult>;
}

// Default provider: no external calls. A broker with a non-empty RERA id is
// optimistically marked verified; everyone else stays pending for manual review.
export const stubProvider: VerificationProvider = {
  name: "stub",
  async verify(input) {
    if (input.reraId && input.reraId.trim().length > 0) return "verified";
    return "pending";
  },
};

const SUREPASS_RERA_URL =
  "https://kyc-api.surepass.io/api/v1/rera/verification";

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

// Real RERA verification against Surepass. Only reachable when a token is
// configured (see getVerificationProvider). fetchImpl is injectable for tests.
export function createSurepassProvider(
  token: string,
  fetchImpl: FetchFn = fetch,
): VerificationProvider {
  return {
    name: "surepass",
    async verify(input) {
      if (!input.reraId || input.reraId.trim().length === 0) return "pending";
      const res = await fetchImpl(SUREPASS_RERA_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_number: input.reraId }),
      });
      if (!res.ok) return "pending";
      const data = (await res.json()) as { success?: boolean };
      return data.success ? "verified" : "rejected";
    },
  };
}

// Env-gated provider selection. Uses Surepass when SUREPASS_API_TOKEN is set,
// otherwise the zero-dependency stub. Defaults to process.env.
export function getVerificationProvider(
  env: Record<string, string | undefined> = process.env,
): VerificationProvider {
  const token = env.SUREPASS_API_TOKEN;
  if (token && token.trim().length > 0) return createSurepassProvider(token);
  return stubProvider;
}

export async function runVerification(
  input: VerificationInput,
): Promise<VerificationResult> {
  return getVerificationProvider().verify(input);
}
