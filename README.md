# Dhaka Tesla Pool

A small React, Node.js, and PostgreSQL ride-pooling MVP for the RoBenDevs internship brief. Nusrat and Rafiq request overlapping trips from Banani; Jashim accepts one request in Bullet, and the other joins the same three-seat pool. Shirin can take the last seat. Each rider sees only their own trip, fare, cash status, and timeline.

**Demo video:** [Six-minute recording outline](docs/demo-video-outline.md); the candidate recording is still to come.

**Live app:** [Dhaka Tesla Pool](https://dhaka-tesla-pool-web-nine.vercel.app/) · [API health](https://dhaka-tesla-pool-api-nine.vercel.app/health). The frontend and API run on Vercel with Neon PostgreSQL. The demo password is shared privately, never in this repository.

![Driver pool with Nusrat and Rafiq](docs/screenshots/driver-pool.png)

## What works

- Passenger registration and login; seeded driver and passenger accounts.
- Fare quote and ride request from a fixed list of Dhaka zones.
- Driver online status, pending requests, acceptance, automatic compatible grouping, and manual fill before departure.
- Individual statuses: `REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED`; cancellation before `STARTED`.
- Per-passenger fare fixed at assignment, cash status, ride history, and event timeline.
- Vehicle-row locking plus an atomic seat claim and database capacity check.
- Role-scoped API, validation, health endpoint, migrations, seed data, Docker Compose, unit and integration tests.

Screens: [login](docs/screenshots/login.png) · [passenger](docs/screenshots/passenger.png) · [driver](docs/screenshots/driver-pool.png) · [phone layout](docs/screenshots/mobile-driver.png)

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

**Known limitations:** Matching uses zones, not route geometry or driver proximity; money is an estimate until assignment; status refresh uses polling; token storage is browser local storage; no password reset, driver registration, real payment, map, notification, rate limit, or recorded video. The hosted demo password stays outside Git. The Vercel projects were uploaded manually and are not linked to GitHub, so code pushes do not trigger deployment.

For the larger-scale design, see [If Oi Tesla Goes Viral](docs/scaling.md). For a candidate-owned walkthrough, see the [video outline](docs/demo-video-outline.md).

## AI usage

OpenAI Codex was used to draft code, documentation, and tests and to inspect local browser screens. I accepted the suggestion to serialize seat assignment with a vehicle lock. A first implementation counted active membership rows after locking; a simultaneous last-seat test exposed a weakness in the local compatibility runner, so I changed it to an atomic pool counter with a database check as a second guard. The candidate should run the Docker setup, inspect the commits, and be able to explain or change every part before submission.
