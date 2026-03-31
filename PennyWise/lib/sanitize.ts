/**
 * PennyWise — Input Sanitization Helpers
 *
 * Applied at submit time (not while typing) to block injection attacks on
 * data stored in Supabase that could later be rendered in emails or web contexts.
 *
 * What this guards against:
 *   - HTML / script tag injection in stored text fields
 *   - Null bytes and control characters that corrupt DB records
 *   - Inputs exceeding reasonable length limits
 *
 * What is already safe by design:
 *   - SQL injection  — Supabase JS client uses parameterized queries
 *   - DOM XSS in-app — React Native Text components don't render HTML
 */

/** Remove HTML tags, null bytes, and control characters. Collapse whitespace. */
function stripTags(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')               // strip HTML/XML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars / null bytes
    .replace(/\s+/g, ' ')                  // collapse multiple spaces/newlines to one space
    .trim();
}

/** Person or account name (full_name, username). Max 100 chars. */
export function sanitizeName(value: string): string {
  return stripTags(value).slice(0, 100);
}

/** Email address: trim, lowercase, max 254 chars (RFC 5321 limit). */
export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}

/**
 * Phone number: keep only digits, +, spaces, hyphens, and parentheses.
 * Max 20 chars.
 */
export function sanitizePhone(value: string): string {
  return value.replace(/[^\d+\s\-()]/g, '').trim().slice(0, 20);
}

/** Short label text — income/expense category names. Max 60 chars. */
export function sanitizeCategoryLabel(value: string): string {
  return stripTags(value).slice(0, 60);
}

/** Title fields — income, expense, and savings goal names. Max 100 chars. */
export function sanitizeTitle(value: string): string {
  return stripTags(value).slice(0, 100);
}

/** Multiline description fields. Max 500 chars. */
export function sanitizeDescription(value: string): string {
  // Allow newlines in descriptions (unlike stripTags which collapses them)
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 500);
}

/**
 * Parse a user-entered currency string (may contain commas).
 * Returns 0 for invalid, negative, or non-finite values.
 */
export function parseAmount(value: string): number {
  const n = parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
