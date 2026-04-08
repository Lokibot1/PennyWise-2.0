import {
  sanitizeName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeCategoryLabel,
  sanitizeTitle,
  sanitizeDescription,
  parseAmount,
  filterName,
  filterEmail,
  filterPhone,
} from '../sanitize';

// ─── sanitizeName ────────────────────────────────────────────────────────────

describe('sanitizeName', () => {
  it('returns plain text unchanged', () => {
    expect(sanitizeName('Alice Reyes')).toBe('Alice Reyes');
  });

  it('strips HTML tags', () => {
    expect(sanitizeName('<b>John</b>')).toBe('John');
  });

  it('strips script tags but preserves inner text content', () => {
    // stripTags removes the <script> wrapper; the text node "alert(1)" remains.
    // This matches the design intent — it blocks stored HTML injection, not JS keywords.
    expect(sanitizeName('<script>alert(1)</script>')).toBe('alert(1)');
  });

  it('strips null bytes and control characters', () => {
    expect(sanitizeName('Jo\x00hn\x01 Doe\x1F')).toBe('John Doe');
  });

  it('collapses multiple spaces and newlines into one space', () => {
    expect(sanitizeName('John  \n  Doe')).toBe('John Doe');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeName('  Alice  ')).toBe('Alice');
  });

  it('truncates to 100 characters', () => {
    const long = 'A'.repeat(150);
    expect(sanitizeName(long)).toHaveLength(100);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeName('')).toBe('');
  });
});

// ─── sanitizeEmail ───────────────────────────────────────────────────────────

describe('sanitizeEmail', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeEmail('  user@mail.com  ')).toBe('user@mail.com');
  });

  it('lowercases the entire email', () => {
    expect(sanitizeEmail('USER@MAIL.COM')).toBe('user@mail.com');
  });

  it('truncates to 254 characters', () => {
    const long = 'a'.repeat(250) + '@b.com';
    expect(sanitizeEmail(long)).toHaveLength(254);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('does not strip valid email characters', () => {
    const email = 'user+tag@sub.domain.com';
    expect(sanitizeEmail(email)).toBe(email);
  });
});

// ─── sanitizePhone ───────────────────────────────────────────────────────────

describe('sanitizePhone', () => {
  it('keeps digits, +, spaces, hyphens, and parentheses', () => {
    expect(sanitizePhone('+63 (912) 345-6789')).toBe('+63 (912) 345-6789');
  });

  it('strips letters and invalid special characters', () => {
    expect(sanitizePhone('abc!@#$%')).toBe('');
  });

  it('strips letters embedded in a phone number', () => {
    expect(sanitizePhone('091a234b5678')).toBe('0912345678');
  });

  it('trims surrounding whitespace', () => {
    expect(sanitizePhone('  09123456789  ')).toBe('09123456789');
  });

  it('truncates to 20 characters', () => {
    const long = '1'.repeat(30);
    expect(sanitizePhone(long)).toHaveLength(20);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizePhone('')).toBe('');
  });
});

// ─── sanitizeCategoryLabel ───────────────────────────────────────────────────

describe('sanitizeCategoryLabel', () => {
  it('returns plain text unchanged', () => {
    expect(sanitizeCategoryLabel('Food & Dining')).toBe('Food & Dining');
  });

  it('strips HTML tags', () => {
    expect(sanitizeCategoryLabel('<em>Food</em>')).toBe('Food');
  });

  it('truncates to 60 characters', () => {
    const long = 'A'.repeat(80);
    expect(sanitizeCategoryLabel(long)).toHaveLength(60);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeCategoryLabel('')).toBe('');
  });
});

// ─── sanitizeTitle ───────────────────────────────────────────────────────────

describe('sanitizeTitle', () => {
  it('returns plain text unchanged', () => {
    expect(sanitizeTitle('Monthly Rent')).toBe('Monthly Rent');
  });

  it('strips HTML tags', () => {
    expect(sanitizeTitle('<h1>Goal</h1>')).toBe('Goal');
  });

  it('strips control characters', () => {
    expect(sanitizeTitle('Budget\x01Plan')).toBe('BudgetPlan');
  });

  it('truncates to 100 characters', () => {
    const long = 'B'.repeat(120);
    expect(sanitizeTitle(long)).toHaveLength(100);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeTitle('')).toBe('');
  });
});

// ─── sanitizeDescription ─────────────────────────────────────────────────────

describe('sanitizeDescription', () => {
  it('strips HTML tags', () => {
    expect(sanitizeDescription('<p>Hello</p>')).toBe('Hello');
  });

  it('preserves intentional newlines', () => {
    const input = 'Line 1\nLine 2';
    expect(sanitizeDescription(input)).toBe('Line 1\nLine 2');
  });

  it('strips control characters but preserves newlines', () => {
    expect(sanitizeDescription('Note\x01\nDetail')).toBe('Note\nDetail');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeDescription('  notes  ')).toBe('notes');
  });

  it('truncates to 500 characters', () => {
    const long = 'C'.repeat(600);
    expect(sanitizeDescription(long)).toHaveLength(500);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeDescription('')).toBe('');
  });
});

// ─── parseAmount ─────────────────────────────────────────────────────────────

describe('parseAmount', () => {
  it('parses a valid decimal string', () => {
    expect(parseAmount('123.45')).toBe(123.45);
  });

  it('parses an integer string', () => {
    expect(parseAmount('100')).toBe(100);
  });

  it('removes commas before parsing', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
  });

  it('returns 0 for a negative value', () => {
    expect(parseAmount('-50')).toBe(0);
  });

  it('returns 0 for a non-numeric string', () => {
    expect(parseAmount('abc')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseAmount('')).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(parseAmount('Infinity')).toBe(0);
  });

  it('returns 0 for zero', () => {
    expect(parseAmount('0')).toBe(0);
  });
});

// ─── filterName ───────────────────────────────────────────────────────────────

describe('filterName', () => {
  it('allows plain letters and spaces', () => {
    expect(filterName('John Doe')).toBe('John Doe');
  });

  it('allows accented / extended Latin characters', () => {
    expect(filterName('José Ñoño')).toBe('José Ñoño');
  });

  it('allows hyphens and apostrophes (common in names)', () => {
    expect(filterName("O'Brien-Smith")).toBe("O'Brien-Smith");
  });

  it('allows periods (e.g. initials)', () => {
    expect(filterName('J. R. Tolkien')).toBe('J. R. Tolkien');
  });

  it('strips emoji characters', () => {
    expect(filterName('John 😀 Doe')).toBe('John  Doe');
  });

  it('strips digits', () => {
    expect(filterName('John123')).toBe('John');
  });

  it('strips special symbols', () => {
    expect(filterName('John@#$%')).toBe('John');
  });

  it('returns empty string for emoji-only input', () => {
    expect(filterName('🔥🚀')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(filterName('')).toBe('');
  });
});

// ─── filterEmail ──────────────────────────────────────────────────────────────

describe('filterEmail', () => {
  it('passes through a valid email address unchanged', () => {
    expect(filterEmail('user@example.com')).toBe('user@example.com');
  });

  it('allows valid email special characters', () => {
    expect(filterEmail('user+tag@sub.domain.com')).toBe('user+tag@sub.domain.com');
  });

  it('strips emoji characters', () => {
    expect(filterEmail('user😀@example.com')).toBe('user@example.com');
  });

  it('strips non-ASCII Unicode letters', () => {
    expect(filterEmail('üser@example.com')).toBe('ser@example.com');
  });

  it('strips spaces', () => {
    expect(filterEmail('user @example.com')).toBe('user@example.com');
  });

  it('returns empty string for empty input', () => {
    expect(filterEmail('')).toBe('');
  });
});

// ─── filterPhone ──────────────────────────────────────────────────────────────

describe('filterPhone', () => {
  it('allows digits, +, spaces, hyphens, and parentheses', () => {
    expect(filterPhone('+63 (912) 345-6789')).toBe('+63 (912) 345-6789');
  });

  it('strips emoji characters', () => {
    expect(filterPhone('0912😀345')).toBe('0912345');
  });

  it('strips letters', () => {
    expect(filterPhone('091abc2345')).toBe('0912345');
  });

  it('strips special symbols', () => {
    expect(filterPhone('0912@#$345')).toBe('0912345');
  });

  it('returns empty string for empty input', () => {
    expect(filterPhone('')).toBe('');
  });
});
