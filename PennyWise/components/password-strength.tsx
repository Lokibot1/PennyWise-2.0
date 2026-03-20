import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Font } from '@/constants/fonts';

const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Contains a number (0–9)', test: (p: string) => /[0-9]/.test(p) },
];

const STRENGTH_COLORS = ['#FF5C5C', '#FF9A3C', '#F5C518', '#1B7A4A'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const results = RULES.map(rule => ({ ...rule, met: rule.test(password) }));
  const metCount = results.filter(r => r.met).length;
  const color = STRENGTH_COLORS[metCount - 1] ?? '#E0EDE8';
  const label = metCount > 0 ? STRENGTH_LABELS[metCount - 1] : '';

  return (
    <View style={styles.container}>
      {/* Segmented strength bar */}
      <View style={styles.barRow}>
        {RULES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < metCount ? color : '#DCF0E6' },
            ]}
          />
        ))}
        {label ? (
          <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
        ) : null}
      </View>

      {/* Rule checklist */}
      <View style={styles.rulesList}>
        {results.map((rule, i) => (
          <View key={i} style={styles.ruleRow}>
            <Ionicons
              name={rule.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={rule.met ? '#1B7A4A' : '#B8D4C6'}
            />
            <Text style={[styles.ruleText, rule.met && styles.ruleTextMet]}>
              {rule.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 2,
  },

  // ── Strength bar ────────────────────────────────────
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 10,
  },
  strengthLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 12,
    marginLeft: 6,
    width: 44,
  },

  // ── Rule list ───────────────────────────────────────
  rulesList: {
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ruleText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: '#9ABCAC',
  },
  ruleTextMet: {
    color: '#1B3D2B',
  },
});
