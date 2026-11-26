/**
 * units.js – unit conversion utilities (mirrors the backend utils)
 *
 * All values are stored in the DB as centimetres.
 * Display / input conversion happens here on the client.
 *
 * 1 inch = 2.54 cm
 */

export const CM_PER_INCH = 2.54

/** Parse user input: treat commas as decimal points. */
export function parseInput(raw) {
  if (raw === null || raw === undefined || raw === '') return NaN
  return parseFloat(String(raw).replace(',', '.'))
}

/** Convert a user-typed value to centimetres for storage. */
export function toCm(value, unit) {
  const n = typeof value === 'number' ? value : parseInput(value)
  if (isNaN(n)) return null
  if (unit === 'in') return Math.round(n * CM_PER_INCH * 100) / 100
  return Math.round(n * 100) / 100
}

/** Convert a stored value_cm to the display unit. */
export function fromCm(valueCm, unit) {
  if (valueCm === null || valueCm === undefined) return ''
  const n = Number(valueCm)
  if (isNaN(n)) return ''
  if (unit === 'in') return String(Math.round((n / CM_PER_INCH) * 100) / 100)
  return String(Math.round(n * 100) / 100)
}

/** Label shown next to measurement inputs. */
export function unitLabel(unit) {
  return unit === 'in' ? 'in' : 'cm'
}

