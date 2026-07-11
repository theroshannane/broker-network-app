# CoBroker — Google Play Listing Kit

Everything needed to fill the Play Console listing. Package: `in.cobroker.app`.

## Store listing text

**App name** (max 30 chars)
```
CoBroker: Broker Network
```

**Short description** (max 80 chars)
```
Verified broker-to-broker network. Share inventory, co-broke, close together.
```

**Full description** (max 4000 chars)
```
CoBroker is a verified broker-to-broker co-broking network for real estate
professionals across India. Share your inventory and requirements, find the
right counter-broker, and close deals together.

WHY COBROKER
• Verified network — brokers add agency, RERA ID and PAN to build trust.
• Co-broke faster — post sell, buy and rent inventory in seconds.
• Smart matching — your requirements are auto-matched to fresh listings.
• Request → approve → connect — contact details are shared only after both
  sides agree, so your relationships stay protected.
• Built for density — designed for active markets like Mumbai, Pune and
  Bangalore first.

HOW IT WORKS
1. Sign in with your phone number (OTP).
2. Create your broker profile.
3. Post listings and requirements.
4. Get matched, request contact, and connect once approved.

Launching free. No listing fees, no lead charges.

CoBroker is a professional networking tool for licensed real estate brokers.
```

**Category:** Business (alt: House & Home)
**Tags:** real estate, brokers, co-broking, property, networking
**Contact email:** support@cobroker.in
**Privacy policy URL:** https://cobroker.beingrealestate.com/privacy.html
  (live, HTTP 200; paste this into Play Console → App content → Privacy policy)

## Data safety form (Play Console → App content → Data safety)

Declare exactly this (matches what the app actually collects):

| Data type | Collected | Shared | Purpose | Optional? |
|-----------|-----------|--------|---------|-----------|
| Phone number | Yes | No | Account management, app functionality (OTP auth) | Required |
| Name | Yes | No | App functionality (broker profile) | Required |
| Other info (agency, RERA ID, PAN) | Yes | No | App functionality, trust/verification | Optional |
| User-generated content (listings, requirements) | Yes | Yes* | App functionality | Required |

*Listings/requirements are shown to other brokers on the network by design;
contact details are revealed only after mutual approval.

- Encrypted in transit: Yes (HTTPS).
- Users can request data deletion: Yes (via support email; see privacy policy).
- No location, contacts, photos, financial data, or ad identifiers collected.
- No third-party advertising / analytics SDKs.

## Content rating

Run the IARC questionnaire. Expected outcome: **Everyone / 3+**.
- No violence, sexual, gambling, or user-to-user unmoderated messaging beyond
  broker contact exchange. Answer honestly; contact reveal after approval is not
  open chat.

## Graphic assets required

Produce and upload:

| Asset | Spec | Notes |
|-------|------|-------|
| App icon | 512×512 PNG, 32-bit | Derive from mobile/assets/icon.png |
| Feature graphic | 1024×500 PNG/JPG | Required. Brand + tagline. |
| Phone screenshots | 2–8 images, min 320px side, 16:9 or 9:16 | See capture list below |
| (Optional) 7" / 10" tablet shots | — | Skip for phone-only launch |

### Screenshots to capture (from the running app)
Capture these screens (dev client or Expo Go, 1080×1920 recommended):
1. Listings feed (app/listings/index.tsx)
2. Listing detail with request-contact (app/listings/[id].tsx)
3. New listing form (app/listings/new.tsx)
4. Requirements / smart-match (app/requirements/new.tsx)
5. Incoming requests (app/requests/incoming.tsx)
6. Sign in (app/login.tsx)

Tip: add a short caption band to each (e.g. "Post inventory in seconds").

## Release track

- First upload: **Internal testing** track → verify install → promote to
  **Closed** (pilot city brokers) → **Production**.
- Build the AAB: `eas build -p android --profile production`
- Submit: `eas submit -p android --latest` (needs a Play service-account JSON
  key configured in Play Console → API access).

## Pre-launch checklist

- [ ] Play Console developer account ($25 one-time) created
- [ ] Privacy policy deployed to a public HTTPS URL
- [ ] Data safety form completed (table above)
- [ ] Content rating questionnaire done
- [ ] Feature graphic + ≥2 screenshots uploaded
- [ ] Signing: let Google Play manage the app signing key (default)
- [ ] Internal test install verified on a real device
