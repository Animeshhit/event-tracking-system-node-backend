# Analytics Backend

Event-tracking and analytics API for an e-commerce store. It collects activity from **guest and logged-in users**, stores it reliably, links old guest activity to a user after login, and serves the data behind the analytics dashboard (event counts, conversion funnel, trends, raw activity).

**Stack:** Bun · TypeScript · Express · PostgreSQL · Drizzle ORM · Redis Streams · Docker

---

## Table of contents

- [Why this exists](#why-this-exists)
- [How it works](#how-it-works)
- [Getting started](#getting-started)
- [Event tracking](#event-tracking)
- [Guest-to-user binding](#guest-to-user-binding)
- [API overview](#api-overview)
- [Redis Streams pipeline](#redis-streams-pipeline)
- [Database](#database)
- [Testing](#testing)
- [What's implemented](#whats-implemented)
- [What's missing and what to do next](#whats-missing-and-what-to-do-next)

---

## Why this exists

The store needs to track:

| Area | Events |
|---|---|
| Browsing | product views, searches, category clicks |
| Intent | add to cart, remove from cart, wishlist |
| Conversion | buy now, checkout, payment, purchase |

Two requirements shape the design:

1. **Guest activity must not be lost.** Someone who browses as a guest and then signs up should still have their earlier activity attached to their account.
2. **High event volume.** Writing every event straight to Postgres on the request path doesn't scale, so ingestion and persistence are separated by a queue.

---

## How it works

Every event carries three identities: a device, a session, and (optionally) a user.

```text
Guest:            deviceId = D1   sessionId = S1      userId = null
After login:      deviceId = D1   sessionId = S1/S2   userId = U1
```

Old guest events are **never rewritten**. Instead, the link between a device and a user is stored in a `device_users` table, and queries join through it. That keeps the raw data intact and still lets a user's full history be shown.

### Architecture

```mermaid
flowchart TD
    FE[Next.js frontend] -->|events| API[Express / Bun API]
    API --> AUTH[Auth middleware<br/>guest or user]
    API --> VAL[Event validation]
    VAL --> RS[(Redis Stream: events)]
    RS --> W1[Worker 1]
    RS --> W2[Worker 2]
    RS --> W3[Worker 3]
    W1 --> PG[(PostgreSQL)]
    W2 --> PG
    W3 --> PG
    PG --> ANA[Analytics APIs]
    ANA --> FE
```

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh)
- Docker (for PostgreSQL and Redis)

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5433/mydb
ACCESS_TOKEN_SECRET=change-me-to-a-long-random-string
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
```

> Use a long random value for `ACCESS_TOKEN_SECRET` outside local development. If your Redis connection reads its URL from an env variable, add it here too.

### 3. Start PostgreSQL and Redis

```bash
docker compose up -d
docker ps   # verify both containers are running
```

### 4. Run database migrations

```bash
bunx drizzle-kit migrate
```

After changing the schema, generate a new migration first:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### 5. Start the API

```bash
bun index.ts
```

The API is available at `http://localhost:8080`.

### 6. Start the event worker(s)

```bash
bun src/workers/event.worker.ts
```

Run the same command in more terminals to add workers. Each one joins the same Redis consumer group under its own consumer name, so Redis splits the messages between them.

### Project structure

```text
.
├── src/
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── workers/
│   └── scripts/              # standalone test scripts
│       ├── test-user-binding.ts
│       ├── test-10000-events.ts
│       └── test-10000-per-sec.ts
├── docs/                     # screenshots used in this README
├── index.ts                  # entry point
├── app.ts
├── env.ts
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
└── .env
```

---

## Event tracking

Each event contains:

```text
eventId, eventName, deviceId, sessionId, userId,
productId, properties, occurredAt, createdAt
```

### Supported events

`product_view` · `search` · `category_click` · `add_to_cart` · `remove_from_cart` · `buy_now` · `wishlist` · `checkout` · `payment` · `purchase`

### Validation

Each event type is validated before it's stored. For example:

| Event | Required |
|---|---|
| `product_view` | `productId` |
| `search` | a search query |
| `add_to_cart` | product and quantity |
| `payment` | amount and payment status |
| `purchase` | order ID and amount |

### Duplicate protection

`eventId` is generated on the client and has a **unique constraint** in the database, so retrying the same event can't insert it twice.

The system deliberately does **not** deduplicate on `eventName + deviceId`, `eventName + sessionId` or `eventName + productId`, because one user can legitimately fire the same event many times (viewing the same product twice, for example).

---

## Guest-to-user binding

Guests can send events without logging in (`userId = null`). A middleware checks each request and treats it as either an authenticated user or a guest. The device ID is kept in a cookie.

When a user logs in on a device, the pair is stored in `device_users`. A device can be linked to more than one user.

To fetch a user's events, the API:

1. finds every device linked to the user,
2. finds events that belong directly to the user,
3. finds historical guest events from those linked devices,
4. combines the results.

```text
User U1
  ├── Device D1  ── guest events + logged-in events
  └── Device D2  ── guest events + logged-in events
```

---

## API overview

| Capability | Notes |
|---|---|
| Event ingestion | `POST /events`, accepts guest and authenticated traffic |
| Event retrieval | `GET /api/v1/events` with filters and pagination |
| Product search | `/products/search`, registered **before** `/products/:id` so "search" isn't treated as an id |
| Authentication | register, login, refresh token, logout, current user |
| Analytics | event counts, conversion funnel, event trends, raw activity |

### Event filters

```text
page, limit, eventName, productId, from, to, guest, userId, deviceId
```

```text
/api/v1/events?userId=<USER_ID>      # direct events + guest events from linked devices
/api/v1/events?deviceId=<DEVICE_ID>  # activity from one device
```

Results are paginated, so a query never returns an unbounded number of rows.

The analytics endpoints support filtering by date range, event type, product and guest/logged-in type. The raw event endpoint also accepts `userId` and `deviceId`, so a single user's or device's activity can be visualised.

---

## Redis Streams pipeline

Ingestion and persistence are decoupled so database speed doesn't limit how fast events can be accepted.

```text
Client → POST /events → Redis Stream → Consumer group → Workers → PostgreSQL
```

| Setting | Value |
|---|---|
| Stream | `events` |
| Consumer group | `event-workers` |
| Consumers | one per worker process, e.g. `worker-123`, `worker-456` |

- Workers process events **in batches**.
- A message is acknowledged (`ACK`) only **after** it's been written successfully.
- Messages that were delivered but never acknowledged (a worker crashed) can be recovered through Redis pending-message handling.
- Adding throughput means starting more workers. The event API doesn't change.

---

## Database

PostgreSQL is the primary store. Main tables:

```text
users · products · events · device_users
```

The `events` table has indexes for the common query patterns:

```text
(eventName, occurredAt)
(productId, occurredAt)
(deviceId,  occurredAt)
(sessionId, occurredAt)
(userId,    occurredAt)
```

---

## Testing

Three standalone scripts live in `src/scripts/`. They need the API, Redis, Postgres and at least one worker running.

### 1. User binding test

```bash
bun src/scripts/test-user-binding.ts
```

Verifies the key guest-to-user flow:

```text
Create guest event → Register user → Login → Query user events → Verify old guest event is visible
```

Expected output:

```text
Guest event created
User registered
Login successful
Events returned: 1
PASSED: Historical guest event is visible for the logged-in user.
USER BINDING TEST PASSED
```

![User binding test result](./docs/user-binding.png)

**What the run shows**

1. **Guest event created.** A `product_view` event is sent with no user, using a test device ID and session ID.
2. **User registered.** A new user (`test-name`) is created and the API returns tokens and the user object.
3. **Login successful.** The same user logs in.
4. **Events fetched for the user.** `GET /api/v1/events` for that user returns exactly one event, with `total: 1` in the pagination block.

The key detail is in that returned event: its `userId` is `null`. It is the original guest event, and it was never rewritten. It appears in the new user's history only because of the device-to-user link, which is the behavior this test is meant to prove. The script ends with `PASSED: Historical guest event is visible for the logged-in user.`

### 2. 10,000 event test

```bash
bun src/scripts/test-10000-events.ts
```

Sends 10,000 events to the API in batches and checks they're all ingested.

### 3. 10,000 events/second test

```bash
bun src/scripts/test-10000-per-sec.ts
```

Pushes the ingestion API toward 10,000 events per second.

### Results

All numbers below come from a local machine.

**10,000-event test**

| Metric | Result |
|---|---|
| Total events | 10,000 |
| Successful | 10,000 |
| Failed | 0 |
| Duration | ~4.69 s |
| Request throughput | ~2,131 events/sec |

**10,000 events/second test**

| Setting / metric | Value |
|---|---|
| Target throughput | 10,000 events/sec |
| Configured duration | 10 s |
| Concurrency | 10,000 |
| Total requests sent | 20,000 |
| Successful | 20,000 |
| Failed | 0 |
| Success rate | 100.00% |
| Actual duration | 10.97 s |
| Actual throughput | **1,822 events/sec** |
| Target achieved | **No** |

![Stress test result](./docs/stress-test-result.png)

The run reported per-second rates of 1,894 and 1,756 events/sec and finished with no failed requests, so the API stayed stable under 10,000 concurrent requests. It did not reach the 10,000 events/sec target: it sustained roughly 1,800 events/sec, about 18% of the goal. The script's own output says `Target achieved: NO`, and this README keeps that result as it is.

> **How to read these numbers.** This is a local API load test, not a production benchmark, and it doesn't show that PostgreSQL can sustain 10,000 inserts per second. What the architecture provides is a way to separate *accepting* events (Redis) from *persisting* them (workers → Postgres), so the two can be scaled independently. The measured 1,800 to 2,100 events/sec is well below the 10,000/sec target, and reaching it is covered in the roadmap below.

---

## What's implemented

**Tracking**
- Event ingestion with per-event validation
- `eventId`-based duplicate protection
- Guest and logged-in tracking, with device and session identification
- Guest-to-user historical binding via `device_users`

**Pipeline**
- Redis Streams with consumer groups
- Multiple workers, batch processing, acknowledgements
- Pending-message recovery

**API and data**
- Event filtering and pagination
- Product search
- User and device activity lookup
- Analytics endpoints: counts, funnel, trends, raw activity
- PostgreSQL persistence with Drizzle ORM and query-specific indexes

**Auth**
- Registration, login, refresh token flow, logout

**Testing**
- User binding, 10,000-event and 10,000-events/sec scripts

---

## What's missing and what to do next

Nothing below blocks the current demo. These are production-hardening and scaling items, roughly ordered by importance.

### 1. Role-based authorization for analytics
Analytics endpoints currently aren't restricted by role. Any authenticated caller who can reach them can read business data.

**Plan:** add a `role` to the user model → make the auth middleware role-aware → protect analytics routes → allow only `admin`.

### 2. Return `202 Accepted` after queueing
Ingestion should acknowledge as soon as the event is safely in Redis, without waiting on the database.

```text
Client → API → Redis Stream → HTTP 202 → (later) Workers → PostgreSQL
```

This keeps ingestion latency independent of database write latency, and is the most direct route toward the 10k events/sec goal.

### 3. Dead-letter queue
Events that keep failing should not be retried forever or lost.

```text
Worker ── success ──► ACK
       └─ failure ──► retry ── success ──► ACK
                          └── max retries ──► dead-letter stream
```

Add a retry counter, a `events-dlq` stream, and a small script to inspect and replay dead-lettered events.

### 4. Rate limiting
Protect ingestion and the auth endpoints (login and register especially) from abuse.

```text
Client → Rate limiter ── allowed ──► API
                      └─ limited ──► 429
```

Use Redis-backed limits so they work across multiple API instances. Set ingestion limits carefully so legitimate high-volume traffic isn't blocked.

### 5. Production-grade load testing
Replace the local scripts with a dedicated tool such as [k6](https://k6.io):

1. Deploy the API, Redis and PostgreSQL.
2. Write a k6 scenario targeting 10k events/sec with a ramp-up.
3. Record p50 / p95 / p99 latency and error rate.
4. Watch Redis stream depth, worker throughput, and Postgres CPU, connections and write rate.
5. Add workers and repeat.

### 6. Observability
- Structured logging
- Request latency metrics
- Redis stream depth and consumer lag
- Worker throughput
- PostgreSQL metrics
- Error tracking and alerts

Stream depth growing steadily is the first sign workers can't keep up, so alert on it.

### 7. Further ideas
These aren't in the current plan but would be natural next steps as data grows:

- **Pre-aggregated analytics.** Funnel and trend queries over a very large `events` table get slow. Rollup tables or materialized views refreshed on a schedule keep the dashboard fast.
- **Table partitioning and retention.** Partition `events` by `occurredAt` (monthly, for example) and archive or drop old partitions.
- **Automated tests in CI.** The three scripts are manual. Turning the user-binding script into an automated integration test would catch regressions.
- **Idempotent binding.** Add a unique constraint on `(deviceId, userId)` in `device_users` if not already present, so repeated logins don't create duplicate links.
- **Privacy controls.** Add a way to delete a user's events and device links on request, and decide how long guest data is kept.

---

## Notes

- Test scripts need the API, Redis, PostgreSQL and at least one worker running, or events will be accepted but never persisted.
- The load-test figures are from a local environment and will vary by machine.