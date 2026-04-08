import {
  setNavTarget,
  getNavTarget,
  clearNavTarget,
} from '../activityNavTarget';

// Reset the module-level singleton between tests
beforeEach(() => clearNavTarget());

describe('activityNavTarget', () => {
  it('returns null initially', () => {
    expect(getNavTarget()).toBeNull();
  });

  it('setNavTarget stores an income target', () => {
    setNavTarget({ tab: 'income', categoryId: 'cat-1' });
    expect(getNavTarget()).toEqual({ tab: 'income', categoryId: 'cat-1' });
  });

  it('setNavTarget stores an expense target', () => {
    setNavTarget({ tab: 'expense', catTab: 'Archived' });
    expect(getNavTarget()).toEqual({ tab: 'expense', catTab: 'Archived' });
  });

  it('setNavTarget stores a savings target', () => {
    setNavTarget({ tab: 'savings', goalTab: 'Completed' });
    expect(getNavTarget()).toEqual({ tab: 'savings', goalTab: 'Completed' });
  });

  it('clearNavTarget resets the target to null', () => {
    setNavTarget({ tab: 'income' });
    clearNavTarget();
    expect(getNavTarget()).toBeNull();
  });

  it('a second setNavTarget overwrites the first', () => {
    setNavTarget({ tab: 'income' });
    setNavTarget({ tab: 'savings', goalTab: 'Active' });
    expect(getNavTarget()).toEqual({ tab: 'savings', goalTab: 'Active' });
  });
});
