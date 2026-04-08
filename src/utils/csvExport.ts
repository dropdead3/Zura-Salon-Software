/**
 * Escape a CSV field value. Wraps in double-quotes if the value contains
 * commas, double-quotes, or newlines. Internal quotes are doubled per RFC 4180.
 */
export function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert a 2D array of strings into a valid CSV string with proper escaping.
 */
export function buildCsvString(rows: string[][]): string {
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\n');
}
