/**
 * PennyWise — Module-level network state
 *
 * Maintained by NetworkContext; readable anywhere without React hooks.
 * DataCache uses isOnline() to decide between Supabase and stale cache.
 */

let _isOnline = true;

export function setNetworkOnline(online: boolean): void {
  _isOnline = online;
}

export function isOnline(): boolean {
  return _isOnline;
}
