/**
 * TopBar – persistent navigation bar
 *
 * Brand "Designique by Mandy" on the left.
 * Nav links Home / Clients / Orders on the right.
 * Active link gets an underline + bold weight (via .active class).
 */

import { NavLink } from 'react-router-dom'
import styles from './TopBar.module.css'

const NAV_LINKS = [
  { to: '/',        label: 'Home'    },
  { to: '/clients', label: 'Clients' },
  { to: '/orders',  label: 'Orders'  },
]

export default function TopBar() {
  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Designique by Mandy</span>
      <nav className={styles.nav} aria-label="Main navigation">
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.active : ''].join(' ').trim()
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

