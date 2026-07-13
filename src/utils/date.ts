/**
 * Unified Date Formatter for Gestão Leadium
 * Formats any ISO / DB date string to the elegant Portuguese layout: "DD/MM - HH:MM"
 * Defaults to "10:30" if no specialized time is recorded, matching user preferences perfectly.
 */
export function formatSystemDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const rawStr = String(dateStr).trim();
    
    // Hand-parse simple YYYY-MM-DD or partial timestamps to avoid UTC vs Local timezone shifts
    const matches = rawStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matches) {
      const year = parseInt(matches[1], 10);
      const month = String(parseInt(matches[2], 10)).padStart(2, '0');
      const day = String(parseInt(matches[3], 10)).padStart(2, '0');
      
      // Check if there is actual custom hours/minutes info on the string
      // If it's a date-only (like 2026-06-20) or standard midnight (T00:00:00)
      const hasTimeInfo = rawStr.includes('T') && !rawStr.includes('T00:00:00') && !rawStr.includes('00:00:00.000');
      
      if (hasTimeInfo) {
        const d = new Date(rawStr);
        if (!isNaN(d.getTime())) {
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${day}/${month} - ${hours}:${minutes}`;
        }
      }
      
      // Default time for non-time-specific entries as explicitly requested: "10:30"
      return `${day}/${month} - 10:30`;
    }
    
    // Fallback standard Date parser
    const d = new Date(rawStr);
    if (isNaN(d.getTime())) return rawStr;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    let hours = d.getHours();
    let minutes = d.getMinutes();
    
    if (hours === 0 && minutes === 0) {
      return `${day}/${month} - 10:30`;
    }
    
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    return `${day}/${month} - ${hoursStr}:${minutesStr}`;
  } catch (e) {
    return dateStr;
  }
}

/** Converts ISO, database timestamps and Brazilian DD/MM/YYYY dates to a sortable value. */
export function dateValue(dateStr?: string): number {
  if (!dateStr) return 0;
  const raw = String(dateStr).trim();
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]), Number(br[4] || 0), Number(br[5] || 0)).getTime();
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function newestDateFirst<T extends { date?: string }>(a: T, b: T): number {
  return dateValue(b.date) - dateValue(a.date);
}
