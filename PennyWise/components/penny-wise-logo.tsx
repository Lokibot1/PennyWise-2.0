import { Image, StyleSheet, Text, View } from 'react-native';
import { Font } from '@/constants/fonts';

interface PennyWiseLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const IMAGE_SIZE_MAP = {
  xs: 40,   // fits inside 40–42 px nav icon buttons
  sm: 80,
  md: 120,
  lg: 180,
};

// ── Image logo — circular crop, zoomed to show chip only ─────────────────────
// The coin occupies ~88 % of the source image; scale up by 1/0.88 ≈ 1.14×
// so the circular mask clips the background corners away.
const ZOOM = 1.14;

export function PennyWiseLogo({ size = 'md' }: PennyWiseLogoProps) {
  const s = IMAGE_SIZE_MAP[size];
  const imgSize = s * ZOOM;
  const offset  = -(imgSize - s) / 2;   // negative margin to re-centre
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, overflow: 'hidden' }}>
      <Image
        source={require('@/assets/images/logo.jpg')}
        style={{ width: imgSize, height: imgSize, marginLeft: offset, marginTop: offset }}
        resizeMode="cover"
      />
    </View>
  );
}

// ── Fallback text logo (kept for any internal use) ────────────────────────────
const TEXT_SIZE_MAP = {
  sm: { big: 52, small: 14, gap: 8 },
  md: { big: 68, small: 18, gap: 10 },
  lg: { big: 84, small: 22, gap: 13 },
};

export function PennyWiseTextLogo({
  color = '#FFFFFF',
  size = 'md',
}: {
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { big, small, gap } = TEXT_SIZE_MAP[size];

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
