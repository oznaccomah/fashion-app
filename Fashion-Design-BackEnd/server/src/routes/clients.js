/**
 * Clients resource
 *
 * GET    /api/clients?q=          search by name or phone (with latest-set info)
 * POST   /api/clients             create client (+ optional first measurement set)
 * GET    /api/clients/:id         single client with latest-set info
 * PUT    /api/clients/:id         update client fields
 * DELETE /api/clients/:id         delete (fails with 409 if the client has orders)
 */

import { Router } from 'express';
import pool from '../db.js';
import { validateMeasurements } from '../utils/measurements.js';

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

/** Columns returned for a single client + latest-set summary */
const CLIENT_SELECT = `
  c.id,
  c.name,
  c.phone,
  c.address,
  c.email,
  c.notes,
  c.created_at,
  c.updated_at,
  vl.set_id          AS latest_set_id,
  vl.date_taken      AS latest_set_date,
  vl.measurement_count
`;

const CLIENT_JOIN = `
  FROM clients c
  LEFT JOIN v_client_latest_set vl ON vl.client_id = c.id
`;

// ─── GET /api/clients?q= ────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { q = '' } = req.query;
  try {
    const pattern = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT ${CLIENT_SELECT}
       ${CLIENT_JOIN}
       WHERE ($1 = '' OR c.name ILIKE $1 OR c.phone ILIKE $1)
       ORDER BY c.name`,
      [pattern],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// ─── POST /api/clients ──────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { name, phone, address, email, notes, measurement_set } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'phone is required' });

  // Optional measurement_set: { date_taken?, fitting_notes?, measurements: [{type_id, value_cm}] }
  let measurementError = null;
  if (measurement_set?.measurements) {
    measurementError = validateMeasurements(measurement_set.measurements);
  }
  if (measurementError) return res.status(400).json({ error: measurementError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [newClient] } = await client.query(
      `INSERT INTO clients (name, phone, address, email, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, phone, address, email, notes, created_at, updated_at`,
      [name.trim(), phone.trim(), address || null, email || null, notes || null],
    );

    if (measurement_set?.measurements?.length) {
      const { date_taken, fitting_notes, measurements } = measurement_set;

      const { rows: [newSet] } = await client.query(
        `INSERT INTO measurement_sets (client_id, date_taken, fitting_notes)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [newClient.id, date_taken || null, fitting_notes || null],
      );

      for (const { type_id, value_cm } of measurements) {
        await client.query(
          `INSERT INTO measurements (set_id, measurement_type_id, value_cm)
           VALUES ($1, $2, $3)`,
          [newSet.id, type_id, value_cm],
        );
      }

      newClient.latest_set_id = newSet.id;
      newClient.measurement_count = measurements.length;
    } else {
      newClient.latest_set_id = null;
      newClient.measurement_count = 0;
    }

    await client.query('COMMIT');
    res.status(201).json(newClient);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create client' });
  } finally {
    client.release();
  }
});

// ─── GET /api/clients/:id ───────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT ${CLIENT_SELECT} ${CLIENT_JOIN} WHERE c.id = $1`,
      [id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// ─── PUT /api/clients/:id ───────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, address, email, notes } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!phone || !phone.trim()) return res.status(400).json({ error: 'phone is required' });

  try {
    const { rows } = await pool.query(
      `UPDATE clients
       SET name = $1, phone = $2, address = $3, email = $4, notes = $5
       WHERE id = $6
       RETURNING id, name, phone, address, email, notes, created_at, updated_at`,
      [name.trim(), phone.trim(), address || null, email || null, notes || null, id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// ─── DELETE /api/clients/:id ────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    // FK RESTRICT: client has orders
    if (err.code === '23503') {
      return res.status(409).json({
        error: "This client has existing orders and can't be deleted. Remove their orders first.",
      });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;

