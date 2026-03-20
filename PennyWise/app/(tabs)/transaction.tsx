import { useEffect, useState, useMemo, useRef } from 'react';
import { router } from 'expo-router';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedStyle,
  interpolateColor,
} from 'react-native-reanimated';

// ── Types ──────────────────────────────────────────────────────────────────────
type FilterType = 'All' | 'Income' | 'Expense' | 'Archived';
type Frequency  = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

type Transaction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  time: string;
  date: string;
  category: string;
  value: number;
  archived: boolean;
  recurring: boolean;
  frequency?: Frequency;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(value: number): string {
  const abs = Math.abs(value);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (value < 0 ? '-' : '') + '₱' + str;
}

function nowTime(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function nowDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function nextId(list: Transaction[]): string {
  return String(Math.max(0, ...list.map(t => Number(t.id))) + 1);
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BUDGET_LIMIT = 20000;
const FILTERS: FilterType[]   = ['All', 'Income', 'Expense', 'Archived'];
const FREQUENCIES: Frequency[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const CATEGORIES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Food',          icon: 'restaurant-outline'  },
  { label: 'Transport',     icon: 'bus-outline'          },
  { label: 'Shopping',      icon: 'cart-outline'         },
  { label: 'Health',        icon: 'medkit-outline'       },
  { label: 'Utilities',     icon: 'wifi-outline'         },
  { label: 'Rent',          icon: 'home-outline'         },
  { label: 'Entertainment', icon: 'gift-outline'         },
  { label: 'Investment',    icon: 'trending-up-outline'  },
  { label: 'Salary',        icon: 'cash-outline'         },
  { label: 'Other',         icon: 'receipt-outline'      },
];

const ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
  'cash-outline', 'receipt-outline', 'home-outline', 'bus-outline',
  'medkit-outline', 'restaurant-outline', 'gift-outline', 'cart-outline',
  'wifi-outline', 'trending-up-outline', 'card-outline', 'school-outline',
];

// ── Initial Data ───────────────────────────────────────────────────────────────
const INITIAL: Transaction[] = [
  { id: '1',  icon: 'cash-outline',        title: 'Salary',        description: '',                 time: '18:27', date: 'April 30',  category: 'Salary',      value:  4000,   archived: false, recurring: true,  frequency: 'Monthly'  },
  { id: '2',  icon: 'receipt-outline',     title: 'Groceries',     description: 'Weekly groceries', time: '17:00', date: 'April 24',  category: 'Food',        value:  -100,   archived: false, recurring: false },
  { id: '3',  icon: 'home-outline',        title: 'Rent',          description: '',                 time: '8:30',  date: 'April 15',  category: 'Rent',        value:  -674.4, archived: false, recurring: true,  frequency: 'Monthly'  },
  { id: '4',  icon: 'bus-outline',         title: 'Transport',     description: '',                 time: '9:30',  date: 'April 08',  category: 'Transport',   value:  -4.13,  archived: false, recurring: false },
  { id: '5',  icon: 'medkit-outline',      title: 'Medicine',      description: '',                 time: '11:00', date: 'April 05',  category: 'Health',      value:  -250,   archived: false, recurring: false },
  { id: '6',  icon: 'restaurant-outline',  title: 'Dinner Out',    description: '',                 time: '20:15', date: 'April 03',  category: 'Food',        value:  -320,   archived: false, recurring: false },
  { id: '7',  icon: 'gift-outline',        title: 'Freelance',     description: 'Design project',   time: '14:00', date: 'April 02',  category: 'Other',       value:  1200,   archived: false, recurring: false },
  { id: '8',  icon: 'cart-outline',        title: 'Online Shop',   description: '',                 time: '10:45', date: 'March 30',  category: 'Shopping',    value:  -599,   archived: false, recurring: false },
  { id: '9',  icon: 'wifi-outline',        title: 'Internet Bill', description: '',                 time: '9:00',  date: 'March 28',  category: 'Utilities',   value:  -799,   archived: false, recurring: true,  frequency: 'Monthly'  },
  { id: '10', icon: 'trending-up-outline', title: 'Dividends',     description: 'Quarterly payout', time: '12:00', date: 'March 25',  category: 'Investment',  value:  583,    archived: false, recurring: false },
];

// ── FilterChip ────────────────────────────────────────────────────────────────
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
        style={[styles.filterTab, active && styles.filterTabActive, !active && { backgroundColor: theme.surface }]}
        onPress={() => {
          scale.value = withSequence(
            withSpring(0.88, { damping: 6,  stiffness: 600 }),
            withSpring(1,    { damping: 10, stiffness: 400 }),
          );
          onPress();
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterText, active && styles.filterTextActive, !active && { color: theme.textSecondary }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Animation Helpers ─────────────────────────────────────────────────────────
function useEntranceAnim() {
  const opacity = useSharedValue(0);
  const ty      = useSharedValue(20);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    ty.value      = withSpring(0, { damping: 22, stiffness: 180 });
  }, []);
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));
}

// ── TransactionItem ────────────────────────────────────────────────────────────
function TransactionItem({
  item,
  isLast,
  onPress,
  theme,
}: {
  item: Transaction;
  isLast: boolean;
  onPress: () => void;
  theme: import('@/contexts/AppTheme').Theme;
}) {
  const isExpense = item.value < 0;
  const scale     = useSharedValue(1);
  const scaleAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={scaleAnim}>
    <TouchableOpacity
      style={[styles.txItem, !isLast && styles.txItemBorder, !isLast && { borderBottomColor: theme.divider }]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.98, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      activeOpacity={1}
    >
      <View>
        <View style={[
          styles.txIconCircle,
          isExpense ? styles.txIconExpense : styles.txIconIncome,
          item.archived && styles.txIconArchived,
        ]}>
          <Ionicons name={item.icon} size={20} color="#fff" />
        </View>
        {item.recurring && (
          <View style={styles.recurringBadge}>
            <Ionicons name="repeat" size={9} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txTitle, item.archived && styles.txTitleMuted, { color: theme.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.txMeta, { color: theme.textMuted }]}>
          {item.time} · {item.date}
          {item.recurring && item.frequency ? ` · ${item.frequency}` : ''}
        </Text>
      </View>
      <Text style={[styles.txCategory, { color: theme.textMuted }]}>{item.category}</Text>
      <View style={styles.txAmtDivider} />
      <Text style={[styles.txAmount, isExpense && styles.txAmountBlue, !isExpense && { color: theme.textPrimary }]}>
        {fmt(item.value)}
      </Text>
    </TouchableOpacity>
    </Animated.View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function TransactionScreen() {
  const { theme } = useAppTheme();
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  // ── Form modal state ────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible]     = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [formType, setFormType]             = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory]     = useState('');
  const [formTitle, setFormTitle]           = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount]         = useState('');
  const [formRecurring, setFormRecurring]   = useState(false);
  const [formFrequency, setFormFrequency]   = useState<Frequency>('Monthly');
  const [formIcon, setFormIcon]             = useState<keyof typeof Ionicons.glyphMap>('receipt-outline');

  // ── Detail / archive / success state ────────────────────────────────────────
  const [detailVisible, setDetailVisible]                 = useState(false);
  const [detailTx, setDetailTx]                           = useState<Transaction | null>(null);
  const [archiveConfirmVisible, setArchiveConfirmVisible] = useState(false);
  const [restorePromptVisible, setRestorePromptVisible]   = useState(false);
  const [successMsg, setSuccessMsg]                       = useState('');
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const active       = useMemo(() => transactions.filter(t => !t.archived), [transactions]);
  const totalIncome  = useMemo(() => active.filter(t => t.value > 0).reduce((s, t) => s + t.value, 0), [active]);
  const totalExpense = useMemo(() => active.filter(t => t.value < 0).reduce((s, t) => s + Math.abs(t.value), 0), [active]);
  const totalBalance = totalIncome - totalExpense;
  const pct          = Math.min(Math.round((totalExpense / BUDGET_LIMIT) * 100), 100);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return transactions.filter((tx) => {
      const matchesFilter =
        activeFilter === 'Archived'
          ? tx.archived
          : !tx.archived && (
              activeFilter === 'All' ||
              (activeFilter === 'Income'  && tx.value > 0) ||
              (activeFilter === 'Expense' && tx.value < 0)
            );
      const matchesSearch =
        q === '' ||
        tx.title.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.date.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [transactions, search, activeFilter]);

  // ── Modal helpers ───────────────────────────────────────────────────────────
  function resetForm() {
    setFormType('expense');
    setFormCategory('');
    setFormTitle('');
    setFormDescription('');
    setFormAmount('');
    setFormRecurring(false);
    setFormFrequency('Monthly');
    setFormIcon('receipt-outline');
  }

  function openCreate() {
    setEditingId(null);
    resetForm();
    setModalVisible(true);
  }

  function openEdit(tx: Transaction) {
    setEditingId(tx.id);
    setFormType(tx.value < 0 ? 'expense' : 'income');
    setFormCategory(tx.category);
    setFormTitle(tx.title);
    setFormDescription(tx.description);
    setFormAmount(String(Math.abs(tx.value)));
    setFormRecurring(tx.recurring);
    setFormFrequency(tx.frequency ?? 'Monthly');
    setFormIcon(tx.icon);
    setModalVisible(true);
  }

  function selectCategory(cat: typeof CATEGORIES[number]) {
    setFormCategory(cat.label);
    setFormIcon(cat.icon);
  }

  // Called when Save button is pressed — validate then show confirm dialog
  function handleSavePress() {
    const numVal = parseFloat(formAmount.replace(/,/g, ''));
    if (!formTitle.trim() || isNaN(numVal) || numVal <= 0) return;
    setConfirmVisible(true);
  }

  // Called when user taps "Yes" in confirm dialog
  function confirmSave() {
    const numVal = parseFloat(formAmount.replace(/,/g, ''));
    const value  = formType === 'expense' ? -numVal : numVal;

    if (editingId) {
      setTransactions(prev => prev.map(t =>
        t.id === editingId ? {
          ...t,
          icon: formIcon,
          title: formTitle.trim(),
          description: formDescription.trim(),
          category: formCategory || (formType === 'income' ? 'Income' : 'Expense'),
          value,
          recurring: formRecurring,
          frequency: formRecurring ? formFrequency : undefined,
        } : t
      ));
    } else {
      setTransactions(prev => [{
        id: nextId(prev),
        icon: formIcon,
        title: formTitle.trim(),
        description: formDescription.trim(),
        time: nowTime(),
        date: nowDate(),
        category: formCategory || (formType === 'income' ? 'Income' : 'Expense'),
        value,
        archived: false,
        recurring: formRecurring,
        frequency: formRecurring ? formFrequency : undefined,
      }, ...prev]);
    }

    setConfirmVisible(false);
    setModalVisible(false);
    showSuccess(editingId ? 'Transaction updated successfully.' : 'Transaction created successfully.');
  }

  function showSuccess(msg: string) {
    if (successTimeout.current) clearTimeout(successTimeout.current);
    setSuccessMsg(msg);
    successTimeout.current = setTimeout(() => setSuccessMsg(''), 3000);
  }

  function openDetail(tx: Transaction) {
    setDetailTx(tx);
    if (tx.archived) {
      setRestorePromptVisible(true);
    } else {
      setDetailVisible(true);
    }
  }

  function closeDetail() {
    setDetailVisible(false);
    setDetailTx(null);
  }

  function openEditFromDetail() {
    if (!detailTx) return;
    const tx = detailTx;
    setDetailVisible(false);
    setDetailTx(null);
    openEdit(tx);
  }

  function cancelEdit() {
    Keyboard.dismiss();
    setModalVisible(false);
  }

  // Archive from the detail sheet — close detail first so only one modal is open
  function handleArchivePress() {
    setDetailVisible(false);          // close detail (detailTx stays set for liveTx)
    setArchiveConfirmVisible(true);
  }

  // Archive from the edit form — need to populate detailTx so archive confirm has content
  function handleArchiveFromForm() {
    if (!editingId) return;
    const tx = transactions.find(t => t.id === editingId);
    if (tx) setDetailTx(tx);         // so liveTx works in archive confirm
    Keyboard.dismiss();
    setModalVisible(false);           // close form first
    setArchiveConfirmVisible(true);
  }

  function confirmArchive() {
    const id = detailTx?.id ?? editingId;
    if (!id) return;
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const wasArchived = tx.archived;
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, archived: !t.archived } : t
    ));
    setArchiveConfirmVisible(false);
    setRestorePromptVisible(false);
    setDetailVisible(false);
    setDetailTx(null);
    setModalVisible(false);
    showSuccess(wasArchived ? 'Transaction restored successfully.' : 'Transaction archived successfully.');
  }

  const editingTx = editingId ? transactions.find(t => t.id === editingId) : null;
  const liveTx    = detailTx ? (transactions.find(t => t.id === detailTx.id) ?? detailTx) : null;

  // ── Animations ──────────────────────────────────────────────────────────────
  const bodyAnim    = useEntranceAnim();
  const addBtnScale = useSharedValue(1);
  const addBtnAnim  = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  // Type toggle sliding indicator
  const [typeTabWidth, setTypeTabWidth] = useState(0);
  const typeTabWidthRef  = useRef(0);
  const typeIndicatorX   = useSharedValue(0);
  const typeProgress     = useSharedValue(0); // 0 = income, 1 = expense
  const typeIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: typeIndicatorX.value }],
    backgroundColor: interpolateColor(typeProgress.value, [0, 1], ['#1B7A4A', '#4B78E0']),
  }));
  useEffect(() => {
    if (typeTabWidthRef.current === 0) return;
    const idx = formType === 'income' ? 0 : 1;
    typeIndicatorX.value = withSpring(idx * typeTabWidthRef.current, { damping: 18, stiffness: 200 });
    typeProgress.value   = withTiming(idx, { duration: 200 });
  }, [formType]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
      {/* ── Green Header ──────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: theme.iconBtnBg }]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <PennyWiseLogo size="xs" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.iconBtnColor }]}>Transactions</Text>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.iconBtnBg }]} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
        </TouchableOpacity>
      </View>

      {/* ── Balance Summary Card ──────────────────────────────────────────── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="wallet-outline" size={11} color="#666" />
              <Text style={styles.summaryLabel}> Total Balance</Text>
            </View>
            <Text style={styles.summaryAmount}>{fmt(totalBalance)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="trending-down-outline" size={11} color="#666" />
              <Text style={styles.summaryLabel}> Total Expense</Text>
            </View>
            <Text style={[styles.summaryAmount, styles.summaryExpenseText]}>
              -{fmt(totalExpense)}
            </Text>
          </View>
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>{pct}%</Text>
            </View>
            <Text style={styles.budgetLimit}>₱{BUDGET_LIMIT.toLocaleString()}.00</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
          </View>
        </View>
      </View>

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.iconBtnBg }]}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search transactions..."
            placeholderTextColor="#BBB"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="#BBB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── White Card ────────────────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <View style={styles.filterHeaderRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  active={activeFilter === f}
                  onPress={() => setActiveFilter(f)}
                  theme={theme}
                />
              ))}
            </View>
          </ScrollView>
          <Animated.View style={addBtnAnim}>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={openCreate}
              onPressIn={() => { addBtnScale.value = withSpring(0.9, { damping: 15, stiffness: 300 }); }}
              onPressOut={() => { addBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
              activeOpacity={1}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#DDD" />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No transactions found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <TransactionItem
                item={item}
                isLast={index === filtered.length - 1}
                onPress={() => openDetail(item)}
                theme={theme}
              />
            )}
          />
        )}
      </View>
      </Animated.View>

      {/* ── Form Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cancelEdit}
      >
        <View style={styles.modalContainer}>
          {/* Tap the dark area to dismiss */}
          <Pressable style={{ flex: 1 }} onPress={cancelEdit} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              style={[styles.modalSheet, { backgroundColor: theme.modalBg }]}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingId ? 'Edit Transaction' : 'New Transaction'}
            </Text>

            {/* ── Step 1: Type ─────────────────────────────────────────── */}
            <View
              style={styles.typeToggle}
              onLayout={(e) => {
                const w = (e.nativeEvent.layout.width - 8) / 2;
                typeTabWidthRef.current = w;
                setTypeTabWidth(w);
                typeIndicatorX.value = (formType === 'income' ? 0 : 1) * w;
                typeProgress.value   = formType === 'income' ? 0 : 1;
              }}
            >
              <Animated.View style={[styles.typeIndicator, { width: typeTabWidth }, typeIndicatorStyle]} />
              <TouchableOpacity
                style={styles.typeBtn}
                onPress={() => { setFormType('income'); setFormIcon('cash-outline'); }}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up-circle-outline" size={16} color={formType === 'income' ? '#fff' : '#888'} />
                <Text style={[styles.typeBtnText, formType === 'income' && styles.typeBtnTextActive]}> Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.typeBtn}
                onPress={() => { setFormType('expense'); setFormIcon('receipt-outline'); }}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down-circle-outline" size={16} color={formType === 'expense' ? '#fff' : '#888'} />
                <Text style={[styles.typeBtnText, formType === 'expense' && styles.typeBtnTextActive]}> Expense</Text>
              </TouchableOpacity>
            </View>

            {/* ── Step 2: Select Category (expense only) ───────────────── */}
            {formType === 'expense' && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const active = formCategory === cat.label;
                    return (
                      <TouchableOpacity
                        key={cat.label}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                        onPress={() => selectCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={cat.icon} size={16} color={active ? '#fff' : '#666'} />
                        <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ── Step 3: Enter Details ────────────────────────────────── */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Title</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.surface, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="e.g. Salary, Rent..."
              placeholderTextColor="#CCC"
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description <Text style={styles.fieldLabelOptional}>(optional)</Text></Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { backgroundColor: theme.surface, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="Add a note..."
              placeholderTextColor="#CCC"
              value={formDescription}
              onChangeText={setFormDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Amount (₱)</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.surface, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              placeholder="0.00"
              placeholderTextColor="#CCC"
              value={formAmount}
              onChangeText={setFormAmount}
              keyboardType="decimal-pad"
            />

            {/* ── Step 4: Recurring? ───────────────────────────────────── */}
            <View style={styles.recurringRow}>
              <View>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Recurring?</Text>
                <Text style={styles.recurringSubtitle}>Repeat this transaction automatically</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleTrack, formRecurring && styles.toggleTrackOn]}
                onPress={() => setFormRecurring(v => !v)}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, formRecurring && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            {/* ── Step 5: Set Frequency (only if recurring) ────────────── */}
            {formRecurring && (
              <View style={styles.freqSection}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Frequency</Text>
                <View style={styles.freqRow}>
                  {FREQUENCIES.map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.freqChip, formFrequency === f && styles.freqChipActive]}
                      onPress={() => setFormFrequency(f)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.freqChipText, formFrequency === f && styles.freqChipTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Icon picker (expense only) */}
            {formType === 'expense' && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Icon</Text>
                <View style={styles.iconGrid}>
                  {ICON_OPTIONS.map((ico) => (
                    <TouchableOpacity
                      key={ico}
                      style={[styles.iconOption, formIcon === ico && styles.iconOptionActive]}
                      onPress={() => setFormIcon(ico)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={ico} size={20} color={formIcon === ico ? '#fff' : '#888'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Action buttons */}
            <View style={styles.modalActions}>
              {editingId && (
                <TouchableOpacity
                  style={[styles.archiveBtn, { borderColor: theme.divider }]}
                  onPress={handleArchiveFromForm}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={editingTx?.archived ? 'refresh-outline' : 'archive-outline'}
                    size={15}
                    color="#888"
                  />
                  <Text style={[styles.archiveBtnText, { color: theme.textSecondary }]}>
                    {editingTx?.archived ? 'Unarchive' : 'Archive'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.surface }]} onPress={cancelEdit} activeOpacity={0.8}>
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePress} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Confirm Dialog ───────────────────────────────────────────────── */}
      <Modal
        visible={confirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setConfirmVisible(false)}>
          <Pressable onPress={() => {}} style={[styles.confirmBox, { backgroundColor: theme.confirmBg }]}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="save-outline" size={28} color="#1B7A4A" />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.textPrimary }]}>Save Transaction?</Text>
            <Text style={[styles.confirmMsg, { color: theme.textSecondary }]}>
              Are you sure you want to save this transaction? Your balance will be updated.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmNo}
                onPress={() => setConfirmVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmNoText}>No, go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmYes}
                onPress={confirmSave}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmYesText}>Yes, save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetail}
      >
        <View style={styles.modalContainer}>
          <Pressable style={{ flex: 1 }} onPress={closeDetail} />
          <View style={[styles.detailSheet, { backgroundColor: theme.modalBg }]}>
            <View style={styles.modalHandle} />

            {/* Icon + title */}
            <View style={styles.detailHeader}>
              <View style={[
                styles.detailIconCircle,
                (liveTx?.value ?? 0) >= 0 ? styles.txIconIncome : styles.txIconExpense,
                liveTx?.archived && styles.txIconArchived,
              ]}>
                <Ionicons name={liveTx?.icon ?? 'receipt-outline'} size={32} color="#fff" />
                {liveTx?.recurring && (
                  <View style={[styles.recurringBadge, styles.detailRecurringBadge]}>
                    <Ionicons name="repeat" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[styles.detailTitle, { color: theme.textPrimary }]}>{liveTx?.title}</Text>
              {liveTx?.archived && (
                <View style={styles.archivedBadge}>
                  <Text style={styles.archivedBadgeText}>Archived</Text>
                </View>
              )}
            </View>

            {/* Amount */}
            <Text style={[styles.detailAmount, (liveTx?.value ?? 0) < 0 && styles.txAmountBlue, (liveTx?.value ?? 0) >= 0 && { color: theme.textPrimary }]}>
              {liveTx ? fmt(liveTx.value) : ''}
            </Text>

            {/* Meta rows */}
            <View style={[styles.detailMeta, { backgroundColor: theme.surface }]}>
              <View style={styles.detailMetaRow}>
                <Ionicons name="calendar-outline" size={14} color="#999" />
                <Text style={[styles.detailMetaText, { color: theme.textSecondary }]}>{liveTx?.date} · {liveTx?.time}</Text>
              </View>
              {liveTx?.category ? (
                <View style={styles.detailMetaRow}>
                  <Ionicons name="pricetag-outline" size={14} color="#999" />
                  <Text style={[styles.detailMetaText, { color: theme.textSecondary }]}>{liveTx.category}</Text>
                </View>
              ) : null}
              {liveTx?.recurring && liveTx.frequency ? (
                <View style={styles.detailMetaRow}>
                  <Ionicons name="repeat" size={14} color="#999" />
                  <Text style={[styles.detailMetaText, { color: theme.textSecondary }]}>Recurring · {liveTx.frequency}</Text>
                </View>
              ) : null}
              {liveTx?.description ? (
                <View style={styles.detailMetaRow}>
                  <Ionicons name="document-text-outline" size={14} color="#999" />
                  <Text style={[styles.detailMetaText, { color: theme.textSecondary }]}>{liveTx.description}</Text>
                </View>
              ) : null}
            </View>

            {/* Action buttons */}
            <TouchableOpacity style={styles.detailUpdateBtn} onPress={openEditFromDetail} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.detailUpdateBtnText}>Update Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailArchiveBtn, { backgroundColor: theme.surface }]} onPress={handleArchivePress} activeOpacity={0.8}>
              <Ionicons
                name={liveTx?.archived ? 'refresh-outline' : 'archive-outline'}
                size={18}
                color="#888"
              />
              <Text style={[styles.detailArchiveBtnText, { color: theme.textSecondary }]}>
                {liveTx?.archived ? 'Unarchive Transaction' : 'Archive Transaction'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Restore Prompt (step 1 of ATM flow) ──────────────────────────── */}
      <Modal
        visible={restorePromptVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRestorePromptVisible(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setRestorePromptVisible(false)}>
          <Pressable onPress={() => {}} style={[styles.confirmBox, { backgroundColor: theme.confirmBg }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: 'rgba(27,122,74,0.12)' }]}>
              <Ionicons name="refresh-outline" size={28} color="#1B7A4A" />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.textPrimary }]}>Restore this Transaction?</Text>
            <Text style={[styles.confirmMsg, { color: theme.textSecondary }]}>
              {`Do you want to restore "${liveTx?.title}" back to your active transactions?`}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmNo}
                onPress={() => setRestorePromptVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmNoText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmYes}
                onPress={() => { setRestorePromptVisible(false); setArchiveConfirmVisible(true); }}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmYesText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Archive Confirm Dialog ────────────────────────────────────────── */}
      <Modal
        visible={archiveConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setArchiveConfirmVisible(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setArchiveConfirmVisible(false)}>
          <Pressable onPress={() => {}} style={[styles.confirmBox, { backgroundColor: theme.confirmBg }]}>
            <View style={[styles.confirmIconWrap, liveTx?.archived
              ? { backgroundColor: 'rgba(27,122,74,0.12)' }
              : { backgroundColor: 'rgba(255,140,0,0.1)' }
            ]}>
              <Ionicons
                name={liveTx?.archived ? 'refresh-circle-outline' : 'archive-outline'}
                size={28}
                color={liveTx?.archived ? '#1B7A4A' : '#FF8C00'}
              />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.textPrimary }]}>
              {liveTx?.archived ? 'Restore Transaction?' : 'Archive Transaction?'}
            </Text>
            <Text style={[styles.confirmMsg, { color: theme.textSecondary }]}>
              {liveTx?.archived
                ? 'Are you sure you want to restore this transaction? It will return to your active list.'
                : 'Are you sure you want to archive this transaction?'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmNo}
                onPress={() => setArchiveConfirmVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmNoText}>No, go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmYes, { backgroundColor: liveTx?.archived ? '#1B7A4A' : '#FF8C00' }]}
                onPress={confirmArchive}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmYesText}>
                  {liveTx?.archived ? 'Yes, restore' : 'Yes, archive'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Success Toast ─────────────────────────────────────────────────── */}
      {successMsg !== '' && (
        <View style={styles.successToast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.successToastText}>{successMsg}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B3D2B' },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerSpacer: { width: 40 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A' },

  // ── Summary Card ─────────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16, marginHorizontal: 20, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  summaryItem: { flex: 1 },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  summaryLabel: { fontFamily: Font.bodyRegular, fontSize: 11, color: '#666' },
  summaryDivider: { width: 1, height: 38, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 12 },
  summaryAmount: { fontFamily: Font.headerBold, fontSize: 18, color: '#1A1A1A', letterSpacing: -0.3 },
  summaryExpenseText: { color: '#4895EF' },
  progressSection: { paddingTop: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  percentBadge: { backgroundColor: '#1A1A1A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  percentText: { fontFamily: Font.bodySemiBold, fontSize: 11, color: '#fff' },
  budgetLimit: { fontFamily: Font.bodyRegular, fontSize: 11, color: '#666' },
  progressTrack: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: '#1A1A1A', borderRadius: 4 },

  // ── Search ───────────────────────────────────────────────────────────────────
  searchRow: { paddingHorizontal: 20, paddingBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontFamily: Font.bodyRegular, fontSize: 14, color: '#1A1A1A', paddingVertical: 0 },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 16, paddingHorizontal: 20,
  },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, backgroundColor: '#F2F2F2' },
  filterTabActive: { backgroundColor: '#1B7A4A' },
  filterText: { fontFamily: Font.bodyMedium, fontSize: 13, color: '#888' },
  filterTextActive: { fontFamily: Font.bodySemiBold, color: '#fff' },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1B7A4A', alignItems: 'center', justifyContent: 'center',
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: { paddingBottom: 24 },

  // ── Transaction Item ─────────────────────────────────────────────────────────
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  txItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  txIconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  txIconIncome: { backgroundColor: '#1B7A4A' },
  txIconExpense: { backgroundColor: '#4B78E0' },
  txIconArchived: { backgroundColor: '#C0C0C0' },
  recurringBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#1A8A6A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  txInfo: { flex: 1 },
  txTitle: { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 3 },
  txTitleMuted: { color: '#AAAAAA' },
  txMeta: { fontFamily: Font.bodyRegular, fontSize: 11, color: '#999' },
  txCategory: { fontFamily: Font.bodyRegular, fontSize: 11, color: '#999' },
  txAmtDivider: { width: 1, height: 28, backgroundColor: '#E8E8E8', marginHorizontal: 6 },
  txAmount: { fontFamily: Font.bodySemiBold, fontSize: 13, color: '#1A1A1A', minWidth: 80, textAlign: 'right' },
  txAmountBlue: { color: '#4895EF' },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: Font.bodyRegular, fontSize: 14, color: '#CCC' },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '93%' },
  modalContent: { paddingHorizontal: 24, paddingBottom: 40 },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 18,
  },
  modalTitle: { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A', marginBottom: 20 },

  // ── Type Toggle ───────────────────────────────────────────────────────────────
  typeToggle: {
    flexDirection: 'row', backgroundColor: '#F5F5F5',
    borderRadius: 14, padding: 4, marginBottom: 24, gap: 4,
  },
  typeIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 10,
  },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  typeBtnIncome: { backgroundColor: '#1B7A4A' },
  typeBtnExpense: { backgroundColor: '#4B78E0' },
  typeBtnText: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#888' },
  typeBtnTextActive: { fontFamily: Font.bodySemiBold, color: '#fff' },

  // ── Category Grid ─────────────────────────────────────────────────────────────
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 50, backgroundColor: '#F2F2F2',
    borderWidth: 1, borderColor: '#F2F2F2',
  },
  categoryChipActive: { backgroundColor: '#1B7A4A', borderColor: '#1B7A4A' },
  categoryChipLabel: { fontFamily: Font.bodyMedium, fontSize: 12, color: '#666' },
  categoryChipLabelActive: { color: '#fff' },

  // ── Form Fields ───────────────────────────────────────────────────────────────
  fieldLabel: { fontFamily: Font.bodySemiBold, fontSize: 13, color: '#555', marginBottom: 6 },
  fieldLabelOptional: { fontFamily: Font.bodyRegular, fontSize: 12, color: '#AAA' },
  fieldInput: {
    borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Font.bodyRegular, fontSize: 14, color: '#1A1A1A',
    marginBottom: 16, backgroundColor: '#FAFAFA',
  },
  fieldInputMulti: { minHeight: 72, paddingTop: 12 },

  // ── Recurring Toggle ──────────────────────────────────────────────────────────
  recurringRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  recurringSubtitle: { fontFamily: Font.bodyRegular, fontSize: 11, color: '#AAA', marginTop: 2 },
  toggleTrack: {
    width: 48, height: 26, borderRadius: 13,
    backgroundColor: '#E0E0E0', justifyContent: 'center', padding: 3,
  },
  toggleTrackOn: { backgroundColor: '#1B7A4A' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // ── Frequency ─────────────────────────────────────────────────────────────────
  freqSection: { marginBottom: 16 },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F2F2F2' },
  freqChipActive: { backgroundColor: '#1B7A4A' },
  freqChipText: { fontFamily: Font.bodyMedium, fontSize: 12, color: '#888' },
  freqChipTextActive: { fontFamily: Font.bodySemiBold, color: '#fff' },

  // ── Icon Grid ─────────────────────────────────────────────────────────────────
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  iconOption: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  iconOptionActive: { backgroundColor: '#1B7A4A' },

  // ── Modal Actions ─────────────────────────────────────────────────────────────
  modalActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  archiveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#E8E8E8',
  },
  archiveBtnText: { fontFamily: Font.bodyMedium, fontSize: 13, color: '#888' },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: '#F2F2F2' },
  cancelBtnText: { fontFamily: Font.bodySemiBold, fontSize: 14, color: '#888' },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: '#1B7A4A' },
  saveBtnText: { fontFamily: Font.bodySemiBold, fontSize: 14, color: '#fff' },

  // ── Confirm Dialog ────────────────────────────────────────────────────────────
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  confirmBox: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 28, width: '100%', alignItems: 'center',
  },
  confirmIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(27,122,74,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  confirmTitle: { fontFamily: Font.headerBold, fontSize: 18, color: '#1A1A1A', marginBottom: 10 },
  confirmMsg: {
    fontFamily: Font.bodyRegular, fontSize: 14, color: '#777',
    textAlign: 'center', lineHeight: 21, marginBottom: 24,
  },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmNo: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, backgroundColor: '#F2F2F2',
  },
  confirmNoText: { fontFamily: Font.bodySemiBold, fontSize: 14, color: '#888' },
  confirmYes: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 14, backgroundColor: '#1B7A4A',
  },
  confirmYesText: { fontFamily: Font.bodySemiBold, fontSize: 14, color: '#fff' },

  // ── Detail Sheet ──────────────────────────────────────────────────────────────
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  detailHeader: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  detailIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  detailRecurringBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    bottom: -2,
    right: -2,
  },
  detailTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  archivedBadge: {
    backgroundColor: '#EBEBEB',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  archivedBadgeText: {
    fontFamily: Font.bodyMedium,
    fontSize: 12,
    color: '#999',
  },
  detailAmount: {
    fontFamily: Font.headerBlack,
    fontSize: 34,
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  detailMeta: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMetaText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  detailUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1B7A4A',
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  detailUpdateBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    color: '#fff',
  },
  detailArchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F2F2F2',
    borderRadius: 14,
    paddingVertical: 15,
  },
  detailArchiveBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    color: '#888',
  },

  // ── Success Toast ─────────────────────────────────────────────────────────────
  successToast: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#115533',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  successToastText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
});
