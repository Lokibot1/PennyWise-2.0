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

// ── Keystroke-level input filters ─────────────────────────────────────────────
// Applied inside onChangeText so invalid characters never reach state.

/**
 * Name fields (full name, username).
 * Allows letters (Latin + extended/accented), spaces, hyphens, apostrophes,
 * and periods. Blocks emojis, digits, and all other symbols.
 */
export function filterName(value: string): string {
  // Allow: basic + extended Latin letters, spaces, hyphens, apostrophes, periods.
  // \u00C0-\u024F covers Latin Extended-A/B (accented chars, ñ, etc.)
  return value.replace(/[^a-zA-Z\u00C0-\u024F\s'\-.]/g, '');
}

/**
 * Email fields.
 * Restricts input to printable ASCII characters that are valid in an email
 * address. Blocks emojis, Unicode letters, and all non-ASCII code points.
 */
export function filterEmail(value: string): string {
  return value.replace(/[^a-zA-Z0-9@._+\-]/g, '');
}

/**
 * Phone / mobile number fields.
 * Allows digits and leading + only (supports 09XXXXXXXXX and +639XXXXXXXXX).
 */
export function filterPhone(value: string): string {
  // Allow + only as the very first character
  if (value.startsWith('+')) {
    return '+' + value.slice(1).replace(/[^\d]/g, '');
  }
  return value.replace(/[^\d]/g, '');
}

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
 * Phone number: keep only digits and leading +. Max 20 chars.
 */
export function sanitizePhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/[^\d]/g, '').slice(0, 19);
  }
  return trimmed.replace(/[^\d]/g, '').slice(0, 20);
}

/**
 * Validates Philippine mobile number format.
 * Accepts: 09XXXXXXXXX (11 digits) or +639XXXXXXXXX (13 chars).
 */
export function validatePhone(value: string): boolean {
  const v = value.trim();
  return /^09\d{9}$/.test(v) || /^\+639\d{9}$/.test(v);
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
