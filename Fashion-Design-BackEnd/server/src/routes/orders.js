/**
 * Orders resource (Step 4 stub — extended fully in Step 5)
 *
 * GET  /api/orders?client_id=   list orders for a client (used by ClientPage)
 * PATCH /api/orders/:id/status  update status in-place
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const VALID_STATUSES = ['Ordered', 'In progress', 'Fitting', 'Ready', 'Collected'];

// GET /api/orders?client_id=&status=&q=
router.get('/', async (req, res) => {
  const { client_id, status, q } = req.query;
  try {
    const conditions = [];
    const params = [];

    if (client_id) {
      params.push(client_id);
      conditions.push(`o.client_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(c.name ILIKE $${params.length} OR o.outfit_type ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT o.id, o.client_id, c.name AS client_name,
              o.outfit_type, o.status,
              o.ordering_date, o.fitting_date, o.collection_date,
              o.total_price, o.deposit, o.total_paid, o.balance_due,
              o.notes, o.created_at, o.updated_at
       FROM orders o
       JOIN clients c ON c.id = o.client_id
       ${where}
       ORDER BY o.created_at DESC`,
      params,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2
       RETURNING id, status, collected_at`,
      [status, id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// GET /api/orders/:id  (single order – stub for ClientPage "Open" link)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, c.name AS client_name, c.phone AS client_phone, c.address AS client_address
       FROM orders o JOIN clients c ON c.id = o.client_id
       WHERE o.id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router;

