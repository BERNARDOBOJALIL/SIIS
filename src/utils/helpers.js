/**
 * Formatea una fecha a string legible.
 * @param {string|Date} date
 * @param {string} locale
 */
export function formatDate(date, locale = 'es-ES') {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

/**
 * Capitaliza la primera letra de un string.
 * @param {string} str
 */
export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Trunca un texto a n caracteres.
 * @param {string} text
 * @param {number} n
 */
export function truncate(text = '', n = 50) {
  return text.length > n ? text.slice(0, n) + '...' : text
}

/**
 * Genera un ID único simple.
 */
export function uniqueId() {
  return Math.random().toString(36).slice(2, 9)
}
