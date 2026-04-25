import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { router, useFocusEffect } from 'expo-router';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import { DataCache } from '@/lib/dataCache';
import type { CachedCategory } from '@/lib/dataCache';
import { setNavTarget } from '@/lib/activityNavTarget';
import { logActivity, ACTION, ENTITY } from '@/lib/logActivity';
import { ActivityHistorySkeleton } from '@/components/SkeletonLoader';
import ErrorModal from '@/components/ErrorModal';

// ── Types ──────────────────────────────────────────────────────────────────────
type FilterType = 'All' | 'Income' | 'Expenses' | 'Savings';

type RawTransaction = {
  id:             string;
  table:          'income_sources' | 'expenses';
  title:          string;
  amount:         number;
  date:           string;    // YYYY-MM-DD
  time:           string;    // HH:MM:SS
  description:    string;
  category_id:    string;
  category_label: string;
  is_recurring:   boolean;
  frequency:      string | null;
};

type ActivityItem = {
  id:          string;
  action_type: string;
  entity_type: string;
  title:       string;
  description: string;
  icon:        string;
  created_at:  string;
  category_id?: string;
  _raw?:        RawTransaction;
};

type Section = {
  title: string;
  data:  ActivityItem[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS: FilterType[] = ['All', 'Income', 'Expenses', 'Savings'];

const LOG_ONLY_ACTIONS = [
  'INCOME_SOURCE_UPDATED',
  'INCOME_SOURCE_ARCHIVED',
  'INCOME_SOURCE_RESTORED',
  'INCOME_SOURCE_DELETED',
  'EXPENSE_UPDATED',
  'EXPENSE_CATEGORY_UPDATED',
  'EXPENSE_CATEGORY_RESTORED',
  'EXPENSE_CATEGORY_DELETED',
  'EXPENSE_ARCHIVED',
  'EXPENSE_RESTORED',
  'EXPENSE_DELETED',
  'INCOME_CATEGORY_CREATED',
  'INCOME_CATEGORY_UPDATED',
  'INCOME_CATEGORY_ARCHIVED',
  'INCOME_CATEGORY_RESTORED',
  'INCOME_CATEGORY_DELETED',
  'EXPENSE_CATEGORY_CREATED',
  'EXPENSE_CATEGORY_ARCHIVED',
  'SAVINGS_GOAL_UPDATED',
  'SAVINGS_GOAL_FUNDED',
  'SAVINGS_GOAL_ARCHIVED',
  'SAVINGS_GOAL_RESTORED',
  'SAVINGS_GOAL_DELETED',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function entityColor(entityType: string, actionType: string): string {
  if (entityType === 'savings_goal') {
    if (actionType === 'SAVINGS_GOAL_COMPLETED') return '#3ECBA8';
    if (actionType === 'SAVINGS_GOAL_RESTORED')  return '#3ECBA8';
    if (actionType === 'SAVINGS_GOAL_ARCHIVED')  return '#9AA5B4';
    if (actionType === 'SAVINGS_GOAL_DELETED')   return '#EF4444';
    if (actionType === 'SAVINGS_GOAL_FUNDED')    return '#F59E0B';
    return '#F59E0B';
  }
  if (actionType.includes('DELETED'))  return '#EF4444';
  if (actionType.includes('RESTORED')) return '#3ECBA8';
  if (actionType.includes('ARCHIVED')) return '#9AA5B4';
  if (entityType.startsWith('income'))  return '#22C55E';
  if (entityType.startsWith('expense')) return '#4895EF';
  return '#9AA5B4';
}

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const h    = d.getHours();
  const m    = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${ampm}`;
}

function sectionKey(iso: string): string {
  const d     = new Date(iso);
  const today = new Date();
  const diff  = Math.floor(
    (new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000,
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(items: ActivityItem[]): Section[] {
  const map = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const key = sectionKey(item.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function actionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    INCOME_CATEGORY_CREATED:   'New Income Category Created',
    INCOME_CATEGORY_UPDATED:   'Income Category Updated',
    INCOME_CATEGORY_ARCHIVED:  'Income Category Archived',
    INCOME_CATEGORY_RESTORED:  'Income Category Restored',
    INCOME_CATEGORY_DELETED:   'Income Category Deleted',
    INCOME_SOURCE_ADDED:       'New Income Source Created',
    INCOME_SOURCE_UPDATED:     'Income Source Updated',
    INCOME_SOURCE_ARCHIVED:    'Income Source Archived',
    INCOME_SOURCE_RESTORED:    'Income Source Restored',
    INCOME_SOURCE_DELETED:     'Income Source Deleted',
    EXPENSE_CATEGORY_CREATED:  'New Expense Category Created',
    EXPENSE_CATEGORY_UPDATED:  'Expense Category Updated',
    EXPENSE_CATEGORY_ARCHIVED: 'Expense Category Archived',
    EXPENSE_CATEGORY_RESTORED: 'Expense Category Restored',
    EXPENSE_CATEGORY_DELETED:  'Expense Category Deleted',
    EXPENSE_ADDED:             'New Expense Created',
    EXPENSE_UPDATED:           'Expense Updated',
    EXPENSE_ARCHIVED:          'Expense Archived',
    EXPENSE_RESTORED:          'Expense Restored',
    EXPENSE_DELETED:           'Expense Deleted',
    SAVINGS_GOAL_CREATED:      'New Savings Goal Created',
    SAVINGS_GOAL_UPDATED:      'Savings Goal Updated',
    SAVINGS_GOAL_FUNDED:       'Savings Goal Funded',
    SAVINGS_GOAL_COMPLETED:    'Savings Goal Achieved',
    SAVINGS_GOAL_ARCHIVED:     'Savings Goal Archived',
    SAVINGS_GOAL_RESTORED:     'Savings Goal Restored',
    SAVINGS_GOAL_DELETED:      'Savings Goal Deleted',
  };
  return labels[actionType] ?? actionType.replace(/_/g, ' ');
}

function fmtAmount(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeStrToDate(timeStr: string | null): Date {
  const d = new Date();
  const parts = (timeStr ?? '00:00:00').split(':').map(Number);
  d.setHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0);
  return d;
}

function dateToTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}

function fmt12h(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function csvEscape(s: string): string {
  const str = String(s ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Build unified activity feed ────────────────────────────────────────────────
async function fetchAllActivity(userId: string): Promise<ActivityItem[]> {
  const [cachedIncome, cachedExpenses, cachedGoals, logsRes] = await Promise.all([
    DataCache.fetchIncomeSources(userId),
    DataCache.fetchExpenses(userId),
    DataCache.fetchSavingsGoals(userId),
    supabase
      .from('activity_logs')
      .select('id, action_type, entity_type, title, description, icon, created_at')
      .eq('user_id', userId)
      .in('action_type', LOG_ONLY_ACTIONS)
      .order('created_at', { ascending: false }),
  ]);

  const [incomeCats, expenseCats] = await Promise.all([
    DataCache.fetchIncomeCategories(userId),
    DataCache.fetchExpenseCategories(userId),
  ]);
  const incomeCatMap  = Object.fromEntries(incomeCats.map(c => [c.id, c]));
  const expenseCatMap = Object.fromEntries(expenseCats.map(c => [c.id, c]));

  if (logsRes.error) throw logsRes.error;

  const items: ActivityItem[] = [];

  for (const r of cachedIncome) {
    const cat = incomeCatMap[r.category_id];
    const amt = Number(r.amount);
    items.push({
      id:          `inc-${r.id}`,
      action_type: 'INCOME_SOURCE_ADDED',
      entity_type: 'income_source',
      title:       `Income: ${r.title}`,
      description: `${fmtAmount(amt)} · ${cat?.label ?? 'Income'}${r.is_archived ? ' · Archived' : ''}`,
      icon:        cat?.icon ?? 'cash-outline',
      created_at:  (r as any).created_at,
      category_id: cat?.id,
      _raw: {
        id:             r.id,
        table:          'income_sources',
        title:          r.title,
        amount:         amt,
        date:           r.date,
        time:           r.time ?? '00:00:00',
        description:    r.description ?? '',
        category_id:    r.category_id,
        category_label: cat?.label ?? 'Income',
        is_recurring:   r.is_recurring,
        frequency:      r.frequency,
      },
    });
  }

  for (const r of cachedExpenses) {
    const cat = expenseCatMap[r.category_id];
    const amt = Number(r.amount);
    items.push({
      id:          `exp-${r.id}`,
      action_type: 'EXPENSE_ADDED',
      entity_type: 'expense',
      title:       `Expense: ${r.title}`,
      description: `${fmtAmount(amt)} · ${cat?.label ?? 'Expense'}${r.is_archived ? ' · Archived' : ''}`,
      icon:        cat?.icon ?? 'receipt-outline',
      created_at:  (r as any).created_at,
      category_id: cat?.id,
      _raw: {
        id:             r.id,
        table:          'expenses',
        title:          r.title,
        amount:         amt,
        date:           r.date,
        time:           r.time ?? '00:00:00',
        description:    r.description ?? '',
        category_id:    r.category_id,
        category_label: cat?.label ?? 'Expense',
        is_recurring:   r.is_recurring,
        frequency:      r.frequency,
      },
    });
  }

  for (const r of cachedGoals) {
    const isCompleted = r.is_completed || r.is_archived;
    if (isCompleted && r.completed_at) {
      items.push({
        id:          `goal-done-${r.id}`,
        action_type: 'SAVINGS_GOAL_COMPLETED',
        entity_type: 'savings_goal',
        title:       `Goal Achieved: ${r.title}`,
        description: `Target of ${fmtAmount(r.target_amount)} reached!`,
        icon:        r.icon ?? 'trophy-outline',
        created_at:  r.completed_at,
      });
    }
    items.push({
      id:          `goal-${r.id}`,
      action_type: 'SAVINGS_GOAL_CREATED',
      entity_type: 'savings_goal',
      title:       `Goal Created: ${r.title}`,
      description: `Target: ${fmtAmount(r.target_amount)}`,
      icon:        r.icon ?? 'flag-outline',
      created_at:  r.created_at,
    });
  }

  for (const r of logsRes.data ?? []) {
    items.push({
      id:          `log-${r.id}`,
      action_type: r.action_type,
      entity_type: r.entity_type,
      title:       r.title,
      description: r.description ?? '',
      icon:        r.icon,
      created_at:  r.created_at,
    });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items;
}

// ── Action sheet ──────────────────────────────────────────────────────────────
function ActionSheet({
  visible, item, onClose, onEdit, onDelete,
}: {
  visible:  boolean;
  item:     ActivityItem | null;
  onClose:  () => void;
  onEdit:   () => void;
  onDelete: () => void;
}) {
  const { theme } = useAppTheme();
  if (!item) return null;
  const isIncome = item._raw?.table === 'income_sources';
  const typeLabel = isIncome ? 'Income' : 'Expense';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.asBackdrop} onPress={onClose}>
        <Pressable style={[styles.asSheet, { backgroundColor: theme.cardBg }]} onPress={() => {}}>
          <View style={[styles.asHandle, { backgroundColor: theme.divider }]} />
          <Text style={[styles.asItemTitle, { color: theme.textMuted }]} numberOfLines={1}>
            {item._raw?.title ?? item.title}
          </Text>
          <TouchableOpacity
            style={[styles.asBtn, { borderBottomColor: theme.divider }]}
            onPress={() => { onClose(); setTimeout(onEdit, 180); }}
            activeOpacity={0.7}
          >
            <View style={[styles.asBtnIcon, { backgroundColor: 'rgba(72,149,239,0.12)' }]}>
              <Ionicons name="pencil-outline" size={18} color="#4895EF" />
            </View>
            <Text style={[styles.asBtnText, { color: '#4895EF' }]}>Edit {typeLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color="#4895EF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.asBtn, { borderBottomWidth: 0 }]}
            onPress={() => { onClose(); setTimeout(onDelete, 180); }}
            activeOpacity={0.7}
          >
            <View style={[styles.asBtnIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.asBtnText, { color: '#EF4444' }]}>Delete {typeLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.asCancelBtn, { backgroundColor: theme.surface }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.asCancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Date/Time picker modal ─────────────────────────────────────────────────────
function PickerModal({
  visible, mode, value, onChange, onClose,
}: {
  visible:  boolean;
  mode:     'date' | 'time';
  value:    Date;
  onChange: (d: Date) => void;
  onClose:  () => void;
}) {
  const { theme } = useAppTheme();
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.pickerSheet, { backgroundColor: theme.cardBg }]} onPress={() => {}}>
          <Text style={[styles.pickerTitle, { color: theme.textPrimary }]}>
            {mode === 'date' ? 'Select Date' : 'Select Time'}
          </Text>
          <DateTimePicker
            value={local}
            mode={mode}
            display="spinner"
            onChange={(_, d) => { if (d) setLocal(d); }}
            style={{ width: '100%' }}
            textColor={theme.textPrimary}
          />
          <View style={styles.pickerBtns}>
            <TouchableOpacity
              style={[styles.pickerBtn, { borderColor: theme.divider }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: '#1B7A4A', borderColor: '#1B7A4A' }]}
              onPress={() => { onChange(local); onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.pickerBtnText, { color: '#fff' }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Edit transaction modal ─────────────────────────────────────────────────────
function EditTransactionModal({
  item, userId, visible, onClose, onSaved,
}: {
  item:    ActivityItem;
  userId:  string;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useAppTheme();
  const raw = item._raw!;

  const [titleStr, setTitleStr]       = useState(raw.title);
  const [amtStr,   setAmtStr]         = useState(String(raw.amount));
  const [catId,    setCatId]          = useState(raw.category_id);
  const [dateObj,  setDateObj]        = useState(() => new Date(raw.date + 'T00:00:00'));
  const [timeObj,  setTimeObj]        = useState(() => timeStrToDate(raw.time));
  const [descStr,  setDescStr]        = useState(raw.description);
  const [cats,     setCats]           = useState<CachedCategory[]>([]);
  const [showDate, setShowDate]       = useState(false);
  const [showTime, setShowTime]       = useState(false);
  const [saving,   setSaving]         = useState(false);
  const [errMsg,   setErrMsg]         = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitleStr(raw.title);
    setAmtStr(String(raw.amount));
    setCatId(raw.category_id);
    setDateObj(new Date(raw.date + 'T00:00:00'));
    setTimeObj(timeStrToDate(raw.time));
    setDescStr(raw.description ?? '');
    setErrMsg('');
  }, [visible, raw]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const data = raw.table === 'income_sources'
        ? await DataCache.fetchIncomeCategories(userId)
        : await DataCache.fetchExpenseCategories(userId);
      setCats(data.filter(c => !c.is_archived));
    };
    load().catch(() => {});
  }, [visible, raw.table, userId]);

  async function handleSave() {
    const title = titleStr.trim();
    const amt   = parseFloat(amtStr.replace(/[^0-9.]/g, ''));
    if (!title)             { setErrMsg('Title is required.'); return; }
    if (isNaN(amt) || amt <= 0) { setErrMsg('Enter a valid amount greater than zero.'); return; }

    setSaving(true);
    setErrMsg('');

    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateToTimeStr(timeObj);

    const { error } = await supabase
      .from(raw.table)
      .update({ title, amount: amt, category_id: catId, date: dateStr, time: timeStr, description: descStr.trim() })
      .eq('id', raw.id)
      .eq('user_id', userId);

    if (error) { setErrMsg(error.message); setSaving(false); return; }

    if (raw.table === 'income_sources') {
      DataCache.invalidateIncomeSources(userId);
      await logActivity({ user_id: userId, action_type: ACTION.INCOME_SOURCE_UPDATED, entity_type: ENTITY.INCOME_SOURCE, title: `Income updated: ${title}`, description: `Amount: ${fmtAmount(amt)}`, icon: 'pencil-outline' });
    } else {
      DataCache.invalidateExpenses(userId);
      await logActivity({ user_id: userId, action_type: ACTION.EXPENSE_UPDATED, entity_type: ENTITY.EXPENSE, title: `Expense updated: ${title}`, description: `Amount: ${fmtAmount(amt)}`, icon: 'pencil-outline' });
    }
    DataCache.invalidateDashboard(userId);

    setSaving(false);
    onClose();
    onSaved();
  }

  const isIncome = raw.table === 'income_sources';
  const accentColor = isIncome ? '#22C55E' : '#4895EF';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.editSafe, { backgroundColor: accentColor }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.editHeader, { backgroundColor: accentColor }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.editHeaderClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.editHeaderTitle}>Edit {isIncome ? 'Income' : 'Expense'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={[styles.editScroll, { backgroundColor: theme.cardBg }]}
            contentContainerStyle={styles.editContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={[styles.editLabel, { color: theme.textMuted }]}>TITLE</Text>
            <View style={[styles.editInputWrap, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.editInput, { color: theme.textPrimary }]}
                value={titleStr}
                onChangeText={setTitleStr}
                placeholder="Transaction title"
                placeholderTextColor={theme.textMuted}
                returnKeyType="next"
              />
            </View>

            {/* Amount */}
            <Text style={[styles.editLabel, { color: theme.textMuted, marginTop: 18 }]}>AMOUNT</Text>
            <View style={[styles.editInputWrap, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
              <Text style={[styles.editCurrencyPrefix, { color: theme.textSecondary }]}>₱</Text>
              <TextInput
                style={[styles.editInput, { color: theme.textPrimary }]}
                value={amtStr}
                onChangeText={setAmtStr}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Category */}
            <Text style={[styles.editLabel, { color: theme.textMuted, marginTop: 18 }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {cats.map(c => {
                const sel = c.id === catId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, sel && { borderColor: accentColor, backgroundColor: accentColor + '18' }, !sel && { borderColor: theme.divider, backgroundColor: theme.surface }]}
                    onPress={() => setCatId(c.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={c.icon as any} size={14} color={sel ? accentColor : theme.textSecondary} />
                    <Text style={[styles.catChipText, { color: sel ? accentColor : theme.textSecondary }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Date + Time */}
            <View style={styles.editDateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.editLabel, { color: theme.textMuted }]}>DATE</Text>
                <TouchableOpacity
                  style={[styles.editPickerBtn, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}
                  onPress={() => setShowDate(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.editPickerText, { color: theme.textPrimary }]}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.editLabel, { color: theme.textMuted }]}>TIME</Text>
                <TouchableOpacity
                  style={[styles.editPickerBtn, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}
                  onPress={() => setShowTime(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.editPickerText, { color: theme.textPrimary }]}>{fmt12h(timeObj)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.editLabel, { color: theme.textMuted, marginTop: 18 }]}>DESCRIPTION</Text>
            <View style={[styles.editInputWrap, { backgroundColor: theme.surface, borderColor: theme.inputBorder, minHeight: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
              <TextInput
                style={[styles.editInput, { color: theme.textPrimary, textAlignVertical: 'top' }]}
                value={descStr}
                onChangeText={setDescStr}
                placeholder="Optional note…"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Error */}
            {errMsg !== '' && (
              <Text style={styles.editError}>{errMsg}</Text>
            )}

            {/* Save */}
            <TouchableOpacity
              style={[styles.editSaveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.editSaveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        <PickerModal visible={showDate} mode="date" value={dateObj} onChange={setDateObj} onClose={() => setShowDate(false)} />
        <PickerModal visible={showTime} mode="time" value={timeObj} onChange={setTimeObj} onClose={() => setShowTime(false)} />
      </SafeAreaView>
    </Modal>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({
  item, visible, loading, onCancel, onConfirm,
}: {
  item:      ActivityItem | null;
  visible:   boolean;
  loading:   boolean;
  onCancel:  () => void;
  onConfirm: () => void;
}) {
  const { theme } = useAppTheme();
  if (!item) return null;
  const isIncome = item._raw?.table === 'income_sources';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.asBackdrop} onPress={loading ? undefined : onCancel}>
        <Pressable style={[styles.deleteCard, { backgroundColor: theme.cardBg }]} onPress={() => {}}>
          <View style={styles.deleteIconWrap}>
            <Ionicons name="trash-outline" size={28} color="#EF4444" />
          </View>
          <Text style={[styles.deleteTitle, { color: theme.textPrimary }]}>Delete {isIncome ? 'Income' : 'Expense'}?</Text>
          <Text style={[styles.deleteBody, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: Font.bodySemiBold }}>{item._raw?.title}</Text>
            {' '}will be permanently removed. This cannot be undone.
          </Text>
          <View style={styles.deleteBtnRow}>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: theme.divider, backgroundColor: theme.surface }]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.deleteBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[styles.deleteBtnText, { color: '#fff' }]}>{loading ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({
  label, active, onPress, theme,
}: {
  label: string; active: boolean; onPress: () => void;
  theme: import('@/contexts/AppTheme').Theme;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        style={[styles.filterChip, active && styles.filterChipActive, !active && { backgroundColor: theme.surface }]}
        onPress={() => {
          scale.value = withSpring(0.88, { damping: 6, stiffness: 600 });
          setTimeout(() => { scale.value = withSpring(1, { damping: 10, stiffness: 400 }); }, 80);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive, !active && { color: theme.textSecondary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Navigation helper ─────────────────────────────────────────────────────────
function navigateToActivity(item: ActivityItem) {
  const a          = item.action_type;
  const categoryId = item.category_id;

  if (item.entity_type === 'income_source' || item.entity_type === 'income_category') {
    if (a === 'INCOME_SOURCE_ADDED' && categoryId) {
      setNavTarget({ tab: 'income', categoryId, detailTab: 'Active' });
    } else if (a === 'INCOME_CATEGORY_ARCHIVED') {
      setNavTarget({ tab: 'income', catTab: 'Archived' });
    } else {
      setNavTarget({ tab: 'income', catTab: 'Active' });
    }
    router.push('/(tabs)/analytics' as any);
    return;
  }

  if (item.entity_type === 'expense' || item.entity_type === 'expense_category') {
    if (a === 'EXPENSE_ADDED' && categoryId) {
      setNavTarget({ tab: 'expense', categoryId, detailTab: 'Active' });
    } else if (a === 'EXPENSE_CATEGORY_ARCHIVED') {
      setNavTarget({ tab: 'expense', catTab: 'Archived' });
    } else {
      setNavTarget({ tab: 'expense', catTab: 'Active' });
    }
    router.push('/(tabs)/budget' as any);
    return;
  }

  if (item.entity_type === 'savings_goal') {
    if (a === 'SAVINGS_GOAL_COMPLETED') {
      setNavTarget({ tab: 'savings', goalTab: 'Completed' });
    } else if (a === 'SAVINGS_GOAL_ARCHIVED') {
      setNavTarget({ tab: 'savings', goalTab: 'Archived' });
    } else {
      setNavTarget({ tab: 'savings', goalTab: 'Active' });
    }
    router.push('/savings-goals' as any);
  }
}

// ── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({
  item, theme, onMore,
}: {
  item:    ActivityItem;
  theme:   import('@/contexts/AppTheme').Theme;
  onMore?: (item: ActivityItem) => void;
}) {
  const color     = entityColor(item.entity_type, item.action_type);
  const canEdit   = !!item._raw;

  return (
    <TouchableOpacity
      style={[styles.activityItem, { borderBottomColor: theme.divider }]}
      onPress={() => navigateToActivity(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={item.icon as any} size={18} color="#fff" />
      </View>
      <View style={styles.activityInfo}>
        <View style={styles.activityTitleRow}>
          <Text style={[styles.activityTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.activityTime, { color: theme.textMuted }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
        {item.description !== '' && (
          <Text style={[styles.activityDesc, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <View style={[styles.actionBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.actionBadgeText, { color }]}>{actionLabel(item.action_type)}</Text>
        </View>
      </View>
      {canEdit ? (
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => onMore?.(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textMuted as string} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted as string} style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TransactionHistoryScreen() {
  const { theme }   = useAppTheme();
  const [all, setAll]                   = useState<ActivityItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const debouncedSearch                 = useDebounce(search, 300);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [errModal, setErrModal]         = useState({ visible: false, title: '', message: '' });

  // Edit / delete state
  const [actionItem, setActionItem]   = useState<ActivityItem | null>(null);
  const [editItem,   setEditItem]     = useState<ActivityItem | null>(null);
  const [deleteItem, setDeleteItem]   = useState<ActivityItem | null>(null);
  const [deleting,   setDeleting]     = useState(false);

  const userIdRef = useRef<string | null>(null);

  // Entrance animation
  const bodyOpacity = useSharedValue(0);
  const bodyTY      = useSharedValue(20);
  useEffect(() => {
    bodyOpacity.value = withTiming(1, { duration: 280 });
    bodyTY.value      = withSpring(0, { damping: 22, stiffness: 180 });
  }, []);
  const bodyAnim = useAnimatedStyle(() => ({
    flex: 1,
    opacity: bodyOpacity.value,
    transform: [{ translateY: bodyTY.value }],
  }));

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const items = await fetchAllActivity(uid);
      setAll(items);
    } catch (err: any) {
      setErrModal({ visible: true, title: 'Failed to Load Activity', message: err?.message ?? 'Could not load activity history. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        load(session.user.id);
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (userIdRef.current) load(userIdRef.current);
    }, [load]),
  );

  // ── Delete handler ──────────────────────────────────────────────────────────
  async function handleDelete() {
    const item = deleteItem;
    if (!item?._raw || !userIdRef.current) return;
    const { id, table } = item._raw;
    const userId = userIdRef.current;

    setDeleting(true);

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      setDeleting(false);
      setDeleteItem(null);
      setErrModal({ visible: true, title: 'Delete Failed', message: error.message });
      return;
    }

    await logActivity({
      user_id:     userId,
      action_type: table === 'income_sources' ? ACTION.INCOME_SOURCE_DELETED : ACTION.EXPENSE_DELETED,
      entity_type: table === 'income_sources' ? ENTITY.INCOME_SOURCE : ENTITY.EXPENSE,
      title:       `${table === 'income_sources' ? 'Income' : 'Expense'} deleted: ${item._raw.title}`,
      description: `Amount: ${fmtAmount(item._raw.amount)}`,
      icon:        'trash-outline',
    });

    if (table === 'income_sources') {
      DataCache.invalidateIncomeSources(userId);
    } else {
      DataCache.invalidateExpenses(userId);
    }
    DataCache.invalidateDashboard(userId);

    setDeleting(false);
    setDeleteItem(null);
    load(userId);
  }

  // ── Export handler ──────────────────────────────────────────────────────────
  async function handleExport() {
    const uid = userIdRef.current;
    if (!uid) return;

    const exportable = filtered.filter(i => i._raw);
    if (exportable.length === 0) {
      setErrModal({ visible: true, title: 'Nothing to Export', message: 'No income or expense transactions match the current view.' });
      return;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      setErrModal({ visible: true, title: 'Export Not Available', message: 'Sharing is not supported on this device.' });
      return;
    }

    const header = 'Date,Time,Type,Category,Title,Amount,Description,Recurring,Frequency';
    const rows = exportable.map(item => {
      const r = item._raw!;
      const type = r.table === 'income_sources' ? 'Income' : 'Expense';
      const time12 = fmt12h(timeStrToDate(r.time));
      return [
        r.date,
        csvEscape(time12),
        type,
        csvEscape(r.category_label),
        csvEscape(r.title),
        r.amount.toFixed(2),
        csvEscape(r.description),
        r.is_recurring ? 'Yes' : 'No',
        r.frequency ?? '',
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const today = new Date().toISOString().split('T')[0];
    const fileName = `PennyWise_Export_${today}.csv`;
    const filePath = (FileSystem.cacheDirectory ?? '') + fileName;

    await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(filePath, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  }

  // ── Filter + search ─────────────────────────────────────────────────────────
  const ENTITY_TYPES: Record<FilterType, string[]> = {
    All:      [],
    Income:   ['income_source', 'income_category'],
    Expenses: ['expense', 'expense_category'],
    Savings:  ['savings_goal'],
  };

  const filtered = all.filter(item => {
    const types       = ENTITY_TYPES[activeFilter];
    const matchFilter = activeFilter === 'All' || types.includes(item.entity_type);
    const q           = debouncedSearch.toLowerCase().trim();
    const matchSearch = q === '' ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const sections = groupByDate(filtered);

  const incomeCount  = all.filter(i => i.entity_type === 'income_source').length;
  const expenseCount = all.filter(i => i.entity_type === 'expense').length;
  const savingsCount = all.filter(i => i.entity_type === 'savings_goal').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      <Animated.View style={bodyAnim}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.iconBtnBg }]}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <PennyWiseLogo size="xs" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.iconBtnColor }]}>Activity History</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.iconBtnBg }]}
              onPress={handleExport}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={20} color={theme.iconBtnColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.iconBtnBg }]}
              onPress={() => userIdRef.current && load(userIdRef.current)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={20} color={theme.iconBtnColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{incomeCount}</Text>
            <Text style={styles.statLabel}>Income</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{expenseCount}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{savingsCount}</Text>
            <Text style={styles.statLabel}>Savings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{all.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: theme.iconBtnBg }]}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.6)" />
            <TextInput
              style={[styles.searchInput, { color: '#fff' }]}
              placeholder="Search history..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          {/* Filters */}
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <FilterChip key={f} label={f} active={activeFilter === f} onPress={() => setActiveFilter(f)} theme={theme} />
            ))}
          </View>

          {/* Count + export hint */}
          {!loading && (
            <View style={styles.countRow}>
              <Text style={[styles.resultCount, { color: theme.textMuted }]}>
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              </Text>
              {filtered.some(i => i._raw) && (
                <Text style={[styles.resultCount, { color: theme.textMuted }]}>
                  · tap ··· to edit/delete
                </Text>
              )}
            </View>
          )}

          {loading ? (
            <ActivityHistorySkeleton />
          ) : sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={52} color={theme.divider} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {all.length === 0 ? 'No activity yet' : 'No results found'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {all.length === 0
                  ? 'Actions across Income, Expenses, and Savings will appear here.'
                  : 'Try a different search or filter.'}
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: theme.cardBg }]}>
                  <Text style={[styles.sectionHeaderText, { color: theme.textMuted }]}>
                    {section.title}
                  </Text>
                  <View style={[styles.sectionLine, { backgroundColor: theme.divider }]} />
                </View>
              )}
              renderItem={({ item }) => (
                <ActivityRow item={item} theme={theme} onMore={setActionItem} />
              )}
            />
          )}
        </View>
      </Animated.View>

      {/* Action sheet */}
      <ActionSheet
        visible={!!actionItem}
        item={actionItem}
        onClose={() => setActionItem(null)}
        onEdit={() => setEditItem(actionItem)}
        onDelete={() => setDeleteItem(actionItem)}
      />

      {/* Edit modal */}
      {editItem?._raw && (
        <EditTransactionModal
          item={editItem}
          userId={userIdRef.current ?? ''}
          visible={!!editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => userIdRef.current && load(userIdRef.current)}
        />
      )}

      {/* Delete confirm */}
      <DeleteConfirmModal
        item={deleteItem}
        visible={!!deleteItem}
        loading={deleting}
        onCancel={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 20,
    paddingTop:        10,
    paddingBottom:     14,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Font.headerBold, fontSize: 20, letterSpacing: 0.2, flex: 1, textAlign: 'center' },
  headerRight: { flexDirection: 'row', gap: 8 },

  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  statItem:   { flex: 1, alignItems: 'center', gap: 2 },
  statValue:  { fontFamily: Font.headerBold, fontSize: 18, color: '#fff' },
  statLabel:  { fontFamily: Font.bodyRegular, fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  searchRow:   { paddingHorizontal: 20, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontFamily: Font.bodyRegular, fontSize: 14, padding: 0 },

  card: {
    flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 20, overflow: 'hidden',
  },
  filterRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip:  { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 },
  filterChipActive:     { backgroundColor: '#3ECBA8' },
  filterChipText:       { fontFamily: Font.bodyMedium, fontSize: 13 },
  filterChipTextActive: { fontFamily: Font.bodySemiBold, color: '#fff' },

  countRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4, gap: 6 },
  resultCount: { fontFamily: Font.bodyRegular, fontSize: 12 },

  listContent: { paddingBottom: 60 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 10,
  },
  sectionHeaderText: {
    fontFamily: Font.bodySemiBold, fontSize: 12,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionLine: { flex: 1, height: 1 },

  activityItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, gap: 12,
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  activityInfo:     { flex: 1, gap: 3 },
  activityTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  activityTitle:    { fontFamily: Font.bodySemiBold, fontSize: 14, flex: 1 },
  activityTime:     { fontFamily: Font.bodyRegular,  fontSize: 11, marginTop: 2, flexShrink: 0 },
  activityDesc:     { fontFamily: Font.bodyRegular,  fontSize: 12, lineHeight: 16 },
  actionBadge: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginTop: 2,
  },
  actionBadgeText: { fontFamily: Font.bodySemiBold, fontSize: 10 },
  moreBtn: { paddingHorizontal: 4, paddingVertical: 4, marginLeft: 2 },

  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, paddingTop: 60, gap: 10,
  },
  emptyTitle:    { fontFamily: Font.headerBold, fontSize: 18, textAlign: 'center', marginTop: 8 },
  emptySubtitle: { fontFamily: Font.bodyRegular, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── Action sheet ──────────────────────────────────────────────────────────────
  asBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  asSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12,
  },
  asHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  asItemTitle: { fontFamily: Font.bodyRegular, fontSize: 12, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
  asBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  asBtnIcon:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  asBtnText:  { fontFamily: Font.bodySemiBold, fontSize: 15, flex: 1 },
  asCancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  asCancelText: { fontFamily: Font.bodySemiBold, fontSize: 15 },

  // ── Date/time picker ─────────────────────────────────────────────────────────
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 28,
  },
  pickerTitle:   { fontFamily: Font.headerBold, fontSize: 16, textAlign: 'center', marginBottom: 4 },
  pickerBtns:    { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 12 },
  pickerBtn:     { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: 'center' },
  pickerBtnText: { fontFamily: Font.bodySemiBold, fontSize: 15 },

  // ── Edit modal ────────────────────────────────────────────────────────────────
  editSafe:   { flex: 1 },
  editHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  editHeaderClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  editHeaderTitle: { fontFamily: Font.headerBold, fontSize: 18, color: '#fff', flex: 1, textAlign: 'center' },
  editScroll:  { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  editContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  editLabel:   { fontFamily: Font.bodySemiBold, fontSize: 11, letterSpacing: 0.6, marginBottom: 6 },
  editInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 50,
  },
  editCurrencyPrefix: { fontFamily: Font.bodySemiBold, fontSize: 16, marginRight: 4 },
  editInput:   { flex: 1, fontFamily: Font.bodyRegular, fontSize: 15, padding: 0 },
  catScroll:   { marginBottom: 2 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 50,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
  },
  catChipText: { fontFamily: Font.bodyMedium, fontSize: 12 },
  editDateRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  editPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13,
  },
  editPickerText: { fontFamily: Font.bodyRegular, fontSize: 13, flex: 1 },
  editError:   { fontFamily: Font.bodyRegular, fontSize: 13, color: '#EF4444', marginTop: 12, textAlign: 'center' },
  editSaveBtn: {
    borderRadius: 50, paddingVertical: 16, alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  editSaveBtnText: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff', letterSpacing: 0.3 },

  // ── Delete confirm ────────────────────────────────────────────────────────────
  deleteCard: {
    marginHorizontal: 24, borderRadius: 24,
    padding: 24, alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  deleteIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  deleteTitle:  { fontFamily: Font.headerBold, fontSize: 18 },
  deleteBody:   { fontFamily: Font.bodyRegular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  deleteBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  deleteBtn:    { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 13, alignItems: 'center' },
  deleteBtnText: { fontFamily: Font.bodySemiBold, fontSize: 15 },
});
