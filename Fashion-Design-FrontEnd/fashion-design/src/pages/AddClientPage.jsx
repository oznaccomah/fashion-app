/**
 * AddClientPage
 *
 * Two cards: Client details + Measurements (27 fields).
 * Buttons: Cancel | Save without measurements | Save client
 *
 * Variant when ?from=order (arriving from "New order"):
 *  - shows a note
 *  - buttons become "Save without measurements & continue" / "Save & continue to order"
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { clientsApi, measurementTypesApi } from '../api'
import MeasurementGrid from '../components/MeasurementGrid'
import { useSettings } from '../context/SettingsContext'
import { toCm, fromCm } from '../utils/units'
import { useState } from 'react'
import styles from './AddClientPage.module.css'

export default function AddClientPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOrder = searchParams.get('from') === 'order'
  const { unit } = useSettings()
  const qc = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm()

  // Measurement values keyed by type_id
  const [mValues, setMValues] = useState({})
  const [dateTaken, setDateTaken] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [fittingNotes, setFittingNotes] = useState('')

  const { data: types = [] } = useQuery({
    queryKey: ['measurement-types'],
    queryFn: measurementTypesApi.list,
  })

  const mutation = useMutation({
    mutationFn: (body) => clientsApi.create(body),
    onSuccess: (newClient) => {
      qc.invalidateQueries(['dashboard'])
      qc.invalidateQueries(['clients'])
      if (fromOrder) {
        navigate(`/orders/new?client_id=${newClient.id}`)
      } else {
        navigate(`/clients/${newClient.id}`)
      }
    },
  })

  function buildBody(data, includeMeasurements) {
    const body = { ...data }
    if (includeMeasurements) {
      const measurements = Object.entries(mValues)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([type_id, v]) => ({
          type_id: Number(type_id),
          value_cm: toCm(v, unit),
        }))
        .filter((m) => m.value_cm !== null)

      if (measurements.length > 0) {
        body.measurement_set = { date_taken: dateTaken, fitting_notes: fittingNotes, measurements }
      }
    }
    return body
  }

  function onSave(data) { mutation.mutate(buildBody(data, true)) }
  function onSaveNoMeasurements(data) { mutation.mutate(buildBody(data, false)) }

  const saving = mutation.isPending

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>Add client</h1>
        <Link to={fromOrder ? '/orders/choose-client' : '/clients'} className={styles.back}>
          ← Back
        </Link>
      </div>

      {fromOrder && (
        <div className={`card ${styles.note}`}>
          <strong>This client is for a new order.</strong> After saving, you'll be taken straight to the order form.
        </div>
      )}

      {mutation.isError && (
        <p className={styles.error}>{mutation.error?.message ?? 'Something went wrong.'}</p>
      )}

      <form onSubmit={handleSubmit(onSave)} noValidate>
        {/* ── Client details ── */}
        <section className={`card ${styles.card}`}>
          <h2>Client details</h2>
          <div className={styles.fields}>
            <div className={styles.fieldGroup}>
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                className={`input ${errors.name ? styles.inputError : ''}`}
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <span className={styles.fieldError}>{errors.name.message}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="phone">Phone # *</label>
              <input
                id="phone"
                className={`input ${errors.phone ? styles.inputError : ''}`}
                inputMode="tel"
                {...register('phone', { required: 'Phone is required' })}
              />
              {errors.phone && <span className={styles.fieldError}>{errors.phone.message}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="address">Address</label>
              <input id="address" className="input" {...register('address')} />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" className="input" {...register('email')} />
            </div>

            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" className={`input ${styles.textarea}`} {...register('notes')} />
            </div>
          </div>
        </section>

        {/* ── Measurements ── */}
        <section className={`card ${styles.card}`}>
          <div className={styles.measureHeader}>
            <h2>Measurements</h2>
            <span className={styles.unitBadge}>{unit === 'in' ? 'Inches' : 'Centimetres'}</span>
          </div>

          <div className={styles.metaRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="date-taken">Date taken</label>
              <input
                id="date-taken"
                type="date"
                className="input"
                value={dateTaken}
                onChange={(e) => setDateTaken(e.target.value)}
              />
            </div>
          </div>

          <MeasurementGrid
            types={types}
            values={mValues}
            onChange={(id, val) => setMValues((prev) => ({ ...prev, [id]: val }))}
            unit={unit}
          />

          <div className={styles.fieldGroup} style={{ marginTop: 16 }}>
            <label htmlFor="fitting-notes">Fitting notes</label>
            <textarea
              id="fitting-notes"
              className={`input ${styles.textarea}`}
              value={fittingNotes}
              onChange={(e) => setFittingNotes(e.target.value)}
            />
          </div>
        </section>

        {/* ── Buttons ── */}
        <div className={styles.actions}>
          <Link
            to={fromOrder ? '/orders/choose-client' : '/clients'}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={handleSubmit(onSaveNoMeasurements)}
          >
            {fromOrder ? 'Save without measurements & continue' : 'Save client without measurements'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : fromOrder ? 'Save & continue to order' : 'Save client'}
          </button>
        </div>
      </form>
    </main>
  )
}

