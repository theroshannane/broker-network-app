# Broker Network App — Design

Date: 2026-07-08
Status: Validated design (pre-implementation)

## Concept

Peer-to-peer network for real estate brokers. Verified brokers list available
properties (sell / buy / rent) and connect with other brokers to close clients.
Broker-to-broker co-broking, not a consumer property portal.

## Locked Decisions

- Standalone new venture, separate brand.
- Pan-India tech scope; density-first go-to-market (1-2 pilot cities first).
- All three transaction types at launch: sell, buy, rent.
- Verification: RERA registration + Aadhaar/PAN KYC. "Pending" badge until approved.
- Connect flow: request -> approve -> reveal, with auto-expiring SLA queue.
- Discovery: active search + passive saved-requirement alerts.
- Platform: Android-first mobile app + lightweight web (onboarding, admin, SEO pages).
- Launch fully free. Monetization tiers designed but dormant.

## 1. Core Flows

### Broker Onboarding
Signup -> Aadhaar/PAN + RERA ID input -> Surepass RERA API auto-verify ->
verified badge (or "pending" if RERA not found or manual state) -> profile
(agency name, localities served, specialization: residential / commercial / rent).

### Listing Creation
Broker posts property (type: sell/buy/rent, locality, budget, specs, media) ->
tagged to pincode + locality for match precision -> visible in search + pushed
to brokers with matching saved-requirement profiles.

### Discovery
Two paths:
- Active search: filters (locality, type, budget, BHK).
- Passive requirement alerts: broker sets standing requirement profile once,
  gets notified on new matches.

### Connect Flow
Interested broker taps "Request Contact" -> listing owner notified -> approves
(reveals phone/WhatsApp) or ignores -> 24-48h SLA, auto-expires if no action,
next requester in queue unlocked.

### Deal Tracking (lightweight)
Optional "mark as closed" on listing by owner-broker. Feeds analytics
(hot localities, active brokers) without payment enforcement. No escrow or
commission-split in v1.

## 2. AI Features (v1)

### AI Listing Parser (hero feature)
Broker forwards messy WhatsApp text dump or voice note (Hindi/Marathi supported)
-> transcription (voice) -> LLM extracts structured listing (locality, BHK,
budget, type, amenities) -> auto-fills form -> broker confirms before publish
(human-in-loop, never auto-post). Marketing hook: "India's first AI-powered
broker network — just forward, we list."

### AI Smart Match (v1)
Semantic requirement matching beyond exact filters. Broker types free-text
requirement -> embeddings match against listings, ranked by relevance.
Built on embeddings + pgvector.

### Deferred to v2/v3
- AI price/valuation estimate (needs locality comp data).
- Broker trust/reputation score (needs deal-closure history volume).
- Fraud/duplicate listing detection (needs scale).
- AI-generated marketing copy from photos.

## 3. Business Model

Launch fully free. Tiers designed but dormant until network density reached.

### Tiers (dormant, flip on later)
- Free: 3 active listings, 5 contact reveals/mo, basic search. Seeds density.
- Pro (~INR 499-999/mo): unlimited listings + reveals, priority search rank,
  AI parser + Smart Match unlimited, requirement alerts.
- Agency (~INR 2999+/mo): multi-seat teams, shared listing pool, analytics
  dashboard, team lead routing.

### Add-ons (dormant)
- Featured listing boost (top of locality search), pay per listing.
- Verified+ badge (extra KYC), one-time/annual.

### Monetization Triggers
Switch tiers on when: X active brokers/city + Y listings liquidity + proven
reveal-request demand. Then gate AI parser / reveal-cap / featured boost to Pro.

### Deferred: Success Fee (v3)
Commission cut on confirmed closed deals. Requires escrow + commission-split
tool + deal verification. Not viable early — deals close offline, brokers
bypass. Subscription/access is the collectable model.

## 4. Tech Architecture

- Mobile (Android-first): React Native (Expo). iOS later. OTA updates, large
  India dev pool.
- Backend: Node.js API + Postgres. PostGIS for locality/geo-radius matching.
  Redis for request-queue + SLA expiry timers.
- AI layer: LLM API (listing parser) + embeddings + pgvector (Smart Match,
  reuse Postgres, no separate vector DB). Voice -> transcription API
  (Hindi/Marathi) -> LLM parse.
- Verification: Surepass RERA API + Aadhaar/PAN KYC provider.
- Web (lightweight): Next.js — onboarding, admin panel, public SEO listing pages.
- Infra: managed (Railway/Render/Supabase) early, scale later.
- Push: FCM. Payments (dormant): Razorpay.

## 5. Growth / Cold-Start

Marketplace chicken-egg: seed supply side (brokers + listings) first.

- Manual founder-led onboarding of broker associations, city-by-city. Start
  Mumbai/Pune/Bangalore for liquidity despite pan-India tech.
- WhatsApp group harvesting: onboard whole broker groups, AI parser ingests
  existing listing dumps -> instant catalog.
- "Founding broker" badge: early-adopter status + select free-forever perks ->
  referral incentive.
- Demand loop: requirement alerts (retention) + SEO public listing pages
  (organic buyer/tenant traffic).
- Referral engine: broker invites broker, both unlock perk. Network inherently
  viral (brokers already know each other).
- Density-first geo: win one city's broker density -> repeatable playbook ->
  replicate. Thin pan-India = dead app.

## 6. Roadmap

- v1 (MVP): Android app + web onboarding, broker verify (RERA+KYC), listing
  CRUD, search + alerts, request -> reveal + SLA, AI parser, Smart Match.
  All free. 1-2 pilot cities.
- v2: iOS, monetization switch-on (tiers), featured boost, analytics dashboard,
  deal-tracking maturity.
- v3: success-fee + escrow/commission-split, AI valuation, trust score, fraud
  detection, more cities.

## 7. Risks & Mitigations

1. Circumvention (biggest): brokers connect then deal offline, bypass cut.
   -> v1 free (nothing to bypass); later monetize via subscription/access, not
   success-fee. Value = ongoing deal flow.
2. Cold-start / thin liquidity. -> density-first, 1-2 cities, WhatsApp bulk onboard.
3. Fake/unverified brokers. -> RERA+Aadhaar gate, pending badge, verified-only reveal.
4. Fake/duplicate listings. -> dedupe (AI v2), report flow v1, listing expiry.
5. Spam contact requests. -> request->approve control, SLA queue, rate-limit.
6. AI parser errors. -> broker confirms before publish, never auto-post.
7. WhatsApp dependency (Business API cost/policy). -> v1 manual paste/forward
   text, auto-ingest deferred.
8. Free-forever expectation. -> signal paid coming, grandfather founders on
   select perks only.
9. Incumbent competition (Plabro, PropertyPistol Syndicate, BeyondWalls).
   -> sharper AI UX + under-served city density niche.

## Competitive Landscape (reference)

Existing India broker-to-broker / co-broking players: TeamUP Broker Network,
BrokerApp, PropertyPistol Syndicate, BeyondWalls Brokers, Plabro. Space is not
empty — differentiation must be sharp (AI UX, city density, trust-gating).

RERA verification is technically solvable via Surepass RERA verification API
(feed RERA ID, get registration/compliance data) — no manual state-portal scraping.
