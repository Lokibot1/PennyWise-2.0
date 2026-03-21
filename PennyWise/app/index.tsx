import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import { supabase } from '@/lib/supabase';
import { Font } from '@/constants/fonts';

const COIN = 180;
const ZOOM = 1.14;

// ── Animation timeline ────────────────────────────────────────────────────────
// 0ms      Phase 1 — coin fades in + rises                    (~350ms)
// 350ms    Phase 2 — 3 vertical flips via rotateX, decelerating (~1200ms)
//            Uses Easing.out(Easing.cubic): fast start → slow landing
//            1080° total = 3 full rotations
// 1550ms   Phase 3 — landing bounce + heavy haptic            (~280ms)
// 1750ms   Phase 4 — "PennyWise" text slides up               (~450ms)
// 3800ms   Navigate → home or login

export default function SplashScreen() {
  const coinOpacity   = useRef(new Animated.Value(0)).current;
  const coinScale     = useRef(new Animated.Value(0.65)).current;
  const flipRotation  = useRef(new Animated.Value(0)).current;
  const coinY         = useRef(new Animated.Value(20)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const textY         = useRef(new Animated.Value(30)).current;

  // rotateX string interpolation (0 → 1080deg = 3 full vertical rotations)
  const rotateX = flipRotation.interpolate({
    inputRange:  [0, 1080],
    outputRange: ['0deg', '1080deg'],
  });

  useEffect(() => {
    // ── Sound ─────────────────────────────────────────────────────────────────
    let sound: Audio.Sound | null = null;
    const playFlipSound = async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          require('@/assets/sounds/coin-flip.mp3'),
          { shouldPlay: true, volume: 1.0 },
        );
        sound = s;
      } catch {
        // Sound file not found — animation still plays without audio
      }
    };
    const soundTimer = setTimeout(playFlipSound, 350);

    // ── Haptic schedule ───────────────────────────────────────────────────────
    // With Easing.out(Easing.cubic) the rotations bunch up at the start.
    // Face-change moments (every 360°): ~501ms, ~718ms, ~1550ms from t=0
    // Edge-on moments (every 180°):     ~421ms, ~597ms, ~890ms from t=0
    const flipHaptics = [421, 501, 597, 718, 890, 1200];
    const hapticTimers = flipHaptics.map(t =>
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), t),
    );
    const landTimer = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      1580,
    );

    // ── Phase 1: Coin appears + rises (0ms) ──────────────────────────────────
    Animated.parallel([
      Animated.timing(coinOpacity, { toValue: 1,   duration: 300, useNativeDriver: true }),
      Animated.timing(coinScale,   { toValue: 1,   duration: 350, useNativeDriver: true }),
      Animated.timing(coinY,       { toValue: -18, duration: 350, useNativeDriver: true }),
    ]).start();

    // ── Phase 2: Vertical flip (350ms) ────────────────────────────────────────
    // rotateX 0 → 1080° with cubic-out easing = 3 flips, fast → slow
    const flipTimer = setTimeout(() => {
      Animated.timing(flipRotation, {
        toValue:  1080,
        duration: 1200,
        easing:   Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 350);

    // ── Phase 3: Landing bounce (1550ms) ─────────────────────────────────────
    const landingTimer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(coinY, {
          toValue:  0,
          friction: 4,
          tension:  200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(coinScale, { toValue: 1.14, duration: 80,  useNativeDriver: true }),
          Animated.spring(coinScale,  { toValue: 1,   friction: 5, tension: 280, useNativeDriver: true }),
        ]),
      ]).start();
    }, 1550);

    // ── Phase 4: "PennyWise" text appears (1750ms) ───────────────────────────
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]).start();
    }, 1750);

    // ── Navigate (3800ms) ────────────────────────────────────────────────────
    const navTimer = setTimeout(async () => {
      if (sound) await sound.unloadAsync();
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? '/(tabs)' : '/login-form');
    }, 3800);

    return () => {
      clearTimeout(soundTimer);
      hapticTimers.forEach(clearTimeout);
      clearTimeout(landTimer);
      clearTimeout(flipTimer);
      clearTimeout(landingTimer);
      clearTimeout(textTimer);
      clearTimeout(navTimer);
      sound?.unloadAsync();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Coin ─────────────────────────────────────────────────────────── */}
      <Animated.View style={{
        opacity: coinOpacity,
        transform: [
          { translateY: coinY     },
          { scale:      coinScale },
          { perspective: 600      },
          { rotateX                },
        ],
      }}>
        <View style={styles.coin}>
          <Image
            source={require('@/assets/images/logo.jpg')}
            style={styles.coinImg}
            resizeMode="cover"
          />
        </View>
      </Animated.View>

      {/* ── PennyWise wordmark ───────────────────────────────────────────── */}
      <Animated.View style={[
        styles.textWrap,
        { opacity: textOpacity, transform: [{ translateY: textY }] },
      ]}>
        <Text style={styles.textMain}>PennyWise</Text>
        <Text style={styles.textSub}>Your Smart Budget Tracker</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B3D2B',
    alignItems:      'center',
    justifyContent:  'center',
    gap: 36,
  },

  coin: {
    width:        COIN,
    height:       COIN,
    borderRadius: COIN / 2,
    overflow:     'hidden',
  },
  coinImg: {
    width:      COIN * ZOOM,
    height:     COIN * ZOOM,
    marginLeft: -(COIN * (ZOOM - 1) / 2),
    marginTop:  -(COIN * (ZOOM - 1) / 2),
  },

  textWrap: {
    alignItems: 'center',
    gap: 6,
  },
  textMain: {
    fontFamily:    Font.headerBlack,
    fontSize:      38,
    color:         '#fff',
    letterSpacing: 1,
  },
  textSub: {
    fontFamily:    Font.bodyRegular,
    fontSize:      13,
    color:         'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
});
