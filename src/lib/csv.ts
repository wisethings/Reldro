import "server-only";

/**
 * Escapes a single CSV field per RFC 4180 (quote it if it contains a comma,
 * quote, or newline, doubling any inner quotes), and neutralizes formula
 * injection: a value starting with =, +, -, @, tab, or CR gets a leading
 * single quote, since spreadsheet apps (Excel, Google Sheets) otherwise
 * treat that leading character as a live formula when the CSV is opened -
 * a real risk here because several exported fields (bio, notableProjects,
 * headline) are free text from the public, unauthenticated apply form.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Builds a CSV string (with header row) from a list of plain objects and an ordered column spec. */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: { key: keyof T; label: string }[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

/** Standard response headers for a CSV file download with the given filename. */
export function csvResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
