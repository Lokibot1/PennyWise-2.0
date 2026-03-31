import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '@/components/form-input';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { callFunction } from '@/lib/callFunction';
import { loadingBar } from '@/components/GlobalLoadingBar';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const { theme } = useAppTheme();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleReset() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    loadingBar.start();

    const { data, ok, status, rawError } = await callFunction('send-reset-otp', {
      email: trimmed.toLowerCase(),
    });

    loadingBar.finish();
    setLoading(false);

    if (rawError) {
      setError('Network error. Please check your connection.');
      return;
    }

    if (!ok) {
      if ((data as any)?.rateLimited) {
        setError('Please wait a moment before requesting another code.');
        return;
      }
      setError((data as any)?.error ?? `Error ${status}. Please try again.`);
      return;
    }

    // Always navigate on success — prevents user enumeration
    router.push({ pathname: '/verify-code', params: { email: trimmed.toLowerCase() } });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]}>
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forgot Password</Text>
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
          {/* Reset section */}
          <View style={styles.resetSection}>
            <Text style={[styles.resetTitle, { color: theme.textPrimary }]}>Reset Password?</Text>
            <Text style={[styles.resetDescription, { color: theme.textMuted }]}>
              Enter the email address linked to your account and we'll send
              you a 6-digit verification code.
            </Text>
          </View>

          {/* Email input */}
          <FormInput
            label="Enter Email Address"
            placeholder="example@example.com"
            iconName="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
          />

          {/* Error message */}
          {error !== '' && (
            <View style={[styles.errorBox, { backgroundColor: theme.isDark ? 'rgba(224,88,88,0.12)' : '#FFF0F0' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#E05858" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Next Step */}
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={handleReset}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextButtonText}>Send Code</Text>
            }
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
    fontSize: 36,
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
    gap: 16,
  },

  // ── Reset section ───────────────────────────────────
  resetSection: {
    gap: 10,
    marginBottom: 6,
  },
  resetTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    color: '#1E3A2E',
    letterSpacing: -0.3,
  },
  resetDescription: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#7A7A7A',
    lineHeight: 20,
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
  nextButton: {
    backgroundColor: '#1B7A4A',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 52,
    shadowColor: '#1B7A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
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
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0D8C8',
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
    borderColor: '#E0D8C8',
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
