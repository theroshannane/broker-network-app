# Implementation Plan: Next.js Web Frontend MVP

Date: 2026-07-09
Scope: Proof-of-concept web client for the existing broker-network-app Express API.

## Overview

A Next.js 14+ App Router frontend that talks to the existing Express backend running on localhost:3000. Covers phone OTP login, listing browse/search, listing creation, connect request flow (send, view status, approve, reveal contact). No AI features, no alerts, no smart-match. Plain Tailwind CSS. Single solo session deliverable.

## Architecture Decisions

### Auth Token Storage: localStorage + Authorization header

- Backend expects `Authorization: Bearer <token>`. Cookie proxy would need a BFF; out of scope for PoC.
- Token from `POST /auth/verify-otp` stored in localStorage, attached via fetch wrapper.
- 401 response clears token, redirects to login.

### API Communication

Next.js `rewrites()` proxy `/api/*` to Express backend (localhost:3000). Avoids CORS.

### Styling

Tailwind CSS utility classes. No component library.

## Project Structure

New directory: `/Users/roshan/Downloads/broker-network-app/web/` (separate Next.js project in the monorepo).

```
web/
  package.json, next.config.ts, tailwind.config.ts, tsconfig.json, postcss.config.mjs
  src/
    lib/api.ts       - fetch wrapper + token management
    lib/auth.tsx      - AuthContext provider + useAuth hook
    lib/types.ts      - shared TS types matching backend schemas
    app/layout.tsx    - root layout, AuthProvider, nav bar
    app/globals.css
    app/page.tsx      - home redirect
    app/login/page.tsx
    app/listings/page.tsx        - browse/search
    app/listings/new/page.tsx    - create listing
    app/listings/[id]/page.tsx   - detail + send request
    app/requests/page.tsx        - my sent requests
    app/requests/incoming/page.tsx - approve incoming
    app/requests/[id]/page.tsx   - detail + reveal contact
```

## Required Backend Additions (added before frontend, via TDD)

1. `GET /listings/:id` - single listing by ID.
2. `GET /brokers/me` - broker profile for authenticated phone (requireAuth).
3. `GET /brokers/:id/incoming-requests` - pending contact_requests joined to broker's own listings.

## Build Order

1. Backend additions (3 endpoints, TDD, tsc clean, commit).
2. Scaffold Next.js project.
3. API client + types.
4. Auth context.
5. Layout + home.
6. Login page (phone OTP).
7. Listings browse.
8. Create listing.
9. Listing detail + send request.
10. Request detail + reveal.
11. My sent requests (localStorage-tracked IDs).
12. Incoming requests + approve.

## Verification

Manual: run Express (port 3000) + Next.js (port 3001) together, walk through login -> create listing -> browse -> request -> approve -> reveal.

## Deferred

AI parser UI, smart-match UI, alerts UI, cookie-proxy auth hardening, deployment config, Expo/React Native mobile track.
