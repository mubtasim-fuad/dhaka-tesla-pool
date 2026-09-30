# Dhaka Tesla Pool

**Shared seats, clear fares, and a ride history each passenger can follow.**

A ride-pooling MVP for a three-seat vehicle in Dhaka, built for the RoBenDevs internship brief by Md Mubtasim Fuad (North South University CSE ’25).

| | |
| --- | --- |
| **Live app** | [Open Dhaka Tesla Pool](https://dhaka-tesla-pool-web-nine.vercel.app/) |
| **API health** | [Check the API](https://dhaka-tesla-pool-api-nine.vercel.app/health) |
| **Stack** | React + Vite · Express · PostgreSQL · handwritten SQL · Docker Compose |
| **Hosting** | Vercel (web and API) · Neon (PostgreSQL) |

The demo password is shared privately, never in this repository. The hosted app is a working demo, and its current ride state may differ from the screenshots below.

## Contents

[Summary](#summary) · [Problem](#the-problem) · [Screenshots](#screenshots) · [Features](#what-works) · [How it works](#how-it-works) · [Architecture and ERD](#architecture) · [Fares](#assumptions-and-fares) · [Last-seat race](#the-last-seat-race) · [Project structure](#project-structure) · [Run with Docker](#run-with-docker) · [API](#api-overview) · [Tests](#tests-and-verification) · [Deployment](#deployment) · [Trade-offs](#choices-and-trade-offs) · [AI usage](#ai-usage)

## Summary

Nusrat requests Banani → Mohakhali and Rafiq requests Banani → Gulshan 1. Jashim accepts a request in his three-seat vehicle, Bullet. The app places compatible waiting riders in one pool; Shirin can take the last seat if her request fits before departure. Each passenger keeps a separate request, fare, cash status, and timeline. This project's example fares are **Tk 98 for Nusrat** and **Tk 86 for Rafiq**, fixed when a seat is assigned.

## The problem

Pooling must answer five questions consistently:

- **Compatibility:** Which trips can share one vehicle under the documented route rule?
- **Capacity:** Can two near-simultaneous requests claim the last seat without overbooking?
- **Fare:** What does each passenger owe, and when does that amount become fixed?
- **State:** Can the driver or passenger skip a step or cancel after the trip starts?
- **Privacy and history:** Can a passenger see only their own ride and its events?

## Screenshots

Captured from a demo session; the live database can have a different state.

| Sign in | Passenger ride |
| --- | --- |
| ![Login screen](docs/screenshots/login.png) | ![Passenger booking and ride status](docs/screenshots/passenger.png) |
| **Driver pool** | **Phone layout** |
| ![Bullet with pooled riders](docs/screenshots/driver-pool.png) | ![Driver page on a phone](docs/screenshots/mobile-driver.png) |

## What works

- Passenger registration and login; seeded driver and passenger accounts.
- Fare quote and ride request from a fixed list of Dhaka zones.
- Driver online status, pending requests, acceptance, automatic compatible grouping, and manual fill before departure.
- Individual statuses: `REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED`; cancellation before `STARTED`.
- Per-passenger fare fixed at assignment, cash status, ride history, and event timeline.
- Vehicle-row locking plus an atomic seat claim and database capacity check.
- Role-scoped API, validation, health endpoint, migrations, seed data, Docker Compose, unit and integration tests.

## How it works

1. A passenger chooses one of eight named zones, a destination, and 1–3 seats. The API returns an estimated fare before the request is placed.
2. A new request starts as `REQUESTED`. If an online driver's active `MATCHED` pool has the same pickup and route group and enough capacity, it can join immediately.
3. Otherwise, an online driver accepts a waiting request. This creates a pool and checks other compatible waiting requests. The driver may retry **Find more riders** before departure.
4. Each attached passenger receives a fixed fare in `pool_memberships`. The driver advances the pool through `MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED`; corresponding passenger requests and event timelines advance in the same transaction.
5. A passenger may cancel before `STARTED`. Their seats are released; if no active riders remain, the pool becomes `CANCELLED`. Completed rides mark cash as collected.

The example Banani routes share a `BANANI_EAST` group. Other routes require an exact pickup and destination match. This is a documented demo rule, not a live-road detour calculation.

## Architecture

```mermaid
flowchart LR
    B[Browser] --> R[React app]
    R -->|JSON over HTTP| A[Node Express API]
    A --> P[(PostgreSQL)]
```

The browser stores a short-lived bearer token. Express handles validation, authorization, transactions, matching, fares, and lifecycle rules. PostgreSQL stores users, vehicles, requests, pools, membership fares, and immutable ride events. This is one API and one database; there is no real-time socket or map service.

```mermaid
erDiagram
    USERS ||--o{ RIDE_REQUESTS : books
    USERS ||--o| VEHICLES : drives
    VEHICLES ||--o{ POOLS : operates
    POOLS ||--o{ POOL_MEMBERSHIPS : contains
    RIDE_REQUESTS ||--o| POOL_MEMBERSHIPS : joins
    RIDE_REQUESTS ||--o{ RIDE_EVENTS : records
    POOLS ||--o{ RIDE_EVENTS : records
    USERS ||--o{ RIDE_EVENTS : acts
```

| Table | Why it exists | Important integrity rule |
| --- | --- | --- |
| `users` | Passenger or driver identity | Unique email; role check |
| `vehicles` | Bullet and seat capacity | One vehicle per driver; capacity 1–6 |
| `ride_requests` | Each passenger's own lifecycle | One active request per passenger; indexed pending lookup |
| `pools` | One shared driver trip | Partial unique index prevents two active pools per vehicle; `occupied_seats <= capacity` |
| `pool_memberships` | Individual seats, fixed fare, cash state | A request joins one pool at most; `left_at` preserves cancellations |
| `ride_events` | Audit trail for state changes | Indexed by request and pool; a passenger can query only their own events |
| `schema_migrations` | Applied SQL versions | Unique filename |

## Assumptions and fares

- Pickup and destination come from eight named zones. Trips share a pool when pickups are equal and route groups match. `Banani → Mohakhali` and `Banani → Gulshan 1` form one documented `BANANI_EAST` group; all other routes require an exact pickup/destination match. This is a product assumption, not a claim that the real roads always make this detour sensible.
- Demo distances are **4 km** for Banani → Mohakhali and **3 km** for Banani → Gulshan 1. Other pairs use rounded straight-line distance multiplied by 1.35 for a rough estimate. No map API or live traffic data is used.
- Per-seat fare in integer paisa: `5000 base + 1500 × distance_km − 20% × (1500 × distance_km)`. A party booking more than one seat pays the per-seat amount times the seat count. Nusrat pays **9,800 paisa = Tk 98**; Rafiq pays **8,600 paisa = Tk 86**.
- The quoted pool discount is guaranteed once a request is assigned, even if a second rider never joins. This keeps the fare fixed after matching. An unmatched request has a quote but no charged fare.
- Cash is the only payment mode. Completing a pool records cash as collected; there is no gateway or refund workflow.
- A rider may cancel a pending, matched, or driver-arrived request. Once the ride starts, cancellation is rejected. A pool with no active riders becomes cancelled.
- The driver can handle one active pool at a time. The driver must be online to accept; riders can join only while the pool is `MATCHED`.

### The last-seat race

Every mutation of a pool's seats first locks Bullet's vehicle row with `SELECT ... FOR UPDATE`. A seat claim also uses `UPDATE pools SET occupied_seats = occupied_seats + requested_seats WHERE occupied_seats + requested_seats <= capacity`, inside the same transaction. The database check constraint is the final guard. Two callers claiming the last seat cannot both succeed on PostgreSQL; the loser remains `REQUESTED`. Cancellation decrements the count in the same transaction. At larger scale, partition matching by area and reduce lock contention without weakening this database invariant.

## Project structure

```text
api/
  src/          Express routes, authentication, pooling, fares, migrations, and seed
  sql/          Schema and capacity/cash migrations
  test/         Domain unit tests and ride integration tests
web/
  src/          React authentication, passenger and driver screens, API client, CSS
docs/
  screenshots/  Captures from a demo session
  scaling.md    Larger-scale design
  deploy-vercel.md  Hosting notes
scripts/
  setup-env.mjs Generates private local credentials
docker-compose.yml
```

## Run with Docker

Prerequisites: Docker with Compose. No paid service is required.

```bash
node scripts/setup-env.mjs
docker compose up --build
```

Open **http://localhost:8080** for the app and **http://localhost:4000/health** for API health. The setup script creates a private `.env` with randomly generated database, session, and demo-login credentials; it refuses to overwrite an existing file. Read `DEMO_PASSWORD` there for the seeded accounts. Compose starts Postgres, waits for its health check, applies migrations, seeds the demo cast, and starts the API and static frontend. Database data persists in the `postgres_data` volume. On a repeat start, migrations and seed data are idempotent; existing ride history remains.

| Demo account | Email | Password |
| --- | --- | --- |
| Jashim, driver of Bullet | `jashim@example.test` | `DEMO_PASSWORD` from your private `.env` |
| Nusrat | `nusrat@example.test` | `DEMO_PASSWORD` from your private `.env` |
| Rafiq | `rafiq@example.test` | `DEMO_PASSWORD` from your private `.env` |
| Shirin | `shirin@example.test` | `DEMO_PASSWORD` from your private `.env` |
| Farhan, additional race-test rider | `farhan@example.test` | `DEMO_PASSWORD` from your private `.env` |

Seeded requests: Nusrat asks for Banani → Mohakhali; Rafiq asks for Banani → Gulshan 1. Sign in as Jashim and accept Nusrat to place both in Bullet. Sign in as Shirin to request the final seat. To rerun the story without deleting other data, complete the trip and make fresh requests; for a completely clean local demo use a fresh database volume. Never run the integration test against data you want to keep.

For local processes instead of Compose: run PostgreSQL, install dependencies with `npm ci` in `api/` and `web/`, set `DATABASE_URL` to your local database, a 32+ character `JWT_SECRET`, and a private 12+ character `DEMO_PASSWORD`, run `npm run migrate && npm run seed && npm run dev` in `api/`, then `npm run dev` in `web/`. Set `WEB_ORIGIN=http://localhost:5173` for Vite. The Docker environment constructs the `db` connection URL and uses web port 8080; change these for local processes.

## API overview

| Method and path | Role | Purpose |
| --- | --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | Public | Passenger sign-up and login |
| `GET /api/zones` | Public | Allowed zones |
| `GET /api/requests/quote` | Passenger | Estimate by pickup, destination, seats |
| `POST /api/requests`, `GET /api/requests` | Passenger | Create and list own rides |
| `GET /api/requests/:id/events` | Passenger | Own timeline only |
| `POST /api/requests/:id/cancel` | Passenger | Cancel before start |
| `GET /api/driver/dashboard` | Driver | Bullet, pending requests, pool history |
| `POST /api/driver/online` | Driver | Toggle availability |
| `POST /api/driver/requests/:id/accept` | Driver | Create a pool and assign compatible waiting riders |
| `POST /api/driver/pools/:id/fill` | Driver | Retry matching pending riders before departure |
| `POST /api/driver/pools/:id/advance` | Driver | Advance exactly one lifecycle step |

Requests use JSON and an `Authorization: Bearer <token>` header after login. Invalid input returns 400, unauthorized access 401/403, ownership misses 404, and conflicting ride states or duplicate active requests 409. `GET /health` checks database connectivity.

## Tests and verification

```bash
cd api
npm ci
npm test
```

The integration test **resets every ride table**. Create a dedicated database whose name ends in `_test`, migrate it, then run:

```bash
# Example with local Postgres and a separately created tesla_pool_test database:
export DATABASE_URL=postgres://tesla_pool:YOUR_PRIVATE_DB_PASSWORD@localhost:5432/tesla_pool_test
export JWT_SECRET=local-test-secret-with-at-least-32-chars
npm run migrate
npm run test:integration
```

The integration test checks role boundaries, Nusrat/Rafiq fares and membership, invalid transitions, cancellation, cash completion, and two simultaneous attempts to claim Bullet's last seat. It can be rerun against the dedicated test database.

**Verified:** React production build and unit tests pass. The SQL migrations, seed, and end-to-end API test passed against a local PGlite PostgreSQL-compatible wire server. The live Vercel API returned 200 for `/health` and `/api/zones`; browser checks confirmed seeded passenger and driver sign-in, the fare quote and timeline, and automatic grouping of Nusrat and Rafiq after Jashim accepted one request. A native Docker daemon and PostgreSQL server were unavailable in the build workspace, so `docker compose up` and native PostgreSQL contention still need a run in your environment.

## Deployment

The React app and Express API are deployed as separate Vercel projects, backed by Neon PostgreSQL. The web project uses `web` as its Root Directory and deploys from `main`; API changes still require a separate deployment workflow. The live links are at the top of this page. The hosted demo password is distributed privately.

For local reproduction, use the Docker instructions below. The repository records what was tested and what still needs a native Docker/PostgreSQL run in [Tests and verification](#tests-and-verification).

## Choices and trade-offs

| Choice | Alternatives | Why here | Switch when |
| --- | --- | --- | --- |
| React + Vite | Next.js | A small authenticated client needs no SSR | Public discovery pages or server rendering matter |
| Express REST | Fastify, NestJS, GraphQL | Few resources and stateful commands are easy to trace | Contract or team size needs a stronger framework |
| PostgreSQL + handwritten SQL | MySQL, SQLite, Prisma | Row locks, transactions, partial indexes, and explicit constraints fit seat inventory | Geographic matching or high-volume analytics requires separate search/read infrastructure |
| JWT bearer token | HttpOnly cookie session | Simple two-process demo and role authorization | Public launch needs secure cookie sessions, CSRF policy, revocation, and stronger rate limits |
| Cash only | Simulated wallet, payment gateway | Keeps this MVP focused on matching and fare integrity | Real settlement/refunds become product requirements |
| Polling every six seconds | WebSockets, server-sent events | Simple state refresh for a tiny demo | Dispatch latency or driver scale requires push updates |
| Plain CSS | Tailwind, component library | Small screen set and minimal dependencies | A larger design system emerges |
| `node:test` | Vitest, Jest | Covers risky behavior without extra runtime | More UI and component testing becomes valuable |
| Docker Compose and Vercel/Neon | Docker only | Local reproducibility plus a reviewable public demo | A dedicated host is needed for stronger uptime or scale |

**Known limitations:** Matching uses zones, not route geometry or driver proximity; money is an estimate until assignment; status refresh uses polling; token storage is browser local storage; no password reset, driver registration, real payment, map, notification, or rate limit. The hosted demo password stays outside Git. The web project is connected to this GitHub repository with `web` as its Root Directory; pushes to `main` trigger web deployments. The API project still uses a separate manual deployment workflow.

For the larger-scale design, see [If Oi Tesla Goes Viral](docs/scaling.md).

## AI usage

OpenAI Codex assisted with parts of the code, documentation, tests, and browser checks. The last-seat race led to a revision: the first approach counted active membership rows after locking; the current implementation uses an atomic pool counter plus a database check. The implementation, tests, and limitations are here for review and reproduction.
