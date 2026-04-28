/**
 * PennyWise — Offline Banner
 *
 * Slides down from the top of the screen when the device loses connectivity.
 * Slides back up when connection is restored.
 * Rendered in _layout.tsx so it overlays every screen.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '@/contexts/NetworkContext';
import { Font } from '@/constants/fonts';

export default function OfflineBanner() {
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();

  const BANNER_H = 40 + insets.top;
  const slideY  = useRef(new Animated.Value(-BANNER_H)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnline) {
      Animated.parallel([
        Animated.timing(slideY,  { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY,  { toValue: -BANNER_H, duration: 260, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,         duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [isOnline, BANNER_H]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 6, height: BANNER_H, transform: [{ translateY: slideY }], opacity },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={styles.text}>You&apos;re offline — viewing cached data</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#92400E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingBottom: 6,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 20,
  },
  text: {
    fontFamily: Font.bodySemiBold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.2,
  },
});
