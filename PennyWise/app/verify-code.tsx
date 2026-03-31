import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { callFunction } from '@/lib/callFunction';
import { loadingBar } from '@/components/GlobalLoadingBar';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyCodeScreen() {
  const { theme }            = useAppTheme();
  const { email = '' }       = useLocalSearchParams<{ email: string }>();

  const [digits, setDigits]   = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expired, setExpired] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Resend cooldown
  const [cooldown, setCooldown]   = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // Start cooldown on mount (code was just sent)
  useEffect(() => {
    startCooldown();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function handleDigitChange(index: number, value: string) {
    // Accept only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Support pasting a full 6-digit code into any cell
  function handlePaste(index: number, text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length === 6) {
      setDigits(cleaned.split(''));
      inputRefs.current[5]?.focus();
      setError('');
    } else {
      handleDigitChange(index, text);
    }
  }

  const otp      = digits.join('');
  const complete = otp.length === 6;

  async function handleVerify() {
    if (!complete) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');
    loadingBar.start();

    const { data, ok, rawError } = await callFunction('verify-reset-otp', { email, otp });

    loadingBar.finish();
    setLoading(false);

    if (rawError) {
      setError('Network error. Please check your connection.');
      return;
    }

    if (!ok || !(data as any)?.success) {
      const body = (data ?? {}) as any;
      if (body.expired) {
        setExpired(true);
        setError(body.error ?? 'Code expired. Please request a new one.');
      } else {
        if (typeof body.remaining === 'number') setRemaining(body.remaining);
        setError(body.error ?? 'Incorrect code. Please try again.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
      return;
    }

    // Success — navigate with recovery token
    router.push({
      pathname: '/reset-password',
      params: { email, hashedToken: (data as any).hashedToken },
    });
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError('');
    setExpired(false);
    setRemaining(null);
    setDigits(['', '', '', '', '', '']);

    const { data, ok, rawError } = await callFunction('send-reset-otp', { email });

    setResending(false);

    if (rawError) {
      setError('Network error. Could not resend code.');
      return;
    }

    if (!ok) {
      if ((data as any)?.rateLimited) {
        setError('Please wait a moment before requesting another code.');
        return;
      }
      setError('Could not resend code. Please try again.');
      return;
    }

    startCooldown();
    inputRefs.current[0]?.focus();
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]}>
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Code</Text>
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
          {/* Info section */}
          <View style={styles.infoSection}>
            <View style={[styles.iconCircle, { backgroundColor: theme.isDark ? '#1A2820' : '#EDF7F1' }]}>
              <Ionicons name="mail-outline" size={32} color="#1B7A4A" />
            </View>
            <Text style={[styles.infoTitle, { color: theme.textPrimary }]}>Check Your Email</Text>
            <Text style={[styles.infoDesc, { color: theme.textMuted }]}>
              We sent a 6-digit code to
            </Text>
            <Text style={[styles.infoEmail, { color: theme.textPrimary }]} numberOfLines={1}>
              {email}
            </Text>
            <Text style={[styles.infoExpiry, { color: theme.textMuted }]}>
              The code expires in 10 minutes.
            </Text>
          </View>

          {/* OTP digit cells */}
          <View style={styles.otpRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[
                  styles.otpCell,
                  {
                    borderColor: digit
                      ? '#1B7A4A'
                      : error && !expired
                        ? '#E05858'
                        : (theme.isDark ? '#2E4038' : '#D5EDE3'),
                    backgroundColor: theme.isDark ? theme.surface : '#F8FDFB',
                    color: theme.textPrimary,
                  },
                ]}
                value={digit}
                onChangeText={(v) => handlePaste(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
                autoFocus={i === 0}
              />
            ))}
          </View>

          {/* Remaining attempts hint */}
          {remaining !== null && remaining > 0 && !expired && (
            <Text style={[styles.attemptsText, { color: theme.textMuted }]}>
              {remaining} attempt{remaining === 1 ? '' : 's'} remaining
            </Text>
          )}

          {/* Error message */}
          {error !== '' && (
            <View style={[styles.errorBox, { backgroundColor: theme.isDark ? 'rgba(224,88,88,0.12)' : '#FFF0F0' }]}>
              <Ionicons name="alert-circle-outline" size={16} color="#E05858" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyButton, (!complete || loading || expired) && styles.verifyButtonDisabled]}
            activeOpacity={0.85}
            disabled={!complete || loading || expired}
            onPress={handleVerify}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.verifyButtonText}>Verify Code</Text>
            }
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendLabel, { color: theme.textMuted }]}>Didn't receive it? </Text>
            {cooldown > 0 ? (
              <Text style={[styles.resendCooldown, { color: theme.textMuted }]}>
                Resend in {cooldown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
                {resending
                  ? <ActivityIndicator size="small" color="#1B7A4A" />
                  : <Text style={styles.resendLink}>Resend Code</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          {/* Back to login */}
          <TouchableOpacity
            style={styles.backToLoginRow}
            onPress={() => router.replace('/login-form')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={14} color="#1B7A4A" />
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    padding: 6,
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  cardContent: {
    padding: 28,
    paddingBottom: 48,
    gap: 20,
  },

  // ── Info section ─────────────────────────────────────
  infoSection: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  infoDesc: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
  },
  infoEmail: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
  },
  infoExpiry: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    marginTop: 2,
  },

  // ── OTP cells ───────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpCell: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontFamily: Font.headerBold,
    fontSize: 22,
  },

  // ── Attempts hint ───────────────────────────────────
  attemptsText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
  },

  // ── Error ───────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

  // ── Verify button ────────────────────────────────────
  verifyButton: {
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
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  // ── Resend ──────────────────────────────────────────
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  resendLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
  },
  resendLink: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#1B7A4A',
  },
  resendCooldown: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
  },

  // ── Back to login ────────────────────────────────────
  backToLoginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  backToLoginText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: '#1B7A4A',
  },
});
