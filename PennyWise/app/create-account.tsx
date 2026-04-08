import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DatePickerModal from "@/components/DatePickerModal";
import { FormInput } from "@/components/form-input";
import { loadingBar } from "@/components/GlobalLoadingBar";
import { PasswordStrength } from "@/components/password-strength";
import { Font } from "@/constants/fonts";
import { TERMS_SECTIONS, TERMS_VERSION } from "@/constants/terms";
import { useAppTheme } from "@/contexts/AppTheme";
import { sanitizeEmail, sanitizeName, sanitizePhone, filterName, filterEmail, filterPhone } from "@/lib/sanitize";
import { supabase } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MAX_DOB = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d;
})();

const MIN_DOB = new Date(1900, 0, 1);

function formatDob(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isCloseToBottom({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: NativeScrollEvent) {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
}

// ── Terms Modal ───────────────────────────────────────────────────────────────
function TermsModal({
  visible,
  onAccept,
  onClose,
}: {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);

  function handleClose() {
    setScrolledToEnd(false);
    setAccepted(false);
    onClose();
  }

  function handleAccept() {
    setScrolledToEnd(false);
    setAccepted(false);
    onAccept();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[tStyles.safe, { backgroundColor: theme.headerBg }]}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={[tStyles.header, { backgroundColor: theme.headerBg }]}>
          <Text style={tStyles.headerTitle}>Terms & Conditions</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scroll hint */}
        {!scrolledToEnd && (
          <View style={[tStyles.hint, { backgroundColor: theme.headerBg }]}>
            <Ionicons
              name="arrow-down-circle-outline"
              size={15}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={tStyles.hintText}>Scroll to the bottom to accept</Text>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={[tStyles.scroll, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={tStyles.content}
          showsVerticalScrollIndicator={false}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (isCloseToBottom(e.nativeEvent)) setScrolledToEnd(true);
          }}
          scrollEventThrottle={16}
        >
          {TERMS_SECTIONS.map((section, i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <Text
                style={[
                  tStyles.sectionTitle,
                  {
                    color: theme.textPrimary,
                    fontSize: i === 0 ? 17 : 14,
                  },
                ]}
              >
                {section.title}
              </Text>
              {section.subtitle ? (
                <Text
                  style={[
                    tStyles.body,
                    {
                      color: theme.textSecondary,
                      fontStyle: "italic",
                      marginTop: 2,
                    },
                  ]}
                >
                  {section.subtitle}
                </Text>
              ) : null}
              {section.body ? (
                <Text style={[tStyles.body, { color: theme.textSecondary }]}>
                  {section.body}
                </Text>
              ) : null}
            </View>
          ))}

          {/* Checkbox */}
          <TouchableOpacity
            style={tStyles.checkRow}
            onPress={() => scrolledToEnd && setAccepted((v) => !v)}
            activeOpacity={scrolledToEnd ? 0.8 : 1}
          >
            <View
              style={[
                tStyles.checkbox,
                { borderColor: scrolledToEnd ? "#1B7A4A" : "#ccc" },
                accepted && tStyles.checkboxOn,
              ]}
            >
              {accepted && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text
              style={[
                tStyles.checkLabel,
                { color: scrolledToEnd ? theme.textPrimary : theme.textMuted },
              ]}
            >
              I have read and agree to the Terms & Conditions
            </Text>
          </TouchableOpacity>

          {!scrolledToEnd && (
            <Text style={[tStyles.scrollNote, { color: theme.textMuted }]}>
              Please scroll to the bottom before accepting.
            </Text>
          )}

          {/* Accept button */}
          <TouchableOpacity
            style={[
              tStyles.acceptBtn,
              (!scrolledToEnd || !accepted) && tStyles.acceptBtnOff,
            ]}
            activeOpacity={scrolledToEnd && accepted ? 0.85 : 1}
            disabled={!scrolledToEnd || !accepted}
            onPress={handleAccept}
          >
            <Text style={tStyles.acceptBtnText}>Accept & Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreateAccountScreen() {
  const { theme } = useAppTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  function onDobConfirm(date: Date) {
    setDob(date);
    setError("");
  }

  // ── Sign-up logic ─────────────────────────────────────────────────────────
  async function handleSignUp() {
    setError("");

    const cleanName = sanitizeName(fullName);
    const cleanEmail = sanitizeEmail(email);
    const cleanPhone = sanitizePhone(phone);

    if (!cleanName) return setError("Full name is required.");
    if (!cleanEmail) return setError("Email is required.");
    if (!cleanPhone) return setError("Mobile number is required.");
    if (!dob) return setError("Date of birth is required.");
    if (!password) return setError("Password is required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    if (!termsAccepted)
      return setError("You must accept the Terms & Conditions to continue.");

    setLoading(true);
    loadingBar.start();

    const { error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          date_of_birth: dob.toISOString().split("T")[0],
          terms_accepted_version: TERMS_VERSION,
        },
      },
    });

    loadingBar.finish();
    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.headerBg }]}
      {...({ filterTouchesWhenObscured: true } as any)}
    >
      <StatusBar style="light" />

      {/* ── Green header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Account</Text>
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
          {/* ── Fields ── */}
          <View style={styles.form}>
            <FormInput
              label="Full Name"
              placeholder="John Doe"
              iconName="person-outline"
              value={fullName}
              onChangeText={(v) => {
                setFullName(filterName(v));
                setError("");
              }}
              autoCapitalize="words"
            />

            <FormInput
              label="Email"
              placeholder="example@example.com"
              iconName="mail-outline"
              value={email}
              onChangeText={(v) => {
                setEmail(filterEmail(v));
                setError("");
              }}
              keyboardType="email-address"
            />

            <FormInput
              label="Mobile Number"
              placeholder="+63 912 345 6789"
              iconName="call-outline"
              value={phone}
              onChangeText={(v) => {
                setPhone(filterPhone(v));
                setError("");
              }}
              keyboardType="phone-pad"
            />

            {/* ── Date of Birth ── */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Date of Birth
              </Text>
              <TouchableOpacity
                style={[
                  styles.dobRow,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                  },
                ]}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={theme.textMuted}
                  style={styles.dobIcon}
                />
                <Text
                  style={[
                    styles.dobText,
                    { color: dob ? theme.textPrimary : theme.textMuted },
                  ]}
                >
                  {dob ? formatDob(dob) : "Select your date of birth"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
              <Text style={[styles.dobHint, { color: theme.textMuted }]}>
                You must be at least 13 years old.
              </Text>
            </View>

            <FormInput
              label="Password"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError("");
              }}
              isPassword
            />

            <PasswordStrength password={password} />

            <FormInput
              label="Confirm Password"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                setError("");
              }}
              isPassword
            />
          </View>

          {/* ── Error banner ── */}
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

          {/* ── Terms & Conditions row ── */}
          <Pressable
            style={[
              styles.termsRow,
              {
                backgroundColor: theme.inputBg,
                borderColor: termsAccepted ? "#1B7A4A" : theme.inputBorder,
              },
            ]}
            onPress={() => setShowTerms(true)}
          >
            <View
              style={[
                styles.termsCheck,
                { borderColor: termsAccepted ? "#1B7A4A" : "#ccc" },
                termsAccepted && styles.termsCheckOn,
              ]}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={12} color="#fff" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.termsRowLabel, { color: theme.textPrimary }]}
              >
                Terms & Conditions
              </Text>
              <Text style={[styles.termsRowSub, { color: theme.textMuted }]}>
                {termsAccepted
                  ? "Accepted — tap to review"
                  : "Tap to read and accept"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.textMuted}
            />
          </Pressable>

          {/* ── Sign Up button ── */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={loading}
            onPress={handleSignUp}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* ── Footer ── */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/login-form")}
              activeOpacity={0.7}
            >
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

      <TermsModal
        visible={showTerms}
        onAccept={() => {
          setTermsAccepted(true);
          setShowTerms(false);
          setError("");
        }}
        onClose={() => setShowTerms(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  cardWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    color: "#1B3D2B",
    marginLeft: 2,
  },
  dobRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF7F1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  dobRowEmpty: {
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  dobIcon: { marginRight: 10 },
  dobText: {
    flex: 1,
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    color: "#122A1E",
  },
  dobPlaceholder: {
    color: "#BDBDBD",
  },
  dobHint: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    color: "#9E9E9E",
    marginLeft: 2,
  },

  // ── Error ───────────────────────────────────────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0F0",
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

  // ── Terms row ───────────────────────────────────────
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  termsCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  termsCheckOn: {
    backgroundColor: "#1B7A4A",
    borderColor: "#1B7A4A",
  },
  termsRowLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
  },
  termsRowSub: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    marginTop: 1,
  },

  // ── Button ──────────────────────────────────────────
  primaryButton: {
    backgroundColor: "#1B7A4A",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#1B7A4A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  // ── Footer ──────────────────────────────────────────
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: "#7A7A7A",
  },
  footerLink: {
    fontFamily: Font.bodySemiBold,
    fontSize: 13,
    color: "#1B7A4A",
  },
});

// ── Terms modal styles ────────────────────────────────────────────────────────
const tStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    color: "#fff",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  hintText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  scroll: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 44,
  },
  sectionTitle: {
    fontFamily: Font.headerBold,
    marginBottom: 4,
  },
  body: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: "#1B7A4A",
    borderColor: "#1B7A4A",
  },
  checkLabel: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    flex: 1,
  },
  scrollNote: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  acceptBtn: {
    backgroundColor: "#1B7A4A",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#1B7A4A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  acceptBtnOff: { opacity: 0.4 },
  acceptBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: "#fff",
    letterSpacing: 0.4,
  },
});
