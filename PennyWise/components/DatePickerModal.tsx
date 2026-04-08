import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';

type Props = {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmt(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── Android: native dialog fires immediately, no modal wrapper needed ─────────
function AndroidPicker({ visible, value, onConfirm, onClose, maximumDate, minimumDate }: Props) {
  if (!visible) return null;

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    onClose();
    if (selected) onConfirm(selected);
  };

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="calendar"
      onChange={handleChange}
      maximumDate={maximumDate ?? new Date(2100, 11, 31)}
      minimumDate={minimumDate ?? new Date(2000, 0, 1)}
    />
  );
}

// ── iOS: inline calendar inside a bottom-sheet modal ─────────────────────────
function IOSPicker({ visible, value, onConfirm, onClose, maximumDate, minimumDate }: Props) {
  const { theme } = useAppTheme();
  const [draft, setDraft] = useState(value);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) setDraft(selected);
  };

  const handleConfirm = () => {
    onConfirm(draft);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.overlay} onPress={onClose} testID="date-picker-backdrop">
        <Pressable style={[st.sheet, { backgroundColor: theme.modalBg ?? '#fff' }]} onPress={() => {}} testID="date-picker-sheet">

          {/* Header */}
          <View style={st.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={st.headerBtn}>
              <Text style={[st.headerBtnTxt, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <View style={st.headerCenter}>
              <Ionicons name="calendar-outline" size={18} color="#1B7A4A" />
              <Text style={[st.headerTitle, { color: theme.textPrimary }]}>  Select Date</Text>
            </View>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7} style={st.headerBtn}>
              <Text style={[st.headerBtnTxt, { color: '#1B7A4A', fontFamily: Font.bodySemiBold }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Selected date badge */}
          <View style={st.badge}>
            <Text style={[st.badgeTxt, { color: theme.textSecondary }]}>{fmt(draft)}</Text>
          </View>

          {/* Inline calendar */}
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            onChange={handleChange}
            maximumDate={maximumDate ?? new Date(2100, 11, 31)}
            minimumDate={minimumDate ?? new Date(2000, 0, 1)}
            accentColor="#1B7A4A"
            themeVariant={theme.statusBar === 'dark' ? 'light' : 'dark'}
            style={st.picker}
          />

          {/* Confirm button */}
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

// ── Styles ────────────────────────────────────────────────────────────────────
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

  // Header row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  headerBtn: {
    minWidth: 60,
  },
  headerBtnTxt: {
    fontFamily: Font.bodyMedium,
    fontSize: 15,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Font.headerBold,
    fontSize: 16,
  },

  // Selected date badge
  badge: {
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: 'rgba(27,122,74,0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  badgeTxt: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
  },

  // DateTimePicker itself
  picker: {
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },

  // Confirm button
  confirmBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#1B7A4A',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnTxt: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },
});
