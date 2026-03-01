import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PennyWiseLogo } from '@/components/penny-wise-logo';
import { Font } from '@/constants/fonts';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* Logo + tagline */}
        <View style={styles.logoSection}>
          <PennyWiseLogo size="md" />
          <Text style={styles.tagline}>Smart spending. Real savings.</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login-form')}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            activeOpacity={0.82}
            onPress={() => router.push('/create-account')}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.6}
            style={styles.forgotButton}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotButtonText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FAF6',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 48,
  },

  // ── Logo ──────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    gap: 14,
  },
  tagline: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    color: '#5A7A6A',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ── Buttons ───────────────────────────────────────
  buttonSection: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  loginButton: {
    backgroundColor: '#3ECBA8',
    borderRadius: 50,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3ECBA8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#3ECBA8',
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
  },
  signupButtonText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#2AAD8E',
    letterSpacing: 0.5,
  },
  forgotButton: {
    paddingVertical: 4,
    marginTop: 2,
  },
  forgotButtonText: {
    fontFamily: Font.bodyRegular,
    fontSize: 13,
    color: '#7A9A8A',
    textDecorationLine: 'underline',
    textDecorationColor: '#B0CCBF',
  },
});
