import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Font } from '@/constants/fonts';
import type { SaveStatus } from '@/hooks/useFormDraft';

export function DraftSaveIndicator({ status }: { status: SaveStatus }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status === 'saving') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 500 }),
          withTiming(1,   { duration: 500 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [status]);

  const iconStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (status === 'idle') return null;

  const isSaving = status === 'saving';

  return (
    <Animated.View
      entering={FadeInDown.duration(220).springify()}
      exiting={FadeOut.duration(300)}
      style={[styles.pill, isSaving ? styles.pillSaving : styles.pillSaved]}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={isSaving ? 'ellipsis-horizontal' : 'checkmark-circle'}
          size={13}
          color={isSaving ? '#6B7280' : '#1B7A4A'}
        />
      </Animated.View>
      <Text style={[styles.text, isSaving ? styles.textSaving : styles.textSaved]}>
        {isSaving ? 'Saving…' : 'Draft saved'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillSaving: {
    backgroundColor: '#F3F4F6',
  },
  pillSaved: {
    backgroundColor: '#EDF7F1',
  },
  text: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
  },
  textSaving: {
    color: '#6B7280',
  },
  textSaved: {
    color: '#1B7A4A',
  },
});
