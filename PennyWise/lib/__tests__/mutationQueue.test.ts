import { MutationQueue } from '../mutationQueue';

// ── AsyncStorage mock ─────────────────────────────────────────────────────────

const mockGet    = jest.fn();
const mockSet    = jest.fn();
const mockRemove = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    (...a: any[]) => mockGet(...a),
  setItem:    (...a: any[]) => mockSet(...a),
  removeItem: (...a: any[]) => mockRemove(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

// ── getAll ────────────────────────────────────────────────────────────────────

describe('MutationQueue.getAll', () => {
  it('returns empty array when storage has no entry', async () => {
    expect(await MutationQueue.getAll()).toEqual([]);
  });

  it('parses and returns stored mutations', async () => {
    const stored = [{ id: 'mq_1', op: 'insert', table: 'expenses', createdAt: 1 }];
    mockGet.mockResolvedValue(JSON.stringify(stored));
    expect(await MutationQueue.getAll()).toEqual(stored);
  });

  it('returns empty array when stored value is malformed JSON', async () => {
    mockGet.mockResolvedValue('not-valid-json{{');
    expect(await MutationQueue.getAll()).toEqual([]);
  });

  it('reads from the correct AsyncStorage key', async () => {
    await MutationQueue.getAll();
    expect(mockGet).toHaveBeenCalledWith('pw_mutation_queue');
  });
});

// ── add ───────────────────────────────────────────────────────────────────────

describe('MutationQueue.add', () => {
  it('appends an entry with an auto-generated id prefixed with "mq_"', async () => {
    await MutationQueue.add({ op: 'insert', table: 'expenses', payload: { title: 'Lunch' } });
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved[0].id).toMatch(/^mq_/);
  });

  it('includes the correct table and op in the saved entry', async () => {
    await MutationQueue.add({ op: 'delete', table: 'savings_goals', match: { id: 'g-1' } });
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved[0].op).toBe('delete');
    expect(saved[0].table).toBe('savings_goals');
  });

  it('stamps createdAt as a positive number', async () => {
    await MutationQueue.add({ op: 'insert', table: 'expenses', payload: {} });
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved[0].createdAt).toBeGreaterThan(0);
  });

  it('appends to existing entries rather than replacing them', async () => {
    const existing = [{ id: 'mq_old', op: 'delete', table: 'expenses', createdAt: 1 }];
    mockGet.mockResolvedValue(JSON.stringify(existing));
    await MutationQueue.add({ op: 'insert', table: 'expenses', payload: {} });
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved).toHaveLength(2);
    expect(saved[0].id).toBe('mq_old');
  });

  it('preserves optional tempId when provided', async () => {
    await MutationQueue.add({ op: 'insert', table: 'expenses', payload: {}, tempId: 'tmp-abc' });
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved[0].tempId).toBe('tmp-abc');
  });
});

// ── remove ────────────────────────────────────────────────────────────────────

describe('MutationQueue.remove', () => {
  it('removes the entry with the matching id', async () => {
    const stored = [
      { id: 'mq_1', op: 'insert', table: 'expenses', createdAt: 1 },
      { id: 'mq_2', op: 'delete', table: 'expenses', createdAt: 2 },
    ];
    mockGet.mockResolvedValue(JSON.stringify(stored));
    await MutationQueue.remove('mq_1');
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('mq_2');
  });

  it('is a no-op when the id does not exist', async () => {
    mockGet.mockResolvedValue(JSON.stringify([]));
    await MutationQueue.remove('does-not-exist');
    expect(mockSet).toHaveBeenCalledWith('pw_mutation_queue', '[]');
  });

  it('leaves other entries intact', async () => {
    const stored = [
      { id: 'mq_a', op: 'insert', table: 'expenses', createdAt: 1 },
      { id: 'mq_b', op: 'update', table: 'expenses', createdAt: 2 },
      { id: 'mq_c', op: 'delete', table: 'expenses', createdAt: 3 },
    ];
    mockGet.mockResolvedValue(JSON.stringify(stored));
    await MutationQueue.remove('mq_b');
    const saved = JSON.parse(mockSet.mock.calls[0][1]);
    expect(saved.map((m: any) => m.id)).toEqual(['mq_a', 'mq_c']);
  });
});

// ── clear ─────────────────────────────────────────────────────────────────────

describe('MutationQueue.clear', () => {
  it('calls AsyncStorage.removeItem with the queue key', async () => {
    await MutationQueue.clear();
    expect(mockRemove).toHaveBeenCalledWith('pw_mutation_queue');
  });

  it('resolves without throwing', async () => {
    await expect(MutationQueue.clear()).resolves.toBeUndefined();
  });
});

// ── count ─────────────────────────────────────────────────────────────────────

describe('MutationQueue.count', () => {
  it('returns 0 when queue is empty', async () => {
    expect(await MutationQueue.count()).toBe(0);
  });

  it('returns the correct number of queued mutations', async () => {
    const stored = [
      { id: 'mq_1', op: 'insert', table: 'expenses', createdAt: 1 },
      { id: 'mq_2', op: 'delete', table: 'expenses', createdAt: 2 },
      { id: 'mq_3', op: 'update', table: 'expenses', createdAt: 3 },
    ];
    mockGet.mockResolvedValue(JSON.stringify(stored));
    expect(await MutationQueue.count()).toBe(3);
  });
});
