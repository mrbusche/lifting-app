// Conversion factor from pounds to kilograms
const LBS_TO_KG_FACTOR = 0.453592;

/**
 * Convert weight from pounds to kilograms for display
 * @param {number} weightInLbs - Weight in pounds
 * @param {string} unit - Current unit ('lbs' or 'kg')
 * @returns {number} - Weight in the specified unit
 */
export function convertWeight(weightInLbs, unit) {
  if (unit === 'kg') {
    return Math.round(weightInLbs * LBS_TO_KG_FACTOR * 10) / 10; // Convert and round to 1 decimal place
  }
  return weightInLbs;
}

/**
 * Get the current unit label
 * @param {string} unit - Current unit ('lbs' or 'kg')
 * @returns {string} - Unit label
 */
export function getUnitLabel(unit) {
  return unit === 'kg' ? 'kg' : 'lbs';
}
