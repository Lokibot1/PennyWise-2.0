import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';

export default function CheckEmailScreen() {
  const { theme } = useAppTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError('');
    setResent(false);

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'pennywise://' },
    });

    setResending(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setResent(true);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Check Your Email</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={56} color="#1B7A4A" />
        </View>

        <Text style={[styles.title, { color: theme.textPrimary }]}>
          Confirm your email address
        </Text>

        <Text style={[styles.body, { color: theme.textSecondary }]}>
          We sent a confirmation link to:
        </Text>
        <Text style={[styles.email, { color: theme.textPrimary }]}>{email}</Text>

        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Open the link in that email to activate your account, then come back here and log in.
        </Text>

        {resent && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#1B7A4A" />
            <Text style={styles.successText}>Confirmation email resent!</Text>
          </View>
        )}

        {error !== '' && (
          <View style={[styles.errorBox, { backgroundColor: theme.isDark ? 'rgba(224,88,88,0.12)' : '#FFF0F0' }]}>
            <Ionicons name="alert-circle-outline" size={15} color="#E05858" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/login-form')}
        >
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: theme.isDark ? theme.surface : '#EDF7F1' }]}
          activeOpacity={0.85}
          disabled={resending}
          onPress={handleResend}
        >
          {resending
            ? <ActivityIndicator color="#1B7A4A" />
            : <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>Resend Email</Text>
          }
        </TouchableOpacity>

        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Didn&apos;t receive it? Check your spam folder or tap &quot;Resend Email&quot;.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Font.headerBlack,
    fontSize: 34,
    color: '#fff',
    letterSpacing: -0.5,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    textAlign: 'center',
  },
  body: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  email: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    textAlign: 'center',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDF7F1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
  },
  successText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#1B7A4A',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
  },
  errorText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#E05858',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#1B7A4A',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 8,
    shadowColor: '#1B7A4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  secondaryBtnText: {
    fontFamily: Font.headerBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  hint: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
