/**
 * GET /api/measurement-types
 * Returns all 27 measurement points in sort_order.
 * Response: [{ id, name, sort_order }, …]
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, sort_order FROM measurement_types ORDER BY sort_order',
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch measurement types' });
  }
});

export default router;

