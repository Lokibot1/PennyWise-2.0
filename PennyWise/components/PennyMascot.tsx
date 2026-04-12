/**
 * PennyMascot
 *
 * Penny the Owl — PennyWise's financial advisor mascot.
 * Shows a floating animated owl with a speech bubble tip.
 * Tap anywhere to open the chatbot.
 *
 * Props:
 *   tip       – the financial tip shown in the bubble (optional)
 *   onPress   – called when the mascot / bubble is tapped
 *   size      – diameter of the mascot circle (default 56)
 *   variant   – 'bubble' (with tip card) | 'icon' (bare icon only)
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Font } from '@/constants/fonts';

// ── Rotating tips shown in the speech bubble ──────────────────────────────────
export const PENNY_TIPS = [
  "Track every peso — small leaks sink big ships! 💧",
  "Already hit 80% of your budget? Time to slow down. 🛑",
  "An emergency fund = 3–6 months of expenses. Start small! 🏦",
  "Pay yourself first: save before you spend. 🐖",
  "Recurring expenses add up fast. Review them monthly! 📋",
  "A savings goal with a deadline is a dream with a plan. 🎯",
  "The best time to start saving was yesterday. The next best? Now. ⏰",
  "Divide income: 50% needs · 30% wants · 20% savings. 📊",
];

type Variant = 'bubble' | 'icon';

interface PennyMascotProps {
  tip?: string;
  onPress: () => void;
  size?: number;
  variant?: Variant;
  dark?: boolean;
}

export default function PennyMascot({
  tip,
  onPress,
  size = 56,
  variant = 'bubble',
  dark = false,
}: PennyMascotProps) {
  // Gentle floating animation
  const floatY = useRef(new Animated.Value(0)).current;
  // Bounce on mount
  const scaleIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pop in
    Animated.spring(scaleIn, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();

    // Infinite float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -6,
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
  }, []);

  const displayTip = tip ?? PENNY_TIPS[Math.floor(Date.now() / 1000) % PENNY_TIPS.length];

  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: floatY }, { scale: scaleIn }] },
        ]}
      >
        {/* Speech bubble — shown only in 'bubble' variant */}
        {variant === 'bubble' && (
          <View style={[styles.bubble, dark && styles.bubbleDark]}>
            <Text style={[styles.bubbleName, dark && styles.bubbleNameDark]}>
              Penny 🦉
            </Text>
            <Text style={[styles.bubbleText, dark && styles.bubbleTextDark]} numberOfLines={3}>
              {displayTip}
            </Text>
            {/* Bubble tail pointing right */}
            <View style={[styles.bubbleTail, dark && styles.bubbleTailDark]} />
          </View>
        )}

        {/* Mascot circle */}
        <View style={[styles.mascotCircle, { width: size, height: size, borderRadius: size / 2 }]}>
          {/* Outer glow ring */}
          <View style={[styles.glowRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]} />
          {/* Owl emoji + expression */}
          <Text style={[styles.owlEmoji, { fontSize: size * 0.52 }]}>🦉</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-end',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Speech bubble ──────────────────────────────────────────────────────────
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  bubbleDark: {
    backgroundColor: '#1A2820',
  },
  bubbleName: {
    fontFamily: Font.bodyBold,
    fontSize: 11,
    color: '#3ECBA8',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  bubbleNameDark: {
    color: '#3ECBA8',
  },
  bubbleText: {
    fontFamily: Font.bodyRegular,
    fontSize: 11.5,
    color: '#2D4A3A',
    lineHeight: 16,
  },
  bubbleTextDark: {
    color: '#C8DDD2',
  },
  bubbleTail: {
    position: 'absolute',
    right: -8,
    top: '40%',
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 9,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  bubbleTailDark: {
    borderLeftColor: '#1A2820',
  },

  // ── Mascot circle ──────────────────────────────────────────────────────────
  mascotCircle: {
    backgroundColor: '#3ECBA8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3ECBA8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'visible',
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(62,203,168,0.20)',
    zIndex: -1,
  },
  owlEmoji: {
    textAlign: 'center',
  },
});
