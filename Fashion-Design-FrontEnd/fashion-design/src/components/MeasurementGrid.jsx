/**
 * MeasurementGrid
 *
 * Renders all 27 measurement fields in a 3-column grid.
 * Each field: label | input | unit suffix
 *
 * Props:
 *  types       – array from GET /measurement-types
 *  values      – object keyed by type_id: { [type_id]: string (display value) }
 *  onChange    – fn(type_id, rawString) called on every keystroke
 *  unit        – 'cm' | 'in'
 *  tags        – optional object { [type_id]: 'adjusted' | 'new' | 'cleared' }
 *  readOnly    – boolean
 */

import styles from './MeasurementGrid.module.css'
import { unitLabel } from '../utils/units'

export default function MeasurementGrid({
  types = [],
  values = {},
  onChange,
  unit,
  tags = {},
  readOnly = false,
}) {
  return (
    <div className={styles.grid}>
      {types.map((t) => {
        const tag = tags[t.id]
        return (
          <div key={t.id} className={styles.field}>
            <label className={styles.label} htmlFor={`m-${t.id}`}>
              {t.name}
            </label>
            <div className={styles.inputRow}>
              <input
                id={`m-${t.id}`}
                type="text"
                inputMode="decimal"
                className={`input ${styles.input}`}
                placeholder="—"
                value={values[t.id] ?? ''}
                readOnly={readOnly}
                onChange={readOnly ? undefined : (e) => onChange(t.id, e.target.value)}
                aria-label={`${t.name} in ${unitLabel(unit)}`}
              />
              <span className={styles.unit}>{unitLabel(unit)}</span>
            </div>
            {tag === 'adjusted' && <span className="tag-adjusted">Adjusted</span>}
            {tag === 'new'      && <span className="tag-new">New</span>}
          </div>
        )
      })}
    </div>
  )
}

