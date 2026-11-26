/**
 * Shared utilities for validating and converting measurement values.
 *
 * All values are stored in centimetres (value_cm).
 * The conversion factor:  1 inch = 2.54 cm
 *
 * On the way IN  (user typed in inches): value_cm = round(typed * 2.54, 2)
 * On the way OUT (display in inches):    display  = round(value_cm / 2.54, 2)
 *
 * Typed commas count as decimal points.
 */

export const CM_PER_INCH = 2.54;

/**
 * Parse a measurement string from user input.
 * Treats commas as decimal points, e.g. "88,5" → 88.5
 * Returns NaN for invalid input.
 */
export function parseInput(raw) {
  if (raw === null || raw === undefined || raw === '') return NaN;
  return parseFloat(String(raw).replace(',', '.'));
}

/**
 * Convert a value to centimetres.
 * @param {number} value  - numeric value as the user typed
 * @param {string} unit   - 'cm' or 'in'
 * @returns {number}       rounded to 2 decimals
 */
export function toCm(value, unit) {
  if (unit === 'in') return Math.round(value * CM_PER_INCH * 100) / 100;
  return Math.round(value * 100) / 100;
}

/**
 * Convert a value_cm stored in the DB to the display unit.
 * @param {number} valueCm
 * @param {string} unit   - 'cm' or 'in'
 * @returns {number}       rounded to 2 decimals
 */
export function fromCm(valueCm, unit) {
  if (unit === 'in') return Math.round((valueCm / CM_PER_INCH) * 100) / 100;
  return Math.round(valueCm * 100) / 100;
}

/**
 * Validate an array of measurement objects before inserting.
 * Each element must have: { type_id: number, value_cm: number }
 * Returns an error string, or null if valid.
 *
 * @param {Array<{type_id: any, value_cm: any}>} measurements
 * @returns {string|null}
 */
export function validateMeasurements(measurements) {
  if (!Array.isArray(measurements)) return 'measurements must be an array';

  for (const m of measurements) {
    if (!m.type_id || !Number.isInteger(Number(m.type_id))) {
      return `Invalid type_id: ${m.type_id}`;
    }
    const v = Number(m.value_cm);
    if (isNaN(v) || v < 0) {
      return `Invalid value_cm for type_id ${m.type_id}: must be a non-negative number`;
    }
  }
  return null;
}

