/**
 * lib/sfx.ts
 * Sound + haptic feedback system.
 *
 * One audio file, multiple moods via playback-rate pitch shifting:
 *   rate 1.5 → bright high ding   (tap, toggle)
 *   rate 1.0 → classic coin flip  (money actions)
 *   rate 0.65 → low thud          (error, delete)
 *
 * Haptic sequences use precise timing to feel distinct and premium.
 */
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { ImpactFeedbackStyle: Impact, NotificationFeedbackType: Notify } = Haptics;

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function playAt(rate: number, volume = 1.0) {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/coin-flip.mp3'),
      { shouldPlay: false, volume }
    );
    await sound.setRateAsync(rate, true);  // true = pitch correction
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate(s => {
      if (s.isLoaded && s.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch {}
}

export const sfx = {
  // Light tap — single soft click
  tap: async () => {
    try { await Haptics.impactAsync(Impact.Light); } catch {}
  },

  // Toggle switch — snappy double-click
  toggle: async () => {
    try {
      playAt(1.5, 0.4);
      await Haptics.impactAsync(Impact.Rigid);
      await delay(55);
      await Haptics.impactAsync(Impact.Light);
    } catch {}
  },

  // Save / update — rising celebratory triple
  success: async () => {
    try {
      playAt(1.3, 0.5);
      await Haptics.impactAsync(Impact.Light);
      await delay(65);
      await Haptics.impactAsync(Impact.Medium);
      await delay(65);
      await Haptics.impactAsync(Impact.Light);
    } catch {}
  },

  // Delete / fail — heavy double-buzz
  error: async () => {
    try {
      playAt(0.65, 0.6);
      await Haptics.impactAsync(Impact.Heavy);
      await delay(85);
      await Haptics.impactAsync(Impact.Heavy);
    } catch {}
  },

  // Archive / destructive — medium warning double-tap
  warning: async () => {
    try {
      playAt(0.85, 0.45);
      await Haptics.impactAsync(Impact.Medium);
      await delay(70);
      await Haptics.impactAsync(Impact.Medium);
    } catch {}
  },

  // Money action — coin flip + satisfying cascade fade
  coin: async () => {
    try {
      playAt(1.0, 0.9);
      await Haptics.impactAsync(Impact.Rigid);
      await delay(90);
      await Haptics.impactAsync(Impact.Medium);
      await delay(90);
      await Haptics.impactAsync(Impact.Light);
    } catch {}
  },

  // Goal completed — coin at high pitch + notification burst (most special moment)
  complete: async () => {
    try {
      playAt(1.4, 1.0);
      await Haptics.notificationAsync(Notify.Success);
      await delay(110);
      await Haptics.impactAsync(Impact.Medium);
      await delay(80);
      await Haptics.impactAsync(Impact.Light);
      await delay(80);
      await Haptics.impactAsync(Impact.Light);
    } catch {}
  },
};
