import type {
  Alert,
  Broker,
  BulkDraft,
  ContactRequestSummary,
  ContactReveal,
  IncomingRequest,
  Listing,
  ParsedListing,
  RequestDetail,
  Requirement,
  ScoredListing,
  Txn,
} from "./types";

const TOKEN_KEY = "broker_network_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth) {
    const token = getToken();
    if (!token) throw new ApiError(401, "not authenticated");
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { ApiError };

export function requestOtp(phone: string, email?: string): Promise<{ ok: boolean }> {
  return apiFetch("/auth/request-otp", { method: "POST", body: { phone, email } });
}

export function verifyOtp(phone: string, code: string): Promise<{ token: string }> {
  return apiFetch("/auth/verify-otp", { method: "POST", body: { phone, code } });
}

export interface CreateBrokerInput {
  phone: string;
  name: string;
  agencyName?: string;
  reraId?: string;
  pan?: string;
  email?: string;
}

export function createBroker(input: CreateBrokerInput): Promise<Broker> {
  return apiFetch("/brokers", { method: "POST", body: input, auth: true });
}

export function getMe(): Promise<Broker> {
  return apiFetch("/brokers/me", { auth: true });
}

export interface SearchListingsParams {
  locality?: string;
  txn?: Txn;
  limit?: number;
  offset?: number;
}

export async function searchListings(
  params: SearchListingsParams,
): Promise<Listing[]> {
  const qs = new URLSearchParams();
  if (params.locality) qs.set("locality", params.locality);
  if (params.txn) qs.set("txn", params.txn);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return apiFetch(`/listings${query ? `?${query}` : ""}`);
}

export function getListing(id: string): Promise<Listing> {
  return apiFetch(`/listings/${id}`);
}

export interface CreateListingInput {
  brokerId: string;
  txn: Txn;
  locality: string;
  pincode: string;
  budget: number;
  specs?: string;
}

export function createListing(input: CreateListingInput): Promise<Listing> {
  return apiFetch("/listings", { method: "POST", body: input, auth: true });
}

export function sendContactRequest(
  listingId: string,
  requesterId: string,
): Promise<ContactRequestSummary> {
  return apiFetch(`/listings/${listingId}/requests`, {
    method: "POST",
    body: { requesterId },
    auth: true,
  });
}

export function getRequestStatus(id: string): Promise<RequestDetail> {
  return apiFetch(`/requests/${id}`);
}

export function approveRequest(id: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/requests/${id}/approve`, { method: "POST", auth: true });
}

export function getContactReveal(id: string): Promise<ContactReveal> {
  return apiFetch(`/requests/${id}/contact`);
}

export function getIncomingRequests(brokerId: string): Promise<IncomingRequest[]> {
  return apiFetch(`/brokers/${brokerId}/incoming-requests`);
}

export function parseListingText(text: string): Promise<ParsedListing> {
  return apiFetch("/listings/parse", { method: "POST", body: { text } });
}

export function parseListingBulk(text: string): Promise<{ drafts: BulkDraft[] }> {
  return apiFetch("/listings/parse-bulk", { method: "POST", body: { text } });
}

export interface CreateRequirementInput {
  brokerId: string;
  txn: Txn;
  locality: string;
  maxBudget: number;
  specs?: string;
}

export function createRequirement(input: CreateRequirementInput): Promise<Requirement> {
  return apiFetch("/requirements", { method: "POST", body: input, auth: true });
}

export function getAlerts(brokerId: string): Promise<Alert[]> {
  return apiFetch(`/brokers/${brokerId}/alerts`);
}

export function getSmartMatch(requirementId: string): Promise<ScoredListing[]> {
  return apiFetch(`/requirements/${requirementId}/smart-match`);
}
