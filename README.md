# Rachai API

Backend API for Rachai, a group bill-splitting app. Groups are created with a
short code and a PIN, participants log expenses, and the API works out who
owes whom with the smallest possible number of transfers.

## Stack

- Node.js + TypeScript, [Fastify](https://fastify.dev/)
- [Prisma](https://www.prisma.io/) ORM + PostgreSQL
- [Zod](https://zod.dev/) for payload validation
- Argon2id for PIN and password hashing
- [otplib](https://github.com/yeojz/otplib) for admin TOTP two-factor auth
- [Vitest](https://vitest.dev/) for tests

## Prerequisites

- Node.js 20+
- A PostgreSQL database

## Running locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npx prisma migrate dev
npm run dev
```

The server starts on `http://localhost:3000`. `GET /health` reports API and
database status.

## Tests

```bash
npm test
```

## Deployment

Deployed on [Railway](https://railway.app/) with a managed Postgres instance.
All configuration is passed through environment variables — see
`.env.example` for the full list.

## API overview

| Route | Description |
| --- | --- |
| `POST /groups` | Create a group, returns its join code |
| `POST /groups/:code/join` | Join with code + PIN, returns a session token |
| `GET /groups/:code` | Group details |
| `POST /groups/:code/participants` | Add a participant |
| `POST /groups/:code/expenses` | Log an expense |
| `GET /groups/:code/balances` | Net balances and suggested settling transfers |
| `POST /groups/:code/payments` | Record a payment between participants |
| `POST /admin/auth/login` | Admin login (email + password, then TOTP) |
| `GET /admin/dashboard/stats` | Aggregate usage stats |

Group and admin routes require a bearer token or session cookie obtained from
their respective login endpoints.
