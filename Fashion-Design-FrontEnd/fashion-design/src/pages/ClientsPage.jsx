/**
 * ClientsPage – browse / search all clients
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { clientsApi } from '../api'
import styles from './ClientsPage.module.css'

export default function ClientsPage() {
  const [q, setQ] = useState('')

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', q],
    queryFn: () => clientsApi.list(q),
  })

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>Clients</h1>
        <Link to="/clients/new" className="btn btn-primary">+ New client</Link>
      </div>

      <input
        type="search"
        className="input"
        placeholder="Search by name or phone…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search clients"
      />

      {isLoading && <p className={styles.muted}>Loading…</p>}

      {!isLoading && clients.length === 0 && (
        <p className={styles.muted}>
          {q ? 'No clients match that search.' : 'No clients yet. '}
          {!q && <Link to="/clients/new">Add your first client</Link>}
        </p>
      )}

      {clients.length > 0 && (
        <div className={`card ${styles.tableCard}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Measurements</th><th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className={styles.nameCell}>
                    <Link to={`/clients/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{c.phone}</td>
                  <td className={styles.muted}>
                    {c.measurement_count ? `${c.measurement_count} of 27` : 'None yet'}
                  </td>
                  <td><Link to={`/clients/${c.id}`} className={styles.openLink}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
