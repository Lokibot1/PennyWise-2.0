import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────
type FilterType = 'All' | 'Income' | 'Expenses' | 'Savings';

type ActivityItem = {
  id: string;
  action_type: string;
  entity_type: string;
  title: string;
  description: string;
  icon: string;
  created_at: string;   // ISO string, used for sorting + display
};

type Section = {
  title: string;
  data: ActivityItem[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS: FilterType[] = ['All', 'Income', 'Expenses', 'Savings'];

// action_types sourced from activity_logs (not from source tables directly)
// Excluded: INCOME_SOURCE_ADDED, EXPENSE_ADDED, SAVINGS_GOAL_CREATED,
//           SAVINGS_GOAL_COMPLETED — these come from source tables to cover history.
const LOG_ONLY_ACTIONS = [
  'INCOME_SOURCE_UPDATED',
  'INCOME_SOURCE_ARCHIVED',
  'INCOME_SOURCE_RESTORED',
  'INCOME_SOURCE_DELETED',
  'EXPENSE_UPDATED',
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
    EXPENSE_CATEGORY_ARCHIVED: 'Expense Category Archived',
    EXPENSE_ADDED:             'New Expense Created',
    EXPENSE_UPDATED:           'Expense Updated',
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

// ── Build unified activity feed from source tables + activity_logs ─────────────
async function fetchAllActivity(userId: string): Promise<ActivityItem[]> {
  const [incomeRes, expenseRes, goalsRes, logsRes] = await Promise.all([
    // All income sources (including archived)
    supabase
      .from('income_sources')
      .select('id, title, amount, created_at, is_archived, income_categories(label, icon)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    // All expenses (including archived)
    supabase
      .from('expenses')
      .select('id, title, amount, created_at, is_archived, expense_categories(label, icon)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    // All savings goals (active + completed + archived)
    supabase
      .from('savings_goals')
      .select('id, icon, title, target_amount, current_amount, is_completed, is_archived, completed_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

    // activity_logs — only metadata events not covered by source tables
    supabase
      .from('activity_logs')
      .select('id, action_type, entity_type, title, description, icon, created_at')
      .eq('user_id', userId)
      .in('action_type', LOG_ONLY_ACTIONS)
      .order('created_at', { ascending: false }),
  ]);

  const items: ActivityItem[] = [];

  // ── Income sources ──────────────────────────────────────────────────────────
  for (const r of incomeRes.data ?? []) {
    const cat = (r as any).income_categories;
    const amt = Number((r as any).amount);
    items.push({
      id:          `inc-${r.id}`,
      action_type: 'INCOME_SOURCE_ADDED',
      entity_type: 'income_source',
      title:       `Income: ${(r as any).title}`,
      description: `${fmtAmount(amt)} · ${cat?.label ?? 'Income'}${(r as any).is_archived ? ' · Archived' : ''}`,
      icon:        cat?.icon ?? 'cash-outline',
      created_at:  (r as any).created_at,
    });
  }

  // ── Expenses ────────────────────────────────────────────────────────────────
  for (const r of expenseRes.data ?? []) {
    const cat = (r as any).expense_categories;
    const amt = Number((r as any).amount);
    items.push({
      id:          `exp-${r.id}`,
      action_type: 'EXPENSE_ADDED',
      entity_type: 'expense',
      title:       `Expense: ${(r as any).title}`,
      description: `${fmtAmount(amt)} · ${cat?.label ?? 'Expense'}${(r as any).is_archived ? ' · Archived' : ''}`,
      icon:        cat?.icon ?? 'receipt-outline',
      created_at:  (r as any).created_at,
    });
  }

  // ── Savings goals ───────────────────────────────────────────────────────────
  for (const r of goalsRes.data ?? []) {
    const isCompleted = (r as any).is_completed || (r as any).is_archived;
    // Completion event (uses completed_at as timestamp)
    if (isCompleted && (r as any).completed_at) {
      items.push({
        id:          `goal-done-${r.id}`,
        action_type: 'SAVINGS_GOAL_COMPLETED',
        entity_type: 'savings_goal',
        title:       `Goal Achieved: ${(r as any).title}`,
        description: `Target of ${fmtAmount((r as any).target_amount)} reached!`,
        icon:        (r as any).icon ?? 'trophy-outline',
        created_at:  (r as any).completed_at,
      });
    }
    // Creation event (always shown)
    items.push({
      id:          `goal-${r.id}`,
      action_type: 'SAVINGS_GOAL_CREATED',
      entity_type: 'savings_goal',
      title:       `Goal Created: ${(r as any).title}`,
      description: `Target: ${fmtAmount((r as any).target_amount)}`,
      icon:        (r as any).icon ?? 'flag-outline',
      created_at:  (r as any).created_at,
    });
  }

  // ── Metadata logs (updates, category events, goal funding) ──────────────────
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

  // Sort all by created_at descending
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return items;
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

// ── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({
  item, theme,
}: {
  item: ActivityItem; theme: import('@/contexts/AppTheme').Theme;
}) {
  const color = entityColor(item.entity_type, item.action_type);
  return (
    <View style={[styles.activityItem, { borderBottomColor: theme.divider }]}>
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
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TransactionHistoryScreen() {
  const { theme }   = useAppTheme();
  const [all, setAll]                   = useState<ActivityItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
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

  // Load data
  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const items = await fetchAllActivity(uid);
    setAll(items);
    setLoading(false);
  }, []);

  // Auth listener (initial load)
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

  // Refresh on focus (catches changes made in other tabs)
  useFocusEffect(
    useCallback(() => {
      if (userIdRef.current) load(userIdRef.current);
    }, [load]),
  );

  // Filter + search
  const ENTITY_TYPES: Record<FilterType, string[]> = {
    All:      [],
    Income:   ['income_source', 'income_category'],
    Expenses: ['expense', 'expense_category'],
    Savings:  ['savings_goal'],
  };

  const filtered = all.filter(item => {
    const types = ENTITY_TYPES[activeFilter];
    const matchFilter = activeFilter === 'All' || types.includes(item.entity_type);
    const q = search.toLowerCase().trim();
    const matchSearch = q === '' ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const sections = groupByDate(filtered);

  // Stats
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
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.iconBtnBg }]}
            onPress={() => userIdRef.current && load(userIdRef.current)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.iconBtnColor} />
          </TouchableOpacity>
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

          {/* Count */}
          {!loading && (
            <Text style={[styles.resultCount, { color: theme.textMuted }]}>
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator color="#3ECBA8" size="large" style={{ marginTop: 60 }} />
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
              renderItem={({ item }) => <ActivityRow item={item} theme={theme} />}
            />
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    letterSpacing: 0.2,
  },

  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: Font.headerBold, fontSize: 18, color: '#fff' },
  statLabel: { fontFamily: Font.bodyRegular, fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  searchRow: { paddingHorizontal: 20, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: Font.bodyRegular, fontSize: 14, padding: 0 },

  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    overflow: 'hidden',
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 },
  filterChipActive: { backgroundColor: '#3ECBA8' },
  filterChipText: { fontFamily: Font.bodyMedium, fontSize: 13 },
  filterChipTextActive: { fontFamily: Font.bodySemiBold, color: '#fff' },
  resultCount: { fontFamily: Font.bodyRegular, fontSize: 12, paddingHorizontal: 20, marginBottom: 4 },

  listContent: { paddingBottom: 60 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  sectionHeaderText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionLine: { flex: 1, height: 1 },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  activityInfo: { flex: 1, gap: 3 },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityTitle: { fontFamily: Font.bodySemiBold, fontSize: 14, flex: 1 },
  activityTime:  { fontFamily: Font.bodyRegular,  fontSize: 11, marginTop: 2, flexShrink: 0 },
  activityDesc:  { fontFamily: Font.bodyRegular,  fontSize: 12, lineHeight: 16 },
  actionBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  actionBadgeText: { fontFamily: Font.bodySemiBold, fontSize: 10 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle:    { fontFamily: Font.headerBold, fontSize: 18, textAlign: 'center', marginTop: 8 },
  emptySubtitle: { fontFamily: Font.bodyRegular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
