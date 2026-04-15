/**
 * AnimatedOwl
 *
 * Renders the owlpennywise.png with two looping animations:
 *   1. Gentle vertical float (translateY sine wave)
 *   2. Periodic wing-flap burst every ~4 s (rapid scaleY squeezes)
 *
 * Props:
 *   width   – rendered width  (required)
 *   height  – rendered height (required)
 *   flipX   – mirror horizontally so the owl faces left (default false)
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

interface Props {
  width: number;
  height: number;
  flipX?: boolean;
}

export default function AnimatedOwl({ width, height, flipX = false }: Props) {
  const floatY  = useRef(new Animated.Value(0)).current;
  const flapY   = useRef(new Animated.Value(1)).current; // scaleY for flap

  useEffect(() => {
    // ── 1. Continuous gentle float ─────────────────────────────────────────
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -5,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // ── 2. Periodic wing-flap burst ────────────────────────────────────────
    // Three quick scaleY squeezes, repeated every 4 s
    const doFlap = () =>
      Animated.sequence([
        Animated.timing(flapY, { toValue: 0.72, duration: 75, useNativeDriver: true }),
        Animated.timing(flapY, { toValue: 1.00, duration: 75, useNativeDriver: true }),
        Animated.timing(flapY, { toValue: 0.72, duration: 75, useNativeDriver: true }),
        Animated.timing(flapY, { toValue: 1.00, duration: 75, useNativeDriver: true }),
        Animated.timing(flapY, { toValue: 0.72, duration: 75, useNativeDriver: true }),
        Animated.timing(flapY, { toValue: 1.00, duration: 100, useNativeDriver: true }),
      ]).start();

    // First flap after 1.5 s so it doesn't fire immediately on mount
    const first   = setTimeout(doFlap, 1500);
    const interval = setInterval(doFlap, 4000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  return (
    <Animated.Image
      source={require('@/assets/images/owlpennywise.png')}
      style={[
        { width, height },
        {
          transform: [
            { translateY: floatY },
            { scaleX: flipX ? -1 : 1 },
            { scaleY: flapY },
          ],
        },
      ]}
      resizeMode="contain"
    />
  );
}
