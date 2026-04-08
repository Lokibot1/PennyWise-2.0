import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BudgetLimitModal from "@/components/BudgetLimitModal";
import ConfirmModal from "@/components/ConfirmModal";
import ErrorModal from "@/components/ErrorModal";
import { loadingBar } from "@/components/GlobalLoadingBar";
import NotificationBell from "@/components/NotificationBell";
import { PennyWiseLogo } from "@/components/penny-wise-logo";
import {
  ProfileAvatarSkeleton,
  ProfileCardSkeleton,
  ProfileInfoSkeleton,
} from "@/components/SkeletonLoader";
import { Font } from "@/constants/fonts";
import { PRIVACY_SECTIONS } from "@/constants/privacy";
import { TERMS_SECTIONS } from "@/constants/terms";
import { useAppTheme } from "@/contexts/AppTheme";
import { useNotifications } from "@/contexts/NotificationContext";
import { sfx } from "@/lib/sfx";
import { supabase } from "@/lib/supabase";
import { DataCache } from "@/lib/dataCache";
import { Cache } from "@/lib/cache";
import { sanitizeName, sanitizeEmail, sanitizePhone, filterName, filterEmail, filterPhone } from "@/lib/sanitize";

// ── Types ─────────────────────────────────────────────────────────────────────
type Screen = "profile" | "edit" | "terms" | "privacy" | "settings" | "notif-settings" | "change-password";
type IoniconName = keyof typeof Ionicons.glyphMap;
type ProfileData = {
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Nav header ────────────────────────────────────────────────────────────────
function NavHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.nav}>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}
        onPress={onBack ?? (() => router.replace("/(tabs)"))}
        activeOpacity={0.8}
      >
        {onBack ? (
          <Ionicons name="chevron-back" size={22} color={theme.iconBtnColor} />
        ) : (
          <PennyWiseLogo size="xs" />
        )}
      </TouchableOpacity>
      <Text style={[styles.navTitle, { color: theme.iconBtnColor }]}>
        {title}
      </Text>
      <NotificationBell
        style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}
        iconColor={theme.iconBtnColor}
      />
    </View>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({
  name,
  uri,
  size = 96,
  showEdit,
  onEditPress,
}: {
  name: string;
  uri?: string;
  size?: number;
  showEdit?: boolean;
  onEditPress?: () => void;
}) {
  const initials = name ? getInitials(name) : "";
  const fontSize = Math.round(size * 0.35);
  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : initials ? (
    <Text style={[styles.avatarInitials, { fontSize }]}>{initials}</Text>
  ) : (
    <Ionicons name="person" size={size * 0.46} color="#fff" />
  );
  return (
    <TouchableOpacity
      style={{ position: "relative" }}
      onPress={onEditPress}
      disabled={!onEditPress}
      activeOpacity={onEditPress ? 0.8 : 1}
    >
      <View
        style={[
          styles.avatarRing,
          { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 },
        ]}
      >
        <View
          style={[
            styles.avatarCircle,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          {inner}
        </View>
      </View>
      {showEdit && (
        <View style={[styles.cameraBadge, { bottom: 2, right: 2 }]}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Menu group ────────────────────────────────────────────────────────────────
function MenuGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.menuGroup}>
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
        {label}
      </Text>
      <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
        {children}
      </View>
    </View>
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────
function MenuItem({
  icon,
  iconBg,
  label,
  value,
  danger,
  last,
  onPress,
}: {
  icon: IoniconName;
  iconBg: string;
  label: string;
  value?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.divider },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? "#E05555" : theme.textPrimary },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[styles.menuValue, { color: theme.textMuted }]}>
          {value}
        </Text>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={danger ? "#E05555" : theme.textMuted}
        />
      )}
    </TouchableOpacity>
  );
}

// ── Profile view ──────────────────────────────────────────────────────────────
function ProfileView({
  profile,
  loading,
  navigate,
}: {
  profile: ProfileData;
  loading: boolean;
  navigate: (s: Screen) => void;
}) {
  const { theme } = useAppTheme();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [errModal, setErrModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  async function confirmLogout() {
    loadingBar.start();
    const { error } = await supabase.auth.signOut();
    loadingBar.finish();
    if (error) {
      setErrModal({
        visible: true,
        title: "Sign Out Failed",
        message: error.message,
      });
    } else {
      Cache.clearAll();
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top", "left", "right"]}
      {...({ filterTouchesWhenObscured: true } as any)}
    >
      <StatusBar style={theme.statusBar} />

      {/* ── Header ── */}
      <View style={[styles.greenSection, { backgroundColor: theme.headerBg }]}>
        <NavHeader title="Profile" />
        <View style={styles.avatarBlock}>
          {loading ? (
            <ProfileAvatarSkeleton />
          ) : (
            <Avatar
              name={profile.full_name}
              uri={profile.avatar_url}
              size={100}
            />
          )}
          {loading ? (
            <ProfileInfoSkeleton />
          ) : (
            <>
              <Text style={styles.headerName}>
                {profile.full_name || "Your Name"}
              </Text>
              {(!!profile.email || !!profile.phone) && (
                <View style={styles.headerMeta}>
                  {!!profile.email && (
                    <View style={styles.headerMetaItem}>
                      <Ionicons
                        name="mail-outline"
                        size={10}
                        color="rgba(255,255,255,0.6)"
                      />
                      <Text style={styles.headerEmail}>{profile.email}</Text>
                    </View>
                  )}
                  {!!profile.email && !!profile.phone && (
                    <Text style={styles.headerMetaSep}>|</Text>
                  )}
                  {!!profile.phone && (
                    <View style={styles.headerMetaItem}>
                      <Ionicons
                        name="call-outline"
                        size={10}
                        color="rgba(255,255,255,0.6)"
                      />
                      <Text style={styles.headerEmail}>{profile.phone}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* ── Card ── */}
      <ScrollView
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {loading ? (
          <ProfileCardSkeleton />
        ) : (
          <>
            {/* Account section */}
            <MenuGroup label="ACCOUNT">
              <MenuItem
                icon="person-outline"
                iconBg="#1B7A4A"
                label="Edit Profile"
                onPress={() => navigate("edit")}
              />
              <MenuItem
                icon="document-text-outline"
                iconBg="#2D7A5A"
                label="Terms & Conditions"
                onPress={() => navigate("terms")}
              />
              <MenuItem
                icon="shield-checkmark-outline"
                iconBg="#1B6B3A"
                label="Privacy Policy"
                onPress={() => navigate("privacy")}
                last
              />
            </MenuGroup>

            {/* General section */}
            <MenuGroup label="GENERAL">
              <MenuItem
                icon="settings-outline"
                iconBg="#115533"
                label="Settings"
                onPress={() => navigate("settings")}
              />
              <MenuItem
                icon="headset-outline"
                iconBg="#43A872"
                label="Help & Support"
                last
              />
            </MenuGroup>

            {/* Danger zone */}
            <View
              style={[
                styles.dangerCard,
                { backgroundColor: "rgba(224,85,85,0.08)" },
              ]}
            >
              <MenuItem
                icon="log-out-outline"
                iconBg="#E05555"
                label="Log Out"
                danger
                last
                onPress={() => setLogoutVisible(true)}
              />
            </View>

            <View style={{ height: 32 }} />
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={logoutVisible}
        onClose={() => setLogoutVisible(false)}
        onConfirm={confirmLogout}
        title="Log Out?"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        confirmColor="#E05555"
        icon="log-out-outline"
      />

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Edit profile view ─────────────────────────────────────────────────────────
function EditProfileView({
  profile,
  onBack,
  onSaved,
}: {
  profile: ProfileData;
  onBack: () => void;
  onSaved: (u: ProfileData) => void;
}) {
  const { theme } = useAppTheme();
  const [username, setUsername] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [errModal, setErrModal] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const displayUri = avatarRemoved
    ? undefined
    : (previewUri ?? profile.avatar_url);
  const hasPhoto = !!displayUri;

  async function pickFromLibrary() {
    setShowPhotoMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setErrModal({
        visible: true,
        title: "Permission Denied",
        message: "Please allow access to your photo library in Settings.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      setAvatarRemoved(false);
    }
  }

  async function takePhoto() {
    setShowPhotoMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setErrModal({
        visible: true,
        title: "Permission Denied",
        message: "Please allow camera access in Settings.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      setAvatarRemoved(false);
    }
  }

  function removePhoto() {
    setShowPhotoMenu(false);
    setPreviewUri(null);
    setAvatarRemoved(true);
  }

  async function handleSave() {
    setConfirm(false);
    setSaving(true);
    loadingBar.start();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      loadingBar.finish();
      setSaving(false);
      setErrModal({
        visible: true,
        title: "Authentication Error",
        message:
          userError?.message ?? "Could not retrieve user. Please log in again.",
      });
      return;
    }

    let newAvatarUrl: string | null = profile.avatar_url ?? null;

    // Upload new photo if picked
    if (previewUri) {
      try {
        const fileExt = previewUri.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const base64 = await FileSystem.readAsStringAsync(previewUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const arrayBuffer = decode(base64);
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, arrayBuffer, {
            upsert: true,
            contentType: `image/${fileExt}`,
          });
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);
        newAvatarUrl = publicUrl;
      } catch (err: any) {
        loadingBar.finish();
        setSaving(false);
        setErrModal({
          visible: true,
          title: "Upload Failed",
          message: err?.message ?? "Could not upload profile photo.",
        });
        return;
      }
    } else if (avatarRemoved) {
      newAvatarUrl = null;
    }

    const cleanName  = sanitizeName(username);
    const cleanPhone = sanitizePhone(phone);
    const cleanEmail = sanitizeEmail(email);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName,
        phone:     cleanPhone,
        email:     cleanEmail,
        avatar_url: newAvatarUrl,
      })
      .eq("id", user.id);
    loadingBar.finish();
    setSaving(false);
    if (error) {
      setErrModal({
        visible: true,
        title: "Failed to Update Profile",
        message: error.message,
      });
    } else {
      DataCache.invalidateProfile(user.id);
      DataCache.invalidateDashboard(user.id);
      sfx.success();
      onSaved({
        full_name: cleanName,
        phone:     cleanPhone,
        email:     cleanEmail,
        avatar_url: newAvatarUrl ?? undefined,
      });
      onBack();
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top", "left", "right"]}
      {...({ filterTouchesWhenObscured: true } as any)}
    >
      <StatusBar style={theme.statusBar} />

      {/* Sticky header — always visible */}
      <View
        style={[
          styles.greenSection,
          { backgroundColor: theme.headerBg, paddingBottom: 24 },
        ]}
      >
        <NavHeader title="Edit Profile" onBack={onBack} />
        <View style={styles.avatarBlock}>
          <Avatar
            name={username}
            uri={displayUri}
            size={88}
            showEdit
            onEditPress={() => setShowPhotoMenu(true)}
          />
          <Text style={styles.headerName}>{username || "Your Name"}</Text>
          <TouchableOpacity
            onPress={() => setShowPhotoMenu(true)}
            activeOpacity={0.7}
            style={{ marginTop: 6 }}
          >
            <Text
              style={{
                fontFamily: Font.bodyMedium,
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {hasPhoto ? "Change photo" : "Add photo"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo picker action sheet */}
      <Modal
        visible={showPhotoMenu}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowPhotoMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setShowPhotoMenu(false)}
        />
        <View style={[styles.photoSheet, { backgroundColor: theme.modalBg }]}>
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.divider,
              alignSelf: "center",
              marginBottom: 20,
            }}
          />
          <Text style={[styles.photoSheetTitle, { color: theme.textPrimary }]}>
            Profile Photo
          </Text>

          <TouchableOpacity
            style={[
              styles.photoSheetBtn,
              { borderBottomWidth: 1, borderBottomColor: theme.divider },
            ]}
            onPress={pickFromLibrary}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.photoSheetIcon,
                { backgroundColor: "rgba(27,122,74,0.12)" },
              ]}
            >
              <Ionicons name="images-outline" size={20} color="#1B7A4A" />
            </View>
            <Text
              style={[styles.photoSheetLabel, { color: theme.textPrimary }]}
            >
              Choose from Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.photoSheetBtn,
              hasPhoto
                ? { borderBottomWidth: 1, borderBottomColor: theme.divider }
                : {},
            ]}
            onPress={takePhoto}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.photoSheetIcon,
                { backgroundColor: "rgba(27,122,74,0.12)" },
              ]}
            >
              <Ionicons name="camera-outline" size={20} color="#1B7A4A" />
            </View>
            <Text
              style={[styles.photoSheetLabel, { color: theme.textPrimary }]}
            >
              Take Photo
            </Text>
          </TouchableOpacity>

          {hasPhoto && (
            <TouchableOpacity
              style={styles.photoSheetBtn}
              onPress={removePhoto}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.photoSheetIcon,
                  { backgroundColor: "rgba(224,85,85,0.12)" },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color="#E05555" />
              </View>
              <Text style={[styles.photoSheetLabel, { color: "#E05555" }]}>
                Remove Photo
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 14, marginTop: 4 }}
            onPress={() => setShowPhotoMenu(false)}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontFamily: Font.bodyMedium,
                fontSize: 15,
                color: theme.textSecondary,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Scrollable form */}
      <ScrollView
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={[styles.cardContent, { paddingTop: 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal info section */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted }]}>
          PERSONAL INFO
        </Text>
        <View style={[styles.formSection, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.formField,
              { borderBottomWidth: 1, borderBottomColor: theme.divider },
            ]}
          >
            <View style={styles.formFieldIcon}>
              <Ionicons name="person-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={styles.formFieldBody}>
              <Text style={[styles.formFieldLabel, { color: theme.textMuted }]}>
                Username
              </Text>
              <TextInput
                style={[styles.formFieldInput, { color: theme.textPrimary }]}
                value={username}
                onChangeText={(v) => setUsername(filterName(v))}
                placeholderTextColor={theme.textMuted}
                placeholder="e.g. John Smith"
              />
            </View>
          </View>

          <View
            style={[
              styles.formField,
              { borderBottomWidth: 1, borderBottomColor: theme.divider },
            ]}
          >
            <View style={styles.formFieldIcon}>
              <Ionicons name="call-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={styles.formFieldBody}>
              <Text style={[styles.formFieldLabel, { color: theme.textMuted }]}>
                Phone (optional)
              </Text>
              <TextInput
                style={[styles.formFieldInput, { color: theme.textPrimary }]}
                value={phone}
                onChangeText={(v) => setPhone(filterPhone(v))}
                keyboardType="phone-pad"
                placeholderTextColor={theme.textMuted}
                placeholder="e.g. +63 912 345 6789"
              />
            </View>
          </View>

          <View style={styles.formField}>
            <View style={styles.formFieldIcon}>
              <Ionicons name="mail-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={styles.formFieldBody}>
              <Text style={[styles.formFieldLabel, { color: theme.textMuted }]}>
                Email (optional)
              </Text>
              <TextInput
                style={[styles.formFieldInput, { color: theme.textPrimary }]}
                value={email}
                onChangeText={(v) => setEmail(filterEmail(v))}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.textMuted}
                placeholder="e.g. john@example.com"
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          activeOpacity={0.85}
          disabled={saving}
          onPress={() => setConfirm(true)}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.7}
          onPress={onBack}
          disabled={saving}
        >
          <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
          <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
            Back to Profile
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ConfirmModal
        visible={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={handleSave}
        title="Save Changes?"
        message="Are you sure you want to save the changes to your profile?"
        confirmLabel="Save"
        confirmColor="#1B7A4A"
        icon="save-outline"
      />

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Terms view ────────────────────────────────────────────────────────────────

function TermsView({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top", "left", "right"]}
      {...({ filterTouchesWhenObscured: true } as any)}
    >
      <StatusBar style={theme.statusBar} />
      <View
        style={[
          styles.greenSection,
          styles.termsHeader,
          { backgroundColor: theme.headerBg },
        ]}
      >
        <NavHeader title="Terms & Conditions" onBack={onBack} />
      </View>
      <ScrollView
        style={[styles.termsScroll, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={styles.termsContent}
        showsVerticalScrollIndicator={false}
      >
        {TERMS_SECTIONS.map((section, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text
              style={[
                styles.termsText,
                {
                  color: theme.textPrimary,
                  fontFamily: Font.headerBold,
                  fontSize: i === 0 ? 17 : 14,
                  marginBottom: 4,
                },
              ]}
            >
              {section.title}
            </Text>
            {section.subtitle ? (
              <Text
                style={[
                  styles.termsText,
                  { color: theme.textSecondary, fontStyle: "italic", marginBottom: 6 },
                ]}
              >
                {section.subtitle}
              </Text>
            ) : null}
            {section.body ? (
              <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                {section.body}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Privacy Policy view ───────────────────────────────────────────────────────
function PrivacyView({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={theme.statusBar} />
      <View
        style={[
          styles.greenSection,
          styles.termsHeader,
          { backgroundColor: theme.headerBg },
        ]}
      >
        <NavHeader title="Privacy Policy" onBack={onBack} />
      </View>
      <ScrollView
        style={[styles.termsScroll, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={styles.termsContent}
        showsVerticalScrollIndicator={false}
      >
        {PRIVACY_SECTIONS.map((section, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <Text
              style={[
                styles.termsText,
                {
                  color: theme.textPrimary,
                  fontFamily: Font.headerBold,
                  fontSize: i === 0 ? 17 : 14,
                  marginBottom: 4,
                },
              ]}
            >
              {section.title}
            </Text>
            {section.subtitle ? (
              <Text
                style={[
                  styles.termsText,
                  { color: theme.textSecondary, fontStyle: "italic", marginBottom: 6 },
                ]}
              >
                {section.subtitle}
              </Text>
            ) : null}
            {section.body ? (
              <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                {section.body}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Delete account modal ───────────────────────────────────────────────────────
function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { theme } = useAppTheme();
  const [input, setInput] = useState("");
  const confirmed = input.trim() === "DELETE";

  function handleClose() {
    setInput("");
    onClose();
  }

  function handleConfirm() {
    if (!confirmed) return;
    sfx.error();
    setInput("");
    onConfirm();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
          onPress={handleClose}
        />
        <Pressable
          style={[
            {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 44,
              alignItems: "center",
              backgroundColor: theme.modalBg,
            },
          ]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.divider,
              marginBottom: 24,
            }}
          />

          {/* Icon */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "rgba(224,85,85,0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="trash-outline" size={30} color="#E05555" />
          </View>

          <Text
            style={{
              fontFamily: Font.headerBold,
              fontSize: 20,
              color: theme.textPrimary,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Delete Account?
          </Text>
          <Text
            style={{
              fontFamily: Font.bodyRegular,
              fontSize: 13,
              color: theme.textSecondary,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 24,
              paddingHorizontal: 8,
            }}
          >
            This will permanently delete your account and all your financial
            data. {"\n\n"}
            To confirm, type{" "}
            <Text style={{ fontFamily: Font.bodySemiBold, color: "#E05555" }}>
              DELETE
            </Text>{" "}
            below.
          </Text>

          {/* Confirmation input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              width: "100%",
              borderWidth: 1.5,
              borderColor: confirmed ? "#E05555" : theme.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 14,
              backgroundColor: theme.surface,
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={confirmed ? "#E05555" : theme.textMuted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                fontFamily: Font.bodySemiBold,
                fontSize: 15,
                color: "#E05555",
                letterSpacing: 2,
              }}
              value={input}
              onChangeText={setInput}
              placeholder="Type DELETE to confirm"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          {/* Delete button */}
          <TouchableOpacity
            style={{
              width: "100%",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              marginBottom: 10,
              backgroundColor: confirmed ? "#E05555" : theme.surface,
            }}
            onPress={handleConfirm}
            activeOpacity={confirmed ? 0.85 : 1}
          >
            <Text
              style={{
                fontFamily: Font.bodySemiBold,
                fontSize: 16,
                color: confirmed ? "#fff" : theme.textMuted,
              }}
            >
              Delete My Account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: "100%", alignItems: "center", paddingVertical: 10 }}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontFamily: Font.bodyMedium,
                fontSize: 14,
                color: theme.textSecondary,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Change password view ──────────────────────────────────────────────────────
function ChangePasswordView({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPwError, setCurrentPwError] = useState(false);
  const [errModal, setErrModal] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const [successModal, setSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const barAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const pwRules = [
    { label: "At least 9 characters", met: newPassword.length >= 9 },
    { label: "One uppercase letter", met: /[A-Z]/.test(newPassword) },
    { label: "One number", met: /[0-9]/.test(newPassword) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const allRulesMet = pwRules.every((r) => r.met);
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === newPassword;


  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrModal({
        visible: true,
        title: "Missing Fields",
        message: "Please fill in all fields.",
      });
      return;
    }
    if (!allRulesMet) {
      setErrModal({
        visible: true,
        title: "Weak Password",
        message: "Please meet all password requirements.",
      });
      return;
    }
    if (!confirmMatches) {
      setErrModal({
        visible: true,
        title: "Passwords Don't Match",
        message: "New password and confirm password must match.",
      });
      return;
    }

    setSaving(true);
    loadingBar.start();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      loadingBar.finish();
      setSaving(false);
      setErrModal({
        visible: true,
        title: "Authentication Error",
        message: "Could not retrieve user. Please log in again.",
      });
      return;
    }

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) {
      loadingBar.finish();
      setSaving(false);
      setCurrentPwError(true);
      return;
    }

    // Send email BEFORE updateUser — pass data as query params to avoid RN body serialization issues
    const emailParams = new URLSearchParams({
      email: user.email,
      name:  user.user_metadata?.full_name ?? "",
    });
    supabase.functions
      .invoke(`send-password-changed-email?${emailParams.toString()}`)
      .then(({ error }) => { if (error) console.warn("[email] error:", error.message); })
      .catch((err) => console.warn("[email] failed:", err));

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    loadingBar.finish();
    setSaving(false);
    if (updateError) {
      setErrModal({
        visible: true,
        title: "Update Failed",
        message: updateError.message,
      });
      return;
    }

    setSuccessModal(true);
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top"]}
      {...({ filterTouchesWhenObscured: true } as any)}
    >
      <StatusBar style="light" />
      <View style={styles.greenSection}>
        <NavHeader title="Change Password" onBack={onBack} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={[styles.card, { backgroundColor: theme.cardBg }]}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              styles.formSectionTitle,
              { color: theme.textMuted, marginBottom: 12 },
            ]}
          >
            UPDATE YOUR PASSWORD
          </Text>

          <View
            style={[styles.formSection, { backgroundColor: theme.surface }]}
          >
            {/* Current Password */}
            <View
              style={[
                styles.formField,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: currentPwError ? "#E05555" : theme.divider,
                },
                { flexWrap: "wrap" },
              ]}
            >
              <View style={styles.formFieldIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={currentPwError ? "#E05555" : "#1B7A4A"}
                />
              </View>
              <View style={styles.formFieldBody}>
                <Text
                  style={[
                    styles.formFieldLabel,
                    { color: currentPwError ? "#E05555" : theme.textMuted },
                  ]}
                >
                  Current Password
                </Text>
                <TextInput
                  style={[
                    styles.formFieldInput,
                    { color: currentPwError ? "#E05555" : theme.textPrimary },
                  ]}
                  value={currentPassword}
                  onChangeText={(v) => {
                    setCurrentPassword(v);
                    if (currentPwError) setCurrentPwError(false);
                  }}
                  secureTextEntry={!showCurrent}
                  placeholder="Enter current password"
                  placeholderTextColor={currentPwError ? "#E05555" : theme.textMuted}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)}>
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={currentPwError ? "#E05555" : theme.textMuted}
                />
              </TouchableOpacity>
              {currentPwError && (
                <View style={styles.pwRulesContainer}>
                  <View style={styles.pwRuleRow}>
                    <Ionicons name="close-circle" size={14} color="#E05555" />
                    <Text style={[styles.pwRuleText, { color: "#E05555" }]}>
                      Incorrect password. Please try again.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* New Password */}
            <View
              style={[
                styles.formField,
                { borderBottomWidth: 1, borderBottomColor: theme.divider },
                { flexWrap: "wrap" },
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
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
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

            {/* Confirm New Password */}
            <View style={[styles.formField, { flexWrap: "wrap" }]}>
              <View style={styles.formFieldIcon}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#1B7A4A" />
              </View>
              <View style={styles.formFieldBody}>
                <Text
                  style={[styles.formFieldLabel, { color: theme.textMuted }]}
                >
                  Confirm New Password
                </Text>
                <TextInput
                  style={[styles.formFieldInput, { color: theme.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
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
                      name={confirmMatches ? "checkmark-circle" : "close-circle"}
                      size={14}
                      color={confirmMatches ? "#1B7A4A" : "#E05555"}
                    />
                    <Text
                      style={[
                        styles.pwRuleText,
                        { color: confirmMatches ? "#1B7A4A" : "#E05555" },
                      ]}
                    >
                      {confirmMatches ? "Passwords match" : "Passwords do not match"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnOff]}
            onPress={handleChangePassword}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal((e) => ({ ...e, visible: false }))}
      />
      <Modal visible={successModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.pwSuccessOverlay}>
          <View style={[styles.pwSuccessCard, { backgroundColor: theme.surface }]}>
            <View style={styles.pwSuccessIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#1B7A4A" />
            </View>
            <Text style={[styles.pwSuccessTitle, { color: theme.textPrimary }]}>
              Password Changed!
            </Text>
            <Text style={[styles.pwSuccessBody, { color: theme.textMuted }]}>
              Your password has been updated successfully. For your security, you'll be signed out automatically.
            </Text>
            <View style={[styles.pwSuccessBarTrack, { backgroundColor: theme.divider }]}>
              <Animated.View
                style={[
                  styles.pwSuccessBarFill,
                  {
                    width: barAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.pwSuccessCountdown, { color: theme.textMuted }]}>
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

// ── Settings view ─────────────────────────────────────────────────────────────
function SettingsView({
  onBack,
  navigate,
}: {
  onBack: () => void;
  navigate: (s: Screen) => void;
}) {
  const { theme, darkMode, toggleDark } = useAppTheme();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [budgetVisible, setBudgetVisible] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(20000);
  const [errModal, setErrModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error: uErr }) => {
      if (uErr || !user) return;
      supabase
        .from("profiles")
        .select("budget_limit")
        .eq("id", user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.budget_limit) setBudgetLimit(data.budget_limit);
        });
    });
  }, []);

  async function saveBudgetLimit(newLimit: number) {
    const {
      data: { user },
      error: uErr,
    } = await supabase.auth.getUser();
    if (uErr || !user)
      throw new Error(uErr?.message ?? "Could not retrieve user.");
    const { error } = await supabase
      .from("profiles")
      .update({ budget_limit: newLimit })
      .eq("id", user.id);
    if (error) throw error;
    DataCache.invalidateProfile(user.id);
    DataCache.invalidateDashboard(user.id);
    setBudgetLimit(newLimit);
  }

  async function confirmDelete() {
    loadingBar.start();
    try {
      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();
      if (uErr || !user) throw new Error(uErr?.message ?? "Could not retrieve user.");

      // Delete avatar from storage if it exists
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (profileData?.avatar_url) {
        const parts = profileData.avatar_url.split(
          "/storage/v1/object/public/avatars/"
        );
        if (parts[1]) {
          await supabase.storage.from("avatars").remove([parts[1]]);
        }
      }

      // Delete the user account — cascades to all user data via DB foreign keys
      const { error: deleteError } = await supabase.rpc("delete_user");
      if (deleteError) throw deleteError;

      // Clear local session
      await supabase.auth.signOut();
      Cache.clearAll();
    } catch (err: any) {
      loadingBar.finish();
      setErrModal({
        visible: true,
        title: "Delete Account Failed",
        message: err?.message ?? "Something went wrong. Please try again.",
      });
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top", "left", "right"]}
      {...({ filterTouchesWhenObscured: true } as any)}
    >
      <StatusBar style={theme.statusBar} />

      <View
        style={[
          styles.greenSection,
          { backgroundColor: theme.headerBg, paddingBottom: 20 },
        ]}
      >
        <NavHeader title="Settings" onBack={onBack} />
      </View>

      <ScrollView
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={[styles.cardContent, { paddingTop: 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted }]}>
          APPEARANCE
        </Text>
        <View style={[styles.formSection, { backgroundColor: theme.surface }]}>
          <View style={styles.formField}>
            <View style={styles.formFieldIcon}>
              <Ionicons name="moon-outline" size={16} color="#1B7A4A" />
            </View>
            <View
              style={[
                styles.formFieldBody,
                { flexDirection: "row", alignItems: "center" },
              ]}
            >
              <Text
                style={[
                  styles.formToggleLabel,
                  { color: theme.textPrimary, flex: 1 },
                ]}
              >
                Dark Mode
              </Text>
              <Switch
                value={darkMode}
                onValueChange={() => {
                  sfx.toggle();
                  loadingBar.start();
                  toggleDark();
                  setTimeout(() => loadingBar.finish(), 400);
                }}
                trackColor={{ false: theme.inputBorder, true: "#1B7A4A" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Budget */}
        <Text
          style={[
            styles.formSectionTitle,
            { color: theme.textMuted, marginTop: 24 },
          ]}
        >
          BUDGET
        </Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="wallet-outline"
            iconBg="#1B7A4A"
            label="Monthly Budget Limit"
            value={`₱${budgetLimit.toLocaleString("en-PH")}`}
            last
            onPress={() => setBudgetVisible(true)}
          />
        </View>

        {/* Notifications */}
        <Text
          style={[
            styles.formSectionTitle,
            { color: theme.textMuted, marginTop: 24 },
          ]}
        >
          NOTIFICATIONS
        </Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="notifications-outline"
            iconBg="#2A7E8F"
            label="Notification Settings"
            last
            onPress={() => navigate("notif-settings")}
          />
        </View>

        {/* Security */}
        <Text
          style={[
            styles.formSectionTitle,
            { color: theme.textMuted, marginTop: 24 },
          ]}
        >
          SECURITY
        </Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="lock-closed-outline"
            iconBg="#115533"
            label="Change Password"
            last
            onPress={() => navigate("change-password")}
          />
        </View>

        {/* Danger zone */}
        <Text
          style={[
            styles.formSectionTitle,
            { color: theme.textMuted, marginTop: 24 },
          ]}
        >
          DANGER ZONE
        </Text>
        <View
          style={[
            styles.dangerCard,
            { backgroundColor: "rgba(224,85,85,0.08)" },
          ]}
        >
          <MenuItem
            icon="trash-outline"
            iconBg="#E05555"
            label="Delete Account"
            danger
            last
            onPress={() => setDeleteVisible(true)}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <BudgetLimitModal
        visible={budgetVisible}
        current={budgetLimit}
        onClose={() => setBudgetVisible(false)}
        onSave={saveBudgetLimit}
      />

      <DeleteAccountModal
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={confirmDelete}
      />

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Notification settings view ────────────────────────────────────────────────
const NOTIF_CATEGORIES = [
  {
    key: "budget_70" as const,
    icon: "alert-outline" as IoniconName,
    bg: "#F59E0B",
    label: "Budget Getting Low",
    desc: "You'll get a heads-up when your monthly spending hits 70% of your budget, so you can slow down before it's too late.",
  },
  {
    key: "budget_90" as const,
    icon: "alert-circle-outline" as IoniconName,
    bg: "#E05555",
    label: "Budget Almost Gone",
    desc: "A stronger warning when 90% of your budget is used up — only a small amount is left for the rest of the month.",
  },
  {
    key: "budget_exceeded" as const,
    icon: "warning-outline" as IoniconName,
    bg: "#C0392B",
    label: "Budget Exceeded",
    desc: "Get notified immediately when your spending goes over your monthly budget limit.",
  },
  {
    key: "low_balance" as const,
    icon: "trending-down-outline" as IoniconName,
    bg: "#E67E22",
    label: "Low Total Balance",
    desc: "Alerts you when your total available balance drops below 10% of your budget — a sign that funds are running low.",
  },
  {
    key: "goal_50" as const,
    icon: "golf-outline" as IoniconName,
    bg: "#3B82F6",
    label: "Savings Goal: Halfway",
    desc: "Celebrate the milestone when any of your savings goals reaches 50% of its target amount.",
  },
  {
    key: "goal_75" as const,
    icon: "trending-up-outline" as IoniconName,
    bg: "#1B7A4A",
    label: "Savings Goal: Almost There",
    desc: "Stay motivated — get notified when a savings goal hits 75% and you're in the home stretch.",
  },
  {
    key: "goal_100" as const,
    icon: "checkmark-circle-outline" as IoniconName,
    bg: "#115533",
    label: "Savings Goal: Completed",
    desc: "A congratulations notification when you fully reach a savings goal target.",
  },
  {
    key: "no_goals" as const,
    icon: "flag-outline" as IoniconName,
    bg: "#6B7280",
    label: "No Savings Goals Set",
    desc: "A gentle reminder to create a savings goal if you don't have one yet — a great way to stay financially focused.",
  },
  {
    key: "new_month" as const,
    icon: "sparkles-outline" as IoniconName,
    bg: "#8B5CF6",
    label: "New Month Greeting",
    desc: "A fresh-start message during the first 3 days of each month, encouraging you to review your budget and set new targets.",
  },
  {
    key: "recurring" as const,
    icon: "repeat-outline" as IoniconName,
    bg: "#06B6D4",
    label: "Recurring Expense Reminder",
    desc: "A prompt during the first 7 days of the month to log your regular bills and subscriptions before you forget.",
  },
] as const;

function NotificationSettingsView({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();
  const { prefs, updatePrefs } = useNotifications();
  const [local, setLocal] = useState(prefs);
  const [saving, setSaving] = useState(false);

  async function toggle(key: keyof typeof local) {
    const next = { ...local, [key]: !local[key] };
    setLocal(next);
    setSaving(true);
    await updatePrefs(next);
    setSaving(false);
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.headerBg }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={theme.statusBar} />
      <View
        style={[
          styles.greenSection,
          { backgroundColor: theme.headerBg, paddingBottom: 20 },
        ]}
      >
        <NavHeader title="Notification Settings" onBack={onBack} />
      </View>

      <ScrollView
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={[styles.cardContent, { paddingTop: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View
          style={[styles.notifInfoBanner, { backgroundColor: theme.surface }]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2A7E8F"
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.notifInfoTitle, { color: theme.textPrimary }]}>
              Manage your notifications
            </Text>
            <Text
              style={[styles.notifInfoBody, { color: theme.textSecondary }]}
            >
              Toggle each type on or off to control which in-app alerts you
              receive. Changes take effect immediately.
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.formSectionTitle,
            { color: theme.textMuted, marginTop: 24 },
          ]}
        >
          NOTIFICATION TYPES
        </Text>
        <View style={[styles.formSection, { backgroundColor: theme.surface }]}>
          {NOTIF_CATEGORIES.map((cat, i) => (
            <View
              key={cat.key}
              style={[
                styles.notifRow,
                i < NOTIF_CATEGORIES.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.divider,
                },
              ]}
            >
              <View
                style={[
                  styles.menuIconCircle,
                  {
                    backgroundColor: cat.bg,
                    marginRight: 14,
                    alignSelf: "flex-start",
                    marginTop: 2,
                  },
                ]}
              >
                <Ionicons name={cat.icon} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={[styles.notifRowLabel, { color: theme.textPrimary }]}
                >
                  {cat.label}
                </Text>
                <Text style={[styles.notifRowDesc, { color: theme.textMuted }]}>
                  {cat.desc}
                </Text>
              </View>
              <Switch
                value={local[cat.key]}
                onValueChange={() => toggle(cat.key)}
                disabled={saving}
                trackColor={{ false: theme.inputBorder, true: "#1B7A4A" }}
                thumbColor="#fff"
                style={{ alignSelf: "flex-start", marginTop: 2 }}
              />
            </View>
          ))}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [screen, setScreen] = useState<Screen>("profile");
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: undefined,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      DataCache.fetchProfile(user.id).then((cached) => {
        if (cancelled) return;
        if (cached) {
          setProfile({
            full_name:  cached.full_name  || meta.full_name || "",
            email:      cached.email      || meta.email     || "",
            phone:      cached.phone      || meta.phone     || "",
            avatar_url: cached.avatar_url ?? undefined,
          });
          setLoading(false);
        } else {
          supabase
            .from("profiles")
            .select("full_name, budget_limit, email, phone, avatar_url")
            .eq("id", user.id)
            .single()
            .then(({ data }) => {
              if (cancelled) return;
              setProfile({
                full_name:  data?.full_name  || meta.full_name || "",
                email:      data?.email      || meta.email     || "",
                phone:      data?.phone      || meta.phone     || "",
                avatar_url: data?.avatar_url ?? undefined,
              });
              setLoading(false);
            });
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (screen === "edit")
    return (
      <EditProfileView
        profile={profile}
        onBack={() => setScreen("profile")}
        onSaved={(u) => setProfile(u)}
      />
    );
  if (screen === "terms")
    return <TermsView onBack={() => setScreen("profile")} />;
  if (screen === "privacy")
    return <PrivacyView onBack={() => setScreen("profile")} />;
  if (screen === "notif-settings")
    return <NotificationSettingsView onBack={() => setScreen("settings")} />;
  if (screen === "change-password")
    return <ChangePasswordView onBack={() => setScreen("settings")} />;
  if (screen === "settings")
    return (
      <SettingsView onBack={() => setScreen("profile")} navigate={setScreen} />
    );
  return (
    <ProfileView profile={profile} loading={loading} navigate={setScreen} />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontFamily: Font.headerBold, fontSize: 20 },

  greenSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  termsHeader: { paddingBottom: 12 },

  // Avatar
  avatarBlock: { alignItems: "center", marginTop: 4 },
  avatarRing: {
    backgroundColor: "rgba(154,186,166,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    backgroundColor: "#1B7A4A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: Font.headerBold,
    color: "#fff",
    letterSpacing: 1,
  },
  cameraBadge: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#115533",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  // Header name / email / phone
  headerName: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    color: "#fff",
    marginTop: 12,
    letterSpacing: 0.3,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 5,
  },
  headerMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerMetaSep: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  headerEmail: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },

  // Card (scrollable)
  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -18,
  },
  cardContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },

  // Info pill (phone)
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  infoPillText: { fontFamily: Font.bodyMedium, fontSize: 13 },

  // Menu group
  menuGroup: { marginBottom: 16 },
  sectionLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: { borderRadius: 16, overflow: "hidden" },
  dangerCard: { borderRadius: 16, overflow: "hidden", marginBottom: 8 },

  // Menu row
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuLabel: { flex: 1, fontFamily: Font.bodySemiBold, fontSize: 15 },
  menuValue: { fontFamily: Font.bodyRegular, fontSize: 13 },

  // Edit form
  formSectionTitle: {
    fontFamily: Font.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  formSection: { borderRadius: 16, overflow: "hidden" },
  formField: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  formFieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(27,122,74,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  formFieldBody: { flex: 1 },
  formFieldLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  formFieldInput: {
    fontFamily: Font.bodyRegular,
    fontSize: 15,
    paddingVertical: 0,
  },
  formToggleLabel: { fontFamily: Font.bodySemiBold, fontSize: 15 },

  // Buttons
  saveBtn: {
    backgroundColor: "#1B7A4A",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnOff: { backgroundColor: "#43A872" },
  saveBtnText: { fontFamily: Font.bodySemiBold, fontSize: 16, color: "#fff" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelBtnText: { fontFamily: Font.bodySemiBold, fontSize: 15 },

  // Password rules
  pwRulesContainer: {
    width: "100%",
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  pwRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pwRuleText: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
  },

  // Password change success modal
  pwSuccessOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  pwSuccessCard: {
    width: "100%",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  pwSuccessIconWrap: {
    marginBottom: 16,
  },
  pwSuccessTitle: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    marginBottom: 10,
    textAlign: "center",
  },
  pwSuccessBody: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  pwSuccessBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  pwSuccessBarFill: {
    height: "100%",
    backgroundColor: "#1B7A4A",
    borderRadius: 3,
  },
  pwSuccessCountdown: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
  },

  // Terms
  termsScroll: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -10,
  },
  termsContent: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 44 },
  termsText: { fontFamily: Font.bodyRegular, fontSize: 13, lineHeight: 22 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: "#1B7A4A", borderColor: "#1B7A4A" },
  checkLabel: { fontFamily: Font.bodyMedium, fontSize: 13, flex: 1 },

  // Notification settings
  notifInfoBanner: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 16,
  },
  notifInfoTitle: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    marginBottom: 4,
  },
  notifInfoBody: { fontFamily: Font.bodyRegular, fontSize: 13, lineHeight: 19 },
  notifRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notifRowLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    marginBottom: 4,
  },
  notifRowDesc: { fontFamily: Font.bodyRegular, fontSize: 12, lineHeight: 18 },

  // Photo action sheet
  photoSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
  },
  photoSheetTitle: {
    fontFamily: Font.headerBold,
    fontSize: 17,
    textAlign: "center",
    marginBottom: 20,
  },
  photoSheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  photoSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  photoSheetLabel: { fontFamily: Font.bodySemiBold, fontSize: 15 },
});
