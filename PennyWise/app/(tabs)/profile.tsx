import { useState } from 'react';
import {
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
function ProfileView({ navigate }: { navigate: (s: Screen) => void }) {
  const { theme } = useAppTheme();

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
        <Text style={[styles.profileName, { color: theme.textPrimary }]}>John Smith</Text>
        <Text style={[styles.profileId, { color: theme.textSecondary }]}>ID: 25030024</Text>

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
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Edit Profile screen ─────────────────────────────────────────────────────────
function EditProfileView({ onBack }: { onBack: () => void }) {
  const { theme, darkMode, toggleDark } = useAppTheme();
  const [pushNotif, setPushNotif] = useState(true);
  const [username, setUsername]   = useState('John Smith');
  const [phone, setPhone]         = useState('+44 555 5555 55');
  const [email, setEmail]         = useState('example@example.com');

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
          <Text style={[styles.profileName, { color: theme.textPrimary }]}>John Smith</Text>
          <Text style={[styles.profileId, { color: theme.textSecondary }]}>ID: 25030024</Text>

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

          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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

// ── Root ────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [screen, setScreen] = useState<Screen>('profile');

  if (screen === 'edit')  return <EditProfileView onBack={() => setScreen('profile')} />;
  if (screen === 'terms') return <TermsView onBack={() => setScreen('profile')} />;
  return <ProfileView navigate={setScreen} />;
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
});
