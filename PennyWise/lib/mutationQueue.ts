import AsyncStorage from '@react-native-async-storage/async-storage';

export type MutationOp = 'insert' | 'update' | 'delete';

export interface QueuedMutation {
  id: string;
  op: MutationOp;
  table: string;
  payload?: Record<string, any>;
  match?: Record<string, any>;
  /** Temp client-side ID used for optimistic UI (insert only) */
  tempId?: string;
  createdAt: number;
}

const QUEUE_KEY = 'pw_mutation_queue';

export const MutationQueue = {
  async getAll(): Promise<QueuedMutation[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as QueuedMutation[];
    } catch {
      return [];
    }
  },

  async add(mutation: Omit<QueuedMutation, 'id' | 'createdAt'>): Promise<void> {
    const id = `mq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry: QueuedMutation = { ...mutation, id, createdAt: Date.now() };
    const current = await MutationQueue.getAll();
    current.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(current));
  },

  async remove(id: string): Promise<void> {
    const current = await MutationQueue.getAll();
    const next = current.filter((m) => m.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  async count(): Promise<number> {
    const all = await MutationQueue.getAll();
    return all.length;
  },
};
