/**
 * Lightweight input validation helpers.
 * Returns null if valid, or an error string describing the problem.
 */

function validateDate(value, field) {
  if (!value) return `${field} is required`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${field} must be YYYY-MM-DD`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return `${field} is not a valid date`;
  return null;
}

function validateEmail(value, field = 'email') {
  if (!value) return `${field} is required`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${field} is not a valid email`;
  return null;
}

function validateRequired(obj, fields) {
  for (const field of fields) {
    if (obj[field] == null || obj[field] === '') return `${field} is required`;
  }
  return null;
}

function validateBookingDates(checkIn, checkOut) {
  const ciErr = validateDate(checkIn, 'checkIn');
  if (ciErr) return ciErr;
  const coErr = validateDate(checkOut, 'checkOut');
  if (coErr) return coErr;
  if (new Date(checkOut) <= new Date(checkIn)) return 'checkOut must be after checkIn';
  const nights = (new Date(checkOut) - new Date(checkIn)) / 86400000;
  if (nights < 1) return 'Minimum stay is 1 night';
  if (nights > 365) return 'Stay cannot exceed 365 nights';
  return null;
}

module.exports = { validateDate, validateEmail, validateRequired, validateBookingDates };
