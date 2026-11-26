/**
 * ClientPage – single client view
 *
 * Shows:
 *  - Name + "Edit client" and "+ Create order" buttons
 *  - Contact card
 *  - Measurements card (latest set, count, filled values, View all / Re-measure)
 *  - Orders card (list with status dropdown + Open link)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, clientsApi } from '../api'
import StatusPill from '../components/StatusPill'
import { useSettings } from '../context/SettingsContext'
import { fromCm } from '../utils/units'
import styles from './ClientPage.module.css'

const STATUSES = ['Ordered', 'In progress', 'Fitting', 'Ready', 'Collected']
const CURRENCY = 'R'

function fmt(v) { return `${CURRENCY}${Number(v).toFixed(2)}` }
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ClientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { unit } = useSettings()
  const qc = useQueryClient()

  const { data: client, isLoading, isError } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id),
  })

  // Latest measurement set details (if set_id exists)
  const { data: latestSet } = useQuery({
    queryKey: ['set', client?.latest_set_id],
    queryFn: () => api.get(`/sets/${client.latest_set_id}`),
    enabled: !!client?.latest_set_id,
  })

  // Orders for this client
  const { data: orders = [] } = useQuery({
    queryKey: ['client-orders', id],
    queryFn: () => api.get(`/orders?client_id=${id}`),
  })

  // Status change in-line
  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }) =>
      api.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['client-orders', id])
      qc.invalidateQueries(['dashboard'])
    },
  })

  // Delete client
  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['clients']); navigate('/clients') },
    onError: (err) => alert(err.message),
  })

  if (isLoading) return <main className={styles.page}><p>Loading…</p></main>
  if (isError)   return <main className={styles.page}><p style={{color:'var(--color-error)'}}>Client not found.</p></main>

  const measureCount = client.measurement_count ?? 0

  return (
    <main className={styles.page}>
      {/* ── Title row ── */}
      <div className={styles.titleRow}>
        <div>
          <Link to="/clients" className={styles.back}>← All clients</Link>
          <h1 className={styles.name}>{client.name}</h1>
        </div>
        <div className={styles.titleActions}>
          <Link to={`/clients/${id}/edit`} className="btn btn-secondary">Edit client</Link>
          <Link to={`/orders/new?client_id=${id}`} className="btn btn-primary">+ Create order</Link>
        </div>
      </div>

      {/* ── Contact ── */}
      <section className={`card ${styles.contactCard}`}>
        <h2>Contact</h2>
        <dl className={styles.dl}>
          <dt>Phone</dt><dd>{client.phone}</dd>
          {client.address && <><dt>Address</dt><dd>{client.address}</dd></>}
          {client.email   && <><dt>Email</dt>  <dd><a href={`mailto:${client.email}`}>{client.email}</a></dd></>}
          {client.notes   && <><dt>Notes</dt>  <dd>{client.notes}</dd></>}
        </dl>
      </section>

      {/* ── Measurements ── */}
      <section className={`card ${styles.card}`}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Measurements</h2>
            <p className={styles.muted}>
              {measureCount > 0
                ? `${measureCount} of 27 recorded`
                : 'No measurements yet'}
              {client.latest_set_date && ` · ${fmtDate(client.latest_set_date)}`}
            </p>
          </div>
          <div className={styles.cardActions}>
            {client.latest_set_id && (
              <Link to={`/clients/${id}/sets/${client.latest_set_id}`} className="btn btn-secondary">
                View all
              </Link>
            )}
            <Link to={`/clients/${id}/remeasure`} className="btn btn-secondary">Re-measure</Link>
          </div>
        </div>

        {latestSet?.measurements?.length > 0 ? (
          <dl className={styles.measureList}>
            {latestSet.measurements.map((m) => (
              <div key={m.type_id} className={styles.measureRow}>
                <dt>{m.type_name}</dt>
                <dd>{fromCm(m.value_cm, unit)} {unit}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.muted}>No measurements recorded.</p>
        )}
      </section>

      {/* ── Orders ── */}
      <section className={`card ${styles.card}`}>
        <div className={styles.cardHeader}>
          <h2>Orders</h2>
          <Link to={`/orders/new?client_id=${id}`} className="btn btn-secondary">+ New order</Link>
        </div>

        {orders.length === 0
          ? <p className={styles.muted}>No orders yet.</p>
          : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Outfit</th><th>Ordered</th><th>Collection</th><th>Balance</th>
                  <th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.outfit_type}</td>
                    <td>{fmtDate(o.ordering_date)}</td>
                    <td>{fmtDate(o.collection_date)}</td>
                    <td>{fmt(o.balance_due)}</td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={o.status}
                        onChange={(e) => statusMutation.mutate({ orderId: o.id, status: e.target.value })}
                        aria-label={`Change status for ${o.outfit_type}`}
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <Link to={`/orders/${o.id}`} className={styles.openLink}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </section>

      {/* ── Danger zone ── */}
      <section className={`card ${styles.dangerCard}`}>
        <p className={styles.muted}>Deleting a client is permanent and cannot be undone. Clients with orders cannot be deleted.</p>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm(`Delete ${client.name}? This cannot be undone.`)) {
              deleteMutation.mutate()
            }
          }}
        >
          Delete client
        </button>
      </section>
    </main>
  )
}

