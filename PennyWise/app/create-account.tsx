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
import { PasswordStrength } from '@/components/password-strength';
import DatePickerModal from '@/components/DatePickerModal';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import { loadingBar } from '@/components/GlobalLoadingBar';
import { sanitizeEmail, sanitizeName, sanitizePhone } from '@/lib/sanitize';

// ── Helpers ───────────────────────────────────────────────────────────────────
const MAX_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13); // must be at least 13 years old
  return d;
})();

const MIN_DOB = new Date(1900, 0, 1);

function formatDob(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreateAccountScreen() {
  const { theme } = useAppTheme();
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [dob, setDob]                         = useState<Date | null>(null);
  const [showPicker, setShowPicker]           = useState(false);
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  function onDobConfirm(date: Date) {
    setDob(date);
    setError('');
  }

  // ── Sign-up logic ─────────────────────────────────────────────────────────
  async function handleSignUp() {
    setError('');

    const cleanName  = sanitizeName(fullName);
    const cleanEmail = sanitizeEmail(email);
    const cleanPhone = sanitizePhone(phone);

    if (!cleanName)            return setError('Full name is required.');
    if (!cleanEmail)           return setError('Email is required.');
    if (!cleanPhone)           return setError('Mobile number is required.');
    if (!dob)                  return setError('Date of birth is required.');
    if (!password)             return setError('Password is required.');
    if (password.length < 6)   return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    loadingBar.start();

    const { error: authError } = await supabase.auth.signUp({
      email:    cleanEmail,
      password,
      options: {
        data: {
          full_name:     cleanName,
          phone:         cleanPhone,
          date_of_birth: dob.toISOString().split('T')[0],
        },
      },
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
        <Text style={styles.headerTitle}>Create Account</Text>
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
          {/* ── Fields ── */}
          <View style={styles.form}>

            <FormInput
              label="Full Name"
              placeholder="John Doe"
              iconName="person-outline"
              value={fullName}
              onChangeText={(v) => { setFullName(v); setError(''); }}
              autoCapitalize="words"
            />

            <FormInput
              label="Email"
              placeholder="example@example.com"
              iconName="mail-outline"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              keyboardType="email-address"
            />

            <FormInput
              label="Mobile Number"
              placeholder="+63 912 345 6789"
              iconName="call-outline"
              value={phone}
              onChangeText={(v) => { setPhone(v); setError(''); }}
              keyboardType="phone-pad"
            />

            {/* ── Date of Birth ── */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.dobRow, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={17} color={theme.textMuted} style={styles.dobIcon} />
                <Text style={[styles.dobText, { color: dob ? theme.textPrimary : theme.textMuted }]}>
                  {dob ? formatDob(dob) : 'Select your date of birth'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.dobHint, { color: theme.textMuted }]}>You must be at least 13 years old.</Text>
            </View>

            <FormInput
              label="Password"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              isPassword
            />

            <PasswordStrength password={password} />

            <FormInput
              label="Confirm Password"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
              isPassword
            />

          </View>

          {/* ── Error banner ── */}
          {error !== '' && (
            <View style={[styles.errorBox, { backgroundColor: theme.isDark ? 'rgba(224,88,88,0.12)' : '#FFF0F0' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#E05858" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Terms ── */}
          <Text style={[styles.termsText, { color: theme.textMuted }]}>
            By continuing, you agree to{'\n'}
            <Text style={styles.termsLink}>Terms of Use</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          {/* ── Sign Up button ── */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={handleSignUp}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>Sign Up</Text>
            }
          </TouchableOpacity>

          {/* ── Footer ── */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login-form')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showPicker}
        value={dob ?? MAX_DOB}
        onConfirm={onDobConfirm}
        onClose={() => setShowPicker(false)}
        maximumDate={MAX_DOB}
        minimumDate={MIN_DOB}
      />

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  cardWrapper: { flex: 1 },
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
  form: { gap: 14 },

  // ── Date of Birth field ──────────────────────────────
  fieldContainer: { gap: 7 },
  fieldLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#1B3D2B',
    marginLeft: 2,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF7F1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  dobRowEmpty: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dobIcon: { marginRight: 10 },
  dobText: {
    flex: 1,
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    color: '#122A1E',
  },
  dobPlaceholder: {
    color: '#BDBDBD',
  },
  dobHint: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: '#9E9E9E',
    marginLeft: 2,
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

  // ── Terms ───────────────────────────────────────────
  termsText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: '#7A7A7A',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: Font.bodySemiBold,
    color: '#1B7A4A',
  },

  // ── Button ──────────────────────────────────────────
  primaryButton: {
    backgroundColor: '#1B7A4A',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1B7A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // ── Footer ──────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
