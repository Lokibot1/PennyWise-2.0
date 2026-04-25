import "react-native-url-polyfill/auto";

// expo-notifications' push-token auto-registration fires a console error in
// Expo Go (SDK 53+) because remote push was removed there. Local notifications
// still work fine. Suppress the noise so the dev console stays clean.
const _origError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('expo-notifications') && args[0].includes('Expo Go')) return;
  _origError(...args);
};
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { processRecurringTransactions } from "@/lib/recurringProcessor";
import { registerForPushNotifications, clearPushedSet } from "@/lib/pushNotifications";
import { AppThemeProvider } from "@/contexts/AppTheme";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import NotificationPanel from "@/components/NotificationPanel";
import GlobalLoadingBar from "@/components/GlobalLoadingBar";
import OfflineBanner from "@/components/OfflineBanner";
import { Font } from "@/constants/fonts";
import { TERMS_SECTIONS, TERMS_VERSION } from "@/constants/terms";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

// ── Terms update modal ────────────────────────────────────────────────────────
function isCloseToBottom({ layoutMeasurement, contentOffset, contentSize }: NativeScrollEvent) {
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
}

function TermsUpdateModal({ visible, onAccept }: { visible: boolean; onAccept: () => void }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[layoutStyles.safe, { backgroundColor: "#1B3D2B" }]}>
        <View style={layoutStyles.header}>
          <Ionicons name="document-text-outline" size={22} color="#fff" />
          <Text style={layoutStyles.headerTitle}>Terms & Conditions Updated</Text>
        </View>
        <View style={[layoutStyles.subHeader, { backgroundColor: "#1B3D2B" }]}>
          <Text style={layoutStyles.subText}>
            We have updated our Terms & Conditions. Please read and accept to continue using PennyWise.
          </Text>
        </View>
        {!scrolledToEnd && (
          <View style={[layoutStyles.hint, { backgroundColor: "#1B3D2B" }]}>
            <Ionicons name="arrow-down-circle-outline" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={layoutStyles.hintText}>Scroll to the bottom to accept</Text>
          </View>
        )}
        <ScrollView
          style={layoutStyles.scroll}
          contentContainerStyle={layoutStyles.content}
          showsVerticalScrollIndicator={false}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (isCloseToBottom(e.nativeEvent)) setScrolledToEnd(true);
          }}
          scrollEventThrottle={16}
        >
          {TERMS_SECTIONS.map((section, i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <Text style={[layoutStyles.sectionTitle, { fontSize: i === 0 ? 17 : 14 }]}>
                {section.title}
              </Text>
              {section.subtitle ? (
                <Text style={[layoutStyles.body, { fontStyle: "italic", marginTop: 2, color: "#555" }]}>
                  {section.subtitle}
                </Text>
              ) : null}
              {section.body ? (
                <Text style={layoutStyles.body}>{section.body}</Text>
              ) : null}
            </View>
          ))}

          <TouchableOpacity
            style={layoutStyles.checkRow}
            onPress={() => scrolledToEnd && setAccepted(v => !v)}
            activeOpacity={scrolledToEnd ? 0.8 : 1}
          >
            <View
              style={[
                layoutStyles.checkbox,
                { borderColor: scrolledToEnd ? "#1B7A4A" : "#ccc" },
                accepted && layoutStyles.checkboxOn,
              ]}
            >
              {accepted && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={[layoutStyles.checkLabel, { color: scrolledToEnd ? "#122A1E" : "#aaa" }]}>
              I have read and agree to the updated Terms & Conditions
            </Text>
          </TouchableOpacity>

          {!scrolledToEnd && (
            <Text style={layoutStyles.scrollNote}>
              Please scroll to the bottom before accepting.
            </Text>
          )}

          <TouchableOpacity
            style={[layoutStyles.acceptBtn, (!scrolledToEnd || !accepted) && layoutStyles.acceptBtnOff]}
            disabled={!scrolledToEnd || !accepted}
            activeOpacity={scrolledToEnd && accepted ? 0.85 : 1}
            onPress={onAccept}
          >
            <Text style={layoutStyles.acceptBtnText}>Accept & Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showTermsUpdate, setShowTermsUpdate] = useState(false);

  // Listen for auth state changes at the app level.
  // Handles sign-out and session expiry from anywhere in the app.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        clearPushedSet().catch(() => {});
        router.replace("/login-form");
      }
      // Check T&C version whenever a session becomes active
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const acceptedVersion = session.user.user_metadata?.terms_accepted_version;
        if (acceptedVersion !== TERMS_VERSION) {
          setShowTermsUpdate(true);
        }
        // Fire-and-forget: request OS push permission + auto-generate recurring entries.
        registerForPushNotifications().catch(() => {});
        processRecurringTransactions(session.user.id).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleTermsAccepted() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.auth.updateUser({
        data: { terms_accepted_version: TERMS_VERSION },
      });
    }
    setShowTermsUpdate(false);
  }

  const [fontsLoaded] = useFonts({
    KumbhSans_400Regular: require("@expo-google-fonts/kumbh-sans/400Regular/KumbhSans_400Regular.ttf"),
    KumbhSans_500Medium: require("@expo-google-fonts/kumbh-sans/500Medium/KumbhSans_500Medium.ttf"),
    KumbhSans_600SemiBold: require("@expo-google-fonts/kumbh-sans/600SemiBold/KumbhSans_600SemiBold.ttf"),
    KumbhSans_700Bold: require("@expo-google-fonts/kumbh-sans/700Bold/KumbhSans_700Bold.ttf"),
    LeagueSpartan_600SemiBold: require("@expo-google-fonts/league-spartan/600SemiBold/LeagueSpartan_600SemiBold.ttf"),
    LeagueSpartan_700Bold: require("@expo-google-fonts/league-spartan/700Bold/LeagueSpartan_700Bold.ttf"),
    LeagueSpartan_800ExtraBold: require("@expo-google-fonts/league-spartan/800ExtraBold/LeagueSpartan_800ExtraBold.ttf"),
    LeagueSpartan_900Black: require("@expo-google-fonts/league-spartan/900Black/LeagueSpartan_900Black.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <NetworkProvider>
    <AppThemeProvider>
      <NotificationProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ animation: "slide_from_right" }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login-form" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-account"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="verify-code"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="savings-goals"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
        <NotificationPanel />
        <GlobalLoadingBar />
        <TermsUpdateModal visible={showTermsUpdate} onAccept={handleTermsAccepted} />
      </ThemeProvider>
      </NotificationProvider>
    </AppThemeProvider>
    <OfflineBanner />
    </NetworkProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const layoutStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    color: "#fff",
    flex: 1,
  },
  subHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 19,
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
    backgroundColor: "#fff",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 44,
  },
  sectionTitle: {
    fontFamily: Font.headerBold,
    color: "#122A1E",
    marginBottom: 4,
  },
  body: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    lineHeight: 22,
    color: "#444",
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
    color: "#aaa",
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
