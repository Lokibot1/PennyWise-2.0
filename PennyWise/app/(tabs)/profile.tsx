import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import { PennyWiseLogo } from '@/components/penny-wise-logo';
import ConfirmModal from '@/components/ConfirmModal';
import ErrorModal from '@/components/ErrorModal';
import { ProfileInfoSkeleton, ProfileAvatarSkeleton, ProfileCardSkeleton } from '@/components/SkeletonLoader';
import NotificationBell from '@/components/NotificationBell';
import BudgetLimitModal from '@/components/BudgetLimitModal';

// ── Types ─────────────────────────────────────────────────────────────────────
type Screen = 'profile' | 'edit' | 'terms' | 'settings';
type IoniconName = keyof typeof Ionicons.glyphMap;
type ProfileData = { full_name: string; email: string; phone: string };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

// ── Nav header ────────────────────────────────────────────────────────────────
function NavHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.nav}>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}
        onPress={onBack ?? (() => router.replace('/(tabs)'))}
        activeOpacity={0.8}
      >
        {onBack
          ? <Ionicons name="chevron-back" size={22} color={theme.iconBtnColor} />
          : <PennyWiseLogo size="xs" />}
      </TouchableOpacity>
      <Text style={[styles.navTitle, { color: theme.iconBtnColor }]}>{title}</Text>
      <NotificationBell style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]} iconColor={theme.iconBtnColor} />
    </View>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 96, showEdit }: { name: string; size?: number; showEdit?: boolean }) {
  const initials = name ? getInitials(name) : '';
  const fontSize = Math.round(size * 0.35);
  return (
    <View style={{ position: 'relative' }}>
      <View style={[styles.avatarRing, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
        <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
          {initials
            ? <Text style={[styles.avatarInitials, { fontSize }]}>{initials}</Text>
            : <Ionicons name="person" size={size * 0.46} color="#fff" />}
        </View>
      </View>
      {showEdit && (
        <View style={[styles.cameraBadge, { bottom: 2, right: 2 }]}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      )}
    </View>
  );
}

// ── Menu group ────────────────────────────────────────────────────────────────
function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.menuGroup}>
      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
        {children}
      </View>
    </View>
  );
}

// ── Menu item ─────────────────────────────────────────────────────────────────
function MenuItem({
  icon, iconBg, label, value, danger, last, onPress,
}: {
  icon: IoniconName; iconBg: string; label: string;
  value?: string; danger?: boolean; last?: boolean; onPress?: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? '#E05555' : theme.textPrimary }]}>
        {label}
      </Text>
      {value
        ? <Text style={[styles.menuValue, { color: theme.textMuted }]}>{value}</Text>
        : <Ionicons name="chevron-forward" size={16} color={danger ? '#E05555' : theme.textMuted} />}
    </TouchableOpacity>
  );
}

// ── Profile view ──────────────────────────────────────────────────────────────
function ProfileView({
  profile, loading, navigate,
}: {
  profile: ProfileData; loading: boolean; navigate: (s: Screen) => void;
}) {
  const { theme } = useAppTheme();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [errModal, setErrModal] = useState({ visible: false, title: '', message: '' });

  async function confirmLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) setErrModal({ visible: true, title: 'Sign Out Failed', message: error.message });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      {/* ── Header ── */}
      <View style={[styles.greenSection, { backgroundColor: theme.headerBg }]}>
        <NavHeader title="Profile" />
        <View style={styles.avatarBlock}>
          {loading ? <ProfileAvatarSkeleton /> : <Avatar name={profile.full_name} size={100} />}
          {loading ? (
            <ProfileInfoSkeleton />
          ) : (
            <>
              <Text style={styles.headerName}>{profile.full_name || 'Your Name'}</Text>
              {!!profile.email && (
                <Text style={styles.headerEmail}>{profile.email}</Text>
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
        {loading ? <ProfileCardSkeleton /> : (
          <>
            {/* Info pills */}
            {!!profile.phone && (
              <View style={[styles.infoPill, { backgroundColor: theme.surface }]}>
                <Ionicons name="call-outline" size={14} color="#1B7A4A" />
                <Text style={[styles.infoPillText, { color: theme.textSecondary }]}>{profile.phone}</Text>
              </View>
            )}

            {/* Account section */}
            <MenuGroup label="ACCOUNT">
              <MenuItem icon="person-outline"        iconBg="#1B7A4A" label="Edit Profile"        onPress={() => navigate('edit')} />
              <MenuItem icon="document-text-outline" iconBg="#2D7A5A" label="Terms & Conditions"  onPress={() => navigate('terms')} last />
            </MenuGroup>

            {/* General section */}
            <MenuGroup label="GENERAL">
              <MenuItem icon="settings-outline" iconBg="#115533" label="Settings"       onPress={() => navigate('settings')} />
              <MenuItem icon="headset-outline"  iconBg="#43A872" label="Help & Support" last />
            </MenuGroup>

            {/* Danger zone */}
            <View style={[styles.dangerCard, { backgroundColor: 'rgba(224,85,85,0.08)' }]}>
              <MenuItem icon="log-out-outline" iconBg="#E05555" label="Log Out" danger last onPress={() => setLogoutVisible(true)} />
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
        onClose={() => setErrModal(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Edit profile view ─────────────────────────────────────────────────────────
function EditProfileView({
  profile, onBack, onSaved,
}: {
  profile: ProfileData; onBack: () => void; onSaved: (u: ProfileData) => void;
}) {
  const { theme } = useAppTheme();
  const [username, setUsername] = useState(profile.full_name);
  const [phone, setPhone]       = useState(profile.phone ?? '');
  const [email, setEmail]       = useState(profile.email);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [toast, setToast]       = useState(false);
  const [errModal, setErrModal] = useState({ visible: false, title: '', message: '' });

  async function handleSave() {
    setConfirm(false);
    setSaving(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setSaving(false);
      setErrModal({ visible: true, title: 'Authentication Error', message: userError?.message ?? 'Could not retrieve user. Please log in again.' });
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: username.trim(), phone: phone.trim(), email: email.trim() })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      setErrModal({ visible: true, title: 'Failed to Update Profile', message: error.message });
    } else {
      onSaved({ full_name: username.trim(), phone: phone.trim(), email: email.trim() });
      setToast(true);
      setTimeout(() => setToast(false), 2800);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      {/* Sticky header — always visible */}
      <View style={[styles.greenSection, { backgroundColor: theme.headerBg, paddingBottom: 24 }]}>
        <NavHeader title="Edit Profile" onBack={onBack} />
        <View style={styles.avatarBlock}>
          <Avatar name={profile.full_name} size={88} showEdit />
          <Text style={styles.headerName}>{profile.full_name || 'Your Name'}</Text>
        </View>
      </View>

      {/* Scrollable form */}
      <ScrollView
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={[styles.cardContent, { paddingTop: 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Personal info section */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted }]}>PERSONAL INFO</Text>
        <View style={[styles.formSection, { backgroundColor: theme.surface }]}>
          <View style={[styles.formField, { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
            <View style={styles.formFieldIcon}>
              <Ionicons name="person-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={styles.formFieldBody}>
              <Text style={[styles.formFieldLabel, { color: theme.textMuted }]}>Username</Text>
              <TextInput
                style={[styles.formFieldInput, { color: theme.textPrimary }]}
                value={username}
                onChangeText={setUsername}
                placeholderTextColor={theme.textMuted}
                placeholder="Enter your name"
              />
            </View>
          </View>

          <View style={[styles.formField, { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
            <View style={styles.formFieldIcon}>
              <Ionicons name="call-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={styles.formFieldBody}>
              <Text style={[styles.formFieldLabel, { color: theme.textMuted }]}>Phone (optional)</Text>
              <TextInput
                style={[styles.formFieldInput, { color: theme.textPrimary }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={theme.textMuted}
                placeholder="Enter your phone"
              />
            </View>
          </View>

          <View style={styles.formField}>
            <View style={styles.formFieldIcon}>
              <Ionicons name="mail-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={styles.formFieldBody}>
              <Text style={[styles.formFieldLabel, { color: theme.textMuted }]}>Email (optional)</Text>
              <TextInput
                style={[styles.formFieldInput, { color: theme.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.textMuted}
                placeholder="Enter your email"
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
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7} onPress={onBack} disabled={saving}>
          <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
          <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Back to Profile</Text>
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

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText}>Profile updated successfully.</Text>
        </View>
      )}

      <ErrorModal
        visible={errModal.visible}
        title={errModal.title}
        message={errModal.message}
        onClose={() => setErrModal(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Terms view ────────────────────────────────────────────────────────────────
const TERMS_TEXT = `These terms and conditions outline the rules and regulations for the use of PennyWise.

1. By accessing this app we assume you accept these terms and conditions.

2. All personal financial data you enter is stored securely. We do not sell your data to third parties.

3. You are responsible for maintaining the security of your device and account.

4. We reserve the right to modify these terms at any time.

5. This app is provided "as is" without any warranties.`;

function TermsView({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />
      <View style={[styles.greenSection, styles.termsHeader, { backgroundColor: theme.headerBg }]}>
        <NavHeader title="Terms & Conditions" onBack={onBack} />
      </View>
      <ScrollView
        style={[styles.termsScroll, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={styles.termsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.termsText, { color: theme.textSecondary }]}>{TERMS_TEXT}</Text>
        <TouchableOpacity style={styles.checkRow} onPress={() => setAccepted(v => !v)} activeOpacity={0.8}>
          <View style={[styles.checkbox, { borderColor: '#1B7A4A' }, accepted && styles.checkboxOn]}>
            {accepted && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={[styles.checkLabel, { color: theme.textPrimary }]}>I accept all the terms and conditions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, !accepted && styles.saveBtnOff]} activeOpacity={accepted ? 0.85 : 1} disabled={!accepted}>
          <Text style={styles.saveBtnText}>Accept</Text>
        </TouchableOpacity>
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
  const [input, setInput] = useState('');
  const confirmed = input.trim() === 'DELETE';

  function handleClose() {
    setInput('');
    onClose();
  }

  function handleConfirm() {
    if (!confirmed) return;
    setInput('');
    onConfirm();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={handleClose} />
        <Pressable style={[{
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 24, paddingBottom: 44, alignItems: 'center',
          backgroundColor: theme.modalBg,
        }]} onPress={() => {}}>

          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.divider, marginBottom: 24 }} />

          {/* Icon */}
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(224,85,85,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="trash-outline" size={30} color="#E05555" />
          </View>

          <Text style={{ fontFamily: Font.headerBold, fontSize: 20, color: theme.textPrimary, textAlign: 'center', marginBottom: 10 }}>
            Delete Account?
          </Text>
          <Text style={{ fontFamily: Font.bodyRegular, fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 8 }}>
            This will permanently delete your account and all your financial data. {'\n\n'}
            To confirm, type{' '}
            <Text style={{ fontFamily: Font.bodySemiBold, color: '#E05555' }}>DELETE</Text>
            {' '}below.
          </Text>

          {/* Confirmation input */}
          <TextInput
            style={{
              width: '100%',
              borderWidth: 1.5,
              borderColor: confirmed ? '#E05555' : theme.inputBorder,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontFamily: Font.bodySemiBold,
              fontSize: 15,
              color: '#E05555',
              backgroundColor: theme.surface,
              textAlign: 'center',
              letterSpacing: 2,
              marginBottom: 20,
            }}
            value={input}
            onChangeText={setInput}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* Delete button */}
          <TouchableOpacity
            style={{
              width: '100%', borderRadius: 14, paddingVertical: 14,
              alignItems: 'center', marginBottom: 10,
              backgroundColor: confirmed ? '#E05555' : theme.surface,
            }}
            onPress={handleConfirm}
            activeOpacity={confirmed ? 0.85 : 1}
          >
            <Text style={{ fontFamily: Font.bodySemiBold, fontSize: 16, color: confirmed ? '#fff' : theme.textMuted }}>
              Delete My Account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }} onPress={handleClose} activeOpacity={0.7}>
            <Text style={{ fontFamily: Font.bodyMedium, fontSize: 14, color: theme.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Settings view ─────────────────────────────────────────────────────────────
function SettingsView({ onBack }: { onBack: () => void }) {
  const { theme, darkMode, toggleDark } = useAppTheme();
  const [deleteVisible, setDeleteVisible]   = useState(false);
  const [budgetVisible, setBudgetVisible]   = useState(false);
  const [budgetLimit,   setBudgetLimit]     = useState(20000);
  const [errModal,      setErrModal]        = useState({ visible: false, title: '', message: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error: uErr }) => {
      if (uErr || !user) return;
      supabase.from('profiles').select('budget_limit').eq('id', user.id).single()
        .then(({ data, error }) => {
          if (!error && data?.budget_limit) setBudgetLimit(data.budget_limit);
        });
    });
  }, []);

  async function saveBudgetLimit(newLimit: number) {
    const { data: { user }, error: uErr } = await supabase.auth.getUser();
    if (uErr || !user) throw new Error(uErr?.message ?? 'Could not retrieve user.');
    const { error } = await supabase.from('profiles').update({ budget_limit: newLimit }).eq('id', user.id);
    if (error) throw error;
    setBudgetLimit(newLimit);
  }

  async function confirmDelete() {
    const { error } = await supabase.auth.signOut();
    if (error) setErrModal({ visible: true, title: 'Sign Out Failed', message: error.message });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      <View style={[styles.greenSection, { backgroundColor: theme.headerBg, paddingBottom: 20 }]}>
        <NavHeader title="Settings" onBack={onBack} />
      </View>

      <ScrollView
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={[styles.cardContent, { paddingTop: 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.formSection, { backgroundColor: theme.surface }]}>
          <View style={styles.formField}>
            <View style={styles.formFieldIcon}>
              <Ionicons name="moon-outline" size={16} color="#1B7A4A" />
            </View>
            <View style={[styles.formFieldBody, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={[styles.formToggleLabel, { color: theme.textPrimary, flex: 1 }]}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={toggleDark}
                trackColor={{ false: theme.inputBorder, true: '#1B7A4A' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Budget */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted, marginTop: 24 }]}>BUDGET</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
          <MenuItem
            icon="wallet-outline"
            iconBg="#1B7A4A"
            label="Monthly Budget Limit"
            value={`₱${budgetLimit.toLocaleString('en-PH')}`}
            last
            onPress={() => setBudgetVisible(true)}
          />
        </View>

        {/* Notifications */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted, marginTop: 24 }]}>NOTIFICATIONS</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
          <MenuItem icon="notifications-outline" iconBg="#2A7E8F" label="Notification Settings" last />
        </View>

        {/* Security */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted, marginTop: 24 }]}>SECURITY</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
          <MenuItem icon="lock-closed-outline" iconBg="#115533" label="Password Settings" last />
        </View>

        {/* Danger zone */}
        <Text style={[styles.formSectionTitle, { color: theme.textMuted, marginTop: 24 }]}>DANGER ZONE</Text>
        <View style={[styles.dangerCard, { backgroundColor: 'rgba(224,85,85,0.08)' }]}>
          <MenuItem icon="trash-outline" iconBg="#E05555" label="Delete Account" danger last onPress={() => setDeleteVisible(true)} />
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
        onClose={() => setErrModal(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [screen, setScreen]   = useState<Screen>('profile');
  const [profile, setProfile] = useState<ProfileData>({ full_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) { if (!cancelled) setLoading(false); return; }
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      supabase.from('profiles').select('full_name, email, phone').eq('id', user.id).single()
        .then(({ data }) => {
          if (cancelled) return;
          setProfile({
            full_name: data?.full_name || meta.full_name || '',
            email:     data?.email     || meta.email     || '',
            phone:     data?.phone     || meta.phone     || '',
          });
          setLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, []);

  if (screen === 'edit')     return <EditProfileView profile={profile} onBack={() => setScreen('profile')} onSaved={u => setProfile(u)} />;
  if (screen === 'terms')    return <TermsView onBack={() => setScreen('profile')} />;
  if (screen === 'settings') return <SettingsView onBack={() => setScreen('profile')} />;
  return <ProfileView profile={profile} loading={loading} navigate={setScreen} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:         { flex: 1 },
  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  navTitle:     { fontFamily: Font.headerBold, fontSize: 20 },

  greenSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  termsHeader:  { paddingBottom: 12 },

  // Avatar
  avatarBlock:    { alignItems: 'center', marginTop: 4 },
  avatarRing:     { backgroundColor: 'rgba(154,186,166,0.35)', alignItems: 'center', justifyContent: 'center' },
  avatarCircle:   { backgroundColor: '#1B7A4A', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: Font.headerBold, color: '#fff', letterSpacing: 1 },
  cameraBadge:    { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#115533', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  // Header name / email
  headerName:  { fontFamily: Font.headerBold, fontSize: 20, color: '#fff', marginTop: 12, letterSpacing: 0.3 },
  headerEmail: { fontFamily: Font.bodyRegular, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  // Card (scrollable)
  card:        { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -18 },
  cardContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },

  // Info pill (phone)
  infoPill:     { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 20 },
  infoPillText: { fontFamily: Font.bodyMedium, fontSize: 13 },

  // Menu group
  menuGroup:  { marginBottom: 16 },
  sectionLabel: { fontFamily: Font.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  menuCard:   { borderRadius: 16, overflow: 'hidden' },
  dangerCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },

  // Menu row
  menuRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuIconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel:     { flex: 1, fontFamily: Font.bodySemiBold, fontSize: 15 },
  menuValue:     { fontFamily: Font.bodyRegular, fontSize: 13 },

  // Edit form
  formSectionTitle: { fontFamily: Font.bodySemiBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  formSection:      { borderRadius: 16, overflow: 'hidden' },
  formField:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, minHeight: 64 },
  formFieldIcon:    { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(27,122,74,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  formFieldBody:    { flex: 1 },
  formFieldLabel:   { fontFamily: Font.bodyMedium, fontSize: 11, letterSpacing: 0.3, marginBottom: 3 },
  formFieldInput:   { fontFamily: Font.bodyRegular, fontSize: 15, paddingVertical: 0 },
  formToggleLabel:  { fontFamily: Font.bodySemiBold, fontSize: 15 },

  // Buttons
  saveBtn:     { backgroundColor: '#1B7A4A', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnOff:  { backgroundColor: '#43A872' },
  saveBtnText: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },
  cancelBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, marginTop: 4 },
  cancelBtnText: { fontFamily: Font.bodySemiBold, fontSize: 15 },

  // Terms
  termsScroll:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -10 },
  termsContent:  { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 44 },
  termsText:     { fontFamily: Font.bodyRegular, fontSize: 13, lineHeight: 22 },
  checkRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 4 },
  checkbox:      { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxOn:    { backgroundColor: '#1B7A4A', borderColor: '#1B7A4A' },
  checkLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, flex: 1 },

  toast:     { position: 'absolute', bottom: 28, left: 20, right: 20, backgroundColor: '#115533', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, elevation: 10 },
  toastText: { fontFamily: Font.bodySemiBold, fontSize: 14, color: '#fff', flex: 1 },
});
