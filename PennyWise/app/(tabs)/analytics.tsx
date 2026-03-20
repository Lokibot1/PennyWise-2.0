import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import DatePickerModal from '@/components/DatePickerModal';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
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
  | { name: 'categories' }
  | { name: 'detail';   categoryId: string }
  | { name: 'add';      prefillCategoryId?: string }
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtAmt = (n: number) =>
  `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDateShort = (iso: string) => { const [,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}`; };
const monthLabel   = (iso: string) => MONTHS[+iso.split('-')[1] - 1];
const monthYearKey = (iso: string) => iso.slice(0, 7);  // YYYY-MM — used as unique React key

function groupByMonth(items: IncomeSource[]) {
  const map = new Map<string, { key: string; label: string; items: IncomeSource[] }>();
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  for (const inc of sorted) {
    const key = monthYearKey(inc.date);
    if (!map.has(key)) map.set(key, { key, label: monthLabel(inc.date), items: [] });
    map.get(key)!.items.push(inc);
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
  confirm:    { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#1B7A4A', alignItems: 'center' },
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

      <View style={bh.card}>
        <View style={bh.balRow}>
          <View style={{ flex: 1 }}>
            <View style={bh.lblRow}>
              <Ionicons name="trending-up-outline" size={11} color="#666" />
              <Text style={bh.lbl}> Total Income</Text>
            </View>
            <Text style={[bh.amt, { color: '#115533' }]}>{fmtAmt(totalIncome)}</Text>
          </View>
          <View style={bh.divider} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={bh.lblRow}>
              <Ionicons name="cash-outline" size={11} color="#666" />
              <Text style={bh.lbl}> Income Sources</Text>
            </View>
            <Text style={bh.amt}>Active</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const bh = StyleSheet.create({
  wrap:    { backgroundColor: '#1B3D2B', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  nav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  title:   { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A' },
  card:    { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  balRow:  { flexDirection: 'row', alignItems: 'center' },
  lblRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  lbl:     { fontFamily: Font.bodyRegular, fontSize: 11, color: '#666' },
  amt:     { fontFamily: Font.headerBold, fontSize: 20, color: '#1A1A1A', letterSpacing: -0.3 },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 12 },
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
  visible, title, options, selected, renderItem, onSelect, onClose, theme,
}: {
  visible: boolean; title: string; options: T[]; selected: T;
  renderItem?: (opt: T) => React.ReactNode;
  onSelect: (opt: T) => void; onClose: () => void; theme: Theme;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pk.overlay} onPress={onClose}>
        <Pressable style={[pk.sheet, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
          <Text style={[pk.heading, { color: theme.textPrimary }]}>{title}</Text>
          <ScrollView>
            {options.map(opt => (
              <TouchableOpacity key={opt} style={pk.item} onPress={() => { onSelect(opt); onClose(); }} activeOpacity={0.8}>
                {renderItem ? renderItem(opt) : <Text style={pk.itemTxt}>{opt}</Text>}
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
  'briefcase-outline', 'business-outline', 'flash-outline', 'cash-outline',
  'star-outline', 'gift-outline', 'trending-up-outline', 'ribbon-outline',
];

const ncm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 20, paddingBottom: 24, width: '100%', maxHeight: '80%' },
});

function NewCategoryModal({
  visible, onClose, onCreate, theme,
}: {
  visible: boolean; onClose: () => void; onCreate: (label: string, icon: IoniconName) => void; theme: Theme;
}) {
  const [label, setLabel] = useState('');
  const [icon, setIcon]   = useState<IoniconName>('briefcase-outline');

  const handleCreate = () => {
    if (!label.trim()) return;
    onCreate(label.trim(), icon);
    setLabel('');
    setIcon('briefcase-outline');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={ncm.overlay} onPress={onClose}>
          <Pressable style={[ncm.card, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
            <Text style={[pk.heading, { color: theme.textPrimary }]}>New Income Category</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Category Name</Text>
              <Text style={s.hint}>e.g. Freelance, Remittance, Allowance…</Text>
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
                  <TouchableOpacity key={ic} style={[s.iconOpt, icon === ic && s.iconOptActive]} onPress={() => setIcon(ic)} activeOpacity={0.8}>
                    <Ionicons name={ic} size={22} color={icon === ic ? '#fff' : '#115533'} />
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

// ── CategoriesScreen ──────────────────────────────────────────────────────────
function CategoriesScreen({
  categories, income, totalIncome, onSelectCategory, onAddCategory, onViewArchived, theme,
}: {
  categories: Category[]; income: IncomeSource[]; totalIncome: number;
  onSelectCategory: (id: string) => void; onAddCategory: () => void;
  onViewArchived: () => void; theme: Theme;
}) {
  const active   = categories.filter(c => !c.isArchived);
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title="Income Sources" totalIncome={totalIncome} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <ScrollView style={[s.white, { backgroundColor: theme.cardBg }]} contentContainerStyle={s.whiteContent} showsVerticalScrollIndicator={false}>
          <View style={s.grid}>
            {active.map(cat => {
              const count = income.filter(i => i.categoryId === cat.id && !i.isArchived).length;
              return (
                <TouchableOpacity key={cat.id} style={s.catCard} onPress={() => onSelectCategory(cat.id)} activeOpacity={0.85}>
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
                <Ionicons name="add" size={32} color="#115533" />
              </View>
              <Text style={[s.catLabel, { color: theme.textPrimary }]}>More</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.archivedLink} onPress={onViewArchived} activeOpacity={0.8}>
            <Ionicons name="archive-outline" size={15} color="#4A8A6A" />
            <Text style={s.archivedLinkTxt}> View Archived Income Sources</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </>
  );
}

// ── CategoryDetailScreen ──────────────────────────────────────────────────────
function CategoryDetailScreen({
  category, income, totalIncome, onBack, onAdd, onEditIncome, theme,
}: {
  category: Category; income: IncomeSource[]; totalIncome: number;
  onBack: () => void; onAdd: () => void; onEditIncome: (id: string) => void; theme: Theme;
}) {
  const active      = income.filter(i => i.categoryId === category.id && !i.isArchived);
  const grouped     = groupByMonth(active);
  const bodyAnim    = useEntranceAnim();
  const addBtnScale = useSharedValue(1);
  const addBtnAnim  = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  return (
    <>
      <BalanceHeader title={category.label} totalIncome={totalIncome} onBack={onBack} theme={theme} />
      <Animated.View style={[s.white, { flex: 1, backgroundColor: theme.cardBg }, bodyAnim]}>
        <ScrollView contentContainerStyle={[s.whiteContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          {grouped.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="cash-outline" size={48} color="#D0D0D0" />
              <Text style={s.emptyTxt}>No income entries yet</Text>
            </View>
          )}
          {grouped.map(group => (
            <View key={group.key} style={{ marginBottom: 8 }}>
              <View style={s.monthHeader}>
                <Text style={s.monthLabel}>{group.label}</Text>
                <Ionicons name="calendar-outline" size={20} color="#1B7A4A" />
              </View>
              {group.items.map((inc, idx) => (
                <TouchableOpacity
                  key={inc.id}
                  style={[s.incRow, idx < group.items.length - 1 && s.incRowBorder]}
                  onPress={() => onEditIncome(inc.id)}
                  activeOpacity={0.85}
                >
                  <View style={s.incIcon}>
                    <Ionicons name={category.icon} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.incTitle, { color: theme.textPrimary }]}>{inc.title}</Text>
                    <Text style={[s.incMeta, { color: theme.textMuted }]}>
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
  initial, categories, screenTitle, isEdit, saving, onBack, onSave, onArchive, theme,
}: {
  initial: IncomeFormValues; categories: Category[]; screenTitle: string;
  isEdit?: boolean; saving?: boolean;
  onBack: () => void; onSave: (vals: IncomeFormValues) => void;
  onArchive?: () => void; theme: Theme;
}) {
  const [vals, setVals]           = useState<IncomeFormValues>(initial);
  const [showCatPicker, setCat]   = useState(false);
  const [showFreqPicker, setFreq] = useState(false);
  const [showDatePicker, setDatePicker] = useState(false);
  const bodyAnim = useEntranceAnim();
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const set = <K extends keyof IncomeFormValues>(key: K, value: IncomeFormValues[K]) =>
    setVals(prev => ({ ...prev, [key]: value }));

  const activeCategories = categories.filter(c => !c.isArchived);
  const selectedCat      = activeCategories.find(c => c.id === vals.categoryId);

  return (
    <>
      <FormHeader title={screenTitle} onBack={onBack} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={[s.formScroll, { backgroundColor: theme.cardBg }]} contentContainerStyle={s.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

            <Text style={[s.label, { color: theme.textPrimary }]}>Category</Text>
            <TouchableOpacity style={[s.fieldRow, s.selectRow, { backgroundColor: theme.inputBg }]} onPress={() => setCat(true)} activeOpacity={0.8}>
              <Text style={[s.fieldTxt, { flex: 1, color: selectedCat ? theme.textPrimary : '#aaa' }]}>
                {selectedCat ? selectedCat.label : 'Select the category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#aaa" />
            </TouchableOpacity>

            <Text style={[s.label, { color: theme.textPrimary }]}>Amount</Text>
            <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
              <TextInput style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]} value={vals.amount} onChangeText={v => set('amount', v)} keyboardType="decimal-pad" placeholder="₱0.00" placeholderTextColor="#aaa" />
            </View>

            <Text style={[s.label, { color: theme.textPrimary }]}>Income Title</Text>
            <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
              <TextInput style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]} value={vals.title} onChangeText={v => set('title', v)} placeholder="e.g. Monthly Salary" placeholderTextColor="#aaa" />
            </View>

            <Text style={[s.label, { color: theme.textPrimary }]}>Description</Text>
            <View style={[s.fieldRow, { alignItems: 'flex-start', minHeight: 100, backgroundColor: theme.inputBg }]}>
              <TextInput style={[s.fieldTxt, { flex: 1, textAlignVertical: 'top', paddingTop: 2, minHeight: 80, color: theme.textPrimary }]} value={vals.description} onChangeText={v => set('description', v)} placeholder="Enter description" placeholderTextColor="#aaa" multiline />
            </View>

            <TouchableOpacity style={s.recurRow} onPress={() => set('isRecurring', !vals.isRecurring)} activeOpacity={0.8}>
              <View style={[s.checkbox, vals.isRecurring && s.checkboxOn]}>
                {vals.isRecurring && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[s.recurTxt, { color: theme.textPrimary }]}>Recurring Income</Text>
            </TouchableOpacity>

            {vals.isRecurring && (
              <>
                <Text style={[s.label, { color: theme.textPrimary }]}>Frequency</Text>
                <TouchableOpacity style={[s.fieldRow, s.selectRow, { backgroundColor: theme.inputBg }]} onPress={() => setFreq(true)} activeOpacity={0.8}>
                  <Text style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}>{vals.frequency}</Text>
                  <Ionicons name="chevron-down" size={18} color="#aaa" />
                </TouchableOpacity>
              </>
            )}

            {isEdit && onArchive && (
              <TouchableOpacity style={s.archiveBtn} onPress={onArchive} activeOpacity={0.8} disabled={saving}>
                <Ionicons name="archive-outline" size={16} color="#E05858" />
                <Text style={s.archiveBtnTxt}> Archive This Income Category</Text>
              </TouchableOpacity>
            )}

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
      <PickerSheet visible={showCatPicker} title="Select Category" options={activeCategories.map(c => c.id)} selected={vals.categoryId}
        renderItem={id => {
          const cat = activeCategories.find(c => c.id === id)!;
          return (
            <>
              <View style={s.pickerIcon}><Ionicons name={cat.icon} size={20} color="#fff" /></View>
              <Text style={[pk.itemTxt, { marginLeft: 12, color: theme.textPrimary }]}>{cat.label}</Text>
            </>
          );
        }}
        onSelect={id => set('categoryId', id)} onClose={() => setCat(false)} theme={theme}
      />
      <PickerSheet visible={showFreqPicker} title="Set Frequency" options={FREQUENCIES} selected={vals.frequency} onSelect={f => set('frequency', f)} onClose={() => setFreq(false)} theme={theme} />
    </>
  );
}

// ── ArchivedScreen ────────────────────────────────────────────────────────────
function ArchivedScreen({
  categories, totalIncome, onBack, onRestore, theme,
}: {
  categories: Category[]; totalIncome: number;
  onBack: () => void; onRestore: (id: string) => void; theme: Theme;
}) {
  const archived = categories.filter(c => c.isArchived);
  const bodyAnim = useEntranceAnim();

  return (
    <>
      <BalanceHeader title="Archived Income Sources" totalIncome={totalIncome} onBack={onBack} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <ScrollView style={[s.white, { backgroundColor: theme.cardBg }]} contentContainerStyle={s.whiteContent} showsVerticalScrollIndicator={false}>
          {archived.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="archive-outline" size={48} color="#D0D0D0" />
              <Text style={s.emptyTxt}>No archived categories</Text>
            </View>
          )}
          {archived.map((cat, idx) => (
            <View key={cat.id} style={[s.archiveRow, idx < archived.length - 1 && s.archiveRowBorder]}>
              <View style={s.incIcon}>
                <Ionicons name={cat.icon} size={20} color="#fff" />
              </View>
              <Text style={[s.incTitle, { flex: 1, color: theme.textPrimary }]}>{cat.label}</Text>
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
export default function IncomeSourcesScreen() {
  const { theme } = useAppTheme();
  const userIdRef = useRef('');

  const [screen,     setScreen]     = useState<Screen>({ name: 'categories' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [income,     setIncome]     = useState<IncomeSource[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [confirm,    setConfirm]    = useState<ConfirmState>({ visible: false, message: '', onYes: () => {} });
  const [showNewCat, setShowNewCat] = useState(false);
  const [toast,      setToast]      = useState('');

  // ── Load from Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData(userId: string) {
      const [catRes, incRes] = await Promise.all([
        supabase.from('income_categories').select('id, label, icon, is_archived').eq('user_id', userId),
        supabase.from('income_sources').select('id, category_id, title, amount, date, time, description, is_recurring, frequency, is_archived').eq('user_id', userId),
      ]);

      if (catRes.data) {
        setCategories(catRes.data.map(c => ({
          id: c.id, label: c.label, icon: c.icon as IoniconName, isArchived: c.is_archived,
        })));
      }

      if (incRes.data) {
        setIncome(incRes.data.map(i => ({
          id: i.id, categoryId: i.category_id, title: i.title,
          amount: Number(i.amount), date: i.date, time: i.time,
          description: i.description, isRecurring: i.is_recurring,
          frequency: i.frequency as Frequency | null, isArchived: i.is_archived,
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
  const totalIncome = income.filter(i => !i.isArchived).reduce((sum, i) => sum + i.amount, 0);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast   = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };
  const showConfirm = (message: string, onYes: () => void) => setConfirm({ visible: true, message, onYes });
  const hideConfirm = () => setConfirm(prev => ({ ...prev, visible: false }));

  // ── Action Handlers ───────────────────────────────────────────────────────────
  const handleSave = (vals: IncomeFormValues) => {
    const msg = screen.name === 'add'
      ? 'Are you sure you want to save this new Income Source?'
      : 'Are you sure you want to save the updated Income Source?';

    showConfirm(msg, async () => {
      hideConfirm();
      setSaving(true);

      if (screen.name === 'add') {
        const { data, error } = await supabase
          .from('income_sources')
          .insert({
            user_id:      userIdRef.current,
            category_id:  vals.categoryId,
            title:        vals.title.trim(),
            amount:       parseFloat(vals.amount) || 0,
            date:         vals.date,
            time:         new Date().toTimeString().slice(0, 5),
            description:  vals.description.trim(),
            is_recurring: vals.isRecurring,
            frequency:    vals.isRecurring ? vals.frequency : null,
          })
          .select()
          .single();

        if (!error && data) {
          setIncome(prev => [...prev, {
            id: data.id, categoryId: data.category_id, title: data.title,
            amount: Number(data.amount), date: data.date, time: data.time,
            description: data.description, isRecurring: data.is_recurring,
            frequency: data.frequency as Frequency | null, isArchived: data.is_archived,
          }]);
          showToast('Income source added successfully.');
          setScreen({ name: 'categories' });
        }

      } else if (screen.name === 'edit') {
        const { error } = await supabase
          .from('income_sources')
          .update({
            category_id:  vals.categoryId,
            title:        vals.title.trim(),
            amount:       parseFloat(vals.amount) || 0,
            date:         vals.date,
            description:  vals.description.trim(),
            is_recurring: vals.isRecurring,
            frequency:    vals.isRecurring ? vals.frequency : null,
          })
          .eq('id', screen.incomeId);

        if (!error) {
          setIncome(prev => prev.map(i =>
            i.id === screen.incomeId
              ? { ...i, categoryId: vals.categoryId, title: vals.title.trim(), amount: parseFloat(vals.amount) || 0, date: vals.date, description: vals.description.trim(), isRecurring: vals.isRecurring, frequency: vals.isRecurring ? vals.frequency : null }
              : i,
          ));
          showToast('Income source updated successfully.');
          setScreen({ name: 'categories' });
        }
      }

      setSaving(false);
    });
  };

  const handleArchiveCategory = (categoryId: string) => {
    showConfirm('Are you sure you want to archive this Income Category?', async () => {
      hideConfirm();
      const { error } = await supabase.from('income_categories').update({ is_archived: true }).eq('id', categoryId);
      if (!error) {
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: true } : c));
        showToast('Income category archived successfully.');
        setScreen({ name: 'categories' });
      }
    });
  };

  const handleRestore = (categoryId: string) => {
    showConfirm('Are you sure you want to restore this Income Category?', async () => {
      hideConfirm();
      const { error } = await supabase.from('income_categories').update({ is_archived: false }).eq('id', categoryId);
      if (!error) {
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: false } : c));
        showToast('Income category restored successfully.');
      }
    });
  };

  const handleNewCategory = async (label: string, icon: IoniconName) => {
    const { data, error } = await supabase
      .from('income_categories')
      .insert({ user_id: userIdRef.current, label, icon })
      .select()
      .single();

    if (!error && data) {
      const newCat: Category = { id: data.id, label: data.label, icon: data.icon as IoniconName, isArchived: false };
      setCategories(prev => [...prev, newCat]);
      showToast(`Category "${label}" created.`);
    }
  };

  // ── Form Initial Values ───────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);

  const addInitial = (): IncomeFormValues => ({
    date: today,
    categoryId: screen.name === 'add' ? (screen.prefillCategoryId ?? '') : '',
    amount: '', title: '', description: '', isRecurring: false, frequency: 'Monthly',
  });

  const editInitial = (): IncomeFormValues => {
    if (screen.name !== 'edit') return addInitial();
    const inc = income.find(i => i.id === screen.incomeId);
    if (!inc) return addInitial();
    return {
      date: inc.date, categoryId: inc.categoryId, amount: inc.amount.toString(),
      title: inc.title, description: inc.description,
      isRecurring: inc.isRecurring, frequency: inc.frequency ?? 'Monthly',
    };
  };

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: theme.headerBg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#fff" size="large" />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen.name) {
      case 'categories':
        return (
          <CategoriesScreen
            categories={categories} income={income} totalIncome={totalIncome}
            onSelectCategory={id => setScreen({ name: 'detail', categoryId: id })}
            onAddCategory={() => setShowNewCat(true)}
            onViewArchived={() => setScreen({ name: 'archived' })}
            theme={theme}
          />
        );

      case 'detail': {
        const cat = categories.find(c => c.id === screen.categoryId);
        if (!cat) return null;
        return (
          <CategoryDetailScreen
            category={cat} income={income} totalIncome={totalIncome}
            onBack={() => setScreen({ name: 'categories' })}
            onAdd={() => setScreen({ name: 'add', prefillCategoryId: cat.id })}
            onEditIncome={id => setScreen({ name: 'edit', incomeId: id })}
            theme={theme}
          />
        );
      }

      case 'add':
        return (
          <IncomeFormScreen
            key={`add-${screen.prefillCategoryId ?? 'none'}`}
            initial={addInitial()} categories={categories} screenTitle="Add Income Source" saving={saving}
            onBack={() => screen.prefillCategoryId ? setScreen({ name: 'detail', categoryId: screen.prefillCategoryId }) : setScreen({ name: 'categories' })}
            onSave={handleSave} theme={theme}
          />
        );

      case 'edit': {
        const inc = income.find(i => i.id === screen.incomeId);
        return (
          <IncomeFormScreen
            key={`edit-${screen.incomeId}`}
            initial={editInitial()} categories={categories} screenTitle="Edit Income Source" isEdit saving={saving}
            onBack={() => { const catId = inc?.categoryId; catId ? setScreen({ name: 'detail', categoryId: catId }) : setScreen({ name: 'categories' }); }}
            onSave={handleSave}
            onArchive={() => { const catId = inc?.categoryId; if (catId) handleArchiveCategory(catId); }}
            theme={theme}
          />
        );
      }

      case 'archived':
        return (
          <ArchivedScreen
            categories={categories} totalIncome={totalIncome}
            onBack={() => setScreen({ name: 'categories' })}
            onRestore={handleRestore} theme={theme}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />
      {renderScreen()}
      <ConfirmModal state={confirm} onCancel={hideConfirm} theme={theme} />
      <NewCategoryModal visible={showNewCat} onClose={() => setShowNewCat(false)} onCreate={handleNewCategory} theme={theme} />
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

  hint: { fontFamily: Font.bodyRegular, fontSize: 13, color: '#888', marginBottom: 16 },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, marginBottom: 24 },
  catCard:     { width: '30%', alignItems: 'center', marginBottom: 4 },
  catIcon:     { width: 76, height: 76, borderRadius: 20, backgroundColor: '#115533', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIconMore: { backgroundColor: 'rgba(17,85,51,0.12)' },
  catLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  catCount:    { fontFamily: Font.bodyRegular, fontSize: 11, color: '#888', marginTop: 2 },

  archivedLink:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  archivedLinkTxt: { fontFamily: Font.bodyMedium, fontSize: 13, color: '#4A8A6A' },

  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthLabel:  { fontFamily: Font.headerBold, fontSize: 16, color: '#1A1A1A' },

  incRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  incRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  incIcon:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#115533', alignItems: 'center', justifyContent: 'center' },
  incTitle:     { fontFamily: Font.bodySemiBold, fontSize: 15, color: '#1A1A1A', marginBottom: 3 },
  incMeta:      { fontFamily: Font.bodyRegular, fontSize: 11, color: '#999' },
  incAmt:       { fontFamily: Font.bodySemiBold, fontSize: 13, color: '#115533' },

  addBtnWrapper: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  addBtn:        { backgroundColor: '#1B7A4A', borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  addBtnTxt:     { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },

  empty:    { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyTxt: { fontFamily: Font.bodyRegular, fontSize: 14, color: '#aaa', marginTop: 12 },

  formScroll:  { flex: 1, backgroundColor: '#EDF7F1' },
  formContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  label:       { fontFamily: Font.bodyMedium, fontSize: 14, color: '#1A1A1A', marginBottom: 8, marginTop: 16 },
  fieldRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F7EF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
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

  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#115533', alignItems: 'center', justifyContent: 'center' },

  archiveRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  archiveRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  restoreBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#1B7A4A' },
  restoreTxt:       { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1B7A4A' },

  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconOpt:       { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: '#115533', alignItems: 'center', justifyContent: 'center' },
  iconOptActive: { backgroundColor: '#115533', borderColor: '#115533' },

  toast:    { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#115533', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  toastTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#fff' },
});
