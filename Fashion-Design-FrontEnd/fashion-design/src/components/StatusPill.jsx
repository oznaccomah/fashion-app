/** StatusPill – coloured badge for an order status */
export default function StatusPill({ status }) {
  // Map "In progress" → "In-progress" for the CSS class
  const cls = 'pill pill-' + status.replace(/\s+/g, '-')
  return <span className={cls}>{status}</span>
}

