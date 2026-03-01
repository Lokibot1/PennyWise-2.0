import { StyleSheet, Text, View } from 'react-native';
import { Font } from '@/constants/fonts';

interface PennyWiseLogoProps {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { big: 52, small: 14, gap: 8 },
  md: { big: 68, small: 18, gap: 10 },
  lg: { big: 84, small: 22, gap: 13 },
};

export function PennyWiseLogo({ color = '#1A1A1A', size = 'md' }: PennyWiseLogoProps) {
  const { big, small, gap } = SIZE_MAP[size];

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={[styles.bigLetter, { color, fontSize: big, lineHeight: big }]}>P</Text>
        <Text style={[styles.smallWord, { color, fontSize: small, marginBottom: gap }]}>ENNY</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.bigLetter, { color, fontSize: big, lineHeight: big }]}>W</Text>
        <Text style={[styles.smallWord, { color, fontSize: small, marginBottom: gap }]}>ISE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bigLetter: {
    fontFamily: Font.headerBlack,
    includeFontPadding: false,
  },
  smallWord: {
    fontFamily: Font.headerBold,
    letterSpacing: 2,
  },
});
