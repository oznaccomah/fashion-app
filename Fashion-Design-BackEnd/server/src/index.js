/**
 * Designique by Mandy – Express API
 * Port: 4000  (Vite client proxies /api → http://localhost:4000)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import settingsRouter        from './routes/settings.js';
import measurementTypesRouter from './routes/measurementTypes.js';
import clientsRouter         from './routes/clients.js';
import setsRouter            from './routes/sets.js';
import dashboardRouter       from './routes/dashboard.js';
import ordersRouter          from './routes/orders.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/settings',          settingsRouter);
app.use('/api/measurement-types', measurementTypesRouter);
app.use('/api/clients',           clientsRouter);

// Sets: two mount points
//   POST /api/clients/:id/sets   → handled by clientsRouter + setsRouter merged
//   GET/PUT/DELETE /api/sets/:id → standalone
app.use('/api/clients/:id/sets',  setsRouter);
app.use('/api/sets',              setsRouter);
app.use('/api/dashboard',         dashboardRouter);
app.use('/api/orders',            ordersRouter);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Designique API listening on http://localhost:${PORT}`);
});

