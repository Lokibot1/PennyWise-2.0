/**
 * components/ErrorModal.tsx
 * Reusable error feedback modal. Shows a title, message, and a single dismiss button.
 * Drop-in replacement for bare Alert.alert() — stays on-brand with the app's sheet style.
 */
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
};

export default function ErrorModal({ visible, onClose, title, message }: Props) {
  const { theme } = useAppTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={st.overlay} onPress={onClose}>
        {/* Sheet — stop propagation */}
        <Pressable style={[st.sheet, { backgroundColor: theme.modalBg }]} onPress={() => {}}>

          {/* Handle */}
          <View style={[st.handle, { backgroundColor: theme.divider }]} />

          {/* Icon circle */}
          <View style={st.iconCircle}>
            <Ionicons name="alert-circle-outline" size={30} color="#E05858" />
          </View>

          {/* Title */}
          <Text style={[st.title, { color: theme.textPrimary }]}>{title}</Text>

          {/* Message */}
          <Text style={[st.message, { color: theme.textSecondary }]}>{message}</Text>

          {/* Dismiss button */}
          <TouchableOpacity
            style={st.dismissBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={st.dismissBtnText}>Got it</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
    backgroundColor: 'rgba(224,88,88,0.12)',
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
  dismissBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#E05858',
  },
  dismissBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },
});
