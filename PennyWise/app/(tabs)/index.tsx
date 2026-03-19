import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';

// ── Types ──────────────────────────────────────────────────────────────────────
type Period = 'Daily' | 'Weekly' | 'Monthly';

type Transaction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
  date: string;
  category: string;
  amount: string;
  isNegative: boolean;
};

// ── Static Data ────────────────────────────────────────────────────────────────
const TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    icon: 'cash-outline',
    title: 'Salary',
    time: '18:27',
    date: 'April 30',
    category: 'Monthly',
    amount: '₱4,000.00',
    isNegative: false,
  },
  {
    id: '2',
    icon: 'receipt-outline',
    title: 'Groceries',
    time: '17:00',
    date: 'April 24',
    category: 'Pantry',
    amount: '-₱100.00',
    isNegative: true,
  },
  {
    id: '3',
    icon: 'home-outline',
    title: 'Rent',
    time: '8:30',
    date: 'April 15',
    category: 'Rent',
    amount: '-₱674.40',
    isNegative: true,
  },
];

const PERIODS: Period[] = ['Daily', 'Weekly', 'Monthly'];

// ── Component ──────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { theme } = useAppTheme();
  const [activePeriod, setActivePeriod] = useState<Period>('Monthly');

  // Sliding period indicator — same technique as the bottom tab bar
  const [tabWidth, setTabWidth] = useState(0);
  const tabWidthRef = useRef(0);
  const indicatorX = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handlePeriodLayout = (width: number) => {
    const w = (width - 8) / PERIODS.length; // subtract container padding (4 each side)
    tabWidthRef.current = w;
    setTabWidth(w);
    // Set initial position without animation
    indicatorX.value = PERIODS.indexOf(activePeriod) * w;
  };

  const selectPeriod = (period: Period) => {
    indicatorX.value = withSpring(PERIODS.indexOf(period) * tabWidthRef.current, {
      damping: 18,
      stiffness: 200,
    });
    setActivePeriod(period);
  };

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
              <Text style={[styles.greetingTitle, { color: theme.iconBtnColor }]}>Hi, Welcome Back</Text>
              <Text style={styles.greetingSubtitle}>Good Morning</Text>
            </View>
            <TouchableOpacity style={[styles.bellButton, { backgroundColor: theme.iconBtnBg }]} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            {/* Totals row */}
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <View style={styles.labelRow}>
                  <Ionicons name="wallet-outline" size={11} color="#666" />
                  <Text style={styles.balanceLabel}> Total Balance</Text>
                </View>
                <Text style={[styles.balanceAmount, { color: theme.textPrimary }]}>₱7,783.00</Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={[styles.balanceItem, { alignItems: 'flex-end' }]}>
                <View style={styles.labelRow}>
                  <Ionicons name="trending-down-outline" size={11} color="#666" />
                  <Text style={styles.balanceLabel}> Total Expense</Text>
                </View>
                <Text style={[styles.balanceAmount, styles.expenseAmount]}>-₱1,187.40</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentText}>30%</Text>
                </View>
                <Text style={styles.budgetLimit}>₱20,000.00</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '30%' }]} />
              </View>
              <View style={styles.checkRow}>
                <Ionicons name="checkbox-outline" size={14} color="#4A8A6A" />
                <Text style={styles.checkText}> 30% Of Your Expenses, Looks Good.</Text>
              </View>
            </View>
          </View>

          {/* Savings Card */}
          <View style={styles.savingsCard}>
            {/* Left: ring chart */}
            <View style={styles.savingsLeft}>
              <View style={styles.donutRing}>
                <Ionicons name="car-outline" size={26} color="#fff" />
              </View>
              <Text style={styles.savingsLabel}>Savings{'\n'}On Goals</Text>
            </View>

            <View style={styles.savingsDivider} />

            {/* Right: stats */}
            <View style={styles.savingsRight}>
              <View style={styles.savingsStat}>
                <Ionicons name="layers-outline" size={18} color="#fff" />
                <View style={styles.savingsStatText}>
                  <Text style={styles.savingsStatLabel}>Revenue Last Week</Text>
                  <Text style={styles.savingsStatAmount}>₱4,000.00</Text>
                </View>
              </View>
              <View style={[styles.savingsStat, { marginTop: 14 }]}>
                <Ionicons name="restaurant-outline" size={18} color="#fff" />
                <View style={styles.savingsStatText}>
                  <Text style={styles.savingsStatLabel}>Food Last Week</Text>
                  <Text style={[styles.savingsStatAmount, styles.negativeText]}>-₱100.00</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── White Content Section ─────────────────────────────────────── */}
        <View style={[styles.whiteSection, { backgroundColor: theme.cardBg }]}>

          {/* Period Tabs */}
          <View
            style={styles.periodTabs}
            onLayout={(e) => handlePeriodLayout(e.nativeEvent.layout.width)}
          >
            {/* Sliding teal pill — mirrors the bottom tab bar approach */}
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
            {TRANSACTIONS.map((tx, index) => (
              <View
                key={tx.id}
                style={[styles.txItem, index < TRANSACTIONS.length - 1 && styles.txItemBorder, index < TRANSACTIONS.length - 1 && { borderBottomColor: theme.divider }]}
              >
                <View style={styles.txIconCircle}>
                  <Ionicons name={tx.icon} size={20} color="#fff" />
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txTitle, { color: theme.textPrimary }]}>{tx.title}</Text>
                  <Text style={[styles.txMeta, { color: theme.textSecondary }]}>{tx.time} - {tx.date}</Text>
                </View>
                <Text style={[styles.txCategory, { color: theme.textSecondary }]}>{tx.category}</Text>
                <View style={styles.txAmtDivider} />
                <Text style={[styles.txAmount, tx.isNegative && styles.txAmountBlue, !tx.isNegative && { color: theme.textPrimary }]}>
                  {tx.amount}
                </Text>
              </View>
            ))}
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
});
