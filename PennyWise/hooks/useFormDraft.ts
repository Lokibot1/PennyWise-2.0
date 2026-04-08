import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved';

/**
 * Persists form field values to AsyncStorage with a debounced save.
 *
 * Pass `key: null` to disable persistence entirely (acts as plain useState).
 * This lets you use the same component for both "add" (persisted) and "edit"
 * (not persisted, already pre-filled from the server) without conditional hooks.
 */
export function useFormDraft<T extends Record<string, unknown>>(
  key: string | null,
  defaultValues: T,
) {
  const [draft, setDraftState] = useState<T>(defaultValues);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [draftLoaded, setDraftLoaded] = useState(key === null); // immediate if no key
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load draft on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (key === null) return;

    AsyncStorage.getItem(key).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<T>;
          setDraftState({ ...defaultValues, ...parsed });
          setHasSavedDraft(true);
        } catch {
          // corrupted — ignore
        }
      }
      setDraftLoaded(true);
    });

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedTimer.current)    clearTimeout(savedTimer.current);
    };
  }, []); // intentionally only on mount

  // ── Debounced save ──────────────────────────────────────────────────────────
  const scheduleSave = useCallback((data: T) => {
    if (key === null) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSaveStatus('saving');

    debounceTimer.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
        setSaveStatus('saved');
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
      } catch {
        setSaveStatus('idle');
      }
    }, 700);
  }, [key]);

  // ── Update a single field ───────────────────────────────────────────────────
  const setDraftField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setDraftState((prev) => {
      const next = { ...prev, [field]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Update multiple fields at once ──────────────────────────────────────────
  const setDraftFields = useCallback((updates: Partial<T>) => {
    setDraftState((prev) => {
      const next = { ...prev, ...updates };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Clear draft (call on successful submit) ─────────────────────────────────
  const clearDraft = useCallback(async () => {
    if (key === null) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (savedTimer.current)    clearTimeout(savedTimer.current);
    await AsyncStorage.removeItem(key);
    setSaveStatus('idle');
    setHasSavedDraft(false);
  }, [key]);

  // ── Discard draft and reset to defaults ─────────────────────────────────────
  const discardDraft = useCallback(async () => {
    await clearDraft();
    setDraftState(defaultValues);
  }, [clearDraft, defaultValues]);

  return {
    draft,
    setDraftField,
    setDraftFields,
    clearDraft,
    discardDraft,
    saveStatus,
    draftLoaded,
    hasSavedDraft,
  };
}
