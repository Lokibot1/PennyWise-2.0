import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    KumbhSans_400Regular: require('@expo-google-fonts/kumbh-sans/400Regular/KumbhSans_400Regular.ttf'),
    KumbhSans_500Medium: require('@expo-google-fonts/kumbh-sans/500Medium/KumbhSans_500Medium.ttf'),
    KumbhSans_600SemiBold: require('@expo-google-fonts/kumbh-sans/600SemiBold/KumbhSans_600SemiBold.ttf'),
    KumbhSans_700Bold: require('@expo-google-fonts/kumbh-sans/700Bold/KumbhSans_700Bold.ttf'),
    LeagueSpartan_600SemiBold: require('@expo-google-fonts/league-spartan/600SemiBold/LeagueSpartan_600SemiBold.ttf'),
    LeagueSpartan_700Bold: require('@expo-google-fonts/league-spartan/700Bold/LeagueSpartan_700Bold.ttf'),
    LeagueSpartan_800ExtraBold: require('@expo-google-fonts/league-spartan/800ExtraBold/LeagueSpartan_800ExtraBold.ttf'),
    LeagueSpartan_900Black: require('@expo-google-fonts/league-spartan/900Black/LeagueSpartan_900Black.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login-form" options={{ headerShown: false }} />
        <Stack.Screen name="create-account" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
