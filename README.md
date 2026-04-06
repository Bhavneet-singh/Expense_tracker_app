# PennyWise Expense Tracker

PennyWise is a full-stack personal expense tracking application with:

- React frontend (`client/`)
- Express + TypeScript API (`server/`)
- PostgreSQL database with Prisma models
- JWT-based authentication for protected routes

This README is intentionally detailed and aligned with the current source code in this repository.

## Table of Contents

- [Architecture](#architecture)
- [Current Feature Set](#current-feature-set)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Request/Response Conventions](#requestresponse-conventions)
- [Authentication Model](#authentication-model)
- [Backend API (Detailed)](#backend-api-detailed)
- [Frontend Routing and Data Flow](#frontend-routing-and-data-flow)
- [Database Schema and Data Access](#database-schema-and-data-access)
- [Environment Variables](#environment-variables)
- [Run Locally](#run-locally)
- [Run with Docker Compose](#run-with-docker-compose)
- [Testing and Performance](#testing-and-performance)
- [Deployment Guidance (EC2)](#deployment-guidance-ec2)
- [Known Caveats](#known-caveats)

## Architecture

### High-level flow

1. User interacts with React pages.
2. Client stores auth token in local storage (`pennywise_token`).
3. Axios interceptor adds `Authorization: Bearer <token>` to API calls.
4. Express routes call `requireAuth` for protected endpoints.
5. Controllers validate input and call model/db functions.
6. Models use Prisma for CRUD; analytics uses SQL via `pg`.
7. Responses use a consistent JSON envelope (`success`, `data`, `message`, optional `meta`).

### Backend boot sequence

Backend entrypoint: `server/src/index.ts`

- Loads env vars (`dotenv.config()`).
- Creates app from `createApp()` (`server/src/app.ts`).
- Runs `connectDB()` before listening.
- On successful startup, logs server URL and environment.
- Handles process-level `uncaughtException` and `unhandledRejection`.

### Express app composition

In `server/src/app.ts`:

- CORS allowed origin: `http://localhost:3000`
- JSON parser: `express.json()`
- Request timing middleware: `requestTiming` (adds `X-Response-Time`)
- Health endpoints:
  - `GET /`
  - `GET /health`
- API route mounts:
  - `/api/auth`
  - `/api/expenses`
  - `/api/profile`
  - `/api/analytics`
- 404 handler
- Global error handler (`errorHandler`)

## Current Feature Set

- User signup and login
- JWT-protected user sessions
- Expense CRUD with validation
- Pagination/filter/sort for expenses
- Dashboard + advanced analytics endpoints
- Profile read/update
- User data export
- Account deletion
- Backend tests (Jest + Supertest)
- k6 load test scenario file

## Tech Stack

### Frontend (`client`)

- React 19
- TypeScript
- Vite 7
- TanStack Router
- Zustand
- Axios
- Recharts
- Lucide React
- Tailwind CSS v4

### Backend (`server`)

- Node.js
- Express 5
- TypeScript
- PostgreSQL
- Prisma (`@prisma/client`)
- `pg` (direct SQL in analytics + DB bootstrap)
- JWT (`jsonwebtoken`)
- `bcryptjs`
- `cors`, `dotenv`
- `nodemon`, `tsx`

### Tooling

- Jest + ts-jest + Supertest
- Docker + Docker Compose
- k6 load testing script
- InfluxDB + Grafana service definitions in compose for performance visualization

## Repository Structure

```text
Expense_Tracker_App/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── routeTree.gen.ts
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── __tests__/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── types/
│   │   └── utils/
│   ├── loadtest/expenses.k6.js
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── package.json
├── PROJECT_FLOWCHART.md
└── README.md
```

## Request/Response Conventions

### Success format

All successful API responses are sent through `sendSuccess(...)`:

```json
{
  "success": true,
  "data": {},
  "message": "Human-readable message",
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

`meta` appears where pagination is used.

### Error format

Global error handler returns:

```json
{
  "success": false,
  "error": "Error message"
}
```

In development mode, stack trace is included as `stack`.

### Common HTTP error handling

- `400`: validation/input issues
- `401`: missing/invalid/expired JWT, or invalid login credentials
- `404`: missing route/resource
- `500`: unexpected server failure

## Authentication Model

- Login returns a JWT token.
- Client stores token under `pennywise_token` in local storage.
- Axios request interceptor adds bearer token to all requests.
- Response interceptor:
  - if `401`, token is removed
  - user is redirected to `/login` (except when already on `/login` or `/signup`)

### Protected route requirement

```http
Authorization: Bearer <jwt_token>
```

`requireAuth`:

- validates header presence and shape
- verifies JWT with `JWT_SECRET`
- injects `req.userId` for controllers

## Backend API (Detailed)

Base URL (local): `http://localhost:8000/api`

### Public utility endpoints

- `GET /` -> basic service text response
- `GET /health` -> status, uptime, timestamp

### Auth routes (`/api/auth`)

#### `POST /signup`

Creates an account.

Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass1!"
}
```

Validation:

- `name` required, min 2, max 50
- `email` required, valid format
- `password` required, min 8
- password must contain:
  - uppercase
  - lowercase
  - number
  - special char from `@$!%*?&`
- rejects duplicate email

Success:

- `201`
- returns `user` object (without password)
- does **not** issue JWT on signup

#### `POST /login`

Body:

```json
{
  "email": "john@example.com",
  "password": "StrongPass1!"
}
```

Validation:

- both fields required
- invalid credentials -> `401`

Success:

- returns `user` (without password) and `token`

---

### Expense routes (`/api/expenses`) - protected

#### `GET /api/expenses`

Query params:

- `category` (optional)
- `sort` (optional): `amount`, `-amount`, `date`, `-date`
- `limit` (optional, default `20`, max `100`)
- `offset` (optional, default `0`)

Validation:

- `limit` must be integer `1..100`
- `offset` must be integer `>= 0`

Success:

- array of expenses in `data`
- includes pagination `meta`

#### `GET /api/expenses/:id`

- Returns one expense scoped to authenticated user.
- `404` if not found.

#### `POST /api/expenses`

Creates expense.

Body:

```json
{
  "amount": 129.5,
  "category": "food",
  "description": "Team lunch",
  "date": "2026-04-06T10:30:00.000Z"
}
```

Validation:

- `amount` required, numeric, `> 0`, `<= 1000000`
- `category` required and must be one of:
  - `food`
  - `transport`
  - `utilities`
  - `entertainment`
  - `healthcare`
  - `shopping`
  - `education`
  - `other`
- `description` required, min 3, max 100
- `date` cannot be in the future

Success: `201` + created expense.

#### `POST /api/expenses/:id`

Updates expense (current code uses `POST`, not `PUT/PATCH`).

- Any subset of fields can be supplied.
- Field-level validation follows the same constraints as create.
- Future date is rejected.
- `404` if expense is not found for that user.

#### `DELETE /api/expenses/:id`

- Deletes one user-owned expense.
- `404` if missing.

---

### Profile routes (`/api/profile`) - protected

#### `GET /api/profile`

- Returns authenticated user (without password).

#### `PUT /api/profile`

Updates user profile fields.

Accepted body fields:

- `name` (optional, min 2 if provided)
- `email` (optional, valid format if provided, unique among other users)
- `password` (optional, same policy as signup if provided)

At least one of the above must be provided.

#### `GET /api/profile/export`

Returns export payload:

- user (without password)
- all expenses for user (up to 10,000 loaded)
- summary:
  - `totalExpenses`
  - `expenseCount`
- `exportedAt` timestamp

#### `DELETE /api/profile/account`

- Deletes all user expenses
- Deletes user account
- returns success message

---

### Analytics routes (`/api/analytics`) - protected

Analytics queries run through SQL (`pg`) and return aggregated data.

#### `GET /api/analytics/category`

Category totals/count/percentage for all user expenses.

#### `GET /api/analytics/dashboard`

Returns dashboard stats:

- total expenses
- expense count
- average expense amount (rounded)
- highest expense
- lowest expense
- current month total
- last month total
- monthly percentage change

#### `GET /api/analytics/trends`

Last 6 months trend series using month buckets.

#### `GET /api/analytics/period?days=30`

Validations:

- `days` required as number
- allowed range: `1..365`

Returns category stats within the period.

#### `GET /api/analytics/monthly?year=2026`

Validations:

- year must be numeric
- year range: `2000..(currentYear+1)`

Returns monthly totals/count for the selected year.

#### `GET /api/analytics/current-month`

Category breakdown for current month only.

#### `GET /api/analytics/yearly-categories?year=2026`

Yearly month-by-month category distribution.

#### `GET /api/analytics/all-years`

Totals grouped by year.

## Frontend Routing and Data Flow

### Client entry

- `client/src/main.tsx` mounts app
- `client/src/App.tsx` creates and provides router
- generated routes map in `client/src/routeTree.gen.ts`

### Route pages

- `/` -> Home
- `/login`
- `/signup`
- `/dashboard` (protected)
- `/expenses` (protected)
- `/analytics` (protected)
- `/profile` (protected)

### API layer

`client/src/services/api.ts`:

- base URL: `VITE_API_BASE_URL` or fallback `http://localhost:8000/api`
- token injection on request
- global 401 handling

## Database Schema and Data Access

### Prisma schema

Defined in `server/prisma/schema.prisma`.

#### `User` model

- `id` (auto-increment int, PK)
- `name` (`varchar(50)`)
- `email` (unique, `varchar(255)`)
- `password` (`varchar(255)`)
- `createdAt` / `updatedAt` mapped to `created_at` / `updated_at`

#### `Expense` model

- `id` (auto-increment int, PK)
- `userId` -> FK to `User.id` (cascade delete)
- `amount` (`decimal(12,2)`)
- `category` (`varchar(50)`)
- `description` (`varchar(100)`)
- `date`, `createdAt`, `updatedAt`
- indexes:
  - `idx_expenses_user_id`
  - `idx_expenses_user_date`

### DB bootstrap behavior

`server/src/config/db.ts`:

- builds connection string from:
  - `DATABASE_URL` first
  - or `PG*` variables fallback
- checks connectivity (`SELECT 1`)
- creates tables/indexes if missing (`CREATE TABLE IF NOT EXISTS ...`)
- connects Prisma client

## Environment Variables

### Backend (`server/.env`)

Minimum required:

```env
PORT=8000
NODE_ENV=development
JWT_SECRET=replace-with-strong-secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense-tracker
```

Optional split-postgres variables if `DATABASE_URL` is omitted:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=expense-tracker
PGUSER=postgres
PGPASSWORD=postgres
```

### Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Run Locally

### 1) Backend setup

```bash
cd server
npm install
npm run prisma:generate
npm run dev
```

Backend: `http://localhost:8000`

### 2) Frontend setup

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:3000`

## Run with Docker Compose

From `server/`:

```bash
cd server
docker compose up -d --build
```

Services exposed by current compose file:

- API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:8080`
- InfluxDB: `http://localhost:8086`
- Grafana: `http://localhost:3001`

Stop:

```bash
docker compose down
```

Stop + remove volumes:

```bash
docker compose down -v
```

## Testing and Performance

### Backend tests

```bash
cd server
npm test
npm run test:coverage
```

Test files:

- `server/src/__tests__/auth.routes.test.ts`
- `server/src/__tests__/expense.routes.test.ts`

Coverage thresholds are configured in `server/jest.config.ts`.

### k6 load testing

Script: `server/loadtest/expenses.k6.js`

It supports env overrides such as:

- `BASE_URL`
- **`K6_EMAIL`******
- `K6_PASSWORD`
- `K6_NAME`

Example:

```bash
k6 run server/loadtest/expenses.k6.js
```

## Deployment Guidance (EC2)

Recommended production shape:

- Host backend on EC2 (Docker Compose or system service)
- Use managed PostgreSQL (AWS RDS) instead of local container DB
- Build frontend and serve via Nginx (or S3 + CloudFront)
- Put Nginx reverse proxy in front of API
- Enable HTTPS via ACM/ALB or Certbot
- Restrict SSH and DB security group ingress

## Known Caveats

- Current expense update endpoint is `POST /api/expenses/:id` (not `PUT/PATCH`).
- Some repo docs/files may still contain legacy references from older revisions.
- DB naming may vary across files/env values; ensure a single consistent DB name in your deployment config.

# PennyWise Expense Tracker

Full-stack expense tracking application with a React frontend and an Express API backend.
The backend uses PostgreSQL with Prisma and JWT-based authentication.

## Project Overview

- Frontend: React 19 + TypeScript + Vite + TanStack Router + Zustand
- Backend: Express 5 + TypeScript + Prisma + PostgreSQL + `pg`
- Auth: JWT (`Authorization: Bearer <token>`)
- Visualization: Recharts
- Containerization: Docker + Docker Compose
- Testing: Jest + Supertest (backend), k6 load test script

## Screenshots

| Page      | Preview                                                         |
| --------- | --------------------------------------------------------------- |
| Sign Up   | ![Signup](./PennyWise-Screenshots/1-Signup-PennyWise.png)       |
| Login     | ![Login](./PennyWise-Screenshots/2-Login-PennyWise.png)         |
| Home      | ![Home](./PennyWise-Screenshots/3-Home-PennyWise.png)           |
| Dashboard | ![Dashboard](./PennyWise-Screenshots/4-Dashboard-PennyWise.png) |
| Expenses  | ![Expenses](./PennyWise-Screenshots/5-Expenses-PennyWise.png)   |
| Analytics | ![Analytics](./PennyWise-Screenshots/6-Analytics-PennyWise.png) |

## Repository Structure

```text
Expense_Tracker_App/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── routeTree.gen.ts
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── __tests__/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── types/
│   │   ├── utils/
│   │   └── index.ts
│   ├── loadtest/
│   │   └── expenses.k6.js
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── package.json
├── PROJECT_FLOWCHART.md
└── README.md
```

## Tech Stack

### Frontend (`client`)

- `react`, `react-dom`
- `@tanstack/react-router`
- `zustand`
- `axios`
- `recharts`
- `lucide-react`
- `vite`
- `typescript`
- `tailwindcss` + `@tailwindcss/vite`

### Backend (`server`)

- `express`
- `typescript`
- `@prisma/client` + `prisma`
- `pg`
- `jsonwebtoken`
- `bcryptjs`
- `cors`
- `dotenv`
- `nodemon` + `tsx`
- `jest`, `ts-jest`, `supertest`

## Current Features (Code-Verified)

- User signup and login
- JWT-protected API routes
- Expense management (create, read, update, delete)
- Dashboard and analytics endpoints
- Profile retrieval and profile update
- User data export
- Account deletion
- Request timing middleware (`X-Response-Time` header)

## Frontend Details

- TanStack Router file-based routes are generated in `client/src/routeTree.gen.ts`.
- Protected pages (`/dashboard`, `/expenses`, `/analytics`, `/profile`) enforce auth in route guards.
- Axios client in `client/src/services/api.ts`:
  - adds JWT token from local storage to requests
  - clears auth and redirects to `/login` on `401`
- Vite dev server runs on **port `3000`** (configured in `client/vite.config.ts`).

## Backend Details

- App entrypoint: `server/src/index.ts`
- API base: `http://localhost:8000/api`
- Middleware chain includes:
  - CORS
  - JSON body parser
  - request timing middleware
  - route mounting
  - 404 handler
  - global error handler

### Route Map (Exact Methods)

#### Public

- `GET /`
- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/login`

#### Protected (`requireAuth`)

##### Expenses (`/api/expenses`)

- `GET /`
- `GET /:id`
- `POST /`
- `POST /:id` (update)
- `DELETE /:id`

##### Profile (`/api/profile`)

- `GET /`
- `PUT /`
- `GET /export`
- `DELETE /account`

##### Analytics (`/api/analytics`)

- `GET /category`
- `GET /monthly`
- `GET /dashboard`
- `GET /trends`
- `GET /period`
- `GET /current-month`
- `GET /yearly-categories`
- `GET /all-years`

## Authentication

- Login returns a JWT.
- Send token in headers for protected routes:

```http
Authorization: Bearer <jwt_token>
```

## Database

- Database provider: PostgreSQL
- Prisma schema: `server/prisma/schema.prisma`
- Models:
  - `User`
  - `Expense`
- In addition to Prisma model methods, analytics controllers execute raw SQL through `pg` for aggregations.
- Startup DB initialization in `server/src/config/db.ts` creates required tables/indexes if missing.

## Environment Variables

### Backend (`server/.env`)

Required by code:

```env
PORT=8000
NODE_ENV=development
JWT_SECRET=replace-with-strong-secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense-tracker
```

`server/src/config/db.ts` also supports split PG vars if `DATABASE_URL` is not set:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=expense-tracker
PGUSER=postgres
PGPASSWORD=postgres
```

### Frontend (`client/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

If omitted, client falls back to `http://localhost:8000/api`.

## Local Development

### 1) Start backend

```bash
cd server
npm install
npm run prisma:generate
npm run dev
```

Backend runs at `http://localhost:8000`.

### 2) Start frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Docker Compose (Server Side)

From `server/`:

```bash
docker compose up -d --build
```

Exposed services from `server/docker-compose.yml`:

- API: `8000`
- PostgreSQL: `5432`
- pgAdmin: `8080`
- InfluxDB: `8086`
- Grafana: `3001`

Stop services:

```bash
docker compose down
```

Remove volumes as well:

```bash
docker compose down -v
```

## Scripts

### Client

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

### Server

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm test`
- `npm run test:coverage`

## Testing and Performance

- Backend tests: `server/src/__tests__/`
- Test runner: Jest with ts-jest ESM config (`server/jest.config.ts`)
- Coverage thresholds configured in Jest (global lines/statements/functions/branches)
- Load test script: `server/loadtest/expenses.k6.js`

## Important Notes

- This project is currently PostgreSQL/Prisma-based (not MongoDB/Mongoose).
- Some legacy docs/files in the repo may still reference older behavior.
- Route behavior in this README reflects the current code exactly (including `POST /api/expenses/:id` for updates).

