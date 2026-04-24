import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AnimatedOwl from '@/components/AnimatedOwl';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { useNetwork } from '@/contexts/NetworkContext';
import { supabase } from '@/lib/supabase';
import { DataCache } from '@/lib/dataCache';
import { MutationQueue } from '@/lib/mutationQueue';
import { HomeDashboardSkeleton, TransactionRowSkeleton } from '@/components/SkeletonLoader';
import NotificationBell from '@/components/NotificationBell';
import SlideTabBar from '@/components/SlideTabBar';
import BudgetLimitModal from '@/components/BudgetLimitModal';
import CircularRing from '@/components/CircularRing';
import ErrorModal from '@/components/ErrorModal';
import MascotChatbot from '@/components/MascotChatbot';
import SpendingBarChart from '@/components/SpendingBarChart';

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

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${ampm}`;
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
  const { isOnline } = useNetwork();
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
  const [chatOpen, setChatOpen]                 = useState(false);
  const userIdRef = useRef<string | null>(null);

  // ── Goal carousel ───────────────────────────────────────────────────────────
  const displayIdxRef               = useRef(0);
  const [displayIdx, setDisplayIdx] = useState(0);
  const goalFlipX  = useSharedValue(1);  // 1 = full face, 0 = edge, -1 = back face

  const showError = (title: string, msg: string) => setErrModal({ visible: true, title, message: msg });

  const saveBudgetLimit = async (newLimit: number) => {
    if (!userIdRef.current) return;
    const prev = budgetLimit;
    setBudgetLimit(newLimit); // optimistic

    if (!isOnline) {
      await MutationQueue.add({
        op: 'update', table: 'profiles',
        payload: { budget_limit: newLimit },
        match: { id: userIdRef.current },
      });
      return;
    }

    const { error } = await supabase.from('profiles').update({ budget_limit: newLimit }).eq('id', userIdRef.current);
    if (error) {
      setBudgetLimit(prev); // rollback
      throw error;
    }
    DataCache.invalidateProfile(userIdRef.current);
    DataCache.invalidateDashboard(userIdRef.current);
  };

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async (userId: string) => {
    try {
    const now     = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    const dashboard = await DataCache.fetchDashboard(userId);
    if (!dashboard) throw new Error('Could not load dashboard data.');

    setUserName(dashboard.profile.full_name);
    setBudgetLimit(dashboard.profile.budget_limit);
    setSavingsGoals(dashboard.savingsGoals as SavingsGoalRow[]);

    const incomeTxs: TxRow[] = dashboard.incomeSources.map(r => ({
      id:       `inc-${r.id}`,
      icon:     r.category_icon,
      title:    r.title,
      time:     r.time,
      date:     r.date,
      category: r.category_label,
      value:    r.amount,
    }));

    const expenseTxs: TxRow[] = dashboard.expenses.map(r => ({
      id:       `exp-${r.id}`,
      icon:     r.category_icon,
      title:    r.title,
      time:     r.time,
      date:     r.date,
      category: r.category_label,
      value:    -r.amount,
    }));

    const merged = [...incomeTxs, ...expenseTxs].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
    setAllTransactions(merged);

    let totalInc = 0, totalExp = 0, revWeek = 0, expWeek = 0;
    for (const r of dashboard.incomeSources) {
      totalInc += r.amount;
      if (r.date >= weekAgoStr) revWeek += r.amount;
    }
    for (const r of dashboard.expenses) {
      totalExp += r.amount;
      if (r.date >= weekAgoStr) expWeek += r.amount;
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

  // Reconnect: invalidate stale cache and reload when coming back online
  const wasOfflineRef = useRef<boolean>(false);
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && userIdRef.current) {
      wasOfflineRef.current = false;
      DataCache.invalidateDashboard(userIdRef.current);
      loadDashboard(userIdRef.current);
    }
  }, [isOnline, loadDashboard]);

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

  const last6Months = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const income  = allTransactions.filter(t => t.date.startsWith(key) && t.value > 0).reduce((s, t) => s + t.value, 0);
      const expense = allTransactions.filter(t => t.date.startsWith(key) && t.value < 0).reduce((s, t) => s + Math.abs(t.value), 0);
      months.push({ label, income, expense });
    }
    return months;
  }, [allTransactions]);

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

  // Active goal in the carousel (2+ goals)
  const activeGoal    = goalsCount > 0 ? savingsGoals[displayIdx % goalsCount] : null;
  const activeGoalPct = activeGoal && activeGoal.target_amount > 0
    ? Math.min(100, (activeGoal.current_amount / activeGoal.target_amount) * 100)
    : 0;

  // Auto-rotate when 2+ goals
  useEffect(() => {
    displayIdxRef.current = 0;
    setDisplayIdx(0);
    goalFlipX.value = 1;
    if (goalsCount <= 1) return;

    const id = setInterval(() => {
      const nextIdx = (displayIdxRef.current + 1) % goalsCount;
      displayIdxRef.current = nextIdx;

      // First half: squeeze to edge (coin turning away)
      goalFlipX.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) }, () => {
        // Swap content at the midpoint (coin edge — nothing visible)
        runOnJS(setDisplayIdx)(nextIdx);
        // Second half: expand from edge (new face reveals)
        goalFlipX.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
      });
    }, 3500);

    return () => clearInterval(id);
  }, [goalsCount]);

  const goalInfoStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.abs(goalFlipX.value) }],
    // Dim slightly at the edge to simulate the coin turning away from the light
    opacity: 0.4 + Math.abs(goalFlipX.value) * 0.6,
  }));

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
              {/* Owl + speech bubble — normal flow, centered row. zIndex:2 keeps it in front of the card */}
              <TouchableOpacity style={styles.owlPerch} onPress={() => setChatOpen(true)} activeOpacity={0.8}>
                <AnimatedOwl width={OWL_W} height={OWL_H} />

                {/* Speech bubble to the right of the owl */}
                <View style={styles.owlBubble}>
                  <Text style={styles.owlBubbleName}>Penny 🦉</Text>
                  <Text style={styles.owlBubbleText}>{"Hi there! 👋\nTap me to chat!"}</Text>
                  {/* Tail pointing left toward the owl */}
                  <View style={styles.owlBubbleTail} />
                </View>
              </TouchableOpacity>

              {/* Balance Card — marginTop:-OWL_OVERLAP pulls it up under the owl */}
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
                  {goalsCount === 0 ? (
                    <>
                      <View style={{ marginBottom: 8 }}>
                        <CircularRing
                          size={72} stroke={5} pct={0}
                          color="#fff" track="rgba(255,255,255,0.18)"
                          icon="flag-outline" iconSize={24}
                          innerBg="rgba(255,255,255,0.15)"
                        />
                      </View>
                      <Text style={styles.savingsLabel}>Savings{'\n'}On Goals</Text>
                      <Text style={styles.savingsTapHint}>Tap to set a goal</Text>
                    </>
                  ) : goalsCount === 1 ? (
                    <>
                      <View style={{ marginBottom: 8 }}>
                        <CircularRing
                          size={72} stroke={5} pct={goalsPct}
                          color={goalsPct >= 100 ? '#3ECBA8' : '#fff'}
                          track="rgba(255,255,255,0.18)"
                          icon={firstGoal!.icon} iconSize={24}
                          innerBg={goalsPct >= 100 ? '#3ECBA8' : 'rgba(255,255,255,0.15)'}
                        />
                      </View>
                      <Text style={styles.savingsLabel} numberOfLines={2}>{firstGoal!.title}</Text>
                      <Text style={styles.savingsProgressText}>
                        {formatCurrency(firstGoal!.current_amount)}{' / '}{formatCurrency(firstGoal!.target_amount)}
                      </Text>
                    </>
                  ) : (
                    /* 2+ goals — animated carousel */
                    <Animated.View style={[{ alignItems: 'center' }, goalInfoStyle]}>
                      <View style={{ marginBottom: 10 }}>
                        <CircularRing
                          size={72} stroke={5} pct={activeGoalPct}
                          color={activeGoalPct >= 100 ? '#3ECBA8' : '#fff'}
                          track="rgba(255,255,255,0.18)"
                          icon={activeGoal!.icon} iconSize={24}
                          innerBg={activeGoalPct >= 100 ? '#3ECBA8' : 'rgba(255,255,255,0.15)'}
                        />
                      </View>
                      <Text style={styles.savingsLabel} numberOfLines={1}>{activeGoal!.title}</Text>
                      <Text style={styles.savingsProgressText}>
                        {formatCurrency(activeGoal!.current_amount)}{'\n'}of {formatCurrency(activeGoal!.target_amount)}
                      </Text>
                      {/* Dot indicators */}
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, alignItems: 'center' }}>
                        {savingsGoals.map((_, i) => (
                          <View
                            key={i}
                            style={{
                              height: 4,
                              width: i === displayIdx ? 16 : 4,
                              borderRadius: 2,
                              backgroundColor: i === displayIdx ? '#fff' : 'rgba(255,255,255,0.3)',
                            }}
                          />
                        ))}
                      </View>
                    </Animated.View>
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

          {/* 6-Month Trend */}
          {!loading && (
            <View style={styles.chartSection}>
              <Text style={[styles.chartTitle, { color: theme.textPrimary as string }]}>6-Month Overview</Text>
              <SpendingBarChart data={last6Months} theme={theme} />
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
                      {fmt12h(tx.time)} · {formatDate(tx.date)}
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

      <MascotChatbot visible={chatOpen} onClose={() => setChatOpen(false)} />
    </SafeAreaView>
  );
}

// ── Owl sizing constants ───────────────────────────────────────────────────────
// Card width = screen width minus greenSection's 20px horizontal padding on each side
const SCREEN_W    = Dimensions.get('window').width;
const CARD_W      = SCREEN_W - 40;
const OWL_W       = Math.min(105, Math.round(CARD_W * 0.28)); // 28% of card ≈ 95-100px
const OWL_H       = Math.round(OWL_W * 1.40);                 // real crop ratio 220x307 ≈ 1:1.4
const OWL_OVERLAP = Math.round(OWL_H * 0.15);                 // 15% — feet just on card border

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
  // Owl is in normal flow (centered). Card has marginTop: -OWL_OVERLAP which
  // physically pulls the card up so it slides under the owl's feet.
  // zIndex:2 on the owl ensures it paints in front of the card's white background.
  owlPerch: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 2,
    elevation: 2,
    marginLeft: 12,
  },
  owlBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
    maxWidth: 160,
    marginBottom: Math.round(OWL_H * 0.28),  // align bubble roughly to owl body
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  owlBubbleName: {
    fontFamily: Font.bodySemiBold,
    fontSize: 11,
    color: '#3ECBA8',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  owlBubbleText: {
    fontFamily: Font.bodyRegular,
    fontSize: 11.5,
    color: '#2D4A3A',
    lineHeight: 17,
  },
  owlBubbleTail: {
    position: 'absolute',
    left: -8,
    bottom: 18,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    marginTop: -OWL_OVERLAP,           // slides card up under owl feet
    paddingTop: 12,                    // labels sit near the top; owl may overlap
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    zIndex: 1,
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
    overflow: 'hidden',
  },
  savingsLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 18,
  },
  savingsProgressText: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
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

  // ── Chart Section ─────────────────────────────────────────────────────────────
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    marginBottom: 12,
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
