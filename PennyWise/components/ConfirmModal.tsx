import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';

// ── Types ──────────────────────────────────────────────────────────────────────
type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;

  title: string;
  message: string;

  /** Label on the confirm button. Default: "Confirm" */
  confirmLabel?: string;
  /** Background color of the confirm button. Default: "#EF4444" */
  confirmColor?: string;

  /** Ionicons name for the icon shown above the title. Default: "alert-circle-outline" */
  icon?: string;
  /** Background tint behind the icon circle. Defaults to a soft tint of confirmColor. */
  iconBg?: string;
  /** Color of the icon itself. Defaults to confirmColor. */
  iconColor?: string;
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel  = 'Confirm',
  confirmColor  = '#EF4444',
  icon          = 'alert-circle-outline',
  iconBg,
  iconColor,
}: Props) {
  const { theme } = useAppTheme();

  const resolvedIconColor = iconColor ?? confirmColor;
  const resolvedIconBg    = iconBg    ?? `${confirmColor}1A`; // ~10% opacity hex

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable
        style={st.overlay}
        onPress={onClose}
        testID="confirm-modal-backdrop"
        accessibilityLabel="Close modal"
      >

        {/* Sheet — stop touch propagation so taps inside don't close */}
        <Pressable style={[st.sheet, { backgroundColor: theme.modalBg }]} onPress={() => {}}>

          {/* Handle */}
          <View style={[st.handle, { backgroundColor: theme.divider }]} />

          {/* Icon circle */}
          <View style={[st.iconCircle, { backgroundColor: resolvedIconBg }]}>
            <Ionicons name={icon as any} size={30} color={resolvedIconColor} />
          </View>

          {/* Title */}
          <Text style={[st.title, { color: theme.textPrimary }]}>{title}</Text>

          {/* Message */}
          <Text style={[st.message, { color: theme.textSecondary }]}>{message}</Text>

          {/* Confirm button */}
          <TouchableOpacity
            style={[st.confirmBtn, { backgroundColor: confirmColor }]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={st.confirmBtnText}>{confirmLabel}</Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={st.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[st.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    marginBottom: 24,
  },

  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },

  title: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 10,
  },

  message: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 12,
  },

  confirmBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },

  cancelBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: 14,
  },
});
