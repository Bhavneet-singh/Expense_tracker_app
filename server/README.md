# PennyWise Backend

Express 5 + TypeScript backend for PennyWise, now using PostgreSQL instead of MongoDB.

## Stack

- Node.js 18+
- Express 5
- TypeScript
- PostgreSQL
- Prisma Client
- Raw SQL for schema setup and analytics queries
- JWT
- bcryptjs
- Multer

## Environment

Create `server/.env` with:

```env
PORT=8000
JWT_SECRET=your-secure-jwt-secret-key
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pennywise
PGHOST=postgres
PGPORT=5432
PGDATABASE=pennywise
PGUSER=postgres
PGPASSWORD=postgres
```

These values are meant for the Docker Compose network, where the database hostname is `postgres`.

## Run With Docker

From the project root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on `localhost:5432`
- Backend API on `http://localhost:8000`

The backend creates the `users` and `expenses` tables automatically on startup.
Prisma handles the regular user and expense CRUD path, while SQL is used directly for database setup and the heavier reporting queries.

You can test database connectivity with:

```bash
npx tsx src/postgresTestConnection.ts
```

## Notes

- The database is intended to run from Docker only via `docker-compose.yml`.
- User IDs and expense IDs are PostgreSQL integer IDs returned as strings in the API.
- Uploaded avatars are persisted through the mounted `server/uploads` directory in Docker.
