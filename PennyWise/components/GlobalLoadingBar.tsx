/**
 * components/GlobalLoadingBar.tsx
 * Glowing comet-style loading bar with bloom glow layers.
 * Imperative API — import `loadingBar` and call .start() / .finish() anywhere.
 */
import { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const W       = Dimensions.get('window').width;
const BAR_H   = 8;     // taller = more visible
const ORB     = 36;    // large leading orb
const HALO    = 72;    // outer halo circle
const PRIMARY = '#22C55E';
const GLOW    = '#86EFAC';

// ── Imperative singleton ──────────────────────────────────────────────────────
export const loadingBar = {
  start:  (): void => {},
  finish: (): void => {},
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function GlobalLoadingBar() {
  const progress  = useSharedValue(0);
  const opacity   = useSharedValue(0);
  const shimmer   = useSharedValue(0);
  const shimmer2  = useSharedValue(0);
  const orbScale  = useSharedValue(1);
  const flash     = useSharedValue(0);   // white flash on finish

  function startAnim() {
    cancelAnimation(progress);
    cancelAnimation(shimmer);
    cancelAnimation(shimmer2);
    cancelAnimation(orbScale);
    cancelAnimation(flash);

    flash.value    = 0;
    opacity.value  = 1;
    progress.value = 0;

    // Quick surge → slow NProgress crawl
    progress.value = withTiming(0.3, { duration: 200, easing: Easing.out(Easing.cubic) }, () => {
      progress.value = withTiming(0.88, { duration: 7000, easing: Easing.bezier(0.1, 0.6, 0.2, 1) });
    });

    // Shimmer 1 — fast bright sweep
    shimmer.value = 0;
    shimmer.value = withRepeat(
      withTiming(1, { duration: 500, easing: Easing.linear }),
      -1,
      false,
    );

    // Shimmer 2 — half-cycle offset for double-flash effect
    shimmer2.value = 0;
    shimmer2.value = withSequence(
      withTiming(0, { duration: 250 }),
      withRepeat(
        withTiming(1, { duration: 500, easing: Easing.linear }),
        -1,
        false,
      ),
    );

    // Dramatic heartbeat pulse on orb
    orbScale.value = withRepeat(
      withSequence(
        withTiming(2.0, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 420, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }

  function finishAnim() {
    cancelAnimation(progress);
    cancelAnimation(shimmer);
    cancelAnimation(shimmer2);
    cancelAnimation(orbScale);

    // Orb flares out, bar snaps to 100%, white flash, then fade
    orbScale.value = withTiming(2.6, { duration: 180 });
    flash.value    = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0, { duration: 200 }),
    );

    progress.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }, () => {
      opacity.value = withTiming(0, { duration: 320 }, () => {
        progress.value = 0;
        shimmer.value  = 0;
        shimmer2.value = 0;
        orbScale.value = 1;
        flash.value    = 0;
      });
    });
  }

  useEffect(() => {
    loadingBar.start  = startAnim;
    loadingBar.finish = finishAnim;
  }, []);

  // ── Animated styles ──────────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Fill width — shared by bar + all bloom layers
  const fillStyle = useAnimatedStyle(() => ({ width: progress.value * W }));

  // Bloom layers — same width as fill, increasing height + decreasing opacity
  const bloom1Style = useAnimatedStyle(() => ({ width: progress.value * W }));
  const bloom2Style = useAnimatedStyle(() => ({ width: progress.value * W }));
  const bloom3Style = useAnimatedStyle(() => ({ width: progress.value * W }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value,  [0, 1], [-160, W + 160]) }],
  }));

  const shimmer2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer2.value, [0, 1], [-160, W + 160]) }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  // Outer halo — very large, very faint
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * W - HALO / 2 }],
    opacity: opacity.value * 0.12,
  }));

  // Trail orbs
  const trail1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * W - ORB / 2 - 22 }],
    opacity: opacity.value * 0.55,
  }));

  const trail2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * W - ORB / 2 - 42 }],
    opacity: opacity.value * 0.28,
  }));

  const trail3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * W - ORB / 2 - 60 }],
    opacity: opacity.value * 0.12,
  }));

  // Main orb — pulses dramatically
  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * W - ORB / 2 },
      { scale: orbScale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[{
        position:      'absolute',
        top:           0,
        left:          0,
        right:         0,
        height:        BAR_H,
        zIndex:        99999,
        overflow:      'visible',
        pointerEvents: 'none',
      }, containerStyle]}
    >
      {/* Track */}
      <View style={{
        position:        'absolute',
        top:             0, left: 0, right: 0,
        height:          BAR_H,
        backgroundColor: 'rgba(34,197,94,0.18)',
      }} />

      {/* ── Bloom glow layers (stacked, wider + more transparent further down) ── */}
      {/* Bloom 3 — widest, softest, 35px tall */}
      <Animated.View style={[{
        position:        'absolute',
        top:             0, left: 0,
        height:          35,
        backgroundColor: 'rgba(34,197,94,0.07)',
      }, bloom3Style]} />
      {/* Bloom 2 — 22px tall */}
      <Animated.View style={[{
        position:        'absolute',
        top:             0, left: 0,
        height:          22,
        backgroundColor: 'rgba(34,197,94,0.13)',
      }, bloom2Style]} />
      {/* Bloom 1 — 13px tall, closest to bar */}
      <Animated.View style={[{
        position:        'absolute',
        top:             0, left: 0,
        height:          13,
        backgroundColor: 'rgba(34,197,94,0.22)',
      }, bloom1Style]} />

      {/* ── Main fill bar with shimmer ── */}
      <Animated.View style={[{
        position:        'absolute',
        top:             0, left: 0,
        height:          BAR_H,
        backgroundColor: PRIMARY,
        overflow:        'hidden',
        shadowColor:     PRIMARY,
        shadowOffset:    { width: 0, height: 3 },
        shadowOpacity:   1,
        shadowRadius:    10,
        elevation:       10,
      }, fillStyle]}>
        {/* Shimmer 1 — bright fast sweep */}
        <Animated.View style={[{
          position:        'absolute',
          top:             0, bottom: 0,
          width:           150,
          backgroundColor: 'rgba(255,255,255,0.72)',
          transform:       [{ skewX: '-25deg' }],
        }, shimmerStyle]} />
        {/* Shimmer 2 — offset double-flash */}
        <Animated.View style={[{
          position:        'absolute',
          top:             0, bottom: 0,
          width:           80,
          backgroundColor: 'rgba(255,255,255,0.42)',
          transform:       [{ skewX: '-25deg' }],
        }, shimmer2Style]} />
        {/* White flash overlay on finish */}
        <Animated.View style={[{
          position:        'absolute',
          top:             0, bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(255,255,255,0.85)',
        }, flashStyle]} />
      </Animated.View>

      {/* ── Outer halo (very large, barely visible) ── */}
      <Animated.View pointerEvents="none" style={[{
        position:        'absolute',
        top:             BAR_H / 2 - HALO / 2,
        width:           HALO,
        height:          HALO,
        borderRadius:    HALO / 2,
        backgroundColor: GLOW,
      }, haloStyle]} />

      {/* Trail 3 — farthest, tiny */}
      <Animated.View pointerEvents="none" style={[{
        position:        'absolute',
        top:             BAR_H / 2 - 5,
        width:           10,
        height:          10,
        borderRadius:    5,
        backgroundColor: GLOW,
      }, trail3Style]} />

      {/* Trail 2 */}
      <Animated.View pointerEvents="none" style={[{
        position:        'absolute',
        top:             BAR_H / 2 - 8,
        width:           16,
        height:          16,
        borderRadius:    8,
        backgroundColor: GLOW,
        shadowColor:     GLOW,
        shadowOffset:    { width: 0, height: 0 },
        shadowOpacity:   0.7,
        shadowRadius:    8,
        elevation:       6,
      }, trail2Style]} />

      {/* Trail 1 — closest to orb */}
      <Animated.View pointerEvents="none" style={[{
        position:        'absolute',
        top:             BAR_H / 2 - 11,
        width:           22,
        height:          22,
        borderRadius:    11,
        backgroundColor: GLOW,
        shadowColor:     GLOW,
        shadowOffset:    { width: 0, height: 0 },
        shadowOpacity:   0.9,
        shadowRadius:    12,
        elevation:       10,
      }, trail1Style]} />

      {/* Main pulsing glow orb */}
      <Animated.View
        pointerEvents="none"
        style={[{
          position:        'absolute',
          top:             BAR_H / 2 - ORB / 2,
          width:           ORB,
          height:          ORB,
          borderRadius:    ORB / 2,
          backgroundColor: GLOW,
          shadowColor:     GLOW,
          shadowOffset:    { width: 0, height: 0 },
          shadowOpacity:   1,
          shadowRadius:    24,
          elevation:       24,
        }, orbStyle]}
      />
    </Animated.View>
  );
}
