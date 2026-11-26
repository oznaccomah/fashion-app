/**
 * GET /api/dashboard
 * Returns everything the Home page needs in a single request:
 *  - stageCounts   : { Ordered, 'In progress', Fitting, Ready, Collected }
 *  - collectedMonth: number
 *  - upcoming      : orders with fitting/collection date in next 10 days
 *  - balances      : unpaid orders (balance_due > 0, not Collected)
 *  - balanceTotal  : sum of balance_due across those orders
 *  - recentOrders  : last 10 orders
 *  - recentClients : last 10 clients
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [
      stageRes,
      collectedRes,
      upcomingRes,
      balanceRes,
      recentOrdersRes,
      recentClientsRes,
    ] = await Promise.all([
      // Stage counts
      pool.query(`
        SELECT status, COUNT(*)::int AS cnt
        FROM orders
        GROUP BY status
      `),

      // Collected this month
      pool.query(`
        SELECT COUNT(*)::int AS cnt
        FROM orders
        WHERE status = 'Collected'
          AND collected_at >= date_trunc('month', now())
      `),

      // Upcoming fittings & collections (next 10 days, not yet collected)
      pool.query(`
        SELECT o.id, c.name AS client_name, o.outfit_type,
               o.fitting_date, o.collection_date, o.status
        FROM orders o
        JOIN clients c ON c.id = o.client_id
        WHERE o.status <> 'Collected'
          AND (
                o.fitting_date    BETWEEN CURRENT_DATE AND CURRENT_DATE + 10
             OR o.collection_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 10
          )
        ORDER BY LEAST(
          COALESCE(o.fitting_date,    '9999-12-31'::date),
          COALESCE(o.collection_date, '9999-12-31'::date)
        )
      `),

      // Balances owing
      pool.query(`
        SELECT o.id, c.name AS client_name, o.outfit_type,
               o.balance_due, o.status
        FROM orders o
        JOIN clients c ON c.id = o.client_id
        WHERE o.balance_due > 0
          AND o.status <> 'Collected'
        ORDER BY o.balance_due DESC
      `),

      // Recent orders (last 10)
      pool.query(`
        SELECT o.id, c.name AS client_name, o.outfit_type,
               o.status, o.ordering_date, o.balance_due
        FROM orders o
        JOIN clients c ON c.id = o.client_id
        ORDER BY o.created_at DESC
        LIMIT 10
      `),

      // Recently added clients (last 10)
      pool.query(`
        SELECT id, name, phone, created_at
        FROM clients
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    // Build stageCounts map
    const STATUSES = ['Ordered', 'In progress', 'Fitting', 'Ready', 'Collected'];
    const stageCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const { status, cnt } of stageRes.rows) {
      stageCounts[status] = cnt;
    }

    const balances = balanceRes.rows;
    const balanceTotal = balances.reduce((sum, r) => sum + Number(r.balance_due), 0);

    res.json({
      stageCounts,
      collectedMonth: collectedRes.rows[0]?.cnt ?? 0,
      upcoming:       upcomingRes.rows,
      balances,
      balanceTotal:   Math.round(balanceTotal * 100) / 100,
      recentOrders:   recentOrdersRes.rows,
      recentClients:  recentClientsRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;

