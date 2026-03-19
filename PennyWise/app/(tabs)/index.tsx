import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';

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

type SavingsGoal = {
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
  const [userName, setUserName]                   = useState('');
  const [totalBalance, setTotalBalance]           = useState(0);
  const [totalExpense, setTotalExpense]           = useState(0);
  const [budgetLimit, setBudgetLimit]             = useState(20000);
  const [savingsGoal, setSavingsGoal]             = useState<SavingsGoal | null>(null);
  const [revenueLastWeek, setRevenueLastWeek]     = useState(0);
  const [expenseLastWeek, setExpenseLastWeek]     = useState(0);
  const [allTransactions, setAllTransactions]     = useState<TxRow[]>([]);
  const [loading, setLoading]                     = useState(true);

  // Sliding period indicator
  const [tabWidth, setTabWidth] = useState(0);
  const tabWidthRef = useRef(0);
  const indicatorX = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handlePeriodLayout = (width: number) => {
    const w = (width - 8) / PERIODS.length;
    tabWidthRef.current = w;
    setTabWidth(w);
    indicatorX.value = PERIODS.indexOf(activePeriod) * w;
  };

  const selectPeriod = (period: Period) => {
    indicatorX.value = withSpring(PERIODS.indexOf(period) * tabWidthRef.current, {
      damping: 18,
      stiffness: 200,
    });
    setActivePeriod(period);
  };

  // ── Fetch data on auth ──────────────────────────────────────────────────────
  // Use onAuthStateChange instead of getUser() to avoid the AsyncStorage
  // race condition — getUser() can return null if called before the persisted
  // session has finished loading. onAuthStateChange fires INITIAL_SESSION
  // only after the session is fully restored.
  useEffect(() => {
    async function loadDashboard(userId: string) {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);

      const [profileRes, txRes, goalsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, budget_limit')
          .eq('id', userId)
          .single(),
        supabase
          .from('transactions')
          .select('id, icon, title, category, value, date, time')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .order('date', { ascending: false })
          .order('time', { ascending: false }),
        supabase
          .from('savings_goals')
          .select('icon, title, target_amount, current_amount')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        setUserName(profileRes.data.full_name || '');
        setBudgetLimit(profileRes.data.budget_limit ?? 20000);
      }

      if (goalsRes.data) setSavingsGoal(goalsRes.data);

      const txs: TxRow[] = (txRes.data ?? []).map(t => ({
        id: t.id,
        icon: t.icon || 'receipt-outline',
        title: t.title,
        time: t.time,
        date: t.date,
        category: t.category,
        value: Number(t.value),
      }));
      setAllTransactions(txs);

      let balance = 0, expense = 0, revWeek = 0, expWeek = 0;
      for (const tx of txs) {
        balance += tx.value;
        if (tx.value < 0) expense += Math.abs(tx.value);
        const d = new Date(tx.date);
        if (d >= weekAgo && d <= now) {
          if (tx.value > 0) revWeek += tx.value;
          else expWeek += Math.abs(tx.value);
        }
      }
      setTotalBalance(balance);
      setTotalExpense(expense);
      setRevenueLastWeek(revWeek);
      setExpenseLastWeek(expWeek);
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadDashboard(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayedTransactions = useMemo(
    () => filterByPeriod(allTransactions, activePeriod),
    [allTransactions, activePeriod],
  );

  const budgetPercent = budgetLimit > 0 ? Math.min(100, (totalExpense / budgetLimit) * 100) : 0;
  const budgetMsg =
    budgetPercent <= 30 ? `${budgetPercent.toFixed(0)}% Of Your Expenses, Looks Good.`
    : budgetPercent <= 70 ? `${budgetPercent.toFixed(0)}% Of Your Expenses, Be Careful.`
    : `${budgetPercent.toFixed(0)}% Of Your Expenses, Over Budget!`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]}>
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
            <TouchableOpacity style={[styles.bellButton, { backgroundColor: theme.iconBtnBg }]} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Balance Card */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceRow}>
                  <View style={styles.balanceItem}>
                    <View style={styles.labelRow}>
                      <Ionicons name="wallet-outline" size={11} color="#666" />
                      <Text style={styles.balanceLabel}> Total Balance</Text>
                    </View>
                    <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>
                      {formatCurrency(totalBalance)}
                    </Text>
                  </View>
                  <View style={styles.balanceDivider} />
                  <View style={[styles.balanceItem, { alignItems: 'flex-end' }]}>
                    <View style={styles.labelRow}>
                      <Ionicons name="trending-down-outline" size={11} color="#666" />
                      <Text style={styles.balanceLabel}> Total Expense</Text>
                    </View>
                    <Text style={[styles.balanceAmount, styles.expenseAmount]}>
                      {formatCurrency(-totalExpense)}
                    </Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressLabelRow}>
                    <View style={styles.percentBadge}>
                      <Text style={styles.percentText}>{budgetPercent.toFixed(0)}%</Text>
                    </View>
                    <Text style={styles.budgetLimit}>{formatCurrency(budgetLimit)}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${budgetPercent}%` as any }]} />
                  </View>
                  <View style={styles.checkRow}>
                    <Ionicons name="checkbox-outline" size={14} color="#4A8A6A" />
                    <Text style={styles.checkText}> {budgetMsg}</Text>
                  </View>
                </View>
              </View>

              {/* Savings Card */}
              <View style={styles.savingsCard}>
                <View style={styles.savingsLeft}>
                  <View style={styles.donutRing}>
                    <Ionicons name={(savingsGoal?.icon ?? 'car-outline') as any} size={26} color="#fff" />
                  </View>
                  <Text style={styles.savingsLabel}>
                    {savingsGoal?.title ?? 'Savings\nOn Goals'}
                  </Text>
                </View>

                <View style={styles.savingsDivider} />

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
              </View>
            </>
          )}
        </View>

        {/* ── White Content Section ─────────────────────────────────────── */}
        <View style={[styles.whiteSection, { backgroundColor: theme.cardBg }]}>

          {/* Period Tabs */}
          <View
            style={styles.periodTabs}
            onLayout={(e) => handlePeriodLayout(e.nativeEvent.layout.width)}
          >
            <Animated.View
              style={[styles.periodIndicator, { width: tabWidth }, indicatorStyle]}
            />

            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={styles.periodTab}
                onPress={() => selectPeriod(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodTabText, activePeriod === p && styles.periodTabTextActive, { color: activePeriod === p ? '#fff' : theme.textSecondary }]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transaction List */}
          <View>
            {displayedTransactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No transactions for this period.
              </Text>
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
                  <View style={styles.txIconCircle}>
                    <Ionicons name={tx.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txTitle, { color: theme.textPrimary }]}>{tx.title}</Text>
                    <Text style={[styles.txMeta, { color: theme.textSecondary }]}>{tx.time} - {formatDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.txCategory, { color: theme.textSecondary }]}>{tx.category}</Text>
                  <View style={styles.txAmtDivider} />
                  <Text style={[
                    styles.txAmount,
                    tx.value < 0 && styles.txAmountBlue,
                    tx.value >= 0 && { color: theme.textPrimary },
                  ]}>
                    {formatCurrency(tx.value)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7CB898',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Green Section ────────────────────────────────────────────────────────────
  greenSection: {
    backgroundColor: '#7CB898',
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
    color: '#1A1A1A',
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
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Balance Card ─────────────────────────────────────────────────────────────
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
  balanceItem: {
    flex: 1,
  },
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
  expenseAmount: {
    color: '#4895EF',
  },

  // ── Progress ─────────────────────────────────────────────────────────────────
  progressSection: {
    paddingTop: 12,
  },
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

  // ── Savings Card ─────────────────────────────────────────────────────────────
  savingsCard: {
    backgroundColor: '#1E9C70',
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
  savingsLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 16,
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
  savingsStatText: {
    marginLeft: 8,
  },
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
  negativeText: {
    color: '#FF8A8A',
  },

  // ── White Section ─────────────────────────────────────────────────────────────
  whiteSection: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -14,
    paddingTop: 24,
    paddingHorizontal: 20,
    flex: 1,
    minHeight: 480,
  },

  // ── Period Tabs ───────────────────────────────────────────────────────────────
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 50,
    padding: 4,
    marginBottom: 24,
  },
  periodIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 50,
    backgroundColor: '#3ECBA8',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
  },
  periodTabText: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
    color: '#888',
  },
  periodTabTextActive: {
    fontFamily: Font.bodySemiBold,
    color: '#fff',
  },

  // ── Transactions ──────────────────────────────────────────────────────────────
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
  txInfo: {
    flex: 1,
  },
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
    minWidth: 78,
    textAlign: 'right',
  },
  txAmountBlue: {
    color: '#4895EF',
  },
  emptyText: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },
});
