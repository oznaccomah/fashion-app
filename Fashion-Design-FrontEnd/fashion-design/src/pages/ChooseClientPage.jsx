/**
 * ChooseClientPage – Step 1 of "New order"
 *
 * Two big toggle cards: Existing client (default) | New client
 * Existing: live search; each row shows name, phone, measurement count.
 *           Clicking a row goes to /orders/new?client_id=<id>
 * Empty result offers "Add them as a new client"
 * New client: explanation + button to /clients/new?from=order
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { clientsApi } from '../api'
import styles from './ChooseClientPage.module.css'

export default function ChooseClientPage() {
  const [tab, setTab] = useState('existing')
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['clients-search', q],
    queryFn: () => clientsApi.list(q),
    enabled: tab === 'existing',
  })

  return (
    <main className={styles.page}>
      <h1>New order — choose a client</h1>

      {/* ── Tabs ── */}
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'existing'}
          className={`${styles.tab} ${tab === 'existing' ? styles.tabActive : ''}`}
          onClick={() => setTab('existing')}
        >
          Existing client
        </button>
        <button
          role="tab"
          aria-selected={tab === 'new'}
          className={`${styles.tab} ${tab === 'new' ? styles.tabActive : ''}`}
          onClick={() => setTab('new')}
        >
          New client
        </button>
      </div>

      {/* ── Existing ── */}
      {tab === 'existing' && (
        <div className={`card ${styles.panel}`}>
          <input
            type="search"
            className="input"
            placeholder="Search by name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            aria-label="Search clients"
          />

          {isFetching && <p className={styles.muted}>Searching…</p>}

          {!isFetching && results.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.muted}>No clients found.</p>
              <Link to="/clients/new?from=order" className="btn btn-secondary">
                Add them as a new client
              </Link>
            </div>
          )}

          {results.length > 0 && (
            <ul className={styles.list}>
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    className={styles.clientRow}
                    onClick={() => navigate(`/orders/new?client_id=${c.id}`)}
                  >
                    <span className={styles.clientName}>{c.name}</span>
                    <span className={styles.clientPhone}>{c.phone}</span>
                    <span className={styles.clientMeasure}>
                      {c.measurement_count
                        ? `${c.measurement_count} of 27 measurements recorded`
                        : 'No measurements yet'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── New client ── */}
      {tab === 'new' && (
        <div className={`card ${styles.panel} ${styles.newPanel}`}>
          <p>You'll add the client's details and measurements first, then create the order.</p>
          <Link to="/clients/new?from=order" className="btn btn-primary">
            Add a new client &amp; continue
          </Link>
        </div>
      )}
    </main>
  )
}

