import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import contractsRouter from './routes/contracts.js';
import competitorsRouter from './routes/competitors.js';
import scenariosRouter from './routes/scenarios.js';
import referenceRouter from './routes/reference.js';
import exportRouter from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/contracts', contractsRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// Express 5 forwards async rejections automatically; this catches them all.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);

  // Prisma known-request errors
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that value already exists', field: err.meta?.target });
  }

  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({ error: err.message ?? 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
