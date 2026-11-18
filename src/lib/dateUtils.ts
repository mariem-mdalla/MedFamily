/**
 * Date and time formatting helpers ensuring consistent western digits (0-9),
 * DD/MM/YYYY date formatting, and HH:MM time formatting in all languages.
 */

/**
 * Format any Date object or ISO / YYYY-MM-DD date string into DD/MM/YYYY
 * using strictly western digits (0-9) regardless of current locale or RTL.
 */
export function formatDateDDMMYYYY(input: Date | string | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') {
    // If format is YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    const parsed = new Date(input);
    if (isNaN(parsed.getTime())) return input;
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const day = String(input.getDate()).padStart(2, '0');
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const year = input.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format any Date object or ISO timestamp string into HH:MM (24-hour)
 * using strictly western digits (0-9).
 */
export function formatTimeHHMM(input: Date | string | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const matchTime = input.match(/^(\d{1,2}):(\d{2})/);
    if (matchTime) {
      return `${matchTime[1].padStart(2, '0')}:${matchTime[2]}`;
    }
    const parsed = new Date(input);
    if (isNaN(parsed.getTime())) return input;
    const h = String(parsed.getHours()).padStart(2, '0');
    const m = String(parsed.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const h = String(input.getHours()).padStart(2, '0');
  const m = String(input.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
