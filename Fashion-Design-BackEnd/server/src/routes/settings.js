/**
 * GET  /api/settings      → { id, unit }
 * PUT  /api/settings      body: { unit }  → { id, unit }
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, unit FROM settings WHERE id = 1');
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  const { unit } = req.body;

  if (!unit || !['cm', 'in'].includes(unit)) {
    return res.status(400).json({ error: 'unit must be "cm" or "in"' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE settings SET unit = $1 WHERE id = 1 RETURNING id, unit',
      [unit],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;

