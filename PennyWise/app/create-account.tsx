import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '@/components/form-input';
import { PasswordStrength } from '@/components/password-strength';
import { Font } from '@/constants/fonts';
import { supabase } from '@/lib/supabase';

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
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [dob, setDob]                         = useState<Date | null>(null);
  const [tempDob, setTempDob]                 = useState<Date>(MAX_DOB);
  const [showPicker, setShowPicker]           = useState(false);
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  // ── Android: direct picker change ─────────────────────────────────────────
  function onAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setShowPicker(false);
    if (event.type === 'set' && selected) {
      setDob(selected);
      setError('');
    }
  }

  // ── iOS: picker scrolls, we confirm on "Done" ─────────────────────────────
  function onIosChange(_event: DateTimePickerEvent, selected?: Date) {
    if (selected) setTempDob(selected);
  }

  function confirmIosDob() {
    setDob(tempDob);
    setShowPicker(false);
    setError('');
  }

  function openPicker() {
    setTempDob(dob ?? MAX_DOB);
    setShowPicker(true);
  }

  // ── Sign-up logic ─────────────────────────────────────────────────────────
  async function handleSignUp() {
    setError('');

    if (!fullName.trim())      return setError('Full name is required.');
    if (!email.trim())         return setError('Email is required.');
    if (!phone.trim())         return setError('Mobile number is required.');
    if (!dob)                  return setError('Date of birth is required.');
    if (!password)             return setError('Password is required.');
    if (password.length < 6)   return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email:    email.trim(),
      password,
      options: {
        data: {
          full_name:     fullName.trim(),
          phone:         phone.trim(),
          date_of_birth: dob.toISOString().split('T')[0],
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Account</Text>
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
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={[styles.dobRow, !dob && styles.dobRowEmpty]}
                onPress={openPicker}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={17} color="#96BAA8" style={styles.dobIcon} />
                <Text style={[styles.dobText, !dob && styles.dobPlaceholder]}>
                  {dob ? formatDob(dob) : 'Select your date of birth'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#96BAA8" />
              </TouchableOpacity>
              <Text style={styles.dobHint}>You must be at least 13 years old.</Text>
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
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#E05858" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Terms ── */}
          <Text style={styles.termsText}>
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
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login-form')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ════════════════════════════════════════════════
          DATE PICKER
          Android → native dialog (no extra UI needed)
          iOS     → bottom-sheet modal
      ════════════════════════════════════════════════ */}

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={tempDob}
          mode="date"
          display="calendar"
          maximumDate={MAX_DOB}
          minimumDate={MIN_DOB}
          onChange={onAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>

              {/* Handle bar */}
              <View style={styles.sheetHandle} />

              {/* Header row */}
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)} activeOpacity={0.7}>
                  <Text style={styles.sheetCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>Date of Birth</Text>
                <TouchableOpacity onPress={confirmIosDob} activeOpacity={0.7}>
                  <Text style={styles.sheetDone}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Picker wheel */}
              <DateTimePicker
                value={tempDob}
                mode="date"
                display="spinner"
                maximumDate={MAX_DOB}
                minimumDate={MIN_DOB}
                onChange={onIosChange}
                style={styles.iosPicker}
              />

            </Pressable>
          </Pressable>
        </Modal>
      )}

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7CB898',
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
    color: '#3A5A4A',
    marginLeft: 2,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4ED',
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
    color: '#2D4A3E',
  },
  dobPlaceholder: {
    color: '#AABDB5',
  },
  dobHint: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: '#96BAA8',
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
    color: '#7A9A8A',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: Font.bodySemiBold,
    color: '#3ECBA8',
  },

  // ── Button ──────────────────────────────────────────
  primaryButton: {
    backgroundColor: '#3ECBA8',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3ECBA8',
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
    color: '#7A9A8A',
  },
  footerLink: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#3ECBA8',
  },

  // ── iOS bottom-sheet modal ───────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetTitle: {
    fontFamily: Font.headerBold,
    fontSize: 16,
    color: '#1A1A1A',
  },
  sheetCancel: {
    fontFamily: Font.bodyRegular,
    fontSize: 15,
    color: '#888',
  },
  sheetDone: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    color: '#3ECBA8',
  },
  iosPicker: {
    height: 200,
  },
});
