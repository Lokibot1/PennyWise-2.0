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
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [sent, setSent]     = useState(false);

  async function handleReset() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim()
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forgot Password</Text>
      </View>

      {/* ── White card ── */}
      <KeyboardAvoidingView
        style={styles.cardWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.card}
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {sent ? (
            /* ── Success state ── */
            <View style={styles.successBox}>
              <Ionicons name="mail-outline" size={48} color="#1B7A4A" />
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successDesc}>
                We sent a password reset link to{'\n'}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => router.replace('/login-form')}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Reset section */}
              <View style={styles.resetSection}>
                <Text style={styles.resetTitle}>Reset Password?</Text>
                <Text style={styles.resetDescription}>
                  Enter the email address linked to your account and we'll send
                  you a link to reset your password.
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
                <View style={styles.errorBox}>
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
                  : <Text style={styles.nextButtonText}>Next Step</Text>
                }
              </TouchableOpacity>

              {/* Sign Up */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/create-account')}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Sign Up</Text>
              </TouchableOpacity>

              {/* Social divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign up with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/create-account')} activeOpacity={0.7}>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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

  // ── Success state ────────────────────────────────────
  successBox: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
  },
  successTitle: {
    fontFamily: Font.headerBold,
    fontSize: 24,
    color: '#1E3A2E',
  },
  successDesc: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    fontFamily: Font.bodySemiBold,
    color: '#1B7A4A',
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
