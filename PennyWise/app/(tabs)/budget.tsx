import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import DatePickerModal from '@/components/DatePickerModal';
import ConfirmModal from '@/components/ConfirmModal';
import { logActivity, ACTION, ENTITY } from '@/lib/logActivity';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
import { CategoryPageSkeleton } from '@/components/SkeletonLoader';
import {
  ActivityIndicator,
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
import type { Theme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated';

// ── Types ─────────────────────────────────────────────────────────────────────
type IoniconName = keyof typeof Ionicons.glyphMap;
type Frequency = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

type Category = {
  id: string;
  label: string;
  icon: IoniconName;
  isArchived: boolean;
};

type ExpenseEntry = {
  id: string;
  categoryId: string;
  title: string;
  amount: number;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM
  description: string;
  isRecurring: boolean;
  frequency: Frequency | null;
  isArchived: boolean;
};

type Screen =
  | { name: 'main' }
  | { name: 'categories'; mode: 'new' | 'update' }
  | { name: 'detail';   categoryId: string }
  | { name: 'add';      prefillCategoryId: string }
  | { name: 'edit';     expenseId: string }
  | { name: 'archived' };

type ExpenseFormValues = {
  date: string;
  categoryId: string;
  amount: string;
  title: string;
  description: string;
  isRecurring: boolean;
  frequency: Frequency;
};

type ConfirmState = {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  confirmColor?: string;
  onYes: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtAmt = (n: number) =>
  `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDateShort = (iso: string) => { const [,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}`; };
const monthLabel   = (iso: string) => MONTHS[+iso.split('-')[1] - 1];
const monthYearKey = (iso: string) => iso.slice(0, 7);

function groupByMonth(items: ExpenseEntry[]) {
  const map = new Map<string, { key: string; label: string; items: ExpenseEntry[] }>();
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  for (const exp of sorted) {
    const key = monthYearKey(exp.date);
    if (!map.has(key)) map.set(key, { key, label: monthLabel(exp.date), items: [] });
    map.get(key)!.items.push(exp);
  }
  return Array.from(map.values());
}

const FREQUENCIES: Frequency[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

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

function AnimCard({
  delay = 0,
  style,
  onPress,
  children,
}: {
  delay?: number;
  style?: object;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const ty      = useSharedValue(18);
  const scale   = useSharedValue(1);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 260 }));
    ty.value      = withDelay(delay, withSpring(0, { damping: 22, stiffness: 180 }));
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }, { scale: scale.value }],
  }));
  return (
    <Animated.View style={anim}>
      <TouchableOpacity
        style={style}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}


// ── BalanceHeader ─────────────────────────────────────────────────────────────
function BalanceHeader({
  title,
  totalExpenses,
  budgetLimit,
  onBack,
  theme,
}: {
  title: string;
  totalExpenses: number;
  budgetLimit: number;
  onBack?: () => void;
  theme: Theme;
}) {
  const remaining = budgetLimit - totalExpenses;
  const pct       = budgetLimit > 0 ? Math.min(100, (totalExpenses / budgetLimit) * 100) : 0;
  const pctStr    = pct.toFixed(0);
  const pctMsg    =
    pct <= 30 ? `${pctStr}% Of Income Spent, Looks Good.`
    : pct <= 70 ? `${pctStr}% Of Income Spent, Be Careful.`
    : `${pctStr}% Of Income Spent, Over Budget!`;

  return (
    <View style={[bh.wrap, { backgroundColor: theme.headerBg }]}>
      <View style={bh.nav}>
        <TouchableOpacity
          style={[bh.iconBtn, { backgroundColor: theme.iconBtnBg }]}
          onPress={onBack ?? (() => router.replace('/(tabs)'))}
          activeOpacity={0.8}
        >
          {onBack
            ? <Ionicons name="chevron-back" size={22} color={theme.iconBtnColor} />
            : <PennyWiseLogo size="xs" />}
        </TouchableOpacity>
        <Text style={[bh.title, { color: theme.iconBtnColor }]}>{title}</Text>
        <TouchableOpacity style={[bh.iconBtn, { backgroundColor: theme.iconBtnBg }]} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
        </TouchableOpacity>
      </View>

      <View style={[bh.card, {
        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)',
        borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
      }]}>
        <View style={[bh.balRow, { borderBottomColor: theme.divider }]}>
          <View style={{ flex: 1 }}>
            <View style={bh.lblRow}>
              <Ionicons name="trending-up-outline" size={11} color={theme.isDark ? theme.textMuted : '#666'} />
              <Text style={[bh.lbl, { color: theme.isDark ? theme.textMuted : '#666' }]}> Total Income</Text>
            </View>
            <Text style={[bh.amt, { color: theme.textPrimary }]}>{fmtAmt(budgetLimit)}</Text>
          </View>
          <View style={[bh.divider, { backgroundColor: theme.divider }]} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={bh.lblRow}>
              <Ionicons name="wallet-outline" size={11} color={theme.isDark ? theme.textMuted : '#666'} />
              <Text style={[bh.lbl, { color: theme.isDark ? theme.textMuted : '#666' }]}> Remaining</Text>
            </View>
            <Text style={[bh.amt, { color: remaining >= 0 ? theme.textPrimary : '#E05858' }]}>
              {fmtAmt(remaining)}
            </Text>
          </View>
        </View>

        <View style={{ paddingTop: 12 }}>
          <View style={bh.progRow}>
            <View style={bh.pctBadge}><Text style={bh.pctTxt}>{pctStr}%</Text></View>
            <Text style={[bh.budgetLbl, { color: theme.isDark ? theme.textMuted : '#666' }]}>Spent of {fmtAmt(budgetLimit)}</Text>
          </View>
          <View style={[bh.track, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }]}>
            <View style={[bh.fill, { width: `${pct}%` as any }]} />
          </View>
          <View style={bh.lblRow}>
            <Ionicons name="checkbox-outline" size={14} color={theme.textSecondary} />
            <Text style={[bh.checkTxt, { color: theme.textSecondary }]}> {pctMsg}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const bh = StyleSheet.create({
  wrap:      { backgroundColor: '#1B3D2B', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  nav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  title:     { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A' },
  card:      { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  balRow:    { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  lblRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  lbl:       { fontFamily: Font.bodyRegular, fontSize: 11, color: '#666' },
  amt:       { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A', letterSpacing: -0.3 },
  divider:   { width: 1, height: 40, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 12 },
  progRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pctBadge:  { backgroundColor: '#E05858', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pctTxt:    { fontFamily: Font.bodySemiBold, fontSize: 11, color: '#fff' },
  budgetLbl: { fontFamily: Font.bodyRegular, fontSize: 12, color: '#666' },
  track:     { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  fill:      { height: 10, backgroundColor: '#E05858', borderRadius: 5 },
  checkTxt:  { fontFamily: Font.bodyRegular, fontSize: 12, color: '#4A7A5A' },
});

// ── FormHeader ────────────────────────────────────────────────────────────────
function FormHeader({ title, onBack, theme }: { title: string; onBack: () => void; theme: Theme }) {
  return (
    <View style={[fh.wrap, { backgroundColor: theme.headerBg }]}>
      <View style={fh.nav}>
        <TouchableOpacity style={[fh.iconBtn, { backgroundColor: theme.iconBtnBg }]} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={theme.iconBtnColor} />
        </TouchableOpacity>
        <Text style={[fh.title, { color: theme.iconBtnColor }]}>{title}</Text>
        <TouchableOpacity style={[fh.iconBtn, { backgroundColor: theme.iconBtnBg }]} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fh = StyleSheet.create({
  wrap:    { backgroundColor: '#1B3D2B', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  nav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  title:   { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A' },
});

// ── PickerSheet ───────────────────────────────────────────────────────────────
function PickerSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  renderItem,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  title: string;
  options: T[];
  selected: T;
  renderItem?: (opt: T) => React.ReactNode;
  onSelect: (opt: T) => void;
  onClose: () => void;
  theme: Theme;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pk.overlay} onPress={onClose}>
        <Pressable style={[pk.sheet, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
          <Text style={[pk.heading, { color: theme.textPrimary }]}>{title}</Text>
          <ScrollView>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[pk.item, { borderBottomColor: theme.divider }]}
                onPress={() => { onSelect(opt); onClose(); }}
                activeOpacity={0.8}
              >
                {renderItem ? renderItem(opt) : <Text style={[pk.itemTxt, { color: theme.textPrimary }]}>{opt}</Text>}
                {selected === opt && <Ionicons name="checkmark" size={18} color="#1B7A4A" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, maxHeight: '60%' },
  heading: { fontFamily: Font.headerBold, fontSize: 18, color: '#1A1A1A', marginBottom: 16 },
  item:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  itemTxt: { fontFamily: Font.bodyMedium, fontSize: 15, color: '#1A1A1A', flex: 1 },
});

// ── NewCategoryModal ──────────────────────────────────────────────────────────
const NEW_CAT_ICONS: IoniconName[] = [
  'star-outline', 'gift-outline', 'ribbon-outline', 'trophy-outline',
  'diamond-outline', 'heart-outline', 'planet-outline', 'sparkles-outline',
];

const ncm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 20, paddingBottom: 24, width: '100%', maxHeight: '80%' },
});

function NewCategoryModal({
  visible,
  onClose,
  onCreate,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (label: string, icon: IoniconName) => void;
  theme: Theme;
}) {
  const [label, setLabel] = useState('');
  const [icon, setIcon]   = useState<IoniconName>('star-outline');

  const handleCreate = () => {
    if (!label.trim()) return;
    onCreate(label.trim(), icon);
    setLabel('');
    setIcon('star-outline');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={ncm.overlay} onPress={onClose}>
          <Pressable style={[ncm.card, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
            <Text style={[pk.heading, { color: theme.textPrimary }]}>New Expense Category</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Category Name</Text>
              <Text style={s.hint}>e.g. Rent, Groceries, Transport, Utilities…</Text>
              <View style={[s.fieldRow, { marginBottom: 4 }]}>
                <TextInput
                  style={[s.fieldTxt, { flex: 1 }]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Category name"
                  placeholderTextColor="#aaa"
                />
              </View>

              <Text style={s.label}>Icon</Text>
              <View style={s.iconGrid}>
                {NEW_CAT_ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[s.iconOpt, icon === ic && s.iconOptActive]}
                    onPress={() => setIcon(ic)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={ic} size={22} color={icon === ic ? '#fff' : '#E05858'} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, { marginTop: 20, marginBottom: 8 }]}
                onPress={handleCreate}
                activeOpacity={0.9}
              >
                <Text style={s.saveBtnTxt}>Create Category</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── MainScreen ────────────────────────────────────────────────────────────────
function MainScreen({
  totalExpenses,
  budgetLimit,
  onNew,
  onUpdate,
  onViewArchived,
  theme,
}: {
  totalExpenses: number;
  budgetLimit: number;
  onNew: () => void;
  onUpdate: () => void;
  onViewArchived: () => void;
  theme: Theme;
}) {
  const bodyAnim = useEntranceAnim();
  return (
    <>
      <BalanceHeader title="Expenses" totalExpenses={totalExpenses} budgetLimit={budgetLimit} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <ScrollView
          style={[s.white, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={[s.whiteContent, { paddingBottom: 48 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>What would you like to do?</Text>

          <AnimCard delay={0} style={[main.optionCard, { backgroundColor: theme.surface, borderColor: theme.divider }]} onPress={onNew}>
            <View style={[main.optionIcon, { backgroundColor: '#E05858' }]}>
              <Ionicons name="add-circle-outline" size={30} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[main.optionTitle, { color: theme.textPrimary }]}>New Expense</Text>
              <Text style={[main.optionDesc, { color: theme.textSecondary }]}>Add a new expense entry to a category</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </AnimCard>

          <AnimCard delay={80} style={[main.optionCard, { backgroundColor: theme.surface, borderColor: theme.divider }]} onPress={onUpdate}>
            <View style={[main.optionIcon, { backgroundColor: '#4B78E0' }]}>
              <Ionicons name="pencil-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[main.optionTitle, { color: theme.textPrimary }]}>Update Expense</Text>
              <Text style={[main.optionDesc, { color: theme.textSecondary }]}>Edit or archive an existing expense entry</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </AnimCard>

          <AnimCard delay={160} style={[main.optionCard, { backgroundColor: theme.surface, borderColor: theme.divider }]} onPress={onViewArchived}>
            <View style={[main.optionIcon, { backgroundColor: '#9AA5B4' }]}>
              <Ionicons name="archive-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[main.optionTitle, { color: theme.textPrimary }]}>Archived Expenses</Text>
              <Text style={[main.optionDesc, { color: theme.textSecondary }]}>View and restore archived categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </AnimCard>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const main = StyleSheet.create({
  optionCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, gap: 14, borderWidth: 1, borderColor: '#F5EAEA', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  optionIcon:  { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 4 },
  optionDesc:  { fontFamily: Font.bodyRegular, fontSize: 12, color: '#888' },
});

// ── CategoriesScreen ──────────────────────────────────────────────────────────
function CategoriesScreen({
  categories,
  expenses,
  mode,
  totalExpenses,
  budgetLimit,
  onBack,
  onSelectCategory,
  onAddCategory,
  theme,
}: {
  categories: Category[];
  expenses: ExpenseEntry[];
  mode: 'new' | 'update';
  totalExpenses: number;
  budgetLimit: number;
  onBack: () => void;
  onSelectCategory: (id: string) => void;
  onAddCategory: () => void;
  theme: Theme;
}) {
  const active = categories.filter(c => !c.isArchived);
  const headerTitle = mode === 'new' ? 'Select Category' : 'Update Expense';
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title={headerTitle} totalExpenses={totalExpenses} budgetLimit={budgetLimit} onBack={onBack} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <ScrollView
          style={[s.white, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={s.whiteContent}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'new' && (
            <Text style={[s.hint, { color: theme.textMuted }]}>
              Select an existing category or tap <Text style={{ color: '#E05858', fontFamily: Font.bodySemiBold }}>More</Text> to create a new one.
            </Text>
          )}

          <View style={s.grid}>
            {active.map(cat => {
              const count = expenses.filter(e => e.categoryId === cat.id && !e.isArchived).length;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={s.catCard}
                  onPress={() => onSelectCategory(cat.id)}
                  activeOpacity={0.85}
                >
                  <View style={s.catIcon}>
                    <Ionicons name={cat.icon} size={28} color="#fff" />
                  </View>
                  <Text style={[s.catLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
                  {count > 0 && <Text style={[s.catCount, { color: theme.textMuted }]}>{count} item{count !== 1 ? 's' : ''}</Text>}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.catCard} onPress={onAddCategory} activeOpacity={0.85}>
              <View style={[s.catIcon, s.catIconMore]}>
                <Ionicons name="add" size={32} color="#E05858" />
              </View>
              <Text style={[s.catLabel, { color: theme.textPrimary }]}>More</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

// ── CategoryDetailScreen ──────────────────────────────────────────────────────
function CategoryDetailScreen({
  category,
  expenses,
  totalExpenses,
  budgetLimit,
  onBack,
  onAdd,
  onEditExpense,
  theme,
}: {
  category: Category;
  expenses: ExpenseEntry[];
  totalExpenses: number;
  budgetLimit: number;
  onBack: () => void;
  onAdd: () => void;
  onEditExpense: (id: string) => void;
  theme: Theme;
}) {
  const active  = expenses.filter(e => e.categoryId === category.id && !e.isArchived);
  const grouped = groupByMonth(active);
  const bodyAnim    = useEntranceAnim();
  const addBtnScale = useSharedValue(1);
  const addBtnAnim  = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  return (
    <>
      <BalanceHeader title={category.label} totalExpenses={totalExpenses} budgetLimit={budgetLimit} onBack={onBack} theme={theme} />
      <Animated.View style={[s.white, { flex: 1, backgroundColor: theme.cardBg }, bodyAnim]}>
        <ScrollView
          contentContainerStyle={[s.whiteContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {grouped.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
              <Text style={[s.emptyTxt, { color: theme.textMuted }]}>No expense entries yet</Text>
            </View>
          )}

          {grouped.map(group => (
            <View key={group.key} style={{ marginBottom: 8 }}>
              <View style={s.monthHeader}>
                <Text style={[s.monthLabel, { color: theme.textPrimary }]}>{group.label}</Text>
                <Ionicons name="calendar-outline" size={20} color="#1B7A4A" />
              </View>

              {group.items.map((exp, idx) => (
                <TouchableOpacity
                  key={exp.id}
                  style={[s.expRow, idx < group.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}
                  onPress={() => onEditExpense(exp.id)}
                  activeOpacity={0.85}
                >
                  <View style={[s.expIcon, { backgroundColor: '#E05858' }]}>
                    <Ionicons name={category.icon} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.expTitle, { color: theme.textPrimary }]}>{exp.title}</Text>
                    <Text style={[s.expMeta, { color: theme.textMuted }]}>
                      {exp.time} · {fmtDateShort(exp.date)}
                      {exp.isRecurring ? ` · ${exp.frequency}` : ''}
                    </Text>
                  </View>
                  <Text style={s.expAmt}>-{fmtAmt(exp.amount)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={s.addBtnWrapper}>
          <Animated.View style={addBtnAnim}>
            <TouchableOpacity
              style={s.addBtn}
              onPressIn={() => { addBtnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
              onPressOut={() => { addBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
              onPress={onAdd}
              activeOpacity={1}
            >
              <Text style={s.addBtnTxt}>Add Expense</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );
}

// ── ExpenseFormScreen ─────────────────────────────────────────────────────────
function ExpenseFormScreen({
  initial,
  categories,
  screenTitle,
  isEdit,
  saving,
  onBack,
  onSave,
  onArchive,
  theme,
}: {
  initial: ExpenseFormValues;
  categories: Category[];
  screenTitle: string;
  isEdit?: boolean;
  saving?: boolean;
  onBack: () => void;
  onSave: (vals: ExpenseFormValues) => void;
  onArchive?: () => void;
  theme: Theme;
}) {
  const [vals, setVals]           = useState<ExpenseFormValues>(initial);
  const [showCatPicker, setCat]   = useState(false);
  const [showFreqPicker, setFreq] = useState(false);
  const [showDatePicker, setDatePicker] = useState(false);
  const bodyAnim   = useEntranceAnim();
  const btnScale   = useSharedValue(1);
  const btnStyle   = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) =>
    setVals(prev => ({ ...prev, [key]: value }));

  const activeCategories = categories.filter(c => !c.isArchived);
  const selectedCat      = activeCategories.find(c => c.id === vals.categoryId);

  return (
    <>
      <FormHeader title={screenTitle} onBack={onBack} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={[s.formScroll, { backgroundColor: theme.cardBg }]}
            contentContainerStyle={s.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Date</Text>
            <TouchableOpacity
              style={[s.fieldRow, { backgroundColor: theme.inputBg }]}
              onPress={() => setDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.fieldTxt, { flex: 1, color: vals.date ? theme.textPrimary : '#aaa' }]}>
                {vals.date || 'Select a date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#1B7A4A" />
            </TouchableOpacity>

            {/* Category */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Category</Text>
            <TouchableOpacity
              style={[s.fieldRow, s.selectRow, { backgroundColor: theme.inputBg }]}
              onPress={() => setCat(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.fieldTxt, { flex: 1, color: selectedCat ? theme.textPrimary : '#aaa' }]}>
                {selectedCat ? selectedCat.label : 'Select the category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#aaa" />
            </TouchableOpacity>

            {/* Amount */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Amount</Text>
            <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
                value={vals.amount}
                onChangeText={v => set('amount', v)}
                keyboardType="decimal-pad"
                placeholder="₱0.00"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Title */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Expense Title</Text>
            <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
                value={vals.title}
                onChangeText={v => set('title', v)}
                placeholder="e.g. Monthly Rent"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Description */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Description</Text>
            <View style={[s.fieldRow, { alignItems: 'flex-start', minHeight: 100, backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[s.fieldTxt, { flex: 1, textAlignVertical: 'top', paddingTop: 2, minHeight: 80, color: theme.textPrimary }]}
                value={vals.description}
                onChangeText={v => set('description', v)}
                placeholder="Enter description"
                placeholderTextColor="#aaa"
                multiline
              />
            </View>

            {/* Recurring toggle */}
            <TouchableOpacity
              style={s.recurRow}
              onPress={() => set('isRecurring', !vals.isRecurring)}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, vals.isRecurring && s.checkboxOn]}>
                {vals.isRecurring && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[s.recurTxt, { color: theme.textPrimary }]}>Recurring Expense</Text>
            </TouchableOpacity>

            {/* Frequency (only when recurring) */}
            {vals.isRecurring && (
              <>
                <Text style={[s.label, { color: theme.textPrimary }]}>Frequency</Text>
                <TouchableOpacity
                  style={[s.fieldRow, s.selectRow, { backgroundColor: theme.inputBg }]}
                  onPress={() => setFreq(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}>{vals.frequency}</Text>
                  <Ionicons name="chevron-down" size={18} color="#aaa" />
                </TouchableOpacity>
              </>
            )}

            {/* Archive button (edit only) */}
            {isEdit && onArchive && (
              <TouchableOpacity style={s.archiveBtn} onPress={onArchive} activeOpacity={0.8} disabled={saving}>
                <Ionicons name="archive-outline" size={16} color="#E05858" />
                <Text style={s.archiveBtnTxt}> Archive This Expense Category</Text>
              </TouchableOpacity>
            )}

            {/* Save */}
            <Animated.View style={btnStyle}>
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPressIn={() => { btnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
                onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
                onPress={() => onSave(vals)}
                activeOpacity={1}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnTxt}>Save</Text>
                }
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      <DatePickerModal
        visible={showDatePicker}
        value={vals.date ? new Date(vals.date) : new Date()}
        onConfirm={date => set('date', date.toISOString().slice(0, 10))}
        onClose={() => setDatePicker(false)}
      />
      <PickerSheet
        visible={showCatPicker}
        title="Select Category"
        options={activeCategories.map(c => c.id)}
        selected={vals.categoryId}
        renderItem={id => {
          const cat = activeCategories.find(c => c.id === id)!;
          return (
            <>
              <View style={s.pickerIcon}>
                <Ionicons name={cat.icon} size={20} color="#fff" />
              </View>
              <Text style={[pk.itemTxt, { marginLeft: 12, color: theme.textPrimary }]}>{cat.label}</Text>
            </>
          );
        }}
        onSelect={id => set('categoryId', id)}
        onClose={() => setCat(false)}
        theme={theme}
      />

      <PickerSheet
        visible={showFreqPicker}
        title="Set Frequency"
        options={FREQUENCIES}
        selected={vals.frequency}
        onSelect={f => set('frequency', f)}
        onClose={() => setFreq(false)}
        theme={theme}
      />
    </>
  );
}

// ── ArchivedScreen ────────────────────────────────────────────────────────────
function ArchivedScreen({
  categories,
  totalExpenses,
  budgetLimit,
  onBack,
  onRestore,
  theme,
}: {
  categories: Category[];
  totalExpenses: number;
  budgetLimit: number;
  onBack: () => void;
  onRestore: (id: string) => void;
  theme: Theme;
}) {
  const archived = categories.filter(c => c.isArchived);
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title="Archived Expenses" totalExpenses={totalExpenses} budgetLimit={budgetLimit} onBack={onBack} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <ScrollView
          style={[s.white, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={s.whiteContent}
          showsVerticalScrollIndicator={false}
        >
          {archived.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="archive-outline" size={48} color="#D0D0D0" />
              <Text style={s.emptyTxt}>No archived categories</Text>
            </View>
          )}

          {archived.map((cat, idx) => (
            <View
              key={cat.id}
              style={[s.archiveRow, idx < archived.length - 1 && s.archiveRowBorder]}
            >
              <View style={[s.expIcon, { backgroundColor: '#9AA5B4' }]}>
                <Ionicons name={cat.icon} size={20} color="#fff" />
              </View>
              <Text style={[s.expTitle, { flex: 1, color: theme.textPrimary }]}>{cat.label}</Text>
              <TouchableOpacity style={s.restoreBtn} onPress={() => onRestore(cat.id)} activeOpacity={0.75}>
                <Text style={s.restoreTxt}>Restore</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </>
  );
}

// ── Root Screen ───────────────────────────────────────────────────────────────
export default function ManageExpenseScreen() {
  const { theme } = useAppTheme();
  const userIdRef = useRef('');

  const [screen,      setScreen]      = useState<Screen>({ name: 'main' });
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [expenses,    setExpenses]    = useState<ExpenseEntry[]>([]);
  const [budgetLimit, setBudgetLimit] = useState(20000);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [confirm,     setConfirm]     = useState<ConfirmState>({ visible: false, title: '', message: '', onYes: () => {} });
  const [showNewCat,  setShowNewCat]  = useState(false);
  const [toast,       setToast]       = useState('');

  // ── Load from Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData(userId: string) {
      const [incomeRes, catRes, expRes] = await Promise.all([
        // Budget limit = total of all active income sources
        supabase.from('income_sources').select('amount').eq('user_id', userId).eq('is_archived', false),
        supabase.from('expense_categories').select('id, label, icon, is_archived').eq('user_id', userId),
        supabase.from('expenses').select('id, category_id, title, amount, date, time, description, is_recurring, frequency, is_archived').eq('user_id', userId),
      ]);

      if (incomeRes.data) {
        const totalIncome = incomeRes.data.reduce((sum, r) => sum + Number(r.amount), 0);
        setBudgetLimit(totalIncome);
      }

      if (catRes.data) {
        setCategories(catRes.data.map(c => ({
          id:         c.id,
          label:      c.label,
          icon:       c.icon as IoniconName,
          isArchived: c.is_archived,
        })));
      }

      if (expRes.data) {
        setExpenses(expRes.data.map(e => ({
          id:          e.id,
          categoryId:  e.category_id,
          title:       e.title,
          amount:      Number(e.amount),
          date:        e.date,
          time:        e.time,
          description: e.description,
          isRecurring: e.is_recurring,
          frequency:   e.frequency as Frequency | null,
          isArchived:  e.is_archived,
        })));
      }

      setLoading(false);
    }

    // Use onAuthStateChange to avoid the AsyncStorage race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const totalExpenses = expenses
    .filter(e => !e.isArchived)
    .reduce((sum, e) => sum + e.amount, 0);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const showConfirm = (opts: Omit<ConfirmState, 'visible'>) => setConfirm({ visible: true, ...opts });
  const hideConfirm = () => setConfirm(prev => ({ ...prev, visible: false }));

  // ── Action Handlers ───────────────────────────────────────────────────────────
  const handleSave = (vals: ExpenseFormValues) => {
    showConfirm({
      title:        screen.name === 'add' ? 'Save Expense?' : 'Update Expense?',
      message:      screen.name === 'add'
        ? 'Are you sure you want to save this new Expense?'
        : 'Are you sure you want to save the updated Expense?',
      icon:         'save-outline',
      confirmLabel: 'Save',
      confirmColor: '#3ECBA8',
      onYes: async () => {
        hideConfirm();
        setSaving(true);

      if (screen.name === 'add') {
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            user_id:     userIdRef.current,
            category_id: vals.categoryId,
            title:       vals.title.trim(),
            amount:      parseFloat(vals.amount) || 0,
            date:        vals.date,
            time:        new Date().toTimeString().slice(0, 5),
            description: vals.description.trim(),
            is_recurring: vals.isRecurring,
            frequency:   vals.isRecurring ? vals.frequency : null,
          })
          .select()
          .single();

        if (!error && data) {
          setExpenses(prev => [...prev, {
            id:          data.id,
            categoryId:  data.category_id,
            title:       data.title,
            amount:      Number(data.amount),
            date:        data.date,
            time:        data.time,
            description: data.description,
            isRecurring: data.is_recurring,
            frequency:   data.frequency as Frequency | null,
            isArchived:  data.is_archived,
          }]);
          showToast('Expense added successfully.');
          const cat = categories.find(c => c.id === vals.categoryId);
          logActivity({
            user_id:     userIdRef.current!,
            action_type: ACTION.EXPENSE_ADDED,
            entity_type: ENTITY.EXPENSE,
            title:       `Expense Added: ${vals.title.trim()}`,
            description: `₱${(parseFloat(vals.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} · ${cat?.label ?? 'Expense'}`,
            icon:        cat?.icon ?? 'receipt-outline',
          });
          setScreen({ name: 'main' });
        }

      } else if (screen.name === 'edit') {
        const { error } = await supabase
          .from('expenses')
          .update({
            category_id:  vals.categoryId,
            title:        vals.title.trim(),
            amount:       parseFloat(vals.amount) || 0,
            date:         vals.date,
            description:  vals.description.trim(),
            is_recurring: vals.isRecurring,
            frequency:    vals.isRecurring ? vals.frequency : null,
          })
          .eq('id', screen.expenseId);

        if (!error) {
          setExpenses(prev => prev.map(e =>
            e.id === screen.expenseId
              ? {
                  ...e,
                  categoryId:  vals.categoryId,
                  title:       vals.title.trim(),
                  amount:      parseFloat(vals.amount) || 0,
                  date:        vals.date,
                  description: vals.description.trim(),
                  isRecurring: vals.isRecurring,
                  frequency:   vals.isRecurring ? vals.frequency : null,
                }
              : e,
          ));
          showToast('Expense updated successfully.');
          const catU = categories.find(c => c.id === vals.categoryId);
          logActivity({
            user_id:     userIdRef.current!,
            action_type: ACTION.EXPENSE_UPDATED,
            entity_type: ENTITY.EXPENSE,
            title:       `Expense Updated: ${vals.title.trim()}`,
            description: `₱${(parseFloat(vals.amount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} · ${catU?.label ?? 'Expense'}`,
            icon:        catU?.icon ?? 'receipt-outline',
          });
          setScreen({ name: 'main' });
        }
      }

      setSaving(false);
      },
    });
  };

  const handleArchiveCategory = (categoryId: string) => {
    showConfirm({
      title:        'Archive Category?',
      message:      'Are you sure you want to archive this Expense Category?',
      icon:         'archive-outline',
      confirmLabel: 'Archive',
      confirmColor: '#F59E0B',
      onYes: async () => {
      hideConfirm();
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_archived: true })
        .eq('id', categoryId);

      if (!error) {
        const archivedCat = categories.find(c => c.id === categoryId);
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: true } : c));
        showToast('Expense category archived successfully.');
        logActivity({
          user_id:     userIdRef.current!,
          action_type: ACTION.EXPENSE_CATEGORY_ARCHIVED,
          entity_type: ENTITY.EXPENSE_CATEGORY,
          title:       `Category Archived: ${archivedCat?.label ?? 'Expense Category'}`,
          description: 'Expense category and its entries archived.',
          icon:        archivedCat?.icon ?? 'archive-outline',
        });
        setScreen({ name: 'main' });
      }
      },
    });
  };

  const handleRestore = (categoryId: string) => {
    showConfirm({
      title:        'Restore Category?',
      message:      'Are you sure you want to restore this Expense Category?',
      icon:         'refresh-outline',
      confirmLabel: 'Restore',
      confirmColor: '#3ECBA8',
      onYes: async () => {
        hideConfirm();
        const { error } = await supabase
          .from('expense_categories')
          .update({ is_archived: false })
          .eq('id', categoryId);

        if (!error) {
          setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: false } : c));
          showToast('Expense category restored successfully.');
        }
      },
    });
  };

  const handleNewCategory = async (label: string, icon: IoniconName) => {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ user_id: userIdRef.current, label, icon })
      .select()
      .single();

    if (!error && data) {
      const newCat: Category = { id: data.id, label: data.label, icon: data.icon as IoniconName, isArchived: false };
      setCategories(prev => [...prev, newCat]);
      showToast(`Category "${label}" created.`);
      logActivity({
        user_id:     userIdRef.current!,
        action_type: ACTION.EXPENSE_CATEGORY_CREATED,
        entity_type: ENTITY.EXPENSE_CATEGORY,
        title:       `New Expense Category: ${label}`,
        description: 'Expense category created.',
        icon:        icon,
      });
      if (screen.name === 'categories') {
        setScreen({ name: 'add', prefillCategoryId: newCat.id });
      }
    }
  };

  // ── Form Initial Values ───────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const addInitial = (): ExpenseFormValues => ({
    date:        today,
    categoryId:  screen.name === 'add' ? screen.prefillCategoryId : '',
    amount:      '',
    title:       '',
    description: '',
    isRecurring: false,
    frequency:   'Monthly',
  });

  const editInitial = (): ExpenseFormValues => {
    if (screen.name !== 'edit') return addInitial();
    const exp = expenses.find(e => e.id === screen.expenseId);
    if (!exp) return addInitial();
    return {
      date:        exp.date,
      categoryId:  exp.categoryId,
      amount:      exp.amount.toString(),
      title:       exp.title,
      description: exp.description,
      isRecurring: exp.isRecurring,
      frequency:   exp.frequency ?? 'Monthly',
    };
  };

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
        <StatusBar style={theme.statusBar} />
        <CategoryPageSkeleton />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen.name) {

      case 'main':
        return (
          <MainScreen
            totalExpenses={totalExpenses}
            budgetLimit={budgetLimit}
            onNew={() => setScreen({ name: 'categories', mode: 'new' })}
            onUpdate={() => setScreen({ name: 'categories', mode: 'update' })}
            onViewArchived={() => setScreen({ name: 'archived' })}
            theme={theme}
          />
        );

      case 'categories':
        return (
          <CategoriesScreen
            categories={categories}
            expenses={expenses}
            mode={screen.mode}
            totalExpenses={totalExpenses}
            budgetLimit={budgetLimit}
            onBack={() => setScreen({ name: 'main' })}
            onSelectCategory={id => {
              if (screen.mode === 'new') {
                setScreen({ name: 'add', prefillCategoryId: id });
              } else {
                setScreen({ name: 'detail', categoryId: id });
              }
            }}
            onAddCategory={() => setShowNewCat(true)}
            theme={theme}
          />
        );

      case 'detail': {
        const cat = categories.find(c => c.id === screen.categoryId);
        if (!cat) return null;
        return (
          <CategoryDetailScreen
            category={cat}
            expenses={expenses}
            totalExpenses={totalExpenses}
            budgetLimit={budgetLimit}
            onBack={() => setScreen({ name: 'categories', mode: 'update' })}
            onAdd={() => setScreen({ name: 'add', prefillCategoryId: cat.id })}
            onEditExpense={id => setScreen({ name: 'edit', expenseId: id })}
            theme={theme}
          />
        );
      }

      case 'add':
        return (
          <ExpenseFormScreen
            key={`add-${screen.prefillCategoryId}`}
            initial={addInitial()}
            categories={categories}
            screenTitle="New Expense"
            saving={saving}
            onBack={() => setScreen({ name: 'categories', mode: 'new' })}
            onSave={handleSave}
            theme={theme}
          />
        );

      case 'edit': {
        const exp = expenses.find(e => e.id === screen.expenseId);
        return (
          <ExpenseFormScreen
            key={`edit-${screen.expenseId}`}
            initial={editInitial()}
            categories={categories}
            screenTitle="Update Expense"
            isEdit
            saving={saving}
            onBack={() => {
              const catId = exp?.categoryId;
              catId
                ? setScreen({ name: 'detail', categoryId: catId })
                : setScreen({ name: 'categories', mode: 'update' });
            }}
            onSave={handleSave}
            onArchive={() => {
              const catId = exp?.categoryId;
              if (catId) handleArchiveCategory(catId);
            }}
            theme={theme}
          />
        );
      }

      case 'archived':
        return (
          <ArchivedScreen
            categories={categories}
            totalExpenses={totalExpenses}
            budgetLimit={budgetLimit}
            onBack={() => setScreen({ name: 'main' })}
            onRestore={handleRestore}
            theme={theme}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />
      {renderScreen()}

      <ConfirmModal
        visible={confirm.visible}
        onClose={hideConfirm}
        onConfirm={confirm.onYes}
        title={confirm.title}
        message={confirm.message}
        icon={confirm.icon}
        confirmLabel={confirm.confirmLabel}
        confirmColor={confirm.confirmColor}
      />

      <NewCategoryModal
        visible={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreate={handleNewCategory}
        theme={theme}
      />

      {toast !== '' && (
        <View style={s.toast}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={s.toastTxt}> {toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1B3D2B' },

  white:        { flex: 1, backgroundColor: '#fff' },
  whiteContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  sectionTitle: { fontFamily: Font.headerBold, fontSize: 18, color: '#1A1A1A', marginBottom: 20 },

  hint: { fontFamily: Font.bodyRegular, fontSize: 13, color: '#888', marginBottom: 16 },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, marginBottom: 24 },
  catCard:     { width: '30%', alignItems: 'center', marginBottom: 4 },
  catIcon:     { width: 76, height: 76, borderRadius: 20, backgroundColor: '#E05858', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIconMore: { backgroundColor: 'rgba(224,88,88,0.12)' },
  catLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  catCount:    { fontFamily: Font.bodyRegular, fontSize: 11, color: '#888', marginTop: 2 },

  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthLabel:  { fontFamily: Font.headerBold, fontSize: 16, color: '#1A1A1A' },

  expRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  expRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  expIcon:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E05858', alignItems: 'center', justifyContent: 'center' },
  expTitle:     { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 3 },
  expMeta:      { fontFamily: Font.bodyRegular, fontSize: 11, color: '#999' },
  expAmt:       { fontFamily: Font.bodySemiBold, fontSize: 13, color: '#E05858' },

  addBtnWrapper: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  addBtn:        { backgroundColor: '#1B7A4A', borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  addBtnTxt:     { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  empty:    { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyTxt: { fontFamily: Font.bodyRegular, fontSize: 14, color: '#aaa', marginTop: 12 },

  formScroll:  { flex: 1, backgroundColor: '#EDF7F1' },
  formContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  label:       { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  fieldRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5EAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  fieldTxt:    { fontFamily: Font.bodyRegular, fontSize: 14, color: '#1A1A1A' },
  selectRow:   { justifyContent: 'space-between' },

  recurRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#1B7A4A', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxOn: { backgroundColor: '#1B7A4A' },
  recurTxt:   { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A' },

  archiveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 12 },
  archiveBtnTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#E05858' },

  saveBtn:    { backgroundColor: '#1B7A4A', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnTxt: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E05858', alignItems: 'center', justifyContent: 'center' },

  archiveRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  archiveRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  restoreBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#1B7A4A' },
  restoreTxt:       { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1B7A4A' },

  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconOpt:       { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: '#E05858', alignItems: 'center', justifyContent: 'center' },
  iconOptActive: { backgroundColor: '#E05858', borderColor: '#E05858' },

  toast:    { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#115533', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  toastTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#fff' },
});
