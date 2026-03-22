import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import { HomeDashboardSkeleton, TransactionRowSkeleton } from '@/components/SkeletonLoader';
import NotificationBell from '@/components/NotificationBell';
import SlideTabBar from '@/components/SlideTabBar';
import BudgetLimitModal from '@/components/BudgetLimitModal';
import ErrorModal from '@/components/ErrorModal';

// ── Types ──────────────────────────────────────────────────────────────────────
type Period = 'Daily' | 'Weekly' | 'Monthly';

type TxRow = {
  id: string;
  icon: string;
  title: string;
  time: string;
  date: string;   // ISO "YYYY-MM-DD"
  category: string;
  value: number;  // positive = income, negative = expense
};

type SavingsGoalRow = {
  id: string;
  icon: string;
  title: string;
  target_amount: number;
  current_amount: number;
};

const PERIODS: Period[] = ['Daily', 'Weekly', 'Monthly'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const str = abs.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (value < 0 ? '-' : '') + '₱' + str;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function filterByPeriod(txs: TxRow[], period: Period): TxRow[] {
  const now = new Date();
  return txs.filter(tx => {
    const d = new Date(tx.date);
    if (period === 'Daily') return d.toDateString() === now.toDateString();
    if (period === 'Weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { theme } = useAppTheme();
  const [activePeriod, setActivePeriod] = useState<Period>('Monthly');

  // Dashboard state
  const [userName, setUserName]               = useState('');
  const [totalIncome, setTotalIncome]         = useState(0);
  const [totalExpense, setTotalExpense]       = useState(0);
  const [budgetLimit, setBudgetLimit]         = useState(20000);
  const [savingsGoals, setSavingsGoals]       = useState<SavingsGoalRow[]>([]);
  const [revenueLastWeek, setRevenueLastWeek] = useState(0);
  const [expenseLastWeek, setExpenseLastWeek] = useState(0);
  const [allTransactions, setAllTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [errModal, setErrModal]                 = useState({ visible: false, title: '', message: '' });
  const userIdRef = useRef<string | null>(null);

  const showError = (title: string, msg: string) => setErrModal({ visible: true, title, message: msg });

  const saveBudgetLimit = async (newLimit: number) => {
    if (!userIdRef.current) return;
    const { error } = await supabase.from('profiles').update({ budget_limit: newLimit }).eq('id', userIdRef.current);
    if (error) throw error;
    setBudgetLimit(newLimit);
  };

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async (userId: string) => {
    try {
    const now     = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    const [profileRes, incomeRes, expenseRes, goalsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, budget_limit')
        .eq('id', userId)
        .single(),

      // Income sources with category icon + label
      supabase
        .from('income_sources')
        .select('id, title, amount, date, time, is_archived, income_categories(label, icon)')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('date', { ascending: false })
        .order('time', { ascending: false }),

      // Expenses with category icon + label
      supabase
        .from('expenses')
        .select('id, title, amount, date, time, is_archived, expense_categories(label, icon)')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('date', { ascending: false })
        .order('time', { ascending: false }),

      // All active savings goals
      supabase
        .from('savings_goals')
        .select('id, icon, title, target_amount, current_amount')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: false }),
    ]);

    // Profile
    if (profileRes.data) {
      setUserName(profileRes.data.full_name || '');
      setBudgetLimit(profileRes.data.budget_limit ?? 20000);
    }

    // Savings goals
    if (goalsRes.data) setSavingsGoals(goalsRes.data as SavingsGoalRow[]);

    // Build unified transaction list
    const incomeTxs: TxRow[] = (incomeRes.data ?? []).map((r: any) => ({
      id:       `inc-${r.id}`,
      icon:     r.income_categories?.icon  ?? 'cash-outline',
      title:    r.title,
      time:     r.time,
      date:     r.date,
      category: r.income_categories?.label ?? 'Income',
      value:    Number(r.amount),   // positive
    }));

    const expenseTxs: TxRow[] = (expenseRes.data ?? []).map((r: any) => ({
      id:       `exp-${r.id}`,
      icon:     r.expense_categories?.icon  ?? 'receipt-outline',
      title:    r.title,
      time:     r.time,
      date:     r.date,
      category: r.expense_categories?.label ?? 'Expense',
      value:    -Number(r.amount),  // negative
    }));

    // Merge and sort newest first
    const merged = [...incomeTxs, ...expenseTxs].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
    setAllTransactions(merged);

    // Compute totals
    let totalInc = 0, totalExp = 0, revWeek = 0, expWeek = 0;

    for (const r of incomeRes.data ?? []) {
      const amt = Number((r as any).amount);
      totalInc += amt;
      if ((r as any).date >= weekAgoStr) revWeek += amt;
    }

    for (const r of expenseRes.data ?? []) {
      const amt = Number((r as any).amount);
      totalExp += amt;
      if ((r as any).date >= weekAgoStr) expWeek += amt;
    }

    setTotalIncome(totalInc);
    setTotalExpense(totalExp);
    setRevenueLastWeek(revWeek);
    setExpenseLastWeek(expWeek);
    } catch (err: any) {
      showError('Failed to Load', err?.message ?? 'Could not load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load on auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadDashboard(session.user.id);
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadDashboard]);

  // Refresh when screen comes back into focus (e.g. returning from savings-goals)
  useFocusEffect(
    useCallback(() => {
      if (userIdRef.current) loadDashboard(userIdRef.current);
    }, [loadDashboard]),
  );

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalBalance = totalIncome - totalExpense;

  const displayedTransactions = useMemo(
    () => filterByPeriod(allTransactions, activePeriod),
    [allTransactions, activePeriod],
  );

  // Period-scoped income / expense for stats
  const periodIncome  = useMemo(() => displayedTransactions.filter(t => t.value > 0).reduce((s, t) => s + t.value, 0), [displayedTransactions]);
  const periodExpense = useMemo(() => displayedTransactions.filter(t => t.value < 0).reduce((s, t) => s + Math.abs(t.value), 0), [displayedTransactions]);

  const budgetPercent = budgetLimit > 0 ? Math.min(100, (totalExpense / budgetLimit) * 100) : 0;
  const budgetMsg =
    budgetPercent <= 30 ? `${budgetPercent.toFixed(0)}% Of Your Expenses, Looks Good.`
    : budgetPercent <= 70 ? `${budgetPercent.toFixed(0)}% Of Your Expenses, Be Careful.`
    : `${budgetPercent.toFixed(0)}% Of Your Expenses, Over Budget!`;

  // Savings goals aggregate
  const goalsCount   = savingsGoals.length;
  const totalSaved   = savingsGoals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget  = savingsGoals.reduce((s, g) => s + g.target_amount, 0);
  const goalsPct     = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
  const firstGoal    = savingsGoals[0] ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Green Header Section ──────────────────────────────────────── */}
        <View style={[styles.greenSection, { backgroundColor: theme.headerBg }]}>

          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View>
              <Text style={[styles.greetingTitle, { color: theme.iconBtnColor }]}>
                {userName ? `Hi, ${userName}` : 'Hi, Welcome Back'}
              </Text>
              <Text style={styles.greetingSubtitle}>{getGreeting()}</Text>
            </View>
            <NotificationBell style={[styles.bellButton, { backgroundColor: theme.iconBtnBg }]} iconColor={theme.iconBtnColor} />
          </View>

          {loading ? (
            <HomeDashboardSkeleton />
          ) : (
            <>
              {/* Balance Card */}
              <View style={[styles.balanceCard, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)', borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)' }]}>
                <View style={[styles.balanceRow, { borderBottomColor: theme.divider }]}>
                  <View style={styles.balanceItem}>
                    <View style={styles.labelRow}>
                      <Ionicons name="wallet-outline" size={11} color={theme.textSecondary} />
                      <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}> Total Balance</Text>
                    </View>
                    <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>
                      {formatCurrency(totalBalance)}
                    </Text>
                  </View>
                  <View style={[styles.balanceDivider, { backgroundColor: theme.divider }]} />
                  <View style={[styles.balanceItem, { alignItems: 'flex-end' }]}>
                    <View style={styles.labelRow}>
                      <Ionicons name="trending-down-outline" size={11} color={theme.textSecondary} />
                      <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}> Total Expense</Text>
                    </View>
                    <Text style={[styles.balanceAmount, styles.expenseAmount]}>
                      {formatCurrency(-totalExpense)}
                    </Text>
                  </View>
                </View>

                {/* Budget progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <View style={[
                      styles.percentBadge,
                      budgetPercent > 70 && { backgroundColor: '#E85D5D' },
                      budgetPercent > 30 && budgetPercent <= 70 && { backgroundColor: '#F59E0B' },
                    ]}>
                      <Text style={styles.percentText}>{budgetPercent.toFixed(0)}%</Text>
                    </View>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => setBudgetModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.budgetLimit, { color: theme.textSecondary }]}>{formatCurrency(budgetLimit)}</Text>
                      <Ionicons name="pencil-outline" size={12} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : '#E0E0E0' }]}>
                    <View style={[
                      styles.progressFill,
                      { width: `${budgetPercent}%` as any },
                      budgetPercent > 70 && { backgroundColor: '#E85D5D' },
                      budgetPercent > 30 && budgetPercent <= 70 && { backgroundColor: '#F59E0B' },
                    ]} />
                  </View>
                  <View style={styles.checkRow}>
                    <Ionicons
                      name={budgetPercent > 70 ? 'warning-outline' : 'checkbox-outline'}
                      size={14}
                      color={budgetPercent > 70 ? '#E85D5D' : '#4A8A6A'}
                    />
                    <Text style={[styles.checkText, budgetPercent > 70 && { color: '#E85D5D' }]}>
                      {' '}{budgetMsg}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Savings Card ─────────────────────────────────────────── */}
              <TouchableOpacity
                style={styles.savingsCard}
                onPress={() => router.push('/savings-goals')}
                activeOpacity={0.85}
              >
                {/* Left: goal summary */}
                <View style={styles.savingsLeft}>
                  {/* Progress ring */}
                  <View style={[
                    styles.donutRing,
                    goalsCount > 0 && {
                      borderColor: goalsPct >= 100
                        ? '#3ECBA8'
                        : `rgba(255,255,255,${0.3 + (goalsPct / 100) * 0.6})`,
                    },
                  ]}>
                    <Ionicons
                      name={(goalsCount === 0 ? 'flag-outline' : firstGoal!.icon) as any}
                      size={26}
                      color="#fff"
                    />
                    {goalsCount > 0 && (
                      <View style={styles.pctOverlay}>
                        <Text style={styles.pctOverlayText}>{goalsPct.toFixed(0)}%</Text>
                      </View>
                    )}
                  </View>

                  {goalsCount === 0 ? (
                    <>
                      <Text style={styles.savingsLabel}>Savings{'\n'}On Goals</Text>
                      <Text style={styles.savingsTapHint}>Tap to set a goal</Text>
                    </>
                  ) : goalsCount === 1 ? (
                    <>
                      <Text style={styles.savingsLabel} numberOfLines={2}>{firstGoal!.title}</Text>
                      <Text style={styles.savingsProgressText}>
                        {formatCurrency(firstGoal!.current_amount)}{' / '}{formatCurrency(firstGoal!.target_amount)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.savingsLabel}>{goalsCount} Active{'\n'}Goals</Text>
                      <Text style={styles.savingsProgressText}>
                        {formatCurrency(totalSaved)}{'\n'}of {formatCurrency(totalTarget)}
                      </Text>
                    </>
                  )}
                </View>

                <View style={styles.savingsDivider} />

                {/* Right: weekly stats */}
                <View style={styles.savingsRight}>
                  <View style={styles.savingsStat}>
                    <Ionicons name="layers-outline" size={18} color="#fff" />
                    <View style={styles.savingsStatText}>
                      <Text style={styles.savingsStatLabel}>Revenue Last Week</Text>
                      <Text style={styles.savingsStatAmount}>{formatCurrency(revenueLastWeek)}</Text>
                    </View>
                  </View>
                  <View style={[styles.savingsStat, { marginTop: 14 }]}>
                    <Ionicons name="trending-down-outline" size={18} color="#fff" />
                    <View style={styles.savingsStatText}>
                      <Text style={styles.savingsStatLabel}>Expenses Last Week</Text>
                      <Text style={[styles.savingsStatAmount, styles.negativeText]}>
                        {formatCurrency(-expenseLastWeek)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── White Content Section ─────────────────────────────────────── */}
        <View style={[styles.whiteSection, { backgroundColor: theme.cardBg }]}>

          {/* Period summary strip */}
          {!loading && (
            <View style={[styles.periodSummary, { backgroundColor: theme.surface }]}>
              <View style={styles.periodSummaryItem}>
                <Text style={[styles.periodSummaryLabel, { color: theme.textMuted }]}>Income</Text>
                <Text style={[styles.periodSummaryValue, { color: '#22C55E' }]}>
                  +{formatCurrency(periodIncome)}
                </Text>
              </View>
              <View style={[styles.periodSummaryDivider, { backgroundColor: theme.divider }]} />
              <View style={styles.periodSummaryItem}>
                <Text style={[styles.periodSummaryLabel, { color: theme.textMuted }]}>Expenses</Text>
                <Text style={[styles.periodSummaryValue, { color: '#4895EF' }]}>
                  -{formatCurrency(periodExpense)}
                </Text>
              </View>
              <View style={[styles.periodSummaryDivider, { backgroundColor: theme.divider }]} />
              <View style={styles.periodSummaryItem}>
                <Text style={[styles.periodSummaryLabel, { color: theme.textMuted }]}>Net</Text>
                <Text style={[
                  styles.periodSummaryValue,
                  { color: periodIncome - periodExpense >= 0 ? theme.textPrimary : '#E85D5D' },
                ]}>
                  {formatCurrency(periodIncome - periodExpense)}
                </Text>
              </View>
            </View>
          )}

          {/* Period Tabs */}
          <SlideTabBar
            tabs={PERIODS}
            active={activePeriod}
            onChange={(p) => setActivePeriod(p as Period)}
            trackColor={theme.surface as string}
            activeColor="#1B7A4A"
            inactiveTextColor={theme.textSecondary as string}
            style={{ marginBottom: 20 }}
          />

          {/* Transaction List */}
          <View>
            {loading ? (
              [...Array(4)].map((_, i) => <TransactionRowSkeleton key={i} isLast={i === 3} />)
            ) : displayedTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={36} color={theme.divider} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No transactions for this period.
                </Text>
              </View>
            ) : (
              displayedTransactions.map((tx, index) => (
                <View
                  key={tx.id}
                  style={[
                    styles.txItem,
                    index < displayedTransactions.length - 1 && styles.txItemBorder,
                    index < displayedTransactions.length - 1 && { borderBottomColor: theme.divider },
                  ]}
                >
                  <View style={[
                    styles.txIconCircle,
                    { backgroundColor: tx.value >= 0 ? '#22C55E' : '#4B78E0' },
                  ]}>
                    <Ionicons name={tx.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txTitle, { color: theme.textPrimary }]}>{tx.title}</Text>
                    <Text style={[styles.txMeta, { color: theme.textSecondary }]}>
                      {tx.time} · {formatDate(tx.date)}
                    </Text>
                  </View>
                  <Text style={[styles.txCategory, { color: theme.textSecondary }]}>{tx.category}</Text>
                  <View style={[styles.txAmtDivider, { backgroundColor: theme.divider }]} />
                  <Text style={[
                    styles.txAmount,
                    { color: tx.value >= 0 ? '#22C55E' : '#4895EF' },
                  ]}>
                    {formatCurrency(tx.value)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <BudgetLimitModal
        visible={budgetModalVisible}
        current={budgetLimit}
        onClose={() => setBudgetModalVisible(false)}
        onSave={saveBudgetLimit}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#1B3D2B',
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ── Green Section ─────────────────────────────────────────────────────────────
  greenSection: {
    backgroundColor: '#1B3D2B',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
  },
  greetingSubtitle: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#3A6B50',
    marginTop: 3,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Balance Card ──────────────────────────────────────────────────────────────
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  balanceItem: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  balanceLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: '#666',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 12,
  },
  balanceAmount: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  expenseAmount: { color: '#4895EF' },

  // ── Budget Progress ───────────────────────────────────────────────────────────
  progressSection: { paddingTop: 12 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentBadge: {
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  percentText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 11,
    color: '#fff',
  },
  budgetLimit: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: '#666',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 5,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: '#4A7A5A',
  },

  // ── Savings Card ──────────────────────────────────────────────────────────────
  savingsCard: {
    backgroundColor: '#115533',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingsLeft: {
    alignItems: 'center',
    flex: 1,
  },
  donutRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pctOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#3ECBA8',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pctOverlayText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 8,
    color: '#fff',
  },
  savingsLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 16,
  },
  savingsProgressText: {
    fontFamily: Font.bodyRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 14,
  },
  savingsTapHint: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  savingsDivider: {
    width: 1,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  savingsRight: {
    flex: 1.4,
    justifyContent: 'center',
  },
  savingsStat: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  savingsStatText: { marginLeft: 8 },
  savingsStatLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  savingsStatAmount: {
    fontFamily: Font.headerBold,
    fontSize: 14,
    color: '#fff',
  },
  negativeText: { color: '#FF8A8A' },

  // ── White Section ─────────────────────────────────────────────────────────────
  whiteSection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -14,
    paddingTop: 20,
    paddingHorizontal: 20,
    flex: 1,
    minHeight: 480,
  },

  // ── Period Summary Strip ──────────────────────────────────────────────────────
  periodSummary: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  periodSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  periodSummaryLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
  },
  periodSummaryValue: {
    fontFamily: Font.headerBold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  periodSummaryDivider: {
    width: 1,
    marginVertical: 2,
  },

  // ── Transactions ──────────────────────────────────────────────────────────────
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  txItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  txIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4B78E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txTitle: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 3,
  },
  txMeta: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: '#999',
  },
  txCategory: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: '#999',
  },
  txAmtDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 6,
  },
  txAmount: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#1A1A1A',
  },
  txAmountBlue: { color: '#4895EF' },
});
