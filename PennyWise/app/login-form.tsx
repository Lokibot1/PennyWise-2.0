import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

import { FormInput } from '@/components/form-input';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import { loadingBar } from '@/components/GlobalLoadingBar';
import { sanitizeEmail } from '@/lib/sanitize';

export default function LoginFormScreen() {
  const { theme } = useAppTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));


  async function handleLogin() {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail || !password) return;
    setLoading(true);
    setError('');
    loadingBar.start();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    cleanEmail,
      password,
    });

    loadingBar.finish();
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]} {...({ filterTouchesWhenObscured: true } as any)}>
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome</Text>
      </View>

      {/* ── Card ── */}
      <KeyboardAvoidingView
        style={styles.cardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={[styles.card, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form */}
          <View style={styles.form}>
            <FormInput
              label="Username Or Email"
              placeholder="example@example.com"
              iconName="mail-outline"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              keyboardType="email-address"
            />
            <FormInput
              label="Password"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              isPassword
            />
          </View>

          {/* Error message */}
          {error !== '' && (
            <View style={[styles.errorBox, { backgroundColor: theme.isDark ? 'rgba(224,88,88,0.12)' : '#FFF0F0' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#E05858" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Log In */}
          <Animated.View style={btnStyle}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              activeOpacity={1}
              disabled={loading}
              onPressIn={() => { btnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
              onPressOut={() => { btnScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
              onPress={handleLogin}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryButtonText}>Log In</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => router.push('/forgot-password')}
            activeOpacity={0.7}
            style={styles.forgotButton}
          >
            <Text style={[styles.forgotText, { color: theme.textMuted }]}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign Up */}
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme.isDark ? theme.surface : '#EDF7F1' }]}
            onPress={() => router.push('/create-account')}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>Sign Up</Text>
          </TouchableOpacity>

          {/* Social divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>or sign up with</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]} activeOpacity={0.7}>
              <Ionicons name="logo-facebook" size={22} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.inputBorder }]} activeOpacity={0.7}>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/create-account')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1B3D2B',
  },

  // ── Header ──────────────────────────────────────────
  header: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },

  headerTitle: {
    fontFamily: Font.headerBlack,
    fontSize: 40,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  // ── Card ────────────────────────────────────────────
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  cardContent: {
    padding: 28,
    paddingBottom: 48,
    gap: 14,
  },

  // ── Form ────────────────────────────────────────────
  form: {
    gap: 14,
    marginBottom: 4,
  },

  // ── Error ───────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#E05858',
    flex: 1,
  },

  // ── Buttons ─────────────────────────────────────────
  primaryButton: {
    backgroundColor: '#1B7A4A',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#1B7A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  forgotText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#8A8A8A',
  },
  secondaryButton: {
    backgroundColor: '#EDF7F1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: Font.headerBold,
    fontSize: 18,
    color: '#122A1E',
    letterSpacing: -0.2,
  },

  // ── Social ──────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#C8DDD2',
  },
  dividerText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: '#9E9E9E',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#C8DDD2',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  // ── Footer ──────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  footerText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#7A7A7A',
  },
  footerLink: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#1B7A4A',
  },
});
