import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
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

type ActivityLog = {
  id: string;
  action_type: string;
  entity_type: string;
  title: string;
  description: string;
  icon: string;
  created_at: string;
};

type Section = {
  title: string;   // e.g. "Today", "Yesterday", "March 20, 2026"
  data: ActivityLog[];
};

// ── Constants ─────────────────────────────────────────────────────────────────
const FILTERS: FilterType[] = ['All', 'Income', 'Expenses', 'Savings'];

const ENTITY_FILTER: Record<FilterType, string[]> = {
  All:      [],
  Income:   ['income_category', 'income_source'],
  Expenses: ['expense_category', 'expense'],
  Savings:  ['savings_goal'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function entityColor(entityType: string, actionType: string): string {
  if (entityType === 'savings_goal') {
    if (actionType === 'SAVINGS_GOAL_COMPLETED') return '#3ECBA8';
    return '#F59E0B';
  }
  if (entityType.startsWith('income')) return '#22C55E';
  if (entityType.startsWith('expense')) return '#4895EF';
  return '#9AA5B4';
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${ampm}`;
}

function sectionTitle(iso: string): string {
  const d     = new Date(iso);
  const today = new Date();
  const diff  = Math.floor((today.setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(logs: ActivityLog[]): Section[] {
  const map = new Map<string, ActivityLog[]>();
  for (const log of logs) {
    const key = sectionTitle(log.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function actionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    INCOME_CATEGORY_CREATED:  'Category Created',
    INCOME_SOURCE_ADDED:      'Income Added',
    INCOME_SOURCE_UPDATED:    'Income Updated',
    INCOME_CATEGORY_ARCHIVED: 'Category Archived',
    EXPENSE_CATEGORY_CREATED:  'Category Created',
    EXPENSE_ADDED:             'Expense Added',
    EXPENSE_UPDATED:           'Expense Updated',
    EXPENSE_CATEGORY_ARCHIVED: 'Category Archived',
    SAVINGS_GOAL_CREATED:      'Goal Created',
    SAVINGS_GOAL_FUNDED:       'Goal Funded',
    SAVINGS_GOAL_COMPLETED:    'Goal Achieved',
  };
  return labels[actionType] ?? actionType;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: import('@/contexts/AppTheme').Theme;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          active && styles.filterChipActive,
          !active && { backgroundColor: theme.surface },
        ]}
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

function ActivityItem({
  item,
  theme,
}: {
  item: ActivityLog;
  theme: import('@/contexts/AppTheme').Theme;
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
        <View style={[styles.actionBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.actionBadgeText, { color }]}>{actionLabel(item.action_type)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TransactionHistoryScreen() {
  const { theme } = useAppTheme();
  const [logs, setLogs]           = useState<ActivityLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const userIdRef = useRef<string | null>(null);

  // ── Entrance animation ─────────────────────────────────────────────────────
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

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, action_type, entity_type, title, description, icon, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!error && data) setLogs(data as ActivityLog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        fetchLogs(session.user.id);
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchLogs]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const filtered = logs.filter(log => {
    const entityTypes = ENTITY_FILTER[activeFilter];
    const matchFilter = activeFilter === 'All' || entityTypes.includes(log.entity_type);
    const q = search.toLowerCase().trim();
    const matchSearch = q === '' ||
      log.title.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.action_type.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const sections = groupByDate(filtered);

  // ── Stats for summary ──────────────────────────────────────────────────────
  const incomeCount  = logs.filter(l => l.entity_type.startsWith('income')).length;
  const expenseCount = logs.filter(l => l.entity_type.startsWith('expense')).length;
  const savingsCount = logs.filter(l => l.entity_type === 'savings_goal').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      <Animated.View style={bodyAnim}>
        {/* ── Header ──────────────────────────────────────────────────────── */}
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
            onPress={() => userIdRef.current && fetchLogs(userIdRef.current)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.iconBtnColor} />
          </TouchableOpacity>
        </View>

        {/* ── Stats Strip ─────────────────────────────────────────────────── */}
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
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* ── Search ──────────────────────────────────────────────────────── */}
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

        {/* ── White Card ──────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          {/* Filter chips */}
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <FilterChip
                key={f}
                label={f}
                active={activeFilter === f}
                onPress={() => setActiveFilter(f)}
                theme={theme}
              />
            ))}
          </View>

          {/* Result count */}
          {!loading && (
            <Text style={[styles.resultCount, { color: theme.textMuted }]}>
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Text>
          )}

          {/* Content */}
          {loading ? (
            <ActivityIndicator color="#3ECBA8" size="large" style={{ marginTop: 60 }} />
          ) : sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={52} color={theme.divider} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {logs.length === 0 ? 'No activity yet' : 'No results found'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {logs.length === 0
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
                <ActivityItem item={item} theme={theme} />
              )}
            />
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────────────────────────
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

  // ── Stats Strip ───────────────────────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: Font.headerBold,
    fontSize: 18,
    color: '#fff',
  },
  statLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },

  // ── Search ────────────────────────────────────────────────────────────────────
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    padding: 0,
  },

  // ── White Card ────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    overflow: 'hidden',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 50,
  },
  filterChipActive: {
    backgroundColor: '#3ECBA8',
  },
  filterChipText: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
  },
  filterChipTextActive: {
    fontFamily: Font.bodySemiBold,
    color: '#fff',
  },
  resultCount: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  // ── Section List ─────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: 60,
  },
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
  sectionLine: {
    flex: 1,
    height: 1,
  },

  // ── Activity Item ─────────────────────────────────────────────────────────────
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
  activityInfo: {
    flex: 1,
    gap: 3,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityTitle: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    flex: 1,
  },
  activityTime: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    marginTop: 2,
    flexShrink: 0,
  },
  activityDesc: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  actionBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  actionBadgeText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 10,
  },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Font.headerBold,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
