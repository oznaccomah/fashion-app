/**
 * Measurement sets resource
 *
 * POST   /api/clients/:id/sets         add a new measurement set for a client
 * GET    /api/sets/:id                 single set with its measurement values
 * PUT    /api/sets/:id                 replace all measurements in a set
 * DELETE /api/sets/:id                 delete a set (and its measurements via CASCADE)
 */

import { Router } from 'express';
import pool from '../db.js';
import { validateMeasurements } from '../utils/measurements.js';

const router = Router({ mergeParams: true });

// ─── helpers ────────────────────────────────────────────────────────────────

/** Fetch a full set row with an array of measurement values. */
async function fetchSetWithMeasurements(client, setId) {
  const { rows: [set] } = await client.query(
    `SELECT ms.id, ms.client_id, ms.date_taken, ms.fitting_notes, ms.created_at
     FROM measurement_sets ms
     WHERE ms.id = $1`,
    [setId],
  );
  if (!set) return null;

  const { rows: measurements } = await client.query(
    `SELECT m.measurement_type_id AS type_id,
            mt.name               AS type_name,
            mt.sort_order,
            m.value_cm
     FROM measurements m
     JOIN measurement_types mt ON mt.id = m.measurement_type_id
     WHERE m.set_id = $1
     ORDER BY mt.sort_order`,
    [setId],
  );

  return { ...set, measurements };
}

// ─── POST /api/clients/:id/sets ─────────────────────────────────────────────

router.post('/', async (req, res) => {
  const clientId = req.params.id;
  const { date_taken, fitting_notes, measurements = [] } = req.body;

  const err = validateMeasurements(measurements);
  if (err) return res.status(400).json({ error: err });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Confirm client exists
    const { rows: clients } = await client.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (!clients.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Client not found' });
    }

    const { rows: [newSet] } = await client.query(
      `INSERT INTO measurement_sets (client_id, date_taken, fitting_notes)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [clientId, date_taken || null, fitting_notes || null],
    );

    for (const { type_id, value_cm } of measurements) {
      await client.query(
        `INSERT INTO measurements (set_id, measurement_type_id, value_cm)
         VALUES ($1, $2, $3)`,
        [newSet.id, type_id, value_cm],
      );
    }

    await client.query('COMMIT');

    const full = await fetchSetWithMeasurements(pool, newSet.id);
    res.status(201).json(full);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create measurement set' });
  } finally {
    client.release();
  }
});

// ─── GET /api/sets/:id ──────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const set = await fetchSetWithMeasurements(pool, req.params.id);
    if (!set) return res.status(404).json({ error: 'Measurement set not found' });
    res.json(set);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch measurement set' });
  }
});

// ─── PUT /api/sets/:id ──────────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { date_taken, fitting_notes, measurements = [] } = req.body;

  const validErr = validateMeasurements(measurements);
  if (validErr) return res.status(400).json({ error: validErr });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE measurement_sets
       SET date_taken = $1, fitting_notes = $2
       WHERE id = $3
       RETURNING id`,
      [date_taken || null, fitting_notes || null, id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Measurement set not found' });
    }

    // Replace all measurement values
    await client.query('DELETE FROM measurements WHERE set_id = $1', [id]);
    for (const { type_id, value_cm } of measurements) {
      await client.query(
        `INSERT INTO measurements (set_id, measurement_type_id, value_cm)
         VALUES ($1, $2, $3)`,
        [id, type_id, value_cm],
      );
    }

    await client.query('COMMIT');

    const full = await fetchSetWithMeasurements(pool, id);
    res.json(full);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update measurement set' });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/sets/:id ───────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM measurement_sets WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete measurement set' });
  }
});

export default router;

