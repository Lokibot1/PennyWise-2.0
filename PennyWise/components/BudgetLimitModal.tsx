/**
 * components/BudgetLimitModal.tsx
 * Reusable modal for updating the monthly budget limit.
 * Used from both the Home screen and the Settings page.
 */
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';

type Props = {
  visible: boolean;
  current: number;
  onClose: () => void;
  onSave: (newLimit: number) => Promise<void>;
};

function formatWithCommas(raw: string): string {
  // Keep only digits and one decimal point
  const clean = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const [whole, decimal] = clean.split('.');
  const formatted = (whole || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${formatted}.${decimal}` : formatted;
}

export default function BudgetLimitModal({ visible, current, onClose, onSave }: Props) {
  const { theme } = useAppTheme();
  const [value, setValue]   = useState('');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Pre-fill with formatted current value each time the modal opens
  useEffect(() => {
    if (visible) { setValue(formatWithCommas(String(current))); setErrMsg(''); }
  }, [visible, current]);

  const parsed  = parseFloat(value.replace(/,/g, ''));
  const isValid = !isNaN(parsed) && parsed > 0;

  function handleChangeText(text: string) {
    setValue(formatWithCommas(text));
    if (errMsg) setErrMsg('');
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } catch (err: any) {
      setErrMsg(err?.message ?? 'Failed to save budget limit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
          onPress={onClose}
        />

        {/* Sheet */}
        <View style={[st.sheet, { backgroundColor: theme.modalBg }]}>

          {/* Handle */}
          <View style={[st.handle, { backgroundColor: theme.divider }]} />

          {/* Icon + title */}
          <View style={st.header}>
            <View style={st.iconCircle}>
              <Ionicons name="wallet-outline" size={26} color="#1B7A4A" />
            </View>
            <Text style={[st.title, { color: theme.textPrimary }]}>Monthly Budget</Text>
            <Text style={[st.subtitle, { color: theme.textSecondary }]}>
              Set your total spending limit for the month
            </Text>
          </View>

          {/* ₱ Input */}
          <View style={[
            st.inputRow,
            { backgroundColor: theme.surface, borderColor: isValid ? '#1B7A4A' : theme.inputBorder },
          ]}>
            <Text style={st.currency}>₱</Text>
            <TextInput
              style={[st.input, { color: theme.textPrimary }]}
              value={value}
              onChangeText={handleChangeText}
              keyboardType="decimal-pad"
              placeholder="e.g. 20,000.00"
              placeholderTextColor={theme.textMuted}
              selectTextOnFocus
            />
          </View>

          {/* Inline error */}
          {!!errMsg && (
            <View style={st.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#E05858" />
              <Text style={st.errorText}>{errMsg}</Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[st.saveBtn, { backgroundColor: isValid ? '#1B7A4A' : theme.surface }]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.85}
          >
            <Text style={[st.saveBtnTxt, { color: isValid ? '#fff' : theme.textMuted }]}>
              {saving ? 'Saving…' : 'Save Budget'}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={st.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[st.cancelBtnTxt, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  sheet: {
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    padding:              24,
    paddingBottom:        44,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 24,
  },
  header: {
    alignItems: 'center', marginBottom: 24,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(27,122,74,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: Font.headerBold, fontSize: 20, marginBottom: 4,
  },
  subtitle: {
    fontFamily: Font.bodyRegular, fontSize: 13, textAlign: 'center',
  },
  inputRow: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   14,
    borderWidth:    1.5,
    paddingHorizontal: 16,
    marginBottom:   20,
  },
  currency: {
    fontFamily: Font.headerBold, fontSize: 20,
    color: '#1B7A4A', marginRight: 6,
  },
  input: {
    flex: 1,
    fontFamily:    Font.headerBold,
    fontSize:      26,
    paddingVertical: 14,
  },
  saveBtn: {
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  saveBtnTxt: {
    fontFamily: Font.bodySemiBold, fontSize: 16,
  },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 10,
  },
  cancelBtnTxt: {
    fontFamily: Font.bodyMedium, fontSize: 14,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(224,88,88,0.1)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12, alignSelf: 'stretch',
  },
  errorText: {
    fontFamily: Font.bodyRegular, fontSize: 13, color: '#E05858', flex: 1,
  },
});
