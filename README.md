# Analytics Backend

## Overview

This backend is the event-tracking and analytics API for the e-commerce analytics system.

The main goal is to collect user activity from both guest users and authenticated users, persist the events, associate historical guest activity with users after login, and provide analytics data for the dashboard.

The backend is implemented with:

- Bun
- TypeScript
- Express
- PostgreSQL
- Drizzle ORM
- Redis Streams
- Docker
- Cookie-based authentication

---

# Problem

The application needs to track events such as:

- Product views
- Searches
- Category clicks
- Add to cart
- Remove from cart
- Buy now
- Wishlist
- Checkout
- Payment
- Purchase

The system must support both:

1. Guest users
2. Logged-in users

Guest activity should not be lost when the user later logs in.

The system should also be able to handle high event volume and provide data for analytics and conversion-funnel visualization.

---

# Solution

The backend uses a device + session + user identity model.

### Guest

```text
deviceId = D1
sessionId = S1
userId = null
```

### After login

```text
deviceId = D1
sessionId = S1/S2
userId = U1
```

The old guest events are intentionally not rewritten.

Instead, the relationship is stored in `device_users`.

This allows historical guest activity to be associated with the user during queries.

---

# Project Structure

The project keeps the application code under `src/`.

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
│   ├── scripts/
│   │   ├── test-user-binding.ts
│   │   ├── test-10000-events.ts
│   │   └── test-10000-per-sec.ts
│   └── ...
│
├── index.ts
├── app.ts
├── env.ts
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
└── .env
```

`index.ts`, `app.ts`, and `env.ts` are kept outside `src/`.

Test scripts are kept under:

```text
src/scripts/
```

---

# Running the Backend

## 1. Install dependencies

```bash
bun install
```

## 2. ENV Setup

```bash
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5433/mydb
ACCESS_TOKEN_SECRET=hellothisisasecret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
```

## 3. Start PostgreSQL and Redis

```bash
docker compose up -d
```

Verify containers:

```bash
docker ps
```

## 4. Run database migrations

```bash
bunx drizzle-kit migrate
```

If migrations need to be generated after schema changes:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

## 5. Start the backend

The backend is started with:

```bash
bun index.ts
```

The API runs on:

```text
http://localhost:8080
```

## 6. Start the event worker

Run the worker from the worker file:

```bash
bun src/workers/event.worker.ts
```

Multiple worker processes can be started using the same command.

Each worker joins the same Redis consumer group and receives its own messages.

Example:

```text
Terminal 1
bun src/workers/event.worker.ts

Terminal 2
bun src/workers/event.worker.ts

Terminal 3
bun src/workers/event.worker.ts
```

---

# Event Tracking

Each event contains information such as:

```text
eventId
eventName
deviceId
sessionId
userId
productId
properties
occurredAt
createdAt
```

`eventId` is generated on the client and is unique.

The database has a unique constraint on `eventId`.

This prevents the same event from being inserted multiple times.

The system does not deduplicate using:

```text
eventName + deviceId
eventName + sessionId
eventName + productId
```

because the same user can legitimately generate the same event multiple times.

---

# Supported Events

```text
product_view
search
category_click
add_to_cart
remove_from_cart
buy_now
wishlist
checkout
payment
purchase
```

Event-specific validation is performed before an event is stored.

Examples:

- `product_view` requires `productId`
- `search` requires a search query
- `add_to_cart` requires product and quantity
- `payment` requires amount and payment status
- `purchase` requires order ID and amount

---

# Guest and Logged-in Users

Guest requests are allowed on the event ingestion endpoint.

Authentication is checked using middleware that can distinguish between:

```text
Authenticated user
Guest user
```

For guests:

```text
userId = null
```

For authenticated users:

```text
userId = authenticated user's ID
```

The device ID is maintained using a cookie.

---

# Device and User Binding

The `device_users` table stores the relationship between devices and users.

A device can be associated with multiple users.

The system does not modify old guest events after login.

Instead, when querying events for a user:

```text
1. Find all devices linked to the user.
2. Find events belonging directly to the user.
3. Find historical guest events from those linked devices.
4. Combine the results.
```

Conceptually:

```text
User U1
   |
   +---- Device D1
   |       |
   |       +---- Guest events
   |       +---- Logged-in events
   |
   +---- Device D2
           |
           +---- Guest events
           +---- Logged-in events
```

This preserves the original event data while still allowing historical activity to be visualized for the user.

---

# Event Retrieval

The event API supports filtering by fields such as:

```text
page
limit
eventName
productId
from
to
guest
userId
deviceId
```

Examples:

```text
/api/v1/events?userId=<USER_ID>
```

```text
/api/v1/events?deviceId=<DEVICE_ID>
```

A user query includes both:

- events directly associated with the user
- historical guest events from devices linked to that user

A device query returns activity from that device.

Pagination is supported to avoid returning an unlimited number of events.

---

# Search

Product search is implemented before the dynamic product route so that:

```text
/products/search
```

is not incorrectly matched by:

```text
/products/:id
```

Search uses case-insensitive matching across product fields.

The frontend also tracks the search activity as an analytics event.

---

# Analytics APIs

The backend provides analytics data used by the dashboard.

The dashboard consumes endpoints for:

```text
Event counts
Conversion funnel
Event trends
Raw event activity
```

The analytics layer supports filters such as:

```text
date range
event type
product
guest/logged-in user type
```

The raw event endpoint additionally supports:

```text
userId
deviceId
```

so individual user/device activity can be visualized.

---

# Database

PostgreSQL is used as the primary persistent database.

Main entities include:

```text
users
products
events
device_users
```

The `events` table contains indexes for common analytics and lookup patterns, including:

```text
eventName + occurredAt
productId + occurredAt
deviceId + occurredAt
sessionId + occurredAt
userId + occurredAt
```

This helps the database efficiently retrieve event data for common queries.

---

# Redis Streams

For higher-volume event processing, Redis Streams is used as an asynchronous ingestion layer.

The flow is:

```text
Client
   |
   v
POST /events
   |
   v
Redis Stream
   |
   v
Consumer Group
   |
   +---- Worker 1
   +---- Worker 2
   +---- Worker 3
   |
   v
PostgreSQL
```

The Redis stream is:

```text
events
```

The consumer group is:

```text
event-workers
```

Workers process events in batches.

Acknowledgements are used after successful processing.

Pending messages can also be recovered using Redis pending-message handling.

---

# Multiple Workers

Multiple worker processes can consume the same Redis stream.

They use the same consumer group but different consumer names.

This allows work to be distributed between workers.

For example:

```text
event-workers
    |
    +---- worker-123
    +---- worker-456
    +---- worker-789
```

This provides a path toward horizontal scaling without changing the event API.

---

# Testing

The backend currently has three standalone test scripts under:

```text
src/scripts/
```

## 1. User Binding Test

Run:

```bash
bun src/scripts/test-user-binding.ts
```

This verifies the important guest-to-user flow:

```text
Create guest event
        ↓
Register user
        ↓
Login
        ↓
Query user events
        ↓
Verify old guest event is visible
```

Expected result:

```text
Guest event created
User registered
Login successful
Events returned: 1
PASSED: Historical guest event is visible for the logged-in user.
USER BINDING TEST PASSED
```

---

## 2. 10,000 Event Test

Run:

```bash
bun src/scripts/test-10000-events.ts
```

This sends 10,000 events to the event API in batches and verifies successful ingestion.

The purpose is to check API ingestion behavior under a relatively high request volume.

---

## 3. 10,000 Events/Second Test

Run:

```bash
bun src/scripts/test-10000-per-sec.ts
```

This test is intended to push the event ingestion API toward:

```text
10,000 events/second
```

Important:

This is an API load test, not proof that PostgreSQL can permanently sustain 10,000 database inserts per second.

The Redis Streams architecture provides the path for separating:

```text
event ingestion
```

from:

```text
event persistence
```

and allows additional workers to process events asynchronously.

---

# Current Performance Test

A previous 10,000-event ingestion test successfully processed:

```text
Total events: 10,000
Successful: 10,000
Failed: 0
Duration: ~4.69 seconds
Request throughput: ~2,131 events/sec
```

This represents the tested API request throughput in the local environment.

It should not be interpreted as a production benchmark.

---

# What Is Implemented

The backend currently implements:

- Event ingestion
- Event validation
- Event ID based duplicate protection
- Guest event tracking
- Logged-in event tracking
- Device identification
- Session identification
- Guest-to-user historical event binding
- Product search
- Event filtering
- Pagination
- Analytics endpoints
- Funnel analytics
- Trend analytics
- PostgreSQL persistence
- Drizzle ORM
- Redis Streams
- Redis consumer groups
- Multiple event workers
- Pending message recovery
- User authentication
- Refresh token flow
- Logout
- User/device activity lookup
- Load/integration test scripts

---

# Future Improvements / Currently Left

Some production-level improvements are intentionally left for later.

## 1. Role-based authorization for analytics

The analytics endpoints should eventually be protected by roles.

For example:

```text
Admin
  |
  +---- Analytics access

Normal user
  |
  +---- No analytics access
```

Process:

```text
1. Add role to the user model.
2. Add role-aware authentication middleware.
3. Protect analytics routes.
4. Allow only authorized roles to access analytics data.
```

---

## 2. Rate limiting

Rate limiting can be added to protect event ingestion and authentication endpoints.

For example:

```text
Client
  |
  v
Rate Limiter
  |
  +---- Allowed ----> API
  |
  +---- Limited ---> 429
```

For a high-throughput event API, the limiter should be designed carefully so that legitimate high-volume traffic is not blocked immediately.

A production approach could use Redis-backed distributed rate limiting.

---

## 3. Production load testing

The current scripts are useful local tests.

A production-grade load test can later use a dedicated load-testing tool such as k6.

Process:

```text
1. Deploy backend.
2. Deploy Redis and PostgreSQL.
3. Create a k6 scenario targeting 10k events/sec.
4. Run ramp-up testing.
5. Measure p50/p95/p99 latency.
6. Measure error rate.
7. Monitor Redis stream depth.
8. Monitor worker throughput.
9. Monitor PostgreSQL CPU/connections/write throughput.
10. Increase workers and repeat.
```

---

## 4. Better event ingestion response

The current architecture can be improved further so that the HTTP API acknowledges an event after successful queue insertion rather than waiting for database persistence.

The ideal high-volume flow is:

```text
Client
  |
  v
API
  |
  v
Redis Stream
  |
  +---- HTTP 202 Accepted
  |
  v
Workers
  |
  v
PostgreSQL
```

This keeps ingestion latency independent from database write latency.

---

## 5. Dead-letter handling

Failed events should eventually be moved to a dead-letter stream after retry attempts are exhausted.

Process:

```text
Redis Stream
     |
     v
Worker
     |
     +---- success ---> ACK
     |
     +---- failure ---> retry
                         |
                         +---- success ---> ACK
                         |
                         +---- max retries ---> DLQ
```

---

## 6. Observability

Production deployment should eventually add:

- Structured logging
- Metrics
- Request latency monitoring
- Redis stream depth monitoring
- Worker throughput
- PostgreSQL metrics
- Error tracking
- Alerts

---

# Architecture Summary

```text
                  Next.js Frontend
                         |
                         | events
                         v
                Express/Bun API
                         |
             +-----------+-----------+
             |                       |
             v                       v
       Authentication          Event Validation
                                     |
                                     v
                              Redis Stream
                                     |
                          +----------+----------+
                          |          |          |
                          v          v          v
                       Worker 1   Worker 2   Worker 3
                          |          |          |
                          +----------+----------+
                                     |
                                     v
                                PostgreSQL
                                     |
                         +-----------+-----------+
                         |           |           |
                         v           v           v
                       Events     Users      Products
                                     |
                                     v
                              device_users
```

---

# Final Status

The backend currently provides the core analytics system end-to-end:

```text
Event tracking
      ↓
Validation
      ↓
Guest/User identity
      ↓
Redis asynchronous processing
      ↓
PostgreSQL
      ↓
Analytics APIs
      ↓
Frontend dashboard
```

The remaining items listed above are production-hardening and scaling improvements rather than blockers for the current demonstration.
