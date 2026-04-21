/**
 * Formats a phone number for use in a WhatsApp link (wa.me).
 * - Strips all non-numeric characters.
 * - If it starts with '0', strips it and prepends '2' (Egypt country code).
 * - If it starts with '20' or '2', leaves it as is.
 * - Returns a clean numeric string.
 */
export function formatWhatsApp(number: string | undefined): string {
  if (!number) return ''

  // Strip all non-numeric characters
  let clean = number.replace(/\D/g, '')

  // Handle common Egyptian formatting
  if (clean.startsWith('0')) {
    // e.g. 01012345678 -> 201012345678
    return '2' + clean
  }

  // Prepend '2' if it starts with 1 (e.g. 1012345678 -> 201012345678)
  if (clean.startsWith('1')) {
    return '20' + clean
  }

  // Ensure it doesn't just have '2' but '20' for most Egypt numbers if len is 11
  // But strictly follow "strip 0 and prepend country code" as per CEO.
  // CEO example: "If it starts with '0', strip it and prepend the country code (e.g. '2' or '20' for Egypt)"
  // Most people use '2' + '010...' -> '2010...'
  
  return clean
}

/**
 * Generates a full WhatsApp URL with routing logic and formatting.
 */
export function getWhatsAppURL(number: string, message?: string): string {
  const formatted = formatWhatsApp(number)
  if (!formatted) return '#'
  
  const base = `https://wa.me/${formatted}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
