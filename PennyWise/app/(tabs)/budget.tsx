import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { getNavTarget, clearNavTarget } from '@/lib/activityNavTarget';
import DatePickerModal from '@/components/DatePickerModal';
import ConfirmModal from '@/components/ConfirmModal';
import ErrorModal from '@/components/ErrorModal';
import SlideTabBar from '@/components/SlideTabBar';
import { logActivity, ACTION, ENTITY } from '@/lib/logActivity';
import { sfx } from '@/lib/sfx';
import { loadingBar } from '@/components/GlobalLoadingBar';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
import NotificationBell from '@/components/NotificationBell';
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
import { DraftSaveIndicator } from '@/components/DraftSaveIndicator';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import type { Theme } from '@/contexts/AppTheme';
import { useFormDraft } from '@/hooks/useFormDraft';
import { supabase } from '@/lib/supabase';
import { DataCache } from '@/lib/dataCache';
import { sanitizeCategoryLabel, sanitizeTitle, sanitizeDescription, parseAmount } from '@/lib/sanitize';
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
  | { name: 'categories' }
  | { name: 'detail';   categoryId: string }
  | { name: 'add';      prefillCategoryId?: string }
  | { name: 'edit';     expenseId: string };

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

function fmtMoney(raw: string): string {
  const clean = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const [whole, decimal] = clean.split('.');
  const formatted = (whole || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtDateShort = (iso: string) => { const [,m,d] = iso.split('-').map(Number); return `${MONTHS[m-1]} ${d}`; };
const fmt12h = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${ampm}`; };
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
  onBack,
  theme,
}: {
  title: string;
  totalExpenses: number;
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
        <NotificationBell style={[bh.iconBtn, { backgroundColor: theme.iconBtnBg }]} iconColor={theme.iconBtnColor} />
      </View>

      <View style={[bh.card, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)', borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)' }]}>
        <View style={bh.balRow}>
          <View style={{ flex: 1 }}>
            <View style={bh.lblRow}>
              <Ionicons name="trending-down-outline" size={11} color={theme.textSecondary} />
              <Text style={[bh.lbl, { color: theme.textSecondary }]}> Total Expenses</Text>
            </View>
            <Text style={[bh.amt, { color: '#E05858' }]}>{fmtAmt(totalExpenses)}</Text>
          </View>
          <View style={[bh.divider, { backgroundColor: theme.divider }]} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={bh.lblRow}>
              <Ionicons name="wallet-outline" size={11} color={theme.textSecondary} />
              <Text style={[bh.lbl, { color: theme.textSecondary }]}> Expense Categories</Text>
            </View>
            <Text style={[bh.amt, { color: theme.textPrimary }]}>Active</Text>
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
        <NotificationBell style={[fh.iconBtn, { backgroundColor: theme.iconBtnBg }]} iconColor={theme.iconBtnColor} />
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
  'home-outline',          'cart-outline',         'car-outline',          'restaurant-outline',
  'flash-outline',         'medkit-outline',        'school-outline',       'phone-portrait-outline',
  'shirt-outline',         'game-controller-outline','airplane-outline',    'cafe-outline',
  'wifi-outline',          'tv-outline',            'fitness-outline',      'build-outline',
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
  const [label, setLabel]       = useState('');
  const [icon, setIcon]         = useState<IoniconName>('home-outline');
  const [nameError, setNameError] = useState(false);

  const handleCreate = () => {
    if (!label.trim()) { setNameError(true); return; }
    onCreate(label.trim(), icon);
    setLabel('');
    setIcon('home-outline');
    setNameError(false);
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
              <Text style={[s.label, { color: nameError ? '#E05555' : theme.textPrimary }]}>
                Category Name
              </Text>
              <Text style={s.hint}>e.g. Rent, Groceries, Transport, Utilities…</Text>
              <View style={[s.fieldRow, { marginBottom: 4 }, nameError && { borderWidth: 1.5, borderColor: '#E05555', backgroundColor: 'rgba(224,85,85,0.06)' }]}>
                <Ionicons name="tag-outline" size={16} color={nameError ? '#E0908A' : '#aaa'} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.fieldTxt, { flex: 1 }]}
                  value={label}
                  onChangeText={t => { setLabel(t); if (nameError) setNameError(false); }}
                  placeholder="e.g. Rent, Groceries, Transport"
                  placeholderTextColor={nameError ? '#E0908A' : '#aaa'}
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
                    <Ionicons name={ic} size={22} color={icon === ic ? '#fff' : '#2A7E8F'} />
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

// ── EditCategoryModal ─────────────────────────────────────────────────────────
function EditCategoryModal({
  visible, category, onClose, onSave, theme,
}: {
  visible: boolean; category: Category | null; onClose: () => void;
  onSave: (id: string, label: string, icon: IoniconName) => void; theme: Theme;
}) {
  const [label, setLabel] = useState('');
  const [icon, setIcon]   = useState<IoniconName>('star-outline');

  useEffect(() => {
    if (category) { setLabel(category.label); setIcon(category.icon); }
  }, [category?.id]);

  const handleSave = () => {
    if (!label.trim() || !category) return;
    onSave(category.id, label.trim(), icon);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={ncm.overlay} onPress={onClose}>
          <Pressable style={[ncm.card, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
            <Text style={[pk.heading, { color: theme.textPrimary }]}>Edit Category</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[s.label, { color: theme.textPrimary }]}>Category Name</Text>
              <View style={[s.fieldRow, { marginBottom: 4, backgroundColor: theme.inputBg }]}>
                <Ionicons name="tag-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Rent, Groceries, Transport"
                  placeholderTextColor="#aaa"
                />
              </View>
              <Text style={[s.label, { color: theme.textPrimary }]}>Icon</Text>
              <View style={s.iconGrid}>
                {NEW_CAT_ICONS.map(ic => (
                  <TouchableOpacity key={ic} style={[s.iconOpt, icon === ic && s.iconOptActive]} onPress={() => setIcon(ic)} activeOpacity={0.8}>
                    <Ionicons name={ic} size={22} color={icon === ic ? '#fff' : '#2A7E8F'} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[s.saveBtn, { marginTop: 20, marginBottom: 8 }]} onPress={handleSave} activeOpacity={0.9}>
                <Text style={s.saveBtnTxt}>Save Changes</Text>
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
  categories, expenses, totalExpenses,
  initialTab,
  onSelectCategory, onAddCategory,
  onEditCategory, onArchiveCategory, onRestoreCategory, onDeleteCategory,
  theme,
}: {
  categories: Category[]; expenses: ExpenseEntry[];
  totalExpenses: number;
  initialTab?: 'Active' | 'Archived';
  onSelectCategory: (id: string) => void; onAddCategory: () => void;
  onEditCategory: (id: string) => void; onArchiveCategory: (id: string) => void;
  onRestoreCategory: (id: string) => void; onDeleteCategory: (id: string) => void;
  theme: Theme;
}) {
  const [tab, setTab]           = useState<'Active' | 'Archived'>(initialTab ?? 'Active');
  const [kebabCatId, setKebabId] = useState<string | null>(null);
  const active                  = categories.filter(c => !c.isArchived);
  const archived                = categories.filter(c => c.isArchived);
  const bodyAnim                = useEntranceAnim();
  const kebabCat                = kebabCatId ? categories.find(c => c.id === kebabCatId) : null;

  return (
    <>
      <BalanceHeader title="Expense Categories" totalExpenses={totalExpenses} theme={theme} />
      <Animated.View style={[{ flex: 1 }, bodyAnim]}>
        <SlideTabBar
          tabs={['Active', 'Archived']}
          active={tab}
          onChange={(t) => setTab(t as 'Active' | 'Archived')}
          trackColor={theme.isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}
          activeColor="#1B7A4A"
          inactiveTextColor={theme.textMuted as string}
          style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 4 }}
        />
        <ScrollView style={[s.white, { backgroundColor: theme.cardBg }]} contentContainerStyle={s.whiteContent} showsVerticalScrollIndicator={false}>
          {tab === 'Active' ? (
            <>
              <View style={s.grid}>
                {active.map(cat => {
                  const count = expenses.filter(e => e.categoryId === cat.id && !e.isArchived).length;
                  return (
                    <View key={cat.id} style={s.catCard}>
                      <View style={{ position: 'relative' }}>
                        <TouchableOpacity style={s.catIcon} onPress={() => onSelectCategory(cat.id)} activeOpacity={0.85}>
                          <Ionicons name={cat.icon} size={28} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.kebabBtn}
                          onPress={() => setKebabId(cat.id)}
                          activeOpacity={0.75}
                          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                        >
                          <Ionicons name="ellipsis-vertical" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <Text style={[s.catLabel, { color: theme.textPrimary }]}>{cat.label}</Text>
                      {count > 0 && <Text style={[s.catCount, { color: theme.textMuted }]}>{count} item{count !== 1 ? 's' : ''}</Text>}
                    </View>
                  );
                })}
                <TouchableOpacity style={s.catCard} onPress={onAddCategory} activeOpacity={0.85}>
                  <View style={[s.catIcon, s.catIconMore]}>
                    <Ionicons name="add" size={32} color="#2A7E8F" />
                  </View>
                  <Text style={[s.catLabel, { color: theme.textPrimary }]}>More</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {archived.length === 0 && (
                <View style={s.empty}>
                  <Ionicons name="archive-outline" size={48} color="#D0D0D0" />
                  <Text style={[s.emptyTxt, { color: theme.textMuted }]}>No archived categories</Text>
                </View>
              )}
              {archived.map((cat, idx) => (
                <View key={cat.id} style={[s.archiveRow, idx < archived.length - 1 && s.archiveRowBorder, idx < archived.length - 1 && { borderBottomColor: theme.divider }]}>
                  <View style={[s.expIcon, { backgroundColor: '#9AA5B4' }]}>
                    <Ionicons name={cat.icon} size={20} color="#fff" />
                  </View>
                  <Text style={[s.expTitle, { flex: 1, color: theme.textPrimary }]}>{cat.label}</Text>
                  <TouchableOpacity
                    style={s.rowKebabBtn}
                    onPress={() => setKebabId(cat.id)}
                    activeOpacity={0.75}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted as string} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </Animated.View>

      {/* Category kebab action-sheet */}
      <Modal visible={kebabCatId !== null} transparent animationType="fade">
        <Pressable style={s.kebabOverlay} onPress={() => setKebabId(null)}>
          <Pressable style={[s.kebabSheet, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
            {kebabCat && (
              <>
                <View style={s.kebabHeader}>
                  <View style={s.kebabCatIcon}>
                    <Ionicons name={kebabCat.icon} size={20} color="#fff" />
                  </View>
                  <Text style={[s.kebabCatName, { color: theme.textPrimary }]}>{kebabCat.label}</Text>
                </View>
                <View style={[s.kebabDivider, { backgroundColor: theme.divider }]} />
                <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onEditCategory(kebabCatId!); }} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={20} color="#1B7A4A" />
                  <Text style={[s.kebabItemTxt, { color: theme.textPrimary }]}>Edit</Text>
                </TouchableOpacity>
                {kebabCat.isArchived ? (
                  <>
                    <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onRestoreCategory(kebabCatId!); }} activeOpacity={0.8}>
                      <Ionicons name="refresh-outline" size={20} color="#3ECBA8" />
                      <Text style={[s.kebabItemTxt, { color: '#3ECBA8' }]}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onDeleteCategory(kebabCatId!); }} activeOpacity={0.8}>
                      <Ionicons name="trash-outline" size={20} color="#E05858" />
                      <Text style={[s.kebabItemTxt, { color: '#E05858' }]}>Delete Permanently</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onArchiveCategory(kebabCatId!); }} activeOpacity={0.8}>
                    <Ionicons name="archive-outline" size={20} color="#E05858" />
                    <Text style={[s.kebabItemTxt, { color: '#E05858' }]}>Archive</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── CategoryDetailScreen ──────────────────────────────────────────────────────
function CategoryDetailScreen({
  category, expenses, totalExpenses,
  initialTab,
  onBack, onAdd, onEditExpense, onArchiveExpense, onRestoreExpense, onDeleteExpense, theme,
}: {
  category: Category; expenses: ExpenseEntry[];
  totalExpenses: number;
  initialTab?: 'Active' | 'Archived';
  onBack: () => void; onAdd: () => void; onEditExpense: (id: string) => void;
  onArchiveExpense: (id: string) => void; onRestoreExpense: (id: string) => void;
  onDeleteExpense: (id: string) => void; theme: Theme;
}) {
  const [tab, setTab]           = useState<'Active' | 'Archived'>(initialTab ?? 'Active');
  const [kebabExpId, setKebabId] = useState<string | null>(null);

  const catExpenses    = expenses.filter(e => e.categoryId === category.id);
  const activeExpenses = catExpenses.filter(e => !e.isArchived);
  const archExpenses   = catExpenses.filter(e => e.isArchived);
  const activeGrouped  = groupByMonth(activeExpenses);
  const archGrouped    = groupByMonth(archExpenses);
  const kebabExp       = kebabExpId ? catExpenses.find(e => e.id === kebabExpId) : null;

  const bodyAnim    = useEntranceAnim();
  const addBtnScale = useSharedValue(1);
  const addBtnAnim  = useAnimatedStyle(() => ({ transform: [{ scale: addBtnScale.value }] }));

  const renderExpRow = (exp: ExpenseEntry, idx: number, items: ExpenseEntry[]) => (
    <View
      key={exp.id}
      style={[s.expRow, idx < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}
    >
      <View style={[s.expIcon, { backgroundColor: '#2A7E8F' }]}>
        <Ionicons name={category.icon} size={20} color="#fff" />
      </View>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => onEditExpense(exp.id)} activeOpacity={0.85}>
        <Text style={[s.expTitle, { color: theme.textPrimary }]}>{exp.title}</Text>
        <Text style={[s.expMeta, { color: theme.textMuted }]}>
          {fmt12h(exp.time)} · {fmtDateShort(exp.date)}{exp.isRecurring ? ` · ${exp.frequency}` : ''}
        </Text>
      </TouchableOpacity>
      <Text style={s.expAmt}>-{fmtAmt(exp.amount)}</Text>
      <TouchableOpacity
        style={s.rowKebabBtn}
        onPress={() => setKebabId(exp.id)}
        activeOpacity={0.75}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted as string} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <BalanceHeader title={category.label} totalExpenses={totalExpenses} onBack={onBack} theme={theme} />
      <Animated.View style={[s.white, { flex: 1, backgroundColor: theme.cardBg }, bodyAnim]}>
        <SlideTabBar
          tabs={['Active', 'Archived']}
          active={tab}
          onChange={(t) => setTab(t as 'Active' | 'Archived')}
          trackColor={theme.isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0'}
          activeColor="#1B7A4A"
          inactiveTextColor={theme.textMuted as string}
          style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 4 }}
        />
        <ScrollView contentContainerStyle={[s.whiteContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          {tab === 'Active' ? (
            <>
              {activeGrouped.length === 0 && (
                <View style={s.empty}>
                  <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
                  <Text style={[s.emptyTxt, { color: theme.textMuted }]}>No expense entries yet</Text>
                </View>
              )}
              {activeGrouped.map(group => (
                <View key={group.key} style={{ marginBottom: 8 }}>
                  <View style={s.monthHeader}>
                    <Text style={[s.monthLabel, { color: theme.textPrimary }]}>{group.label}</Text>
                    <Ionicons name="calendar-outline" size={20} color="#1B7A4A" />
                  </View>
                  {group.items.map((exp, idx) => renderExpRow(exp, idx, group.items))}
                </View>
              ))}
            </>
          ) : (
            <>
              {archExpenses.length === 0 && (
                <View style={s.empty}>
                  <Ionicons name="archive-outline" size={48} color="#D0D0D0" />
                  <Text style={[s.emptyTxt, { color: theme.textMuted }]}>No archived expenses</Text>
                </View>
              )}
              {archGrouped.map(group => (
                <View key={group.key} style={{ marginBottom: 8 }}>
                  <View style={s.monthHeader}>
                    <Text style={[s.monthLabel, { color: theme.textPrimary }]}>{group.label}</Text>
                    <Ionicons name="calendar-outline" size={20} color="#1B7A4A" />
                  </View>
                  {group.items.map((exp, idx) => renderExpRow(exp, idx, group.items))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
        {tab === 'Active' && (
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
        )}
      </Animated.View>

      {/* Expense kebab action-sheet */}
      <Modal visible={kebabExpId !== null} transparent animationType="fade">
        <Pressable style={s.kebabOverlay} onPress={() => setKebabId(null)}>
          <Pressable style={[s.kebabSheet, { backgroundColor: theme.modalBg }]} onPress={() => {}}>
            {kebabExp && (
              <>
                <View style={s.kebabHeader}>
                  <View style={s.kebabCatIcon}>
                    <Ionicons name={category.icon} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.kebabCatName, { color: theme.textPrimary }]}>{kebabExp.title}</Text>
                    <Text style={[s.expMeta, { color: theme.textMuted }]}>{fmtAmt(kebabExp.amount)}</Text>
                  </View>
                </View>
                <View style={[s.kebabDivider, { backgroundColor: theme.divider }]} />
                <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onEditExpense(kebabExpId!); }} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={20} color="#1B7A4A" />
                  <Text style={[s.kebabItemTxt, { color: theme.textPrimary }]}>Edit</Text>
                </TouchableOpacity>
                {kebabExp.isArchived ? (
                  <>
                    <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onRestoreExpense(kebabExpId!); }} activeOpacity={0.8}>
                      <Ionicons name="refresh-outline" size={20} color="#3ECBA8" />
                      <Text style={[s.kebabItemTxt, { color: '#3ECBA8' }]}>Restore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onDeleteExpense(kebabExpId!); }} activeOpacity={0.8}>
                      <Ionicons name="trash-outline" size={20} color="#E05858" />
                      <Text style={[s.kebabItemTxt, { color: '#E05858' }]}>Delete Permanently</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={s.kebabItem} onPress={() => { setKebabId(null); onArchiveExpense(kebabExpId!); }} activeOpacity={0.8}>
                    <Ionicons name="archive-outline" size={20} color="#E05858" />
                    <Text style={[s.kebabItemTxt, { color: '#E05858' }]}>Archive</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── ExpenseFormScreen ─────────────────────────────────────────────────────────
const EXPENSE_DRAFT_KEY = 'draft:add-expense';

function ExpenseFormScreen({
  initial, categories, screenTitle, isEdit, saving, onBack, onSave, theme,
}: {
  initial: ExpenseFormValues; categories: Category[]; screenTitle: string;
  isEdit?: boolean; saving?: boolean;
  onBack: () => void; onSave: (vals: ExpenseFormValues) => void; theme: Theme;
}) {
  // Use null key for edits so existing data is never overwritten by a draft
  const {
    draft: vals,
    setDraftField,
    saveStatus,
    hasSavedDraft,
    discardDraft,
  } = useFormDraft<ExpenseFormValues>(
    isEdit ? null : EXPENSE_DRAFT_KEY,
    initial,
  );

  const [showResumeBanner, setShowResumeBanner] = useState(true);
  const [showCatPicker, setCat]   = useState(false);
  const [showFreqPicker, setFreq] = useState(false);
  const [showDatePicker, setDatePicker] = useState(false);
  const bodyAnim   = useEntranceAnim();
  const btnScale   = useSharedValue(1);
  const btnStyle   = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) =>
    setDraftField(key, value);

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
            {/* Resume banner — only for new expenses with a saved draft */}
            {!isEdit && hasSavedDraft && showResumeBanner && (
              <View style={[s.resumeBanner, { backgroundColor: theme.isDark ? '#1A3B2C' : '#EDF7F1', borderColor: '#1B7A4A' }]}>
                <Ionicons name="bookmark-outline" size={15} color="#1B7A4A" />
                <Text style={[s.resumeText, { color: theme.textPrimary }]}>Resuming from where you left off</Text>
                <TouchableOpacity onPress={async () => { await discardDraft(); setShowResumeBanner(false); }} hitSlop={8}>
                  <Text style={s.resumeDiscard}>Start fresh</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Auto-save indicator */}
            {!isEdit && <DraftSaveIndicator status={saveStatus} />}

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
              <Ionicons name="cash-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
                value={vals.amount}
                onChangeText={v => set('amount', fmtMoney(v))}
                keyboardType="decimal-pad"
                placeholder="e.g. 1,500.00"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Title */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Expense Title</Text>
            <View style={[s.fieldRow, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="pencil-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={[s.fieldTxt, { flex: 1, color: theme.textPrimary }]}
                value={vals.title}
                onChangeText={v => set('title', v)}
                placeholder="e.g. Monthly Rent"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Description */}
            <Text style={[s.label, { color: theme.textPrimary }]}>Description (optional)</Text>
            <View style={[s.fieldRow, { alignItems: 'flex-start', minHeight: 100, backgroundColor: theme.inputBg }]}>
              <Ionicons name="document-text-outline" size={16} color="#aaa" style={{ marginRight: 8, marginTop: 2 }} />
              <TextInput
                style={[s.fieldTxt, { flex: 1, textAlignVertical: 'top', paddingTop: 2, minHeight: 80, color: theme.textPrimary }]}
                value={vals.description}
                onChangeText={v => set('description', v)}
                placeholder="e.g. Paid at SM Mall"
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

// ── Root Screen ───────────────────────────────────────────────────────────────
export default function ManageExpenseScreen() {
  const { theme } = useAppTheme();
  const userIdRef = useRef('');

  const [screen,      setScreen]      = useState<Screen>({ name: 'categories' });
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [expenses,    setExpenses]    = useState<ExpenseEntry[]>([]);
  const [budgetLimit, setBudgetLimit] = useState(20000);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [confirm,     setConfirm]     = useState<ConfirmState>({ visible: false, title: '', message: '', onYes: () => {} });
  const [showNewCat,  setShowNewCat]  = useState(false);
  const [editCat,     setEditCat]     = useState<Category | null>(null);
  const [toast,       setToast]       = useState('');
  const [errModal,    setErrModal]    = useState({ visible: false, title: '', message: '' });
  const [catNavKey,    setCatNavKey]    = useState(0);
  const [catNavTab,    setCatNavTab]    = useState<'Active' | 'Archived'>('Active');
  const [detailNavTab, setDetailNavTab] = useState<'Active' | 'Archived'>('Active');

  useFocusEffect(
    useCallback(() => {
      const target = getNavTarget();
      if (!target || target.tab !== 'expense') return;
      clearNavTarget();

      if (target.categoryId) {
        setDetailNavTab(target.detailTab ?? 'Active');
        setScreen({ name: 'detail', categoryId: target.categoryId! });
      } else {
        setCatNavTab(target.catTab ?? 'Active');
        setCatNavKey(k => k + 1);
        setScreen({ name: 'categories' });
      }
    }, []),
  );

  // ── Load from Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData(userId: string) {
      try {
        const [sources, cats, exps] = await Promise.all([
          DataCache.fetchIncomeSources(userId),
          DataCache.fetchExpenseCategories(userId),
          DataCache.fetchExpenses(userId),
        ]);

        const totalIncome = sources
          .filter(r => !r.is_archived)
          .reduce((sum, r) => sum + Number(r.amount), 0);
        setBudgetLimit(totalIncome);

        setCategories(cats.map(c => ({
          id: c.id, label: c.label, icon: c.icon as IoniconName, isArchived: c.is_archived,
        })));

        setExpenses(exps.map(e => ({
          id: e.id, categoryId: e.category_id, title: e.title,
          amount: Number(e.amount), date: e.date, time: e.time,
          description: e.description, isRecurring: e.is_recurring,
          frequency: e.frequency as Frequency | null, isArchived: e.is_archived,
        })));
      } catch (err: any) {
        showError('Failed to Load', err?.message ?? 'Could not load expenses. Please try again.');
      } finally {
        setLoading(false);
      }
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
  const showError   = (title: string, msg: string) => setErrModal({ visible: true, title, message: msg });

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
        loadingBar.start();

      if (screen.name === 'add') {
        const tempId = `temp-${Date.now()}`;
        const now = new Date().toTimeString().slice(0, 5);
        const cleanTitle = sanitizeTitle(vals.title);
        const amount     = parseAmount(vals.amount);
        const cleanDesc  = sanitizeDescription(vals.description);
        const tempExp = {
          id: tempId, categoryId: vals.categoryId, title: cleanTitle,
          amount, date: vals.date, time: now, description: cleanDesc,
          isRecurring: vals.isRecurring,
          frequency: vals.isRecurring ? vals.frequency : null,
          isArchived: false,
        };

        // Optimistic: add temp item and navigate immediately
        setExpenses(prev => [...prev, tempExp]);
        sfx.coin();
        showToast('Expense added successfully.');
        AsyncStorage.removeItem(EXPENSE_DRAFT_KEY);
        setScreen({ name: 'detail', categoryId: screen.prefillCategoryId });
        loadingBar.finish();
        setSaving(false);

        const { data, error } = await supabase
          .from('expenses')
          .insert({
            user_id:      userIdRef.current,
            category_id:  vals.categoryId,
            title:        cleanTitle,
            amount,
            date:         vals.date,
            time:         now,
            description:  cleanDesc,
            is_recurring: vals.isRecurring,
            frequency:    vals.isRecurring ? vals.frequency : null,
          })
          .select()
          .single();

        if (error) {
          setExpenses(prev => prev.filter(e => e.id !== tempId));
          showError('Failed to Save Expense', error.message);
        } else if (data) {
          setExpenses(prev => prev.map(e => e.id === tempId ? {
            id: data.id, categoryId: data.category_id, title: data.title,
            amount: Number(data.amount), date: data.date, time: data.time,
            description: data.description, isRecurring: data.is_recurring,
            frequency: data.frequency as Frequency | null, isArchived: data.is_archived,
          } : e));
          DataCache.invalidateExpenses(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          const cat = categories.find(c => c.id === vals.categoryId);
          logActivity({
            user_id:     userIdRef.current!,
            action_type: ACTION.EXPENSE_ADDED,
            entity_type: ENTITY.EXPENSE,
            title:       `Expense Added: ${cleanTitle}`,
            description: `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} · ${cat?.label ?? 'Expense'}`,
            icon:        cat?.icon ?? 'receipt-outline',
          });
        }
        return;

      } else if (screen.name === 'edit') {
        const oldExp    = expenses.find(e => e.id === screen.expenseId);
        const newTitle  = sanitizeTitle(vals.title);
        const newAmount = parseAmount(vals.amount);
        const newDesc   = sanitizeDescription(vals.description);
        const catU      = categories.find(c => c.id === vals.categoryId);
        const oldCatLbl = categories.find(c => c.id === oldExp?.categoryId)?.label;
        const updatedFields = {
          categoryId: vals.categoryId, title: newTitle, amount: newAmount,
          date: vals.date, description: newDesc,
          isRecurring: vals.isRecurring,
          frequency: vals.isRecurring ? vals.frequency : null,
        };

        // Optimistic: apply update and navigate immediately
        setExpenses(prev => prev.map(e => e.id === screen.expenseId ? { ...e, ...updatedFields } : e));
        sfx.success();
        showToast('Expense updated successfully.');
        setScreen({ name: 'categories' });
        loadingBar.finish();
        setSaving(false);

        const { error } = await supabase
          .from('expenses')
          .update({
            category_id:  vals.categoryId,
            title:        newTitle,
            amount:       newAmount,
            date:         vals.date,
            description:  newDesc,
            is_recurring: vals.isRecurring,
            frequency:    vals.isRecurring ? vals.frequency : null,
          })
          .eq('id', screen.expenseId);

        if (error) {
          if (oldExp) setExpenses(prev => prev.map(e => e.id === screen.expenseId ? oldExp : e));
          showError('Failed to Update Expense', error.message);
        } else {
          DataCache.invalidateExpenses(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          const changes: string[] = [];
          if (oldExp) {
            if (oldExp.title !== newTitle)
              changes.push(`Title: "${oldExp.title}" → "${newTitle}"`);
            if (oldExp.amount !== newAmount)
              changes.push(`Amount: ${fmtAmt(oldExp.amount)} → ${fmtAmt(newAmount)}`);
            if (oldExp.categoryId !== vals.categoryId)
              changes.push(`Category: ${oldCatLbl ?? '?'} → ${catU?.label ?? '?'}`);
            if (oldExp.date !== vals.date)
              changes.push(`Date: ${fmtDateShort(oldExp.date)} → ${fmtDateShort(vals.date)}`);
            if (oldExp.isRecurring !== vals.isRecurring)
              changes.push(vals.isRecurring ? 'Set to recurring' : 'Recurring removed');
            else if (oldExp.isRecurring && oldExp.frequency !== vals.frequency)
              changes.push(`Frequency: ${oldExp.frequency} → ${vals.frequency}`);
          }
          logActivity({
            user_id:     userIdRef.current!,
            action_type: ACTION.EXPENSE_UPDATED,
            entity_type: ENTITY.EXPENSE,
            title:       `Expense Updated: ${newTitle}`,
            description: changes.length > 0 ? changes.join(' · ') : `${fmtAmt(newAmount)} · ${catU?.label ?? 'Expense'}`,
            icon:        catU?.icon ?? 'receipt-outline',
          });
        }
        return;
      }

      loadingBar.finish();
      setSaving(false);
      },
    });
  };

  const handleSaveCategory = async (id: string, label: string, icon: IoniconName) => {
    const cleanLabel = sanitizeCategoryLabel(label);
    const oldCat = categories.find(c => c.id === id);

    // Optimistic
    setCategories(prev => prev.map(c => c.id === id ? { ...c, label: cleanLabel, icon } : c));
    sfx.success();
    showToast('Category updated successfully.');

    const { error } = await supabase.from('expense_categories').update({ label: cleanLabel, icon }).eq('id', id);
    if (error) {
      if (oldCat) setCategories(prev => prev.map(c => c.id === id ? oldCat : c));
      showError('Failed to Update Category', error.message);
    } else {
      DataCache.invalidateExpenseCategories(userIdRef.current!);
      DataCache.invalidateDashboard(userIdRef.current!);
      const changes: string[] = [];
      if (oldCat?.label !== cleanLabel) changes.push(`Name: "${oldCat?.label}" → "${cleanLabel}"`);
      if (oldCat?.icon  !== icon)       changes.push('Icon changed');
      logActivity({
        user_id:     userIdRef.current!,
        action_type: ACTION.EXPENSE_CATEGORY_UPDATED,
        entity_type: ENTITY.EXPENSE_CATEGORY,
        title:       `Category Updated: ${cleanLabel}`,
        description: changes.length > 0 ? changes.join(' · ') : 'Details updated',
        icon,
      });
    }
  };

  const handleArchiveCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    showConfirm({
      title: 'Archive Category?', message: 'Are you sure you want to archive this Expense Category?',
      icon: 'archive-outline', confirmLabel: 'Archive', confirmColor: '#F59E0B',
      onYes: async () => {
        hideConfirm();
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: true } : c));
        sfx.warning();
        showToast('Expense category archived.');

        const { error } = await supabase.from('expense_categories').update({ is_archived: true }).eq('id', categoryId);
        if (error) {
          setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: false } : c));
          showError('Failed to Archive Category', error.message);
        } else {
          DataCache.invalidateExpenseCategories(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          logActivity({
            user_id: userIdRef.current!, action_type: ACTION.EXPENSE_CATEGORY_ARCHIVED,
            entity_type: ENTITY.EXPENSE_CATEGORY,
            title: `Category Archived: ${cat?.label ?? 'Expense Category'}`,
            description: 'Expense category and its entries archived.',
            icon: cat?.icon ?? 'archive-outline',
          });
        }
      },
    });
  };

  const handleRestoreCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    showConfirm({
      title: 'Restore Category?', message: 'Are you sure you want to restore this Expense Category?',
      icon: 'refresh-outline', confirmLabel: 'Restore', confirmColor: '#3ECBA8',
      onYes: async () => {
        hideConfirm();
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: false } : c));
        sfx.success();
        showToast('Expense category restored.');

        const { error } = await supabase.from('expense_categories').update({ is_archived: false }).eq('id', categoryId);
        if (error) {
          setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isArchived: true } : c));
          showError('Failed to Restore Category', error.message);
        } else {
          DataCache.invalidateExpenseCategories(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          logActivity({
            user_id: userIdRef.current!, action_type: ACTION.EXPENSE_CATEGORY_RESTORED,
            entity_type: ENTITY.EXPENSE_CATEGORY,
            title: `Category Restored: ${cat?.label ?? 'Expense Category'}`,
            description: 'Expense category restored from archive.',
            icon: cat?.icon ?? 'refresh-outline',
          });
        }
      },
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    const removedExpenses = expenses.filter(e => e.categoryId === categoryId);
    showConfirm({
      title: 'Delete Permanently?',
      message: `This will permanently delete "${cat?.label ?? 'this category'}" and all its expenses. This cannot be undone.`,
      icon: 'trash-outline', confirmLabel: 'Delete', confirmColor: '#E05858',
      onYes: async () => {
        hideConfirm();
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setExpenses(prev => prev.filter(e => e.categoryId !== categoryId));
        sfx.error();
        showToast('Category permanently deleted.');

        const { error } = await supabase.from('expense_categories').delete().eq('id', categoryId);
        if (error) {
          if (cat) setCategories(prev => [...prev, cat]);
          setExpenses(prev => [...prev, ...removedExpenses]);
          showError('Failed to Delete Category', error.message);
        } else {
          DataCache.invalidateExpenseCategories(userIdRef.current!);
          DataCache.invalidateExpenses(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          logActivity({
            user_id: userIdRef.current!, action_type: ACTION.EXPENSE_CATEGORY_DELETED,
            entity_type: ENTITY.EXPENSE_CATEGORY,
            title: `Category Deleted: ${cat?.label ?? 'Expense Category'}`,
            description: 'Expense category and all its entries permanently deleted.',
            icon: cat?.icon ?? 'trash-outline',
          });
        }
      },
    });
  };

  const handleArchiveExpense = (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    showConfirm({
      title: 'Archive Expense?', message: `Archive "${exp?.title ?? 'this expense'}"?`,
      icon: 'archive-outline', confirmLabel: 'Archive', confirmColor: '#F59E0B',
      onYes: async () => {
        hideConfirm();
        setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, isArchived: true } : e));
        sfx.warning();
        showToast('Expense archived.');

        const { error } = await supabase.from('expenses').update({ is_archived: true }).eq('id', expenseId);
        if (error) {
          setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, isArchived: false } : e));
          showError('Failed to Archive Expense', error.message);
        } else {
          DataCache.invalidateExpenses(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          const cat = categories.find(c => c.id === exp?.categoryId);
          logActivity({
            user_id: userIdRef.current!, action_type: ACTION.EXPENSE_ARCHIVED,
            entity_type: ENTITY.EXPENSE,
            title: `Expense Archived: ${exp?.title ?? 'Expense'}`,
            description: `${fmtAmt(exp?.amount ?? 0)} · ${cat?.label ?? 'Expense'}`,
            icon: cat?.icon ?? 'archive-outline',
          });
        }
      },
    });
  };

  const handleRestoreExpense = (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    showConfirm({
      title: 'Restore Expense?', message: `Restore "${exp?.title ?? 'this expense'}"?`,
      icon: 'refresh-outline', confirmLabel: 'Restore', confirmColor: '#3ECBA8',
      onYes: async () => {
        hideConfirm();
        setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, isArchived: false } : e));
        sfx.success();
        showToast('Expense restored.');

        const { error } = await supabase.from('expenses').update({ is_archived: false }).eq('id', expenseId);
        if (error) {
          setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, isArchived: true } : e));
          showError('Failed to Restore Expense', error.message);
        } else {
          DataCache.invalidateExpenses(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          const cat = categories.find(c => c.id === exp?.categoryId);
          logActivity({
            user_id: userIdRef.current!, action_type: ACTION.EXPENSE_RESTORED,
            entity_type: ENTITY.EXPENSE,
            title: `Expense Restored: ${exp?.title ?? 'Expense'}`,
            description: `${fmtAmt(exp?.amount ?? 0)} · ${cat?.label ?? 'Expense'}`,
            icon: cat?.icon ?? 'refresh-outline',
          });
        }
      },
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    showConfirm({
      title: 'Delete Permanently?',
      message: `This will permanently delete "${exp?.title ?? 'this expense'}". This cannot be undone.`,
      icon: 'trash-outline', confirmLabel: 'Delete', confirmColor: '#E05858',
      onYes: async () => {
        hideConfirm();
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        sfx.error();
        showToast('Expense permanently deleted.');

        const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
        if (error) {
          if (exp) setExpenses(prev => [...prev, exp]);
          showError('Failed to Delete Expense', error.message);
        } else {
          DataCache.invalidateExpenses(userIdRef.current!);
          DataCache.invalidateDashboard(userIdRef.current!);
          const cat = categories.find(c => c.id === exp?.categoryId);
          logActivity({
            user_id: userIdRef.current!, action_type: ACTION.EXPENSE_DELETED,
            entity_type: ENTITY.EXPENSE,
            title: `Expense Deleted: ${exp?.title ?? 'Expense'}`,
            description: `${fmtAmt(exp?.amount ?? 0)} · ${cat?.label ?? 'Expense'} · Permanently deleted`,
            icon: cat?.icon ?? 'trash-outline',
          });
        }
      },
    });
  };

  const handleNewCategory = async (label: string, icon: IoniconName) => {
    const cleanLabel = sanitizeCategoryLabel(label);
    const tempId = `temp-${Date.now()}`;

    // Optimistic: add temp category and navigate immediately
    setCategories(prev => [...prev, { id: tempId, label: cleanLabel, icon, isArchived: false }]);
    sfx.success();
    showToast(`Category "${cleanLabel}" created.`);
    setScreen({ name: 'categories' });

    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ user_id: userIdRef.current, label: cleanLabel, icon })
      .select()
      .single();

    if (error) {
      setCategories(prev => prev.filter(c => c.id !== tempId));
      showError('Failed to Create Category', error.message);
    } else if (data) {
      setCategories(prev => prev.map(c => c.id === tempId
        ? { id: data.id, label: data.label, icon: data.icon as IoniconName, isArchived: false }
        : c,
      ));
      DataCache.invalidateExpenseCategories(userIdRef.current!);
      DataCache.invalidateDashboard(userIdRef.current!);
      logActivity({
        user_id:     userIdRef.current!,
        action_type: ACTION.EXPENSE_CATEGORY_CREATED,
        entity_type: ENTITY.EXPENSE_CATEGORY,
        title:       `New Expense Category: ${label}`,
        description: 'Expense category created.',
        icon,
      });
    }
  };

  // ── Form Initial Values ───────────────────────────────────────────────────
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

      case 'categories':
        return (
          <CategoriesScreen
            key={catNavKey}
            categories={categories}
            expenses={expenses}
            totalExpenses={totalExpenses}
            initialTab={catNavTab}
            onSelectCategory={id => setScreen({ name: 'detail', categoryId: id })}
            onAddCategory={() => setShowNewCat(true)}
            onEditCategory={id => setEditCat(categories.find(c => c.id === id) ?? null)}
            onArchiveCategory={handleArchiveCategory}
            onRestoreCategory={handleRestoreCategory}
            onDeleteCategory={handleDeleteCategory}
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
            initialTab={detailNavTab}
            onBack={() => setScreen({ name: 'categories' })}
            onAdd={() => setScreen({ name: 'add', prefillCategoryId: cat.id })}
            onEditExpense={id => setScreen({ name: 'edit', expenseId: id })}
            onArchiveExpense={handleArchiveExpense}
            onRestoreExpense={handleRestoreExpense}
            onDeleteExpense={handleDeleteExpense}
            theme={theme}
          />
        );
      }

      case 'add':
        return (
          <ExpenseFormScreen
            key={`add-${screen.prefillCategoryId ?? 'none'}`}
            initial={addInitial()}
            categories={categories}
            screenTitle="New Expense"
            saving={saving}
            onBack={() => screen.prefillCategoryId ? setScreen({ name: 'detail', categoryId: screen.prefillCategoryId }) : setScreen({ name: 'categories' })}
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
                : setScreen({ name: 'categories' });
            }}
            onSave={handleSave}
            theme={theme}
          />
        );
      }

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

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal(p => ({ ...p, visible: false }))}
      />

      <NewCategoryModal
        visible={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreate={handleNewCategory}
        theme={theme}
      />

      <EditCategoryModal
        visible={editCat !== null}
        category={editCat}
        onClose={() => setEditCat(null)}
        onSave={handleSaveCategory}
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
  catIcon:     { width: 76, height: 76, borderRadius: 20, backgroundColor: '#2A7E8F', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catIconMore: { backgroundColor: 'rgba(42,126,143,0.12)' },
  catLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1A1A1A', textAlign: 'center' },
  catCount:    { fontFamily: Font.bodyRegular, fontSize: 11, color: '#888', marginTop: 2 },

  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthLabel:  { fontFamily: Font.headerBold, fontSize: 16, color: '#1A1A1A' },

  expRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  expRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  expIcon:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#2A7E8F', alignItems: 'center', justifyContent: 'center' },
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

  resumeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  resumeText:   { fontFamily: Font.bodyRegular, fontSize: 13, flex: 1 },
  resumeDiscard: { fontFamily: Font.bodySemiBold, fontSize: 12, color: '#E05858' },

  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2A7E8F', alignItems: 'center', justifyContent: 'center' },

  archiveRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  archiveRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  restoreBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#1B7A4A' },
  restoreTxt:       { fontFamily: Font.bodyMedium, fontSize: 13, color: '#1B7A4A' },

  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  iconOpt:       { width: 50, height: 50, borderRadius: 14, borderWidth: 2, borderColor: '#2A7E8F', alignItems: 'center', justifyContent: 'center' },
  iconOptActive: { backgroundColor: '#2A7E8F', borderColor: '#2A7E8F' },

  toast:    { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#115533', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  toastTxt: { fontFamily: Font.bodyMedium, fontSize: 14, color: '#fff' },

  kebabBtn:     { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  rowKebabBtn:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  kebabOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  kebabSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  kebabHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  kebabCatIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2A7E8F', alignItems: 'center', justifyContent: 'center' },
  kebabCatName: { fontFamily: Font.headerBold, fontSize: 16, flex: 1 },
  kebabDivider: { height: 1, marginBottom: 8 },
  kebabItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  kebabItemTxt: { fontFamily: Font.bodyMedium, fontSize: 15, flex: 1 },
});
