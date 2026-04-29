import { setNetworkOnline, isOnline } from '../network';

afterEach(() => {
  setNetworkOnline(true); // restore default
});

describe('network — isOnline', () => {
  it('returns true by default', () => {
    expect(isOnline()).toBe(true);
  });

  it('returns false after setNetworkOnline(false)', () => {
    setNetworkOnline(false);
    expect(isOnline()).toBe(false);
  });

  it('returns true after restoring online state', () => {
    setNetworkOnline(false);
    setNetworkOnline(true);
    expect(isOnline()).toBe(true);
  });

  it('reflects the last value when toggled multiple times', () => {
    setNetworkOnline(false);
    setNetworkOnline(true);
    setNetworkOnline(false);
    expect(isOnline()).toBe(false);
  });
});

describe('network — setNetworkOnline', () => {
  it('does not throw when called with true', () => {
    expect(() => setNetworkOnline(true)).not.toThrow();
  });

  it('does not throw when called with false', () => {
    expect(() => setNetworkOnline(false)).not.toThrow();
  });

  it('successive calls with the same value are idempotent', () => {
    setNetworkOnline(false);
    setNetworkOnline(false);
    expect(isOnline()).toBe(false);
  });
});
