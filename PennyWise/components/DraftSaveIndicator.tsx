import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import type { SaveStatus } from '@/hooks/useFormDraft';

/**
 * Small status pill shown inline in a form to communicate auto-save state.
 * Renders nothing when status is "idle".
 */
export function DraftSaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;

  return (
    <View style={styles.pill}>
      {status === 'saving' ? (
        <>
          <ActivityIndicator size="small" color="#1B7A4A" style={styles.spinner} />
          <Text style={styles.text}>Saving draft...</Text>
        </>
      ) : (
        <>
          <Ionicons name="checkmark-circle" size={13} color="#1B7A4A" />
          <Text style={styles.text}>Draft saved</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#EDF7F1',
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  text: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: '#1B7A4A',
  },
});
