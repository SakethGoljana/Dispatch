/**
 * Data Masking & Privacy Utilities
 * Protects student & parent personal information from exposure in server logs and audit trails.
 */

export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'N/A';
  const clean = phone.trim();
  if (clean.length <= 6) return '***';
  return `${clean.slice(0, 5)} *** ${clean.slice(-2)}`;
}

export function maskStudentName(name?: string): string {
  if (!name) return 'N/A';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0][0]}***`;
  }
  return `${parts[0]} ${parts[1][0]}***`;
}
