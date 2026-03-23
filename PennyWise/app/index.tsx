import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { supabase } from '@/lib/supabase';
import { Font } from '@/constants/fonts';

const COIN = 180;
const ZOOM = 1.14;

// ── Timeline ──────────────────────────────────────────────────────────────────
// 0ms      Phase 1 — coin fades in + floats up                    (600ms)
// 600ms    Phase 2 — 3 horizontal flips (rotateX, out·sin)        (2200ms)
// 2800ms   Phase 3 — soft landing spring + scale squish + glow
// 3000ms   Phase 4 — title in, subtitle +150ms stagger
// 4800ms   Navigate
//
// All animations run on the UI thread via reanimated — zero JS-thread jank.

export default function SplashScreen() {
  const coinOpacity  = useSharedValue(0);
  const coinScale    = useSharedValue(0.75);
  const coinY        = useSharedValue(28);
  const flipDeg      = useSharedValue(0);

  const glowOpacity  = useSharedValue(0);
  const glowScale    = useSharedValue(1);

  const titleOpacity = useSharedValue(0);
  const titleY       = useSharedValue(22);
  const subOpacity   = useSharedValue(0);
  const subY         = useSharedValue(14);

  // ── Animated styles ───────────────────────────────────────────────────────
  // iOS REQUIRES perspective to be alone with its rotation in a dedicated layer.
  // Mixing perspective with translateY/scale in one array causes visual artifacts.
  const coinOuterStyle = useAnimatedStyle(() => ({
    opacity:   coinOpacity.value,
    transform: [
      { translateY: coinY.value    },
      { scale:      coinScale.value },
    ],
  }));

  // Flip layer: perspective must be FIRST, rotation SECOND — no other transforms.
  const coinFlipStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { rotateX:    `${flipDeg.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity:   glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity:   titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity:   subOpacity.value,
    transform: [{ translateY: subY.value }],
  }));

  useEffect(() => {
    const sounds: Audio.Sound[] = [];

    // Play one sound per flip — volume fades as coin decelerates
    // Flip start times derived from Easing.out(sin) over 2200ms:
    //   Flip 1 starts at 600ms (t=0 of flip)
    //   Flip 2 starts at 360° → arcsin(0.333)*(2/π)*2200 + 600 ≈ 1076ms
    //   Flip 3 starts at 720° → arcsin(0.667)*(2/π)*2200 + 600 ≈ 1622ms
    const flipSoundTimes: [number, number][] = [
      [600,  0.85],
      [1076, 0.65],
      [1622, 0.45],
    ];

    const soundTimers = flipSoundTimes.map(([t, vol]) =>
      setTimeout(async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('@/assets/sounds/coin-flip.mp3'),
            { shouldPlay: true, volume: vol },
          );
          sounds.push(sound);
          sound.setOnPlaybackStatusUpdate(s => {
            if (s.isLoaded && s.didJustFinish) sound.unloadAsync().catch(() => {});
          });
        } catch {}
      }, t),
    );

    // Haptics at edge-on moments (coin perpendicular = perceptible impact)
    // Angles 90°, 270°, 450°, 630°, 810°, 990° → absolute times:
    const hapticTimers = [717, 954, 1205, 1469, 1788, 2233].map(t =>
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), t),
    );
    const landHaptic = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      2800,
    );

    // ── Phase 1: Coin materialises ─────────────────────────────────────────
    coinOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    });

    // Full coinY journey: float up → hold → spring landing
    coinY.value = withSequence(
      withTiming(-18, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withTiming(-18, { duration: 2200 }),                                 // hold during flips
      withSpring(0, { damping: 9, stiffness: 100 }),                       // soft landing
    );

    // Full coinScale journey: appear → hold → squish → settle
    coinScale.value = withSequence(
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 2200 }),                                   // hold
      withTiming(1.06, { duration: 90, easing: Easing.out(Easing.quad) }), // impact
      withSpring(1, { damping: 8, stiffness: 180 }),                       // settle
    );

    // ── Phase 2: 3 smooth horizontal flips ────────────────────────────────
    // out(sin): near-linear start, gentle deceleration — each flip equally visible
    flipDeg.value = withDelay(600, withTiming(1080, {
      duration: 2200,
      easing: Easing.out(Easing.sin),
    }));

    // ── Phase 3: Glow ripple on landing ───────────────────────────────────
    glowOpacity.value = withDelay(2800, withSequence(
      withTiming(0.65, { duration: 50 }),
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    ));
    glowScale.value = withDelay(2800, withTiming(1.55, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    }));

    // ── Phase 4: Text reveal, staggered ───────────────────────────────────
    titleOpacity.value = withDelay(3000, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    titleY.value       = withDelay(3000, withSpring(0, { damping: 11, stiffness: 55 }));
    subOpacity.value   = withDelay(3150, withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) }));
    subY.value         = withDelay(3150, withSpring(0, { damping: 11, stiffness: 45 }));

    // ── Navigate ──────────────────────────────────────────────────────────
    const navTimer = setTimeout(async () => {
      await Promise.all(sounds.map(s => s.unloadAsync().catch(() => {})));
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? '/(tabs)' : '/login-form');
    }, 4800);

    return () => {
      soundTimers.forEach(clearTimeout);
      hapticTimers.forEach(clearTimeout);
      clearTimeout(landHaptic);
      clearTimeout(navTimer);
      cancelAnimation(coinOpacity);
      cancelAnimation(coinScale);
      cancelAnimation(coinY);
      cancelAnimation(flipDeg);
      cancelAnimation(glowOpacity);
      cancelAnimation(glowScale);
      cancelAnimation(titleOpacity);
      cancelAnimation(titleY);
      cancelAnimation(subOpacity);
      cancelAnimation(subY);
      sounds.forEach(s => s.unloadAsync().catch(() => {}));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Glow ripple ring */}
        <Animated.View style={[styles.glowRing, glowStyle]} />

        {/* Outer: position + opacity. Inner flip layer: perspective+rotateX isolated for iOS. */}
        <Animated.View style={coinOuterStyle}>
          <Animated.View
            style={coinFlipStyle}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
          >
            <View style={styles.coin}>
              <Image
                source={require('@/assets/images/logo.jpg')}
                style={styles.coinImg}
                resizeMode="cover"
              />
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Wordmark */}
      <View style={styles.textWrap}>
        <Animated.Text style={[styles.textMain, titleStyle]}>
          PennyWise
        </Animated.Text>
        <Animated.Text style={[styles.textSub, subStyle]}>
          Your Smart Budget Tracker
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#1B3D2B',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             36,
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
  glowRing: {
    position:     'absolute',
    width:         COIN,
    height:        COIN,
    borderRadius:  COIN / 2,
    borderWidth:   2,
    borderColor:  'rgba(62,203,168,0.85)',
    shadowColor:  '#3ECBA8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius:  22,
    elevation:     12,
  },
  textWrap: {
    alignItems: 'center',
    gap:        8,
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
