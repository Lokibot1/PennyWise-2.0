import { callFunction } from '../callFunction';

// ── Mock fetch ────────────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Mock supabaseUrl ──────────────────────────────────────────────────────────
jest.mock('@/lib/supabase', () => ({
  supabaseUrl: 'https://test.supabase.co',
}));

beforeEach(() => jest.clearAllMocks());

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(body: any, ok: boolean, status: number) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('callFunction — happy path', () => {
  it('returns data, ok:true and status on a 200 response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ token: 'abc' }, true, 200));
    const result = await callFunction('my-fn', { email: 'a@b.com' });
    expect(result).toEqual({ data: { token: 'abc' }, ok: true, status: 200, rawError: '' });
  });

  it('POSTs to the correct URL', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, true, 200));
    await callFunction('send-otp', {});
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/send-otp',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sets Content-Type: application/json header', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, true, 200));
    await callFunction('fn', {});
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } })
    );
  });

  it('serialises the body to JSON', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, true, 200));
    await callFunction('fn', { key: 'val' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ key: 'val' }) })
    );
  });
});

describe('callFunction — server errors', () => {
  it('returns ok:false and the status code on a 400 response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Bad request' }, false, 400));
    const result = await callFunction('fn', {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.data).toEqual({ error: 'Bad request' });
    expect(result.rawError).toBe('');
  });

  it('returns ok:false on a 500 response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Server error' }, false, 500));
    const result = await callFunction('fn', {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it('returns data:null when the response body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockRejectedValue(new SyntaxError('not json')),
    });
    const result = await callFunction('fn', {});
    expect(result.data).toBeNull();
    expect(result.ok).toBe(true);
  });
});

describe('callFunction — network errors', () => {
  it('returns ok:false, status:0 and rawError when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    const result = await callFunction('fn', {});
    expect(result).toEqual({ data: null, ok: false, status: 0, rawError: 'Network failure' });
  });

  it('coerces non-Error throws to a string rawError', async () => {
    mockFetch.mockRejectedValue('timeout');
    const result = await callFunction('fn', {});
    expect(result.rawError).toBe('timeout');
    expect(result.ok).toBe(false);
  });
});
