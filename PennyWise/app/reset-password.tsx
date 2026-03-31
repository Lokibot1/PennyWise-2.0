import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { Font } from "@/constants/fonts";
import { useAppTheme } from "@/contexts/AppTheme";
import { supabase } from "@/lib/supabase";
import { loadingBar } from "@/components/GlobalLoadingBar";

const PW_RULES = [
  { label: "At least 9 characters", test: (p: string) => p.length >= 9 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  {
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

export default function ResetPasswordScreen() {
  const { theme } = useAppTheme();
  const { email = "", hashedToken = "" } = useLocalSearchParams<{
    email: string;
    hashedToken: string;
  }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [successModal, setSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const barAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exchange the recovery token for a session as soon as the screen mounts
  useEffect(() => {
    if (!hashedToken) {
      setSessionError("Invalid reset link. Please start over.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash: hashedToken, type: "recovery" })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          setSessionError(
            "This reset link has expired. Please request a new code.",
          );
        } else {
          setSessionReady(true);
        }
      });
  }, [hashedToken]);

  // Countdown for success modal
  useEffect(() => {
    if (!successModal) return;
    setCountdown(5);
    barAnim.setValue(1);
    Animated.timing(barAnim, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: false,
    }).start();
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          supabase.auth.signOut();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [successModal]);

  const pwRules = PW_RULES.map((r) => ({ ...r, met: r.test(newPassword) }));
  const allRulesMet = pwRules.every((r) => r.met);
  const confirmMatch =
    confirmPassword.length > 0 && confirmPassword === newPassword;

  async function handleReset() {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!allRulesMet) {
      setError("Please meet all password requirements.");
      return;
    }
    if (!confirmMatch) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    loadingBar.start();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    loadingBar.finish();
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Notify the user of the change (fire-and-forget)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const params = new URLSearchParams({
        email: user.email,
        name: user.user_metadata?.full_name ?? "",
      });
      supabase.functions
        .invoke(`send-password-changed-email?${params.toString()}`)
        .catch(() => {
          /* non-critical */
        });
    }

    setSuccessModal(true);
  }

  // ── Session error state ──────────────────────────────────────────────────────
  if (sessionError) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.headerBg }]}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reset Password</Text>
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBg,
              flex: 1,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
            },
          ]}
        >
          <View style={styles.sessionErrorBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#E05858" />
            <Text
              style={[styles.sessionErrorTitle, { color: theme.textPrimary }]}
            >
              Link Expired
            </Text>
            <Text style={[styles.sessionErrorDesc, { color: theme.textMuted }]}>
              {sessionError}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace("/forgot-password")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Request New Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.headerBg }]}
    >
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reset Password</Text>
      </View>

      {/* ── Card ── */}
      <KeyboardAvoidingView
        style={styles.cardWrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={[styles.card, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <View style={styles.introSection}>
            <Text style={[styles.introTitle, { color: theme.textPrimary }]}>
              Create New Password
            </Text>
            <Text style={[styles.introDesc, { color: theme.textMuted }]}>
              Choose a strong password for your account.
            </Text>
          </View>

          {/* ── Password fields ── */}
          <View
            style={[styles.formSection, { backgroundColor: theme.surface }]}
          >
            {/* New Password */}
            <View
              style={[
                styles.formField,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.divider,
                  flexWrap: "wrap",
                },
              ]}
            >
              <View style={styles.formFieldIcon}>
                <Ionicons name="key-outline" size={16} color="#1B7A4A" />
              </View>
              <View style={styles.formFieldBody}>
                <Text
                  style={[styles.formFieldLabel, { color: theme.textMuted }]}
                >
                  New Password
                </Text>
                <TextInput
                  style={[styles.formFieldInput, { color: theme.textPrimary }]}
                  value={newPassword}
                  onChangeText={(v) => {
                    setNewPassword(v);
                    setError("");
                  }}
                  secureTextEntry={!showNew}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  editable={sessionReady}
                />
              </View>
              <TouchableOpacity onPress={() => setShowNew((v) => !v)}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {newPassword.length > 0 && (
                <View style={styles.pwRulesContainer}>
                  {pwRules.map((rule) => (
                    <View key={rule.label} style={styles.pwRuleRow}>
                      <Ionicons
                        name={rule.met ? "checkmark-circle" : "ellipse-outline"}
                        size={14}
                        color={rule.met ? "#1B7A4A" : theme.textMuted}
                      />
                      <Text
                        style={[
                          styles.pwRuleText,
                          { color: rule.met ? "#1B7A4A" : theme.textMuted },
                        ]}
                      >
                        {rule.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={[styles.formField, { flexWrap: "wrap" }]}>
              <View style={styles.formFieldIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#1B7A4A"
                />
              </View>
              <View style={styles.formFieldBody}>
                <Text
                  style={[styles.formFieldLabel, { color: theme.textMuted }]}
                >
                  Confirm Password
                </Text>
                <TextInput
                  style={[styles.formFieldInput, { color: theme.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={(v) => {
                    setConfirmPassword(v);
                    setError("");
                  }}
                  secureTextEntry={!showConfirm}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  editable={sessionReady}
                />
              </View>
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {confirmPassword.length > 0 && (
                <View style={styles.pwRulesContainer}>
                  <View style={styles.pwRuleRow}>
                    <Ionicons
                      name={confirmMatch ? "checkmark-circle" : "close-circle"}
                      size={14}
                      color={confirmMatch ? "#1B7A4A" : "#E05555"}
                    />
                    <Text
                      style={[
                        styles.pwRuleText,
                        { color: confirmMatch ? "#1B7A4A" : "#E05555" },
                      ]}
                    >
                      {confirmMatch
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Error */}
          {error !== "" && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: theme.isDark
                    ? "rgba(224,88,88,0.12)"
                    : "#FFF0F0",
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#E05858" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (saving || !sessionReady) && styles.primaryButtonDisabled,
            ]}
            onPress={handleReset}
            disabled={saving || !sessionReady}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {sessionReady ? "Set New Password" : "Verifying…"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Success modal ── */}
      <Modal
        visible={successModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.successOverlay}>
          <View
            style={[styles.successCard, { backgroundColor: theme.surface }]}
          >
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#1B7A4A" />
            </View>
            <Text style={[styles.successTitle, { color: theme.textPrimary }]}>
              Password Reset!
            </Text>
            <Text style={[styles.successBody, { color: theme.textMuted }]}>
              Your password has been updated successfully. Youll be signed out
              automatically.
            </Text>
            <View style={[styles.barTrack, { backgroundColor: theme.divider }]}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width: barAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.countdownText, { color: theme.textMuted }]}>
              Signing out in{" "}
              <Text style={{ color: "#1B7A4A", fontFamily: Font.headerBold }}>
                {countdown}s
              </Text>
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1B3D2B",
  },

  // ── Header ──────────────────────────────────────────
  header: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Font.headerBlack,
    fontSize: 36,
    color: "#FFFFFF",
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

  // ── Intro ────────────────────────────────────────────
  introSection: {
    gap: 8,
  },
  introTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  introDesc: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Form section ─────────────────────────────────────
  formSection: {
    borderRadius: 16,
    overflow: "hidden",
  },
  formField: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  formFieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(27,122,74,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  formFieldBody: {
    flex: 1,
    gap: 2,
  },
  formFieldLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formFieldInput: {
    fontFamily: Font.bodyMedium,
    fontSize: 15,
    paddingVertical: 2,
  },
  pwRulesContainer: {
    width: "100%",
    paddingLeft: 40,
    paddingRight: 8,
    paddingBottom: 10,
    gap: 6,
  },
  pwRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  pwRuleText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
  },

  // ── Error ───────────────────────────────────────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: "#E05858",
    flex: 1,
  },

  // ── Buttons ─────────────────────────────────────────
  primaryButton: {
    backgroundColor: "#1B7A4A",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 52,
    shadowColor: "#1B7A4A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  // ── Session error state ──────────────────────────────
  sessionErrorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  sessionErrorTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  sessionErrorDesc: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Success modal ────────────────────────────────────
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  successIconWrap: {
    marginBottom: 4,
  },
  successTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  successBody: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  barTrack: {
    width: "100%",
    height: 6,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 4,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#1B7A4A",
    borderRadius: 10,
  },
  countdownText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
  },
});
