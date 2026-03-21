// In-memory store for activity-driven navigation targets.
// Set before router.push(); consumed + cleared on useFocusEffect in the target screen.

export type ActivityNavTarget =
  | { tab: 'income';   categoryId?: string; catTab?: 'Active' | 'Archived'; detailTab?: 'Active' | 'Archived' }
  | { tab: 'expense';  categoryId?: string; catTab?: 'Active' | 'Archived'; detailTab?: 'Active' | 'Archived' }
  | { tab: 'savings';  goalTab?: 'Active' | 'Completed' | 'Archived' };

let _pending: ActivityNavTarget | null = null;

export const setNavTarget   = (t: ActivityNavTarget) => { _pending = t; };
export const getNavTarget   = ()                      => _pending;
export const clearNavTarget = ()                      => { _pending = null; };
