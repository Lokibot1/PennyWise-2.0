import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';

// ── Data ───────────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 4;

const FEATURES = [
  {
    icon:  'cash-outline',
    color: '#22C55E',
    title: 'Income Tracking',
    desc:  'Log all your income sources and see your full earning picture.',
  },
  {
    icon:  'wallet-outline',
    color: '#4895EF',
    title: 'Budget Control',
    desc:  'Organize spending into categories with custom monthly limits.',
  },
  {
    icon:  'bar-chart-outline',
    color: '#8B5CF6',
    title: 'Smart Analytics',
    desc:  'Visualize spending trends with charts and actionable insights.',
  },
  {
    icon:  'flag-outline',
    color: '#F59E0B',
    title: 'Savings Goals',
    desc:  'Set targets for what matters and watch your progress grow.',
  },
] as const;

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { theme } = useAppTheme();

  const [step,      setStep]      = useState(0);
  const [firstName, setFirstName] = useState('');
  const [budgetStr, setBudgetStr] = useState('20000');
  const [finishing, setFinishing] = useState(false);

  // ── Animations ──────────────────────────────────────────────────────────────
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(24);
  const checkScale = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  function animateIn() {
    translateY.value = 24;
    opacity.value    = withTiming(1,  { duration: 320 });
    translateY.value = withSpring(0,  { damping: 18, stiffness: 160 });
  }

  function transitionTo(next: number) {
    opacity.value    = withTiming(0,   { duration: 140 }, () => runOnJS(setStep)(next));
    translateY.value = withTiming(-16, { duration: 140 });
  }

  useEffect(() => {
    animateIn();
    if (step === 3) {
      checkScale.value = 0;
      checkScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Load user name ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = (user.user_metadata?.full_name as string) ?? '';
      setFirstName(name.split(' ')[0] ?? '');
    });
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleNext() {
    if (step < TOTAL_STEPS - 1) transitionTo(step + 1);
  }

  async function skipToApp() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = user.user_metadata ?? {};
      await supabase.from('profiles').upsert({
        id:        user.id,
        full_name: meta.full_name ?? '',
        email:     user.email    ?? '',
        phone:     meta.phone    ?? '',
      });
    }
    supabase.auth.updateUser({ data: { onboarding_completed: true } }).catch(() => {});
    router.replace('/(tabs)');
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta   = user.user_metadata ?? {};
      const budget = parseFloat(budgetStr.replace(/[^0-9.]/g, ''));
      await supabase.from('profiles').upsert({
        id:           user.id,
        full_name:    meta.full_name ?? '',
        email:        user.email    ?? '',
        phone:        meta.phone    ?? '',
        ...((!isNaN(budget) && budget > 0) ? { budget_limit: budget } : {}),
      });
    }

    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    router.replace('/(tabs)');
  }

  // ── Hero (green section) ────────────────────────────────────────────────────
  function renderHero() {
    if (step === 0) {
      return (
        <View style={s.heroLogoWrap}>
          <Image
            source={require('@/assets/images/logo.jpg')}
            style={s.heroLogoImg}
            resizeMode="cover"
          />
        </View>
      );
    }
    if (step === 3) {
      return (
        <Animated.View style={[s.heroIconCircle, { backgroundColor: 'rgba(62,203,168,0.2)' }, checkStyle]}>
          <Ionicons name="checkmark-circle-outline" size={52} color="#3ECBA8" />
        </Animated.View>
      );
    }
    const icons = ['wallet-outline', 'sparkles-outline'] as const;
    return (
      <View style={[s.heroIconCircle, { backgroundColor: 'rgba(255,255,255,0.13)' }]}>
        <Ionicons name={icons[step - 1]} size={44} color="#fff" />
      </View>
    );
  }

  // ── Card content per step ───────────────────────────────────────────────────
  function renderStep() {
    switch (step) {

      case 0:
        return (
          <>
            <Text style={[s.title, { color: theme.textPrimary }]}>
              {firstName ? `Hi, ${firstName}! 👋` : 'Welcome! 👋'}
            </Text>
            <Text style={[s.subtitle, { color: theme.textSecondary }]}>
              PennyWise helps you track income, manage budgets, and reach your savings goals — all in one place.
            </Text>
            <TouchableOpacity style={s.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} onPress={skipToApp} activeOpacity={0.7}>
              <Text style={[s.skipText, { color: theme.textMuted }]}>Skip setup</Text>
            </TouchableOpacity>
          </>
        );

      case 1:
        return (
          <>
            <Text style={[s.title, { color: theme.textPrimary }]}>Set Your Monthly Budget</Text>
            <Text style={[s.subtitle, { color: theme.textSecondary }]}>
              How much do you want to limit your monthly spending?
            </Text>
            <View style={[s.budgetWrap, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]}>
              <Text style={[s.budgetPrefix, { color: theme.textSecondary }]}>₱</Text>
              <TextInput
                style={[s.budgetInput, { color: theme.textPrimary }]}
                value={budgetStr}
                onChangeText={v => setBudgetStr(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="20000"
                placeholderTextColor={theme.textMuted}
                selectTextOnFocus
              />
            </View>
            <Text style={[s.hint, { color: theme.textMuted }]}>
              You can change this anytime in Profile → Edit.
            </Text>
            <TouchableOpacity style={s.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Looks Good</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} onPress={handleNext} activeOpacity={0.7}>
              <Text style={[s.skipText, { color: theme.textMuted }]}>Skip, use ₱20,000</Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            <Text style={[s.title, { color: theme.textPrimary }]}>Here&apos;s what awaits you</Text>
            <Text style={[s.subtitle, { color: theme.textSecondary }]}>
              Everything you need to take control of your money.
            </Text>
            <View style={[s.featureList, { borderColor: theme.divider }]}>
              {FEATURES.map((f, i) => (
                <View
                  key={f.title}
                  style={[
                    s.featureRow,
                    i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                  ]}
                >
                  <View style={[s.featureIconWrap, { backgroundColor: f.color + '18' }]}>
                    <Ionicons name={f.icon as any} size={20} color={f.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.featureTitle, { color: theme.textPrimary }]}>{f.title}</Text>
                    <Text style={[s.featureDesc,  { color: theme.textSecondary }]}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[s.primaryBtn, { marginTop: 20 }]} onPress={handleNext} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>I&apos;m Ready</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </>
        );

      case 3:
        return (
          <>
            <Text style={[s.title, { color: theme.textPrimary }]}>
              {firstName ? `You're all set, ${firstName}!` : "You're all set!"}
            </Text>
            <Text style={[s.subtitle, { color: theme.textSecondary }]}>
              Your financial journey starts now. Build better habits, one peso at a time.
            </Text>
            <View style={[s.readyCard, { backgroundColor: theme.surface }]}>
              {[
                { icon: 'add-circle-outline',  color: '#22C55E', label: 'Add your first income source' },
                { icon: 'receipt-outline',      color: '#4895EF', label: 'Log your first expense' },
                { icon: 'flag-outline',         color: '#F59E0B', label: 'Create a savings goal' },
              ].map((item, i, arr) => (
                <View
                  key={item.label}
                  style={[
                    s.readyRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.divider },
                  ]}
                >
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                  <Text style={[s.readyRowText, { color: theme.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, s.primaryBtnLarge, finishing && { opacity: 0.6 }]}
              onPress={finish}
              disabled={finishing}
              activeOpacity={0.85}
            >
              <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.primaryBtnText}>
                {finishing ? 'Loading…' : 'Start Using PennyWise'}
              </Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Top bar: wordmark + step dots */}
      <View style={s.topBar}>
        <Text style={s.wordmark}>PennyWise</Text>
        <View style={s.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === step
                  ? s.dotActive
                  : i < step ? s.dotDone : s.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Hero in green section */}
      <View style={s.heroSection}>{renderHero()}</View>

      {/* White card content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={[s.card, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={s.cardContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={contentStyle}>
            {renderStep()}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 24,
    paddingTop:        10,
    paddingBottom:     16,
  },
  wordmark: {
    fontFamily: Font.headerBold,
    fontSize:   20,
    color:      '#fff',
    letterSpacing: 0.3,
  },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:         { height: 7, borderRadius: 4 },
  dotActive:   { width: 20, backgroundColor: '#fff' },
  dotDone:     { width: 7,  backgroundColor: 'rgba(255,255,255,0.55)' },
  dotInactive: { width: 7,  backgroundColor: 'rgba(255,255,255,0.25)' },

  heroSection: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  heroLogoWrap: {
    width: 110, height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#3ECBA8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  heroLogoImg: { width: 110, height: 110 },
  heroIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    flex: 1,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
  },
  cardContent: {
    paddingHorizontal: 26,
    paddingTop:        28,
    paddingBottom:     48,
  },

  title: {
    fontFamily: Font.headerBold,
    fontSize:   26,
    lineHeight: 32,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Font.bodyRegular,
    fontSize:   14,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Budget input
  budgetWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    borderWidth:     1.5,
    borderRadius:    16,
    paddingHorizontal: 18,
    height:          58,
    marginBottom:    10,
  },
  budgetPrefix: {
    fontFamily: Font.headerBold,
    fontSize:   22,
    marginRight: 6,
  },
  budgetInput: {
    flex:       1,
    fontFamily: Font.headerBold,
    fontSize:   26,
    padding:    0,
  },
  hint: {
    fontFamily:   Font.bodyRegular,
    fontSize:     12,
    marginBottom: 24,
    marginLeft:   2,
  },

  // Feature list
  featureList: {
    borderRadius:  16,
    overflow:      'hidden',
    marginBottom:  4,
  },
  featureRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            14,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  featureIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTitle: {
    fontFamily:   Font.bodySemiBold,
    fontSize:     13.5,
    marginBottom: 2,
  },
  featureDesc: {
    fontFamily: Font.bodyRegular,
    fontSize:   12,
    lineHeight: 17,
  },

  // Ready step
  readyCard: {
    borderRadius:  16,
    paddingHorizontal: 18,
    marginBottom:  28,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    paddingVertical: 13,
  },
  readyRowText: {
    fontFamily: Font.bodyRegular,
    fontSize:   13.5,
  },

  // Buttons
  primaryBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: '#1B7A4A',
    borderRadius:    50,
    paddingVertical: 15,
    shadowColor:     '#1B7A4A',
    shadowOffset:    { width: 0, height: 5 },
    shadowOpacity:   0.28,
    shadowRadius:    10,
    elevation:       5,
  },
  primaryBtnLarge: { paddingVertical: 17 },
  primaryBtnText: {
    fontFamily:    Font.bodySemiBold,
    fontSize:      16,
    color:         '#fff',
    letterSpacing: 0.3,
  },
  skipBtn: { paddingVertical: 14, alignItems: 'center' },
  skipText: { fontFamily: Font.bodyRegular, fontSize: 13 },
});
