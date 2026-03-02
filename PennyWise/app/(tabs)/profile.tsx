import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Font } from '@/constants/fonts';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FAF6' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Font.headerBold, fontSize: 24, color: '#1A1A1A' },
  subtitle: { fontFamily: Font.bodyRegular, fontSize: 14, color: '#888', marginTop: 8 },
});
