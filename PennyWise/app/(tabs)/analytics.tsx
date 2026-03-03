import { useEffect, useState } from 'react';
import {
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

type Expense = {
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
  | { name: 'categories' }
  | { name: 'detail';   categoryId: string }
  | { name: 'add';      prefillCategoryId?: string }
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
  message: string;
  onYes: () => void;
};

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_CATEGORIES: Category[] = [
  { id: 'food',          label: 'Food',          icon: 'restaurant-outline', isArchived: false },
  { id: 'transport',     label: 'Transport',     icon: 'bus-outline',        isArchived: false },
  { id: 'medicine',      label: 'Medicine',      icon: 'medkit-outline',     isArchived: false },
  { id: 'groceries',     label: 'Groceries',     icon: 'cart-outline',       isArchived: false },
  { id: 'rent',          label: 'Rent',          icon: 'key-outline',        isArchived: false },
  { id: 'gifts',         label: 'Gifts',         icon: 'gift-outline',       isArchived: false },
  { id: 'savings',       label: 'Savings',       icon: 'wallet-outline',     isArchived: false },
  { id: 'entertainment', label: 'Entertainment', icon: 'film-outline',       isArchived: false },
];

const SEED_EXPENSES: Expense[] = [
  { id: 'e1', categoryId: 'food',      title: 'Dinner',         amount: 26,    date: '2024-04-30', time: '18:27', description: '',            isRecurring: false, frequency: null,      isArchived: false },
  { id: 'e2', categoryId: 'food',      title: 'Delivery Pizza', amount: 18.35, date: '2024-04-24', time: '15:00', description: '',            isRecurring: false, frequency: null,      isArchived: false },
  { id: 'e3', categoryId: 'food',      title: 'Lunch',          amount: 15.40, date: '2024-04-15', time: '12:30', description: '',            isRecurring: false, frequency: null,      isArchived: false },
  { id: 'e4', categoryId: 'food',      title: 'Brunch',         amount: 12.13, date: '2024-04-08', time: '9:30',  description: '',            isRecurring: false, frequency: null,      isArchived: false },
  { id: 'e5', categoryId: 'food',      title: 'Dinner',         amount: 27.20, date: '2024-03-31', time: '20:50', description: '',            isRecurring: false, frequency: null,      isArchived: false },
  { id: 'e6', categoryId: 'transport', title: 'Grab',           amount: 85,    date: '2024-04-28', time: '8:00',  description: '',            isRecurring: false, frequency: null,      isArchived: false },
  { id: 'e7', categoryId: 'rent',      title: 'Monthly Rent',   amount: 6000,  date: '2024-04-01', time: '9:00',  description: 'April rent', isRecurring: true,  frequency: 'Monthly', isArchived: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);

const fmtAmt = (n: number) =>
  `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDateShort   = (iso: string) => { const [,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}`; };
const fmtDateDisplay = (iso: string) => { const [y,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}, ${y}`; };
const monthLabel     = (iso: string) => MONTHS[+iso.split('-')[1] - 1];
const monthYearKey   = (iso: string) => iso.slice(0, 7);

function groupByMonth(items: Expense[]) {
  const map = new Map<string, { label: string; items: Expense[] }>();
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  for (const ex of sorted) {
    const key = monthYearKey(ex.date);
    if (!map.has(key)) map.set(key, { label: monthLabel(ex.date), items: [] });
    map.get(key)!.items.push(ex);
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

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  return (
    <Modal visible={state.visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={ms.overlay} onPress={onCancel}>
        <Pressable style={ms.card} onPress={() => {}}>
          <Text style={ms.msg}>{state.message}</Text>
          <View style={ms.row}>
            <TouchableOpacity style={ms.cancel}  onPress={onCancel}    activeOpacity={0.8}>
              <Text style={ms.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ms.confirm} onPress={state.onYes} activeOpacity={0.8}>
              <Text style={ms.confirmTxt}>Yes, Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 },
  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  msg:        { fontFamily: Font.bodyMedium, fontSize: 15, color: '#1A1A1A', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  row:        { flexDirection: 'row', gap: 10 },
  cancel:     { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center' },
  cancelTxt:  { fontFamily: Font.bodyMedium, fontSize: 14, color: '#666' },
  confirm:    { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#3ECBA8', alignItems: 'center' },
  confirmTxt: { fontFamily: Font.bodySemiBold, fontSize: 14, color: '#fff' },
});

// ── BalanceHeader (with balance card — used by Categories + Detail) ────────────
function BalanceHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={bh.wrap}>
      <View style={bh.nav}>
        <TouchableOpacity style={bh.iconBtn} onPress={onBack} activeOpacity={0.8}>
          {onBack
            ? <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
            : <View style={{ width: 22 }} />}
        </TouchableOpacity>
        <Text style={bh.title}>{title}</Text>
        <TouchableOpacity style={bh.iconBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <View style={bh.card}>
        <View style={bh.balRow}>
          <View style={{ flex: 1 }}>
            <View style={bh.lblRow}>
              <Ionicons name="wallet-outline" size={11} color="#666" />
              <Text style={bh.lbl}> Total Balance</Text>
            </View>
            <Text style={bh.amt}>₱7,783.00</Text>
          </View>
          <View style={bh.divider} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={bh.lblRow}>
              <Ionicons name="trending-down-outline" size={11} color="#666" />
              <Text style={bh.lbl}> Total Expense</Text>
            </View>
            <Text style={[bh.amt, { color: '#4895EF' }]}>-₱1,187.40</Text>
          </View>
        </View>

        <View style={{ paddingTop: 12 }}>
          <View style={bh.progRow}>
            <View style={bh.pctBadge}><Text style={bh.pctTxt}>30%</Text></View>
            <Text style={bh.budgetLbl}>₱20,000.00</Text>
          </View>
          <View style={bh.track}><View style={[bh.fill, { width: '30%' }]} /></View>
          <View style={bh.lblRow}>
            <Ionicons name="checkbox-outline" size={14} color="#4A8A6A" />
            <Text style={bh.checkTxt}> 30% Of Your Expenses, Looks Good.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const bh = StyleSheet.create({
  wrap:      { backgroundColor: '#7CB898', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
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
  pctBadge:  { backgroundColor: '#1A1A1A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pctTxt:    { fontFamily: Font.bodySemiBold, fontSize: 11, color: '#fff' },
  budgetLbl: { fontFamily: Font.bodyRegular, fontSize: 12, color: '#666' },
  track:     { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  fill:      { height: 10, backgroundColor: '#1A1A1A', borderRadius: 5 },
  checkTxt:  { fontFamily: Font.bodyRegular, fontSize: 12, color: '#4A7A5A' },
});

// ── FormHeader (no balance card — used by Add/Edit screens) ───────────────────
function FormHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={fh.wrap}>
      <View style={fh.nav}>
        <TouchableOpacity style={fh.iconBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={fh.title}>{title}</Text>
        <TouchableOpacity style={fh.iconBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fh = StyleSheet.create({
  wrap:   { backgroundColor: '#7CB898', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  nav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn:{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  title:  { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A' },
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
}: {
  visible: boolean;
  title: string;
  options: T[];
  selected: T;
  renderItem?: (opt: T) => React.ReactNode;
  onSelect: (opt: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pk.overlay} onPress={onClose}>
        <Pressable style={pk.sheet} onPress={() => {}}>
          <Text style={pk.heading}>{title}</Text>
          <ScrollView>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={pk.item}
                onPress={() => { onSelect(opt); onClose(); }}
                activeOpacity={0.8}
              >
                {renderItem ? renderItem(opt) : <Text style={pk.itemTxt}>{opt}</Text>}
                {selected === opt && <Ionicons name="checkmark" size={18} color="#3ECBA8" />}
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

// Centered dialog style for NewCategoryModal
const ncm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 24,
    width: '100%',
    maxHeight: '80%',
  },
});

// ── CategoriesScreen ──────────────────────────────────────────────────────────
function CategoriesScreen({
  categories,
  expenses,
  onSelectCategory,
  onAddCategory,
  onViewArchived,
}: {
  categories: Category[];
  expenses: Expense[];
  onSelectCategory: (id: string) => void;
  onAddCategory: () => void;
  onViewArchived: () => void;
}) {
  const active = categories.filter(c => !c.isArchived);
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title="Expenses" />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
      <ScrollView
        style={s.white}
        contentContainerStyle={s.whiteContent}
        showsVerticalScrollIndicator={false}
      >
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
                <Text style={s.catLabel}>{cat.label}</Text>
                {count > 0 && <Text style={s.catCount}>{count} item{count !== 1 ? 's' : ''}</Text>}
              </TouchableOpacity>
            );
          })}

          {/* Add new category tile */}
          <TouchableOpacity style={s.catCard} onPress={onAddCategory} activeOpacity={0.85}>
            <View style={[s.catIcon, s.catIconMore]}>
              <Ionicons name="add" size={32} color="#4B78E0" />
            </View>
            <Text style={s.catLabel}>More</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.archivedLink} onPress={onViewArchived} activeOpacity={0.8}>
          <Ionicons name="archive-outline" size={15} color="#4A8A6A" />
          <Text style={s.archivedLinkTxt}> View Archived Expenses</Text>
        </TouchableOpacity>
      </ScrollView>
      </Animated.View>
    </>
  );
}

// ── CategoryDetailScreen ──────────────────────────────────────────────────────
function CategoryDetailScreen({
  category,
  expenses,
  onBack,
  onAdd,
  onEditExpense,
}: {
  category: Category;
  expenses: Expense[];
  onBack: () => void;
  onAdd: () => void;
  onEditExpense: (id: string) => void;
}) {
  const active  = expenses.filter(e => e.categoryId === category.id && !e.isArchived);
  const grouped = groupByMonth(active);
  const bodyAnim    = useEntranceAnim();
  const addBtnScale = useSharedValue(1);
  const addBtnAnim  = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  return (
    <>
      <BalanceHeader title={category.label} onBack={onBack} />
      <Animated.View style={[s.white, { flex: 1 }, bodyAnim]}>
        <ScrollView
          contentContainerStyle={[s.whiteContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {grouped.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="receipt-outline" size={48} color="#D0D0D0" />
              <Text style={s.emptyTxt}>No expenses yet</Text>
            </View>
          )}

          {grouped.map(group => (
            <View key={group.label} style={{ marginBottom: 8 }}>
              <View style={s.monthHeader}>
                <Text style={s.monthLabel}>{group.label}</Text>
                <Ionicons name="calendar-outline" size={20} color="#3ECBA8" />
              </View>

              {group.items.map((exp, idx) => (
                <TouchableOpacity
                  key={exp.id}
                  style={[s.expRow, idx < group.items.length - 1 && s.expRowBorder]}
                  onPress={() => onEditExpense(exp.id)}
                  activeOpacity={0.85}
                >
                  <View style={s.expIcon}>
                    <Ionicons name={category.icon} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.expTitle}>{exp.title}</Text>
                    <Text style={s.expMeta}>{exp.time} · {fmtDateShort(exp.date)}</Text>
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
              <Text style={s.addBtnTxt}>Add Expenses</Text>
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
  onBack,
  onSave,
  onArchive,
}: {
  initial: ExpenseFormValues;
  categories: Category[];
  screenTitle: string;
  isEdit?: boolean;
  onBack: () => void;
  onSave: (vals: ExpenseFormValues) => void;
  onArchive?: () => void;
}) {
  const [vals, setVals]           = useState<ExpenseFormValues>(initial);
  const [showCatPicker, setCat]   = useState(false);
  const [showFreqPicker, setFreq] = useState(false);
  const bodyAnim = useEntranceAnim();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) =>
    setVals(prev => ({ ...prev, [key]: value }));

  const activeCategories = categories.filter(c => !c.isArchived);
  const selectedCat      = activeCategories.find(c => c.id === vals.categoryId);

  return (
    <>
      <FormHeader title={screenTitle} onBack={onBack} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.formScroll}
          contentContainerStyle={s.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Date */}
          <Text style={s.label}>Date</Text>
          <View style={s.fieldRow}>
            <TextInput
              style={[s.fieldTxt, { flex: 1 }]}
              value={vals.date}
              onChangeText={v => set('date', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
            />
            <Ionicons name="calendar-outline" size={20} color="#3ECBA8" />
          </View>

          {/* Category */}
          <Text style={s.label}>Category</Text>
          <TouchableOpacity
            style={[s.fieldRow, s.selectRow]}
            onPress={() => setCat(true)}
            activeOpacity={0.8}
          >
            <Text style={[s.fieldTxt, { flex: 1, color: selectedCat ? '#1A1A1A' : '#aaa' }]}>
              {selectedCat ? selectedCat.label : 'Select the category'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#aaa" />
          </TouchableOpacity>

          {/* Amount */}
          <Text style={s.label}>Amount</Text>
          <View style={s.fieldRow}>
            <TextInput
              style={[s.fieldTxt, { flex: 1 }]}
              value={vals.amount}
              onChangeText={v => set('amount', v)}
              keyboardType="decimal-pad"
              placeholder="₱0.00"
              placeholderTextColor="#aaa"
            />
          </View>

          {/* Title */}
          <Text style={s.label}>Expense Title</Text>
          <View style={s.fieldRow}>
            <TextInput
              style={[s.fieldTxt, { flex: 1 }]}
              value={vals.title}
              onChangeText={v => set('title', v)}
              placeholder="e.g. Dinner"
              placeholderTextColor="#aaa"
            />
          </View>

          {/* Message */}
          <Text style={s.label}>Message</Text>
          <View style={[s.fieldRow, { alignItems: 'flex-start', minHeight: 100 }]}>
            <TextInput
              style={[s.fieldTxt, { flex: 1, textAlignVertical: 'top', paddingTop: 2, minHeight: 80 }]}
              value={vals.description}
              onChangeText={v => set('description', v)}
              placeholder="Enter message"
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
            <Text style={s.recurTxt}>Recurring Expense</Text>
          </TouchableOpacity>

          {/* Frequency (only when recurring) */}
          {vals.isRecurring && (
            <>
              <Text style={s.label}>Frequency</Text>
              <TouchableOpacity
                style={[s.fieldRow, s.selectRow]}
                onPress={() => setFreq(true)}
                activeOpacity={0.8}
              >
                <Text style={[s.fieldTxt, { flex: 1 }]}>{vals.frequency}</Text>
                <Ionicons name="chevron-down" size={18} color="#aaa" />
              </TouchableOpacity>
            </>
          )}

          {/* Archive category button (edit only) */}
          {isEdit && onArchive && (
            <TouchableOpacity style={s.archiveBtn} onPress={onArchive} activeOpacity={0.8}>
              <Ionicons name="archive-outline" size={16} color="#E05858" />
              <Text style={s.archiveBtnTxt}> Archive This Category</Text>
            </TouchableOpacity>
          )}

          {/* Save */}
          <Animated.View style={btnStyle}>
            <TouchableOpacity
              style={s.saveBtn}
              onPressIn={() => { btnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
              onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
              onPress={() => onSave(vals)}
              activeOpacity={1}
            >
              <Text style={s.saveBtnTxt}>Save</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>

      {/* Category picker */}
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
              <Text style={[pk.itemTxt, { marginLeft: 12 }]}>{cat.label}</Text>
            </>
          );
        }}
        onSelect={id => set('categoryId', id)}
        onClose={() => setCat(false)}
      />

      {/* Frequency picker */}
      <PickerSheet
        visible={showFreqPicker}
        title="Set Frequency"
        options={FREQUENCIES}
        selected={vals.frequency}
        onSelect={f => set('frequency', f)}
        onClose={() => setFreq(false)}
      />
    </>
  );
}

// ── NewCategoryModal ──────────────────────────────────────────────────────────
const NEW_CAT_ICONS: IoniconName[] = [
  'flame-outline', 'beer-outline', 'rose-outline', 'dice-outline',
  'cafe-outline', 'bicycle-outline', 'cut-outline', 'paw-outline',
];

function NewCategoryModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (label: string, icon: IoniconName) => void;
}) {
  const [label, setLabel]           = useState('');
  const [icon, setIcon]             = useState<IoniconName>('flame-outline');

  const handleCreate = () => {
    if (!label.trim()) return;
    onCreate(label.trim(), icon);
    setLabel('');
    setIcon('flame-outline');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={ncm.overlay} onPress={onClose}>
          <Pressable style={ncm.card} onPress={() => {}}>
            <Text style={pk.heading}>New Category</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.label}>Category Name</Text>
              <View style={[s.fieldRow, { marginBottom: 4 }]}>
                <TextInput
                  style={[s.fieldTxt, { flex: 1 }]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Cigarettes, Vape…"
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
                    <Ionicons name={ic} size={22} color={icon === ic ? '#fff' : '#4B78E0'} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, { marginTop: 20, marginBottom: 8 }]} onPress={handleCreate} activeOpacity={0.9}>
                <Text style={s.saveBtnTxt}>Create Category</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── ArchivedScreen ────────────────────────────────────────────────────────────
function ArchivedScreen({
  categories,
  onBack,
  onRestore,
}: {
  categories: Category[];
  onBack: () => void;
  onRestore: (id: string) => void;
}) {
  const archived = categories.filter(c => c.isArchived);
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title="Archived Expenses" onBack={onBack} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
      <ScrollView
        style={s.white}
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
            <View style={s.expIcon}>
              <Ionicons name={cat.icon} size={20} color="#fff" />
            </View>
            <Text style={[s.expTitle, { flex: 1 }]}>{cat.label}</Text>
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

// ── ManageExpensesScreen (main export) ───────────────────────────────────────
export default function ManageExpensesScreen() {
  const [screen,     setScreen]     = useState<Screen>({ name: 'categories' });
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [expenses,   setExpenses]   = useState<Expense[]>(SEED_EXPENSES);
  const [confirm,    setConfirm]    = useState<ConfirmState>({ visible: false, message: '', onYes: () => {} });
  const [showNewCat, setShowNewCat] = useState(false);
  const [toast,      setToast]      = useState('');

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const showConfirm = (message: string, onYes: () => void) =>
    setConfirm({ visible: true, message, onYes });

  const hideConfirm = () => setConfirm(prev => ({ ...prev, visible: false }));

  // ── Action Handlers ──────────────────────────────────────────────────────────
  const handleSave = (vals: ExpenseFormValues) => {
    const msg =
      screen.name === 'add'
        ? 'Are you sure you want to save this new expense?'
        : 'Are you sure you want to save this updated expense?';

    showConfirm(msg, () => {
      hideConfirm();

      if (screen.name === 'add') {
        const newExp: Expense = {
          id:          genId(),
          categoryId:  vals.categoryId,
          title:       vals.title,
          amount:      parseFloat(vals.amount) || 0,
          date:        vals.date,
          time:        new Date().toTimeString().slice(0, 5),
          description: vals.description,
          isRecurring: vals.isRecurring,
          frequency:   vals.isRecurring ? vals.frequency : null,
          isArchived:  false,
        };
        setExpenses(prev => [...prev, newExp]);
        showToast('Expense added successfully.');
        setScreen({ name: 'categories' });

      } else if (screen.name === 'edit') {
        setExpenses(prev =>
          prev.map(e =>
            e.id === screen.expenseId
              ? {
                  ...e,
                  categoryId:  vals.categoryId,
                  title:       vals.title,
                  amount:      parseFloat(vals.amount) || 0,
                  date:        vals.date,
                  description: vals.description,
                  isRecurring: vals.isRecurring,
                  frequency:   vals.isRecurring ? vals.frequency : null,
                }
              : e,
          ),
        );
        showToast('Expense updated successfully.');
        setScreen({ name: 'categories' });
      }
    });
  };

  const handleArchiveCategory = (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    const cat = exp ? categories.find(c => c.id === exp.categoryId) : null;
    showConfirm('Are you sure you want to archive this expenses category?', () => {
      hideConfirm();
      if (cat) {
        setCategories(prev =>
          prev.map(c => (c.id === cat.id ? { ...c, isArchived: true } : c)),
        );
        showToast('Expenses category archived successfully.');
      }
      setScreen({ name: 'categories' });
    });
  };

  const handleRestore = (categoryId: string) => {
    showConfirm('Are you sure you want to restore this expenses category?', () => {
      hideConfirm();
      setCategories(prev =>
        prev.map(c => (c.id === categoryId ? { ...c, isArchived: false } : c)),
      );
      showToast('Expenses category restored successfully.');
    });
  };

  const handleNewCategory = (label: string, icon: IoniconName) => {
    setCategories(prev => [...prev, { id: genId(), label, icon, isArchived: false }]);
    showToast(`Category "${label}" created.`);
  };

  // ── Form Initial Values ──────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const addInitial = (): ExpenseFormValues => ({
    date:        today,
    categoryId:  screen.name === 'add' ? (screen.prefillCategoryId ?? '') : '',
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

  // ── Render ───────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen.name) {

      case 'categories':
        return (
          <CategoriesScreen
            categories={categories}
            expenses={expenses}
            onSelectCategory={id => setScreen({ name: 'detail', categoryId: id })}
            onAddCategory={() => setShowNewCat(true)}
            onViewArchived={() => setScreen({ name: 'archived' })}
          />
        );

      case 'detail': {
        const cat = categories.find(c => c.id === screen.categoryId);
        if (!cat) return null;
        return (
          <CategoryDetailScreen
            category={cat}
            expenses={expenses}
            onBack={() => setScreen({ name: 'categories' })}
            onAdd={() => setScreen({ name: 'add', prefillCategoryId: cat.id })}
            onEditExpense={id => setScreen({ name: 'edit', expenseId: id })}
          />
        );
      }

      case 'add':
        return (
          <ExpenseFormScreen
            key={`add-${screen.prefillCategoryId ?? 'none'}`}
            initial={addInitial()}
            categories={categories}
            screenTitle="Add Expenses"
            onBack={() =>
              screen.prefillCategoryId
                ? setScreen({ name: 'detail', categoryId: screen.prefillCategoryId })
                : setScreen({ name: 'categories' })
            }
            onSave={handleSave}
          />
        );

      case 'edit': {
        const exp = expenses.find(e => e.id === screen.expenseId);
        return (
          <ExpenseFormScreen
            key={`edit-${screen.expenseId}`}
            initial={editInitial()}
            categories={categories}
            screenTitle="Edit Expense"
            isEdit
            onBack={() => {
              const catId = exp?.categoryId;
              catId
                ? setScreen({ name: 'detail', categoryId: catId })
                : setScreen({ name: 'categories' });
            }}
            onSave={handleSave}
            onArchive={() => handleArchiveCategory(screen.expenseId)}
          />
        );
      }

      case 'archived':
        return (
          <ArchivedScreen
            categories={categories}
            onBack={() => setScreen({ name: 'categories' })}
            onRestore={handleRestore}
          />
        );
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {renderScreen()}

      <ConfirmModal state={confirm} onCancel={hideConfirm} />

      <NewCategoryModal
        visible={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreate={handleNewCategory}
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
  safeArea: { flex: 1, backgroundColor: '#7CB898' },

  // White section
  white:       { flex: 1, backgroundColor: '#fff' },
  whiteContent:{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  // Category grid
  grid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, marginBottom: 24 },
  catCard:     { width: '30%', alignItems: 'center', marginBottom: 4 },
  catIcon:     { width: 76, height: 76, borderRadius: 20, backgroundColor: '#4B78E0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIconMore: { backgroundColor: 'rgba(75,120,224,0.12)' },
  catLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  catCount:    { fontFamily: Font.bodyRegular, fontSize: 11, color: '#888', marginTop: 2 },

  archivedLink:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  archivedLinkTxt: { fontFamily: Font.bodyMedium, fontSize: 13, color: '#4A8A6A' },

  // Month group
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthLabel:  { fontFamily: Font.headerBold, fontSize: 16, color: '#1A1A1A' },

  // Expense row
  expRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  expRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  expIcon:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#4B78E0', alignItems: 'center', justifyContent: 'center' },
  expTitle:     { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 3 },
  expMeta:      { fontFamily: Font.bodyRegular, fontSize: 11, color: '#999' },
  expAmt:       { fontFamily: Font.bodySemiBold, fontSize: 13, color: '#4895EF' },

  // Add Expenses button
  addBtnWrapper: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  addBtn:        { backgroundColor: '#3ECBA8', borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  addBtnTxt:     { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  // Empty state
  empty:    { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyTxt: { fontFamily: Font.bodyRegular, fontSize: 14, color: '#aaa', marginTop: 12 },

  // Form
  formScroll:  { flex: 1, backgroundColor: '#F8FBF9' },
  formContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  label:       { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  fieldRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF7F3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  fieldTxt:    { fontFamily: Font.bodyRegular, fontSize: 14, color: '#1A1A1A' },
  selectRow:   { justifyContent: 'space-between' },

  // Recurring
  recurRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  checkbox:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#3ECBA8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxOn:  { backgroundColor: '#3ECBA8' },
  recurTxt:    { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A' },

  // Archive
  archiveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 12 },
  archiveBtnTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#E05858' },

  // Save button
  saveBtn:    { backgroundColor: '#3ECBA8', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnTxt: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  // Picker icon
  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#4B78E0', alignItems: 'center', justifyContent: 'center' },

  // Archived list
  archiveRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  archiveRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  restoreBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#3ECBA8' },
  restoreTxt:       { fontFamily: Font.bodyMedium, fontSize: 13, color: '#3ECBA8' },

  // New category icon grid
  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconOpt:       { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: '#4B78E0', alignItems: 'center', justifyContent: 'center' },
  iconOptActive: { backgroundColor: '#4B78E0', borderColor: '#4B78E0' },

  // Toast
  toast:    { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#1E9C70', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  toastTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#fff' },
});
