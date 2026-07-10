export type Txn = "sell" | "buy" | "rent";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type RequestStatus = "pending" | "approved" | "expired";

export interface Broker {
  id: string;
  phone: string;
  name: string;
  agencyName: string | null;
  reraId: string | null;
  pan: string | null;
  verification: VerificationStatus;
  createdAt: string;
}

export interface Listing {
  id: string;
  brokerId: string;
  txn: Txn;
  locality: string;
  pincode: string;
  budget: number;
  specs: string | null;
  closed: string | null;
  createdAt: string;
}

export interface ContactRequestSummary {
  id: string;
  status: RequestStatus;
  slaExpiresAt: string;
}

export interface RequestDetail {
  id: string;
  status: RequestStatus;
  queuePosition: number;
}

export interface IncomingRequest {
  id: string;
  listingId: string;
  requesterId: string;
  status: RequestStatus;
  slaExpiresAt: string;
  createdAt: string;
}

export interface ContactReveal {
  phone: string;
  name: string;
}

export interface ParsedListing {
  txn?: Txn;
  locality?: string;
  pincode?: string;
  budget?: number;
  bhk?: number;
  specs?: string;
}

export interface Requirement {
  id: string;
  brokerId: string;
  txn: Txn;
  locality: string;
  maxBudget: number;
  specs: string | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  createdAt: string;
  listing: Listing;
}

export interface ScoredListing {
  listing: Listing;
  score: number;
}
