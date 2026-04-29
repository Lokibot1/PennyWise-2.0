import { useEffect, useState } from 'react';
import {
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import type { Theme } from '@/contexts/AppTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function fmt(d: Date) {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// ── Custom calendar grid (Android) ────────────────────────────────────────────
// Built in pure RN so we never touch the native Android date picker dialog.

function CustomCalendar({
  selected,
  onSelect,
  minimumDate,
  maximumDate,
  theme,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  minimumDate: Date;
  maximumDate: Date;
  theme: Theme;
}) {
  const [cursorYear,  setCursorYear]  = useState(selected.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(selected.getMonth());
  const [viewMode,    setViewMode]    = useState<'calendar' | 'year'>('calendar');
  const [yearSearch,  setYearSearch]  = useState('');

  const firstDow    = new Date(cursorYear, cursorMonth, 1).getDay();
  const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (cursorMonth === 0) { setCursorMonth(11); setCursorYear(y => y - 1); }
    else                   { setCursorMonth(m => m - 1); }
  }

  function nextMonth() {
    if (cursorMonth === 11) { setCursorMonth(0); setCursorYear(y => y + 1); }
    else                    { setCursorMonth(m => m + 1); }
  }

  const today = new Date();

  // Year selection range: from minDate year to maxDate year (default 2000-2100)
  const minYear = minimumDate.getFullYear();
  const maxYear = maximumDate.getFullYear();
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).reverse();

  if (viewMode === 'year') {
    return (
      <View style={[cal.root, { minHeight: 320 }]}>
        <View style={cal.navRow}>
          <TouchableOpacity onPress={() => { setViewMode('calendar'); setYearSearch(''); }} style={cal.navBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[cal.monthYear, { color: theme.textPrimary }]}>Select Year</Text>
          <View style={cal.navBtn} />
        </View>

        <View style={[cal.yearSearchRow, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[cal.yearInput, { color: theme.textPrimary }]}
            placeholder="Type year..."
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            value={yearSearch}
            onChangeText={v => {
              setYearSearch(v);
              if (v.length === 4) {
                const y = parseInt(v);
                if (y >= minYear && y <= maxYear) {
                  setCursorYear(y);
                  setViewMode('calendar');
                  setYearSearch('');
                }
              }
            }}
            maxLength={4}
          />
        </View>

        <ScrollView style={cal.yearList} showsVerticalScrollIndicator={false}>
          <View style={cal.yearGrid}>
            {yearOptions
              .filter(y => !yearSearch || y.toString().includes(yearSearch))
              .map(y => (
                <TouchableOpacity
                  key={y}
                  style={[
                    cal.yearItem,
                    y === cursorYear && { backgroundColor: '#1B7A4A' },
                  ]}
                  onPress={() => {
                    setCursorYear(y);
                    setViewMode('calendar');
                    setYearSearch('');
                  }}
                >
                  <Text style={[
                    cal.yearItemText,
                    { color: y === cursorYear ? '#fff' : theme.textPrimary }
                  ]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={cal.root}>
      {/* Month / year navigation */}
      <View style={cal.navRow}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12} activeOpacity={0.6} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={cal.monthYearContainer} 
          onPress={() => setViewMode('year')}
          activeOpacity={0.6}
        >
          <Text style={[cal.monthYear, { color: theme.textPrimary }]}>
            {MONTH_NAMES[cursorMonth]} {cursorYear}
          </Text>
          <Ionicons name="caret-down" size={12} color={theme.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} hitSlop={12} activeOpacity={0.6} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cal.dowRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[cal.dow, { color: theme.textMuted }]}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={cal.cell} />;

          const cellDate   = new Date(cursorYear, cursorMonth, day);
          const isSelected = sameDay(cellDate, selected);
          const isToday    = sameDay(cellDate, today);
          const isDisabled = cellDate < minimumDate || cellDate > maximumDate;

          return (
            <TouchableOpacity
              key={i}
              style={cal.cell}
              onPress={() => { if (!isDisabled) onSelect(cellDate); }}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[
                cal.dayCircle,
                isSelected && { backgroundColor: '#1B7A4A' },
                !isSelected && isToday && { borderWidth: 1.5, borderColor: '#1B7A4A' },
              ]}>
                <Text style={[
                  cal.dayText,
                  {
                    color: isDisabled
                      ? theme.textMuted
                      : isSelected
                      ? '#fff'
                      : isToday
                      ? '#1B7A4A'
                      : theme.textPrimary,
                  },
                  (isSelected || isToday) && { fontFamily: Font.bodySemiBold },
                ]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── iOS picker — native inline DateTimePicker ─────────────────────────────────

function IOSPicker({ visible, value, onConfirm, onClose, maximumDate, minimumDate }: Props) {
  const { theme } = useAppTheme();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const handleConfirm = () => { onConfirm(draft); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose} testID="date-picker-backdrop">
        <Pressable
          style={[st.sheet, { backgroundColor: theme.modalBg ?? '#fff' }]}
          onPress={() => {}}
          testID="date-picker-sheet"
        >
          <View style={st.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={st.headerBtn}>
              <Text style={[st.headerBtnTxt, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={st.headerCenter}>
              <Ionicons name="calendar-outline" size={18} color="#1B7A4A" />
              <Text style={[st.headerTitle, { color: theme.textPrimary }]}>  Select Date</Text>
            </View>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7} style={st.headerBtn}>
              <Text style={[st.headerBtnTxt, { color: '#1B7A4A', fontFamily: Font.bodySemiBold }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View style={st.badge}>
            <Text style={[st.badgeTxt, { color: theme.textSecondary }]}>{fmt(draft)}</Text>
          </View>

          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            onChange={(_: DateTimePickerEvent, d?: Date) => { if (d) setDraft(d); }}
            maximumDate={maximumDate ?? new Date(2100, 11, 31)}
            minimumDate={minimumDate ?? new Date(2000, 0, 1)}
            accentColor="#1B7A4A"
            themeVariant={theme.isDark ? 'dark' : 'light'}
            style={st.picker}
          />

          <TouchableOpacity style={st.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={st.confirmBtnTxt}>Confirm Date</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Android picker — custom RN calendar, no native dialog ─────────────────────

function AndroidPicker({ visible, value, onConfirm, onClose, maximumDate, minimumDate }: Props) {
  const { theme } = useAppTheme();
  const [draft,   setDraft]   = useState(value);
  // Incrementing key forces CustomCalendar to remount (reset cursor) on each open
  const [calKey,  setCalKey]  = useState(0);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setCalKey(k => k + 1);
    }
  }, [visible, value]);

  const handleConfirm = () => { onConfirm(draft); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose} testID="date-picker-backdrop">
        <Pressable
          style={[st.sheet, { backgroundColor: theme.modalBg ?? '#fff' }]}
          onPress={() => {}}
          testID="date-picker-sheet"
        >
          <View style={st.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={st.headerBtn}>
              <Text style={[st.headerBtnTxt, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={st.headerCenter}>
              <Ionicons name="calendar-outline" size={18} color="#1B7A4A" />
              <Text style={[st.headerTitle, { color: theme.textPrimary }]}>  Select Date</Text>
            </View>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7} style={st.headerBtn}>
              <Text style={[st.headerBtnTxt, { color: '#1B7A4A', fontFamily: Font.bodySemiBold }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <View style={st.badge}>
            <Text style={[st.badgeTxt, { color: theme.textSecondary }]}>{fmt(draft)}</Text>
          </View>

          <CustomCalendar
            key={calKey}
            selected={draft}
            onSelect={setDraft}
            minimumDate={minimumDate ?? new Date(2000, 0, 1)}
            maximumDate={maximumDate ?? new Date(2100, 11, 31)}
            theme={theme}
          />

          <TouchableOpacity style={st.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={st.confirmBtnTxt}>Confirm Date</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function DatePickerModal(props: Props) {
  if (Platform.OS === 'android') return <AndroidPicker {...props} />;
  return <IOSPicker {...props} />;
}

// ── Shared modal styles ───────────────────────────────────────────────────────

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  headerBtn:    { minWidth: 60 },
  headerBtnTxt: { fontFamily: Font.bodyMedium, fontSize: 15 },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle:  { fontFamily: Font.headerBold, fontSize: 16 },
  badge: {
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: 'rgba(27,122,74,0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  badgeTxt: { fontFamily: Font.bodySemiBold, fontSize: 14 },
  picker: { alignSelf: 'stretch', marginHorizontal: 8 },
  confirmBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#1B7A4A',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnTxt: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },
});

// ── Custom calendar styles ────────────────────────────────────────────────────

const CELL_SIZE = 40;

const cal = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  monthYear: {
    fontFamily: Font.headerBold,
    fontSize: 16,
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dow: {
    width: `${100 / 7}%` as any,
    textAlign: 'center',
    fontFamily: Font.bodySemiBold,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%` as any,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayCircle: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
  },
  dayCircleSelected: {
    backgroundColor: '#1B7A4A',
  },
  yearSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  yearInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: Font.bodyMedium,
    fontSize: 14,
    padding: 0,
  },
  yearList: {
    maxHeight: 220,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  yearItem: {
    width: '25%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  yearItemText: {
    fontFamily: Font.bodyMedium,
    fontSize: 15,
  },
});

