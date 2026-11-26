/**
 * HomePage – dashboard
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import StatusPill from '../components/StatusPill'
import styles from './HomePage.module.css'

const CURRENCY = 'R'
const STAGES = ['Ordered', 'In progress', 'Fitting', 'Ready', 'Collected']

function today() {
  return new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function fmt(amount) { return `${CURRENCY}${Number(amount).toFixed(2)}` }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export default function HomePage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  })

  const { data: searchResults } = useQuery({
    queryKey: ['clients-search', search],
    queryFn: () => api.get(`/clients?q=${encodeURIComponent(search)}`),
    enabled: search.trim().length > 0,
  })

  if (isLoading) return <main className={styles.page}><p className={styles.muted}>Loading…</p></main>
  if (isError)   return <main className={styles.page}><p style={{color:'var(--color-error)'}}>Failed to load dashboard.</p></main>

  const { stageCounts, collectedMonth, upcoming, balances, balanceTotal, recentOrders, recentClients } = data

  return (
    <main className={styles.page}>
      {/* Header */}
      <section className={styles.header}>
        <div>
          <h1 className={styles.brand}>Designique by Mandy</h1>
          <p className={styles.date}>{today()}</p>
        </div>
        <div className={styles.quickActions}>
          <Link to="/clients/new" className="btn btn-secondary">+ New client</Link>
          <Link to="/orders/choose-client" className="btn btn-primary">+ New order</Link>
        </div>
      </section>

      {/* Find a client */}
      <section className={`card ${styles.searchCard}`}>
        <label htmlFor="client-search" className={styles.searchLabel}>Find a client</label>
        <input
          id="client-search"
          type="search"
          className="input"
          placeholder="Name or phone number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        {search.trim() && searchResults && (
          <ul className={styles.searchResults}>
            {searchResults.length === 0 && (
              <li className={styles.noResult}>
                No clients found. <Link to="/clients/new">Add as new client</Link>
              </li>
            )}
            {searchResults.map((c) => (
              <li key={c.id}>
                <Link to={`/clients/${c.id}`} className={styles.searchRow}>
                  <span className={styles.searchName}>{c.name}</span>
                  <span className={styles.searchPhone}>{c.phone}</span>
                  <span className={styles.searchMeasure}>
                    {c.measurement_count ? `${c.measurement_count} of 27 measurements` : 'No measurements yet'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Orders by stage */}
      <section>
        <h2 className={styles.sectionTitle}>Orders by stage</h2>
        <div className={styles.stageTiles}>
          {STAGES.map((s) => (
            <div key={s} className={`card ${styles.stageTile}`}>
              <StatusPill status={s} />
              <span className={styles.stageCount}>
                {s === 'Collected' ? collectedMonth : (stageCounts[s] ?? 0)}
              </span>
              {s === 'Collected' && <span className={styles.stageNote}>this month</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Coming up */}
      <section>
        <h2 className={styles.sectionTitle}>Coming up <span className={styles.sub}>(next 10 days)</span></h2>
        {upcoming.length === 0
          ? <p className={styles.muted}>Nothing scheduled in the next 10 days.</p>
          : (
            <div className={`card ${styles.tableCard}`}>
              <table className={styles.table}>
                <thead><tr><th>Client</th><th>Outfit</th><th>Fitting</th><th>Collection</th><th>Status</th></tr></thead>
                <tbody>
                  {upcoming.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className={styles.clickRow}>
                      <td>{o.client_name}</td><td>{o.outfit_type}</td>
                      <td>{fmtDate(o.fitting_date)}</td><td>{fmtDate(o.collection_date)}</td>
                      <td><StatusPill status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </section>

      {/* Balances */}
      <section>
        <h2 className={styles.sectionTitle}>
          Balances owing
          {balances.length > 0 && <span className={styles.balanceTotal}> — Total: {fmt(balanceTotal)}</span>}
        </h2>
        {balances.length === 0
          ? <p className={styles.muted}>No outstanding balances.</p>
          : (
            <div className={`card ${styles.tableCard}`}>
              <table className={styles.table}>
                <thead><tr><th>Client</th><th>Outfit</th><th>Balance due</th><th>Status</th></tr></thead>
                <tbody>
                  {balances.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className={styles.clickRow}>
                      <td>{o.client_name}</td><td>{o.outfit_type}</td>
                      <td className={styles.balance}>{fmt(o.balance_due)}</td>
                      <td><StatusPill status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </section>

      {/* Recent orders */}
      <section>
        <h2 className={styles.sectionTitle}>Recent orders</h2>
        {recentOrders.length === 0
          ? <p className={styles.muted}>No orders yet.</p>
          : (
            <div className={`card ${styles.tableCard}`}>
              <table className={styles.table}>
                <thead><tr><th>Client</th><th>Outfit</th><th>Date</th><th>Balance</th><th>Status</th></tr></thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className={styles.clickRow}>
                      <td>{o.client_name}</td><td>{o.outfit_type}</td>
                      <td>{fmtDate(o.ordering_date)}</td><td>{fmt(o.balance_due)}</td>
                      <td><StatusPill status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </section>

      {/* Recently added clients */}
      <section>
        <h2 className={styles.sectionTitle}>Recently added clients</h2>
        {recentClients.length === 0
          ? <p className={styles.muted}>No clients yet. <Link to="/clients/new">Add your first client</Link>.</p>
          : (
            <div className={styles.clientChips}>
              {recentClients.map((c) => (
                <Link key={c.id} to={`/clients/${c.id}`} className={`card ${styles.clientChip}`}>
                  <span className={styles.chipName}>{c.name}</span>
                  <span className={styles.chipPhone}>{c.phone}</span>
                </Link>
              ))}
            </div>
          )
        }
      </section>
    </main>
  )
}
