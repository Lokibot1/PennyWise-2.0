import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';

type Screen = 'profile' | 'edit' | 'terms';
type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Shared nav header (matches every other page exactly) ────────────────────────
function NavHeader({
  title,
  onBack,
  theme,
}: {
  title: string;
  onBack?: () => void;
  theme: ReturnType<typeof useAppTheme>['theme'];
}) {
  return (
    <View style={styles.nav}>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}
        onPress={onBack}
        activeOpacity={0.8}
        disabled={!onBack}
      >
        {onBack
          ? <Ionicons name="chevron-back" size={22} color={theme.iconBtnColor} />
          : <View style={{ width: 22 }} />}
      </TouchableOpacity>

      <Text style={[styles.navTitle, { color: theme.iconBtnColor }]}>{title}</Text>

      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: theme.iconBtnBg }]}
        activeOpacity={0.8}
      >
        <Ionicons name="notifications-outline" size={20} color={theme.iconBtnColor} />
      </TouchableOpacity>
    </View>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────────
function Avatar({ showEdit }: { showEdit?: boolean }) {
  return (
    <View style={styles.avatarWrap}>
      <View style={styles.avatarCircle}>
        <Ionicons name="person" size={52} color="#fff" />
      </View>
      {showEdit && (
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={13} color="#fff" />
        </View>
      )}
    </View>
  );
}

// ── Profile menu item ────────────────────────────────────────────────────────────
function MenuItem({
  icon,
  iconColor,
  label,
  theme,
  danger,
  onPress,
}: {
  icon: IoniconName;
  iconColor: string;
  label: string;
  theme: ReturnType<typeof useAppTheme>['theme'];
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: theme.divider }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: iconColor }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? '#E05555' : theme.textPrimary }]}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={danger ? '#E05555' : theme.textMuted}
      />
    </TouchableOpacity>
  );
}

// ── Profile main screen ─────────────────────────────────────────────────────────
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
  const [loggingOut, setLoggingOut]       = useState(false);

  async function confirmLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    // _layout.tsx SIGNED_OUT listener handles the redirect
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]}>
      <StatusBar style={theme.statusBar} />

      {/* Green header */}
      <View style={[styles.greenSection, { backgroundColor: theme.headerBg }]}>
        <NavHeader title="Profile" theme={theme} />
        <View style={styles.avatarCenter}>
          <Avatar />
        </View>
      </View>

      {/* Card */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        {loading ? (
          <ActivityIndicator color="#3ECBA8" style={{ marginVertical: 12 }} />
        ) : (
          <>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
              {profile.full_name || 'User'}
            </Text>
            <Text style={[styles.profileId, { color: theme.textSecondary }]}>
              {profile.email}
            </Text>
          </>
        )}

        <View style={styles.menuList}>
          <MenuItem
            icon="person-outline"
            iconColor="#3ECBA8"
            label="Edit Profile"
            theme={theme}
            onPress={() => navigate('edit')}
          />
          <MenuItem
            icon="document-text-outline"
            iconColor="#4B78E0"
            label="Terms And Condition"
            theme={theme}
            onPress={() => navigate('terms')}
          />
          <MenuItem
            icon="settings-outline"
            iconColor="#F4A84E"
            label="Setting"
            theme={theme}
          />
          <MenuItem
            icon="headset-outline"
            iconColor="#7B68EE"
            label="Help"
            theme={theme}
          />
          <MenuItem
            icon="log-out-outline"
            iconColor="#E05555"
            label="Logout"
            theme={theme}
            danger
            onPress={() => setLogoutVisible(true)}
          />
        </View>
      </View>

      {/* ── Logout confirmation modal ── */}
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => !loggingOut && setLogoutVisible(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: theme.confirmBg }]} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={30} color="#E05555" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Log Out?</Text>
            <Text style={[styles.modalMsg, { color: theme.textSecondary }]}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnNo, { backgroundColor: theme.surface }]}
                onPress={() => setLogoutVisible(false)}
                disabled={loggingOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnNoText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnYes}
                onPress={confirmLogout}
                disabled={loggingOut}
                activeOpacity={0.85}
              >
                {loggingOut
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalBtnYesText}>Yes, Log Out</Text>
                }
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Edit Profile screen ─────────────────────────────────────────────────────────
function EditProfileView({
  profile,
  onBack,
  onSaved,
}: {
  profile: ProfileData;
  onBack: () => void;
  onSaved: (updated: ProfileData) => void;
}) {
  const { theme, darkMode, toggleDark } = useAppTheme();
  const [pushNotif, setPushNotif]     = useState(true);
  const [username, setUsername]       = useState(profile.full_name);
  const [phone, setPhone]             = useState(profile.phone ?? '');
  const [email, setEmail]             = useState(profile.email);
  const [saving, setSaving]           = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [savedToast, setSavedToast]   = useState(false);

  async function handleSave() {
    setSaveConfirm(false);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: username.trim(), phone: phone.trim(), email: email.trim() })
      .eq('id', user?.id);

    setSaving(false);

    if (!error) {
      onSaved({ full_name: username.trim(), phone: phone.trim(), email: email.trim() });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2800);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]}>
      <StatusBar style={theme.statusBar} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Green header */}
        <View style={[styles.greenSection, { backgroundColor: theme.headerBg }]}>
          <NavHeader title="Edit Profile" onBack={onBack} theme={theme} />
          <View style={styles.avatarCenter}>
            <Avatar showEdit />
          </View>
        </View>

        {/* Form card */}
        <View style={[styles.card, styles.formCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.profileName, { color: theme.textPrimary }]}>
            {profile.full_name || 'User'}
          </Text>
          <Text style={[styles.profileId, { color: theme.textSecondary }]}>
            {profile.email}
          </Text>

          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>Account Settings</Text>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Username</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.textPrimary,
            }]}
            value={username}
            onChangeText={setUsername}
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.textPrimary,
            }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email Address</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.textPrimary,
            }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={theme.textMuted}
          />

          {/* Toggles */}
          <View style={[styles.toggleRow, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Push Notifications</Text>
            <Switch
              value={pushNotif}
              onValueChange={setPushNotif}
              trackColor={{ false: theme.inputBorder, true: '#3ECBA8' }}
              thumbColor="#fff"
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Dark Theme</Text>
            <Switch
              value={darkMode}
              onValueChange={toggleDark}
              trackColor={{ false: theme.inputBorder, true: '#3ECBA8' }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            disabled={saving}
            onPress={() => setSaveConfirm(true)}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Save confirm modal ── */}
      <Modal visible={saveConfirm} transparent animationType="fade" onRequestClose={() => setSaveConfirm(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSaveConfirm(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: theme.confirmBg }]} onPress={() => {}}>
            <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(62,203,168,0.12)' }]}>
              <Ionicons name="save-outline" size={30} color="#3ECBA8" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Save Changes?</Text>
            <Text style={[styles.modalMsg, { color: theme.textSecondary }]}>
              Are you sure you want to save the changes to your profile?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtnNo, { backgroundColor: theme.surface }]}
                onPress={() => setSaveConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnNoText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnYes} onPress={handleSave} activeOpacity={0.85}>
                <Text style={styles.modalBtnYesText}>Yes, Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Success toast ── */}
      {savedToast && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText}>Profile updated successfully.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Terms & Conditions screen ───────────────────────────────────────────────────
const TERMS_TEXT = `These terms and conditions outline the rules and regulations for the use of PennyWise.

1. By accessing this app we assume you accept these terms and conditions. Do not continue to use PennyWise if you do not agree to take all of the terms and conditions stated on this page.

2. The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and all Agreements: "Client", "You" and "Your" refers to you, the person using this application. "The Company", "Ourselves", "We", "Our" and "Us" refers to PennyWise.

3. All personal financial data you enter in this app is stored locally on your device. We do not collect, transmit, or sell your financial data to any third parties.

4. You are responsible for maintaining the security of your device and ensuring that no unauthorized person has access to your financial information stored in PennyWise.

5. We reserve the right to modify these terms at any time. Continued use of the app after any such changes shall constitute your consent to such changes.

6. This app is provided "as is" without any warranties. We do not warrant that the app will be uninterrupted, error-free, or free of viruses.

Read the full terms at www.pennywise.app/terms`;

function TermsView({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBg }]}>
      <StatusBar style={theme.statusBar} />

      <View style={[styles.greenSection, styles.termsHeader, { backgroundColor: theme.headerBg }]}>
        <NavHeader title="Terms & Condition" onBack={onBack} theme={theme} />
      </View>

      <ScrollView
        style={[styles.termsScroll, { backgroundColor: theme.cardBg }]}
        contentContainerStyle={styles.termsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.termsText, { color: theme.textSecondary }]}>{TERMS_TEXT}</Text>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAccepted(v => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={[styles.checkLabel, { color: theme.textPrimary }]}>
            I accept all the terms and conditions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveBtn, !accepted && styles.saveBtnOff]}
          activeOpacity={accepted ? 0.85 : 1}
          disabled={!accepted}
        >
          <Text style={styles.saveBtnText}>Accept</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────────
type ProfileData = {
  full_name: string;
  email: string;
  phone: string;
};

// ── Root ────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [screen, setScreen]   = useState<Screen>('profile');
  const [profile, setProfile] = useState<ProfileData>({ full_name: '', email: '', phone: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
      setLoadingProfile(false);
    }
    fetchProfile();
  }, []);

  if (screen === 'edit') {
    return (
      <EditProfileView
        profile={profile}
        onBack={() => setScreen('profile')}
        onSaved={(updated) => setProfile(updated)}
      />
    );
  }
  if (screen === 'terms') return <TermsView onBack={() => setScreen('profile')} />;
  return <ProfileView profile={profile} loading={loadingProfile} navigate={setScreen} />;
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ── Nav header (matches BalanceHeader/FormHeader on other pages) ──────────────
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: Font.headerBold,
    fontSize: 20,
  },

  // ── Green top section ─────────────────────────────────────────────────────────
  greenSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  termsHeader: {
    paddingBottom: 12,
  },
  avatarCenter: {
    alignItems: 'center',
  },

  // ── Avatar ────────────────────────────────────────────────────────────────────
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#3ECBA8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3ECBA8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // ── White card ────────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -18,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  formCard: {
    alignItems: 'stretch',
    flex: undefined,
    paddingBottom: 44,
  },
  profileName: {
    fontFamily: Font.headerBold,
    fontSize: 22,
    marginTop: 4,
    textAlign: 'center',
  },
  profileId: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },

  // ── Menu list ─────────────────────────────────────────────────────────────────
  menuList: {
    width: '100%',
    marginTop: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
  },

  // ── Edit form ─────────────────────────────────────────────────────────────────
  sectionHeading: {
    fontFamily: Font.headerBold,
    fontSize: 18,
    marginTop: 18,
    marginBottom: 18,
  },
  fieldLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#3ECBA8',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnOff: {
    backgroundColor: '#A8DDD0',
  },
  saveBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },

  // ── Terms ─────────────────────────────────────────────────────────────────────
  termsScroll: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -10,
  },
  termsContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 44,
  },
  termsText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    lineHeight: 22,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#3ECBA8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxOn: {
    backgroundColor: '#3ECBA8',
    borderColor: '#3ECBA8',
  },
  checkLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
    flex: 1,
  },

  // ── Confirmation modal ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(224,85,85,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: Font.headerBold,
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMsg: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnNo: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalBtnNoText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
  },
  modalBtnYes: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E05555',
    alignItems: 'center',
  },
  modalBtnYesText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  },

  // ── Toast ────────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    backgroundColor: '#1E9C70',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  toastText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
});
