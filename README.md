# PTW App — Price to Win

A full-stack web application for **Price to Win (PTW)** analysis in government contracting business development (BD).

PTW analysis helps BD teams estimate the price a competitor is likely to bid on a government contract, enabling informed pricing strategy to maximize the probability of award while maintaining profitability.

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS            |
| Backend  | Node.js, Express 5                      |
| ORM      | Prisma                                  |
| Database | SQLite (dev) / PostgreSQL (prod)        |

---

## Project Structure

```
ptw-app/
├── client/          # React 18 + Vite + Tailwind frontend
│   └── src/
│       ├── App.jsx
│       └── index.css
├── server/          # Node.js + Express + Prisma backend
│   ├── src/
│   │   └── index.js
│   └── prisma/
│       └── schema.prisma
└── package.json     # Root — runs both concurrently
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
npm run install:all
```

### Development

```bash
npm run dev
```

This starts both the client (port **5173**) and server (port **3001**) concurrently.

| Service | URL                       |
|---------|---------------------------|
| Client  | http://localhost:5173      |
| API     | http://localhost:3001/api  |

The Vite dev server proxies `/api/*` requests to the Express server automatically.

### Run individually

```bash
npm run dev:client   # Frontend only
npm run dev:server   # Backend only
```

---

## Database (Prisma)

```bash
cd server

# Generate Prisma client after schema changes
npm run prisma:generate

# Create and apply a migration
npm run prisma:migrate
```
