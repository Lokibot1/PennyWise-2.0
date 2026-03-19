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
import { useAppTheme } from '@/contexts/AppTheme';
import type { Theme } from '@/contexts/AppTheme';
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

type IncomeSource = {
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
  | { name: 'edit';     incomeId: string }
  | { name: 'archived' };

type IncomeFormValues = {
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
  { id: 'job',        label: 'Job',        icon: 'briefcase-outline',  isArchived: false },
  { id: 'business',   label: 'Business',   icon: 'business-outline',   isArchived: false },
  { id: 'sidehustle', label: 'Side Hustle', icon: 'flash-outline',     isArchived: false },
  { id: 'allowance',  label: 'Allowance',  icon: 'cash-outline',       isArchived: false },
];

const SEED_INCOME: IncomeSource[] = [
  { id: 'i1', categoryId: 'job',        title: 'Monthly Salary',    amount: 25000, date: '2024-04-30', time: '09:00', description: 'April salary', isRecurring: true,  frequency: 'Monthly', isArchived: false },
  { id: 'i2', categoryId: 'job',        title: 'Overtime Pay',      amount: 3500,  date: '2024-04-28', time: '18:00', description: '',             isRecurring: false, frequency: null,      isArchived: false },
  { id: 'i3', categoryId: 'business',   title: 'Freelance Project', amount: 8000,  date: '2024-04-20', time: '14:30', description: 'Logo design',  isRecurring: false, frequency: null,      isArchived: false },
  { id: 'i4', categoryId: 'sidehustle', title: 'Online Selling',    amount: 1200,  date: '2024-04-15', time: '11:00', description: '',             isRecurring: false, frequency: null,      isArchived: false },
  { id: 'i5', categoryId: 'allowance',  title: 'Weekly Allowance',  amount: 500,   date: '2024-04-08', time: '08:00', description: '',             isRecurring: true,  frequency: 'Weekly',  isArchived: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);

const fmtAmt = (n: number) =>
  `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDateShort = (iso: string) => { const [,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}`; };
const monthLabel   = (iso: string) => MONTHS[+iso.split('-')[1] - 1];
const monthYearKey   = (iso: string) => iso.slice(0, 7);

function groupByMonth(items: IncomeSource[]) {
  const map = new Map<string, { label: string; items: IncomeSource[] }>();
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  for (const inc of sorted) {
    const key = monthYearKey(inc.date);
    if (!map.has(key)) map.set(key, { label: monthLabel(inc.date), items: [] });
    map.get(key)!.items.push(inc);
  }
  return Array.from(map.values());
}

const FREQUENCIES: Frequency[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

// ── Animation Helpers ─────────────────────────────────────────────────────────
// Fade-in + slide-up for screen body content on mount
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

// Staggered entrance + press-spring for main option cards
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
function ConfirmModal({ state, onCancel, theme }: { state: ConfirmState; onCancel: () => void; theme: Theme }) {
  return (
    <Modal visible={state.visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable style={ms.overlay} onPress={onCancel}>
        <Pressable style={[ms.card, { backgroundColor: theme.confirmBg }]} onPress={() => {}}>
          <Text style={[ms.msg, { color: theme.textPrimary }]}>{state.message}</Text>
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

// ── BalanceHeader ─────────────────────────────────────────────────────────────
function BalanceHeader({
  title,
  totalIncome,
  onBack,
  theme,
}: {
  title: string;
  totalIncome: number;
  onBack?: () => void;
  theme: Theme;
}) {
  return (
    <View style={[bh.wrap, { backgroundColor: theme.headerBg }]}>
      <View style={bh.nav}>
        <TouchableOpacity style={[bh.iconBtn, { backgroundColor: theme.iconBtnBg }]} onPress={onBack} activeOpacity={0.8}>
          {onBack
            ? <Ionicons name="chevron-back" size={22} color={theme.iconBtnColor} />
            : <View style={{ width: 22 }} />}
        </TouchableOpacity>
        <Text style={[bh.title, { color: theme.iconBtnColor }]}>{title}</Text>
        <TouchableOpacity style={[bh.iconBtn, { backgroundColor: theme.iconBtnBg }]} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
        </TouchableOpacity>
      </View>

      <View style={bh.card}>
        <View style={bh.balRow}>
          <View style={{ flex: 1 }}>
            <View style={bh.lblRow}>
              <Ionicons name="trending-up-outline" size={11} color="#666" />
              <Text style={bh.lbl}> Total Income</Text>
            </View>
            <Text style={[bh.amt, { color: '#1E9C70' }]}>{fmtAmt(totalIncome)}</Text>
          </View>
          <View style={bh.divider} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={bh.lblRow}>
              <Ionicons name="wallet-outline" size={11} color="#666" />
              <Text style={bh.lbl}> Net Balance</Text>
            </View>
            <Text style={bh.amt}>₱7,783.00</Text>
          </View>
        </View>

        <View style={{ paddingTop: 12 }}>
          <View style={bh.progRow}>
            <View style={bh.pctBadge}><Text style={bh.pctTxt}>85%</Text></View>
            <Text style={bh.budgetLbl}>Monthly Goal: ₱30,000.00</Text>
          </View>
          <View style={bh.track}><View style={[bh.fill, { width: '85%' }]} /></View>
          <View style={bh.lblRow}>
            <Ionicons name="checkbox-outline" size={14} color="#4A8A6A" />
            <Text style={bh.checkTxt}> 85% Of Your Income Goal, Great Progress!</Text>
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
  pctBadge:  { backgroundColor: '#1E9C70', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pctTxt:    { fontFamily: Font.bodySemiBold, fontSize: 11, color: '#fff' },
  budgetLbl: { fontFamily: Font.bodyRegular, fontSize: 12, color: '#666' },
  track:     { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  fill:      { height: 10, backgroundColor: '#1E9C70', borderRadius: 5 },
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
  wrap:    { backgroundColor: '#7CB898', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
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
            <Text style={[pk.heading, { color: theme.textPrimary }]}>New Income Category</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Category Name</Text>
              <Text style={s.hint}>e.g. Remittance, Gift, 13th Month Pay, Prize…</Text>
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
                    <Ionicons name={ic} size={22} color={icon === ic ? '#fff' : '#1E9C70'} />
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

// ── MainScreen (G) ────────────────────────────────────────────────────────────
function MainScreen({
  totalIncome,
  onNew,
  onUpdate,
  onViewArchived,
  theme,
}: {
  totalIncome: number;
  onNew: () => void;
  onUpdate: () => void;
  onViewArchived: () => void;
  theme: Theme;
}) {
  const bodyAnim = useEntranceAnim();
  return (
    <>
      <BalanceHeader title="Income Sources" totalIncome={totalIncome} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <ScrollView
          style={[s.white, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={[s.whiteContent, { paddingBottom: 48 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>What would you like to do?</Text>

          {/* New Income Source */}
          <AnimCard delay={0} style={main.optionCard} onPress={onNew}>
            <View style={[main.optionIcon, { backgroundColor: '#1E9C70' }]}>
              <Ionicons name="add-circle-outline" size={30} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[main.optionTitle, { color: theme.textPrimary }]}>New Income Source</Text>
              <Text style={[main.optionDesc, { color: theme.textSecondary }]}>Add a new income entry to a category</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </AnimCard>

          {/* Update Income Source */}
          <AnimCard delay={80} style={main.optionCard} onPress={onUpdate}>
            <View style={[main.optionIcon, { backgroundColor: '#4B78E0' }]}>
              <Ionicons name="pencil-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[main.optionTitle, { color: theme.textPrimary }]}>Update Income Source</Text>
              <Text style={[main.optionDesc, { color: theme.textSecondary }]}>Edit or archive an existing income entry</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#aaa" />
          </AnimCard>

          {/* View Archived */}
          <AnimCard delay={160} style={main.optionCard} onPress={onViewArchived}>
            <View style={[main.optionIcon, { backgroundColor: '#9AA5B4' }]}>
              <Ionicons name="archive-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[main.optionTitle, { color: theme.textPrimary }]}>Archived Income Sources</Text>
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
  optionCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, gap: 14, borderWidth: 1, borderColor: '#EEF7F3', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  optionIcon:  { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 4 },
  optionDesc:  { fontFamily: Font.bodyRegular, fontSize: 12, color: '#888' },
});

// ── CategoriesScreen ──────────────────────────────────────────────────────────
function CategoriesScreen({
  categories,
  income,
  mode,
  totalIncome,
  onBack,
  onSelectCategory,
  onAddCategory,
  theme,
}: {
  categories: Category[];
  income: IncomeSource[];
  mode: 'new' | 'update';
  totalIncome: number;
  onBack: () => void;
  onSelectCategory: (id: string) => void;
  onAddCategory: () => void;
  theme: Theme;
}) {
  const active = categories.filter(c => !c.isArchived);
  const headerTitle = mode === 'new' ? 'Select Category' : 'Update Income Source';
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title={headerTitle} totalIncome={totalIncome} onBack={onBack} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
      <ScrollView
        style={[s.white, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={s.whiteContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'new' && (
          <Text style={s.hint}>
            Select an existing category or tap <Text style={{ color: '#1E9C70', fontFamily: Font.bodySemiBold }}>More</Text> to create a new one.
          </Text>
        )}

        <View style={s.grid}>
          {active.map(cat => {
            const count = income.filter(i => i.categoryId === cat.id && !i.isArchived).length;
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

          {/* Add new category tile */}
          <TouchableOpacity style={s.catCard} onPress={onAddCategory} activeOpacity={0.85}>
            <View style={[s.catIcon, s.catIconMore]}>
              <Ionicons name="add" size={32} color="#1E9C70" />
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
  income,
  totalIncome,
  onBack,
  onAdd,
  onEditIncome,
  theme,
}: {
  category: Category;
  income: IncomeSource[];
  totalIncome: number;
  onBack: () => void;
  onAdd: () => void;
  onEditIncome: (id: string) => void;
  theme: Theme;
}) {
  const active  = income.filter(i => i.categoryId === category.id && !i.isArchived);
  const grouped = groupByMonth(active);
  const bodyAnim    = useEntranceAnim();
  const addBtnScale = useSharedValue(1);
  const addBtnAnim  = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  return (
    <>
      <BalanceHeader title={category.label} totalIncome={totalIncome} onBack={onBack} theme={theme} />
      <Animated.View style={[s.white, { flex: 1, backgroundColor: theme.cardBg }, bodyAnim]}>
        <ScrollView
          contentContainerStyle={[s.whiteContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {grouped.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="cash-outline" size={48} color="#D0D0D0" />
              <Text style={s.emptyTxt}>No income entries yet</Text>
            </View>
          )}

          {grouped.map(group => (
            <View key={group.label} style={{ marginBottom: 8 }}>
              <View style={s.monthHeader}>
                <Text style={s.monthLabel}>{group.label}</Text>
                <Ionicons name="calendar-outline" size={20} color="#3ECBA8" />
              </View>

              {group.items.map((inc, idx) => (
                <TouchableOpacity
                  key={inc.id}
                  style={[s.expRow, idx < group.items.length - 1 && s.expRowBorder]}
                  onPress={() => onEditIncome(inc.id)}
                  activeOpacity={0.85}
                >
                  <View style={[s.expIcon, { backgroundColor: '#1E9C70' }]}>
                    <Ionicons name={category.icon} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.expTitle, { color: theme.textPrimary }]}>{inc.title}</Text>
                    <Text style={[s.expMeta, { color: theme.textMuted }]}>
                      {inc.time} · {fmtDateShort(inc.date)}
                      {inc.isRecurring ? ` · ${inc.frequency}` : ''}
                    </Text>
                  </View>
                  <Text style={s.incAmt}>+{fmtAmt(inc.amount)}</Text>
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
              <Text style={s.addBtnTxt}>Add Income</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );
}

// ── IncomeFormScreen ──────────────────────────────────────────────────────────
function IncomeFormScreen({
  initial,
  categories,
  screenTitle,
  isEdit,
  onBack,
  onSave,
  onArchive,
  theme,
}: {
  initial: IncomeFormValues;
  categories: Category[];
  screenTitle: string;
  isEdit?: boolean;
  onBack: () => void;
  onSave: (vals: IncomeFormValues) => void;
  onArchive?: () => void;
  theme: Theme;
}) {
  const [vals, setVals]           = useState<IncomeFormValues>(initial);
  const [showCatPicker, setCat]   = useState(false);
  const [showFreqPicker, setFreq] = useState(false);
  const bodyAnim   = useEntranceAnim();
  const btnScale   = useSharedValue(1);
  const btnStyle   = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const set = <K extends keyof IncomeFormValues>(key: K, value: IncomeFormValues[K]) =>
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
          <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
              value={vals.date}
              onChangeText={v => set('date', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#aaa"
            />
            <Ionicons name="calendar-outline" size={20} color="#3ECBA8" />
          </View>

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
          <Text style={[s.label, { color: theme.textPrimary }]}>Income Title</Text>
          <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
            <TextInput
              style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
              value={vals.title}
              onChangeText={v => set('title', v)}
              placeholder="e.g. Monthly Salary"
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
            <Text style={[s.recurTxt, { color: theme.textPrimary }]}>Recurring Income</Text>
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
            <TouchableOpacity style={s.archiveBtn} onPress={onArchive} activeOpacity={0.8}>
              <Ionicons name="archive-outline" size={16} color="#E05858" />
              <Text style={s.archiveBtnTxt}> Archive This Income Source</Text>
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
              <Text style={[pk.itemTxt, { marginLeft: 12, color: theme.textPrimary }]}>{cat.label}</Text>
            </>
          );
        }}
        onSelect={id => set('categoryId', id)}
        onClose={() => setCat(false)}
        theme={theme}
      />

      {/* Frequency picker */}
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
  totalIncome,
  onBack,
  onRestore,
  theme,
}: {
  categories: Category[];
  totalIncome: number;
  onBack: () => void;
  onRestore: (id: string) => void;
  theme: Theme;
}) {
  const archived = categories.filter(c => c.isArchived);
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title="Archived Income Sources" totalIncome={totalIncome} onBack={onBack} theme={theme} />
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

// ── ManageIncomeScreen (main export) ──────────────────────────────────────────
export default function ManageIncomeScreen() {
  const { theme } = useAppTheme();
  const [screen,     setScreen]     = useState<Screen>({ name: 'main' });
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [income,     setIncome]     = useState<IncomeSource[]>(SEED_INCOME);
  const [confirm,    setConfirm]    = useState<ConfirmState>({ visible: false, message: '', onYes: () => {} });
  const [showNewCat, setShowNewCat] = useState(false);
  const [toast,      setToast]      = useState('');

  // ── Computed ─────────────────────────────────────────────────────────────────
  const totalIncome = income
    .filter(i => !i.isArchived)
    .reduce((sum, i) => sum + i.amount, 0);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const showConfirm = (message: string, onYes: () => void) =>
    setConfirm({ visible: true, message, onYes });

  const hideConfirm = () => setConfirm(prev => ({ ...prev, visible: false }));

  // ── Action Handlers ───────────────────────────────────────────────────────────
  const handleSave = (vals: IncomeFormValues) => {
    const msg =
      screen.name === 'add'
        ? 'Are you sure you want to save this new Income Source?'
        : 'Are you sure you want to save this updated Income Source?';

    showConfirm(msg, () => {
      hideConfirm();

      if (screen.name === 'add') {
        const newInc: IncomeSource = {
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
        setIncome(prev => [...prev, newInc]);
        showToast('Income Source added successfully.');
        setScreen({ name: 'main' });

      } else if (screen.name === 'edit') {
        setIncome(prev =>
          prev.map(i =>
            i.id === screen.incomeId
              ? {
                  ...i,
                  categoryId:  vals.categoryId,
                  title:       vals.title,
                  amount:      parseFloat(vals.amount) || 0,
                  date:        vals.date,
                  description: vals.description,
                  isRecurring: vals.isRecurring,
                  frequency:   vals.isRecurring ? vals.frequency : null,
                }
              : i,
          ),
        );
        showToast('Income Sources category updated successfully.');
        setScreen({ name: 'main' });
      }
    });
  };

  const handleArchiveIncome = (incomeId: string) => {
    const inc = income.find(i => i.id === incomeId);
    const cat = inc ? categories.find(c => c.id === inc.categoryId) : null;
    showConfirm('Are you sure you want to archive this Income Sources category?', () => {
      hideConfirm();
      if (cat) {
        setCategories(prev =>
          prev.map(c => (c.id === cat.id ? { ...c, isArchived: true } : c)),
        );
        showToast('Income Sources category archived successfully.');
      }
      setScreen({ name: 'main' });
    });
  };

  const handleRestore = (categoryId: string) => {
    showConfirm('Are you sure you want to restore this Income Sources category?', () => {
      hideConfirm();
      setCategories(prev =>
        prev.map(c => (c.id === categoryId ? { ...c, isArchived: false } : c)),
      );
      showToast('Income Sources category restored successfully.');
    });
  };

  const handleNewCategory = (label: string, icon: IoniconName) => {
    const newCat: Category = { id: genId(), label, icon, isArchived: false };
    setCategories(prev => [...prev, newCat]);
    showToast(`Category "${label}" created.`);
    // After creating new category, go straight to add form with it prefilled
    if (screen.name === 'categories') {
      setScreen({ name: 'add', prefillCategoryId: newCat.id });
    }
  };

  // ── Form Initial Values ────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const addInitial = (): IncomeFormValues => ({
    date:        today,
    categoryId:  screen.name === 'add' ? screen.prefillCategoryId : '',
    amount:      '',
    title:       '',
    description: '',
    isRecurring: false,
    frequency:   'Monthly',
  });

  const editInitial = (): IncomeFormValues => {
    if (screen.name !== 'edit') return addInitial();
    const inc = income.find(i => i.id === screen.incomeId);
    if (!inc) return addInitial();
    return {
      date:        inc.date,
      categoryId:  inc.categoryId,
      amount:      inc.amount.toString(),
      title:       inc.title,
      description: inc.description,
      isRecurring: inc.isRecurring,
      frequency:   inc.frequency ?? 'Monthly',
    };
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen.name) {

      case 'main':
        return (
          <MainScreen
            totalIncome={totalIncome}
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
            income={income}
            mode={screen.mode}
            totalIncome={totalIncome}
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
            income={income}
            totalIncome={totalIncome}
            onBack={() => setScreen({ name: 'categories', mode: 'update' })}
            onAdd={() => setScreen({ name: 'add', prefillCategoryId: cat.id })}
            onEditIncome={id => setScreen({ name: 'edit', incomeId: id })}
            theme={theme}
          />
        );
      }

      case 'add':
        return (
          <IncomeFormScreen
            key={`add-${screen.prefillCategoryId}`}
            initial={addInitial()}
            categories={categories}
            screenTitle="New Income Source"
            onBack={() => setScreen({ name: 'categories', mode: 'new' })}
            onSave={handleSave}
            theme={theme}
          />
        );

      case 'edit': {
        const inc = income.find(i => i.id === screen.incomeId);
        return (
          <IncomeFormScreen
            key={`edit-${screen.incomeId}`}
            initial={editInitial()}
            categories={categories}
            screenTitle="Update Income Source"
            isEdit
            onBack={() => {
              const catId = inc?.categoryId;
              catId
                ? setScreen({ name: 'detail', categoryId: catId })
                : setScreen({ name: 'categories', mode: 'update' });
            }}
            onSave={handleSave}
            onArchive={() => handleArchiveIncome(screen.incomeId)}
            theme={theme}
          />
        );
      }

      case 'archived':
        return (
          <ArchivedScreen
            categories={categories}
            totalIncome={totalIncome}
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

      <ConfirmModal state={confirm} onCancel={hideConfirm} theme={theme} />

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
  safeArea: { flex: 1, backgroundColor: '#7CB898' },

  // White section
  white:        { flex: 1, backgroundColor: '#fff' },
  whiteContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  // Section title
  sectionTitle: { fontFamily: Font.headerBold, fontSize: 18, color: '#1A1A1A', marginBottom: 20 },

  // Hint text
  hint: { fontFamily: Font.bodyRegular, fontSize: 13, color: '#888', marginBottom: 16 },

  // Category grid
  grid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, marginBottom: 24 },
  catCard:     { width: '30%', alignItems: 'center', marginBottom: 4 },
  catIcon:     { width: 76, height: 76, borderRadius: 20, backgroundColor: '#1E9C70', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIconMore: { backgroundColor: 'rgba(30,156,112,0.12)' },
  catLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  catCount:    { fontFamily: Font.bodyRegular, fontSize: 11, color: '#888', marginTop: 2 },

  // Month group
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthLabel:  { fontFamily: Font.headerBold, fontSize: 16, color: '#1A1A1A' },

  // Income row
  expRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  expRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  expIcon:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1E9C70', alignItems: 'center', justifyContent: 'center' },
  expTitle:     { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 3 },
  expMeta:      { fontFamily: Font.bodyRegular, fontSize: 11, color: '#999' },
  incAmt:       { fontFamily: Font.bodySemiBold, fontSize: 13, color: '#1E9C70' },

  // Add Income button
  addBtnWrapper: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  addBtn:        { backgroundColor: '#3ECBA8', borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  addBtnTxt:     { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  // Empty state
  empty:    { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyTxt: { fontFamily: Font.bodyRegular, fontSize: 14, color: '#aaa', marginTop: 12 },

  // Form
  formScroll:  { flex: 1, backgroundColor: '#F0FAF6' },
  formContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  label:       { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  fieldRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F7EF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  fieldTxt:    { fontFamily: Font.bodyRegular, fontSize: 14, color: '#1A1A1A' },
  selectRow:   { justifyContent: 'space-between' },

  // Recurring
  recurRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#3ECBA8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxOn: { backgroundColor: '#3ECBA8' },
  recurTxt:   { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A' },

  // Archive
  archiveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, paddingVertical: 12 },
  archiveBtnTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#E05858' },

  // Save button
  saveBtn:    { backgroundColor: '#3ECBA8', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnTxt: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  // Picker icon
  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E9C70', alignItems: 'center', justifyContent: 'center' },

  // Archived list
  archiveRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  archiveRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  restoreBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#3ECBA8' },
  restoreTxt:       { fontFamily: Font.bodyMedium, fontSize: 13, color: '#3ECBA8' },

  // New category icon grid
  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconOpt:       { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: '#1E9C70', alignItems: 'center', justifyContent: 'center' },
  iconOptActive: { backgroundColor: '#1E9C70', borderColor: '#1E9C70' },

  // Toast
  toast:    { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#1E9C70', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  toastTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#fff' },
});
