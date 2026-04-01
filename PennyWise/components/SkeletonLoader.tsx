/**
 * SkeletonLoader.tsx
 * Reusable skeleton loading components with shimmer animation.
 * Uses react-native-reanimated (already in project) — no extra dependencies.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/AppTheme';

// ── Base animated box ──────────────────────────────────────────────────────────
type SkeletonBoxProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
};

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const baseColor = theme.isDark ? '#2E2E2E' : '#D8D8D8';

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: baseColor }, animStyle, style]}
    />
  );
}

// ── Home page: balance card + savings card skeletons ──────────────────────────
export function HomeDashboardSkeleton() {
  const { theme } = useAppTheme();
  const cardBg = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)';
  const cardBorder = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';
  return (
    <>
      {/* Balance Card */}
      <View style={{
        backgroundColor: cardBg,
        borderRadius: 16, padding: 16, marginBottom: 14,
        borderWidth: 1, borderColor: cardBorder,
      }}>
        {/* Two balance columns */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: theme.divider }}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width={90} height={11} borderRadius={5} />
            <SkeletonBox width={130} height={22} borderRadius={6} />
          </View>
          <View style={{ width: 1, height: 40, backgroundColor: theme.divider, marginHorizontal: 12 }} />
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 8 }}>
            <SkeletonBox width={90} height={11} borderRadius={5} />
            <SkeletonBox width={110} height={22} borderRadius={6} />
          </View>
        </View>

        {/* Progress section */}
        <View style={{ paddingTop: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBox width={42} height={22} borderRadius={6} />
            <SkeletonBox width={80} height={12} borderRadius={5} />
          </View>
          <SkeletonBox width='100%' height={10} borderRadius={5} />
          <SkeletonBox width={200} height={12} borderRadius={5} />
        </View>
      </View>

      {/* Savings Card */}
      <View style={{
        backgroundColor: 'rgba(27,122,74,0.55)',
        borderRadius: 20, padding: 18,
        flexDirection: 'row', alignItems: 'center',
      }}>
        {/* Left: circle + label */}
        <View style={{ flex: 1, alignItems: 'center', gap: 10 }}>
          <SkeletonBox width={72} height={72} borderRadius={36}
            style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <SkeletonBox width={64} height={11} borderRadius={5}
            style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
        </View>

        <View style={{ width: 1, height: 80, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 16 }} />

        {/* Right: two stat rows */}
        <View style={{ flex: 1.4, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBox width={18} height={18} borderRadius={4}
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <View style={{ gap: 5 }}>
              <SkeletonBox width={100} height={10} borderRadius={4}
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
              <SkeletonBox width={80} height={14} borderRadius={4}
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SkeletonBox width={18} height={18} borderRadius={4}
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <View style={{ gap: 5 }}>
              <SkeletonBox width={110} height={10} borderRadius={4}
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
              <SkeletonBox width={80} height={14} borderRadius={4}
                style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

// ── Home page: transaction list skeleton rows ─────────────────────────────────
export function TransactionRowSkeleton({ isLast = false }: { isLast?: boolean }) {
  const { theme } = useAppTheme();
  return (
    <View testID="transaction-row-skeleton" style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, gap: 10,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: theme.divider,
    }}>
      {/* Icon circle */}
      <SkeletonBox width={46} height={46} borderRadius={23} />
      {/* Title + meta */}
      <View style={{ flex: 1, gap: 7 }}>
        <SkeletonBox width='70%' height={14} borderRadius={5} />
        <SkeletonBox width='45%' height={11} borderRadius={5} />
      </View>
      {/* Category */}
      <SkeletonBox width={52} height={11} borderRadius={5} />
      {/* Divider */}
      <View style={{ width: 1, height: 28, backgroundColor: theme.divider, marginHorizontal: 6 }} />
      {/* Amount */}
      <SkeletonBox width={72} height={13} borderRadius={5} />
    </View>
  );
}

// ── Category / Analytics / Budget page skeleton ───────────────────────────────
export function CategoryPageSkeleton() {
  const { theme } = useAppTheme();
  const cardBg = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.88)';
  const cardBorder = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)';

  return (
    <>
      {/* Header green section */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}>
        {/* Nav row */}
        <View style={{ flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 20 }}>
          <SkeletonBox width={42} height={42} borderRadius={21}
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <SkeletonBox width={140} height={20} borderRadius={6}
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <SkeletonBox width={42} height={42} borderRadius={21}
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </View>

        {/* Balance card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: cardBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 14,
            borderBottomWidth: 1, borderBottomColor: theme.divider }}>
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width={90} height={11} borderRadius={5} />
              <SkeletonBox width={130} height={22} borderRadius={6} />
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: theme.divider, marginHorizontal: 12 }} />
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 8 }}>
              <SkeletonBox width={80} height={11} borderRadius={5} />
              <SkeletonBox width={60} height={22} borderRadius={6} />
            </View>
          </View>
          <View style={{ paddingTop: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <SkeletonBox width={42} height={22} borderRadius={6} />
              <SkeletonBox width={100} height={12} borderRadius={5} />
            </View>
            <SkeletonBox width='100%' height={10} borderRadius={5} />
            <SkeletonBox width={190} height={12} borderRadius={5} />
          </View>
        </View>
      </View>

      {/* Card section */}
      <View style={{
        flex: 1, backgroundColor: theme.cardBg,
        paddingTop: 24, paddingHorizontal: 20,
      }}>
        {/* Option cards */}
        {[...Array(3)].map((_, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: theme.surface, borderRadius: 16,
            padding: 16, marginBottom: 14, gap: 14,
          }}>
            <SkeletonBox width={58} height={58} borderRadius={16} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox width='55%' height={15} borderRadius={5} />
              <SkeletonBox width='80%' height={12} borderRadius={5} />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

// ── Profile: full card section skeleton ───────────────────────────────────────
export function ProfileCardSkeleton() {
  const { theme } = useAppTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
      {/* Info pill */}
      <SkeletonBox width={140} height={32} borderRadius={20} style={{ marginBottom: 20 }} />

      {/* Section group */}
      {[...Array(2)].map((_, g) => (
        <View key={g} style={{ marginBottom: 16 }}>
          <SkeletonBox width={80} height={11} borderRadius={5} style={{ marginBottom: 10, marginLeft: 4 }} />
          <View style={{ backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden' }}>
            {[...Array(2)].map((_, r) => (
              <View key={r} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 14, paddingHorizontal: 16,
                borderBottomWidth: r === 0 ? 1 : 0, borderBottomColor: theme.divider,
              }}>
                <SkeletonBox width={38} height={38} borderRadius={19} style={{ marginRight: 14 }} />
                <SkeletonBox width={`${50 + r * 20}%`} height={14} borderRadius={5} />
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Danger row */}
      <View style={{ backgroundColor: 'rgba(224,85,85,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}>
          <SkeletonBox width={38} height={38} borderRadius={19} style={{ marginRight: 14 }} />
          <SkeletonBox width='35%' height={14} borderRadius={5} />
        </View>
      </View>
    </View>
  );
}

// ── Profile: name + email skeleton ────────────────────────────────────────────
export function ProfileInfoSkeleton() {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 4 }}>
      <SkeletonBox width={140} height={20} borderRadius={6} />
      <SkeletonBox width={200} height={14} borderRadius={5} />
    </View>
  );
}

// ── Profile: avatar skeleton ───────────────────────────────────────────────────
export function ProfileAvatarSkeleton() {
  return (
    <SkeletonBox
      width={96}
      height={96}
      borderRadius={48}
      style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
    />
  );
}

// ── Activity History skeleton ─────────────────────────────────────────────────
export function ActivityHistorySkeleton() {
  const { theme } = useAppTheme();
  // Two sections: 3 rows then 2 rows
  const sections = [3, 2];
  return (
    <View style={{ paddingBottom: 24 }}>
      {sections.map((count, si) => (
        <View key={si}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, paddingVertical: 10, gap: 10 }}>
            <SkeletonBox width={si === 0 ? 44 : 90} height={10} borderRadius={4} />
            <View style={{ flex: 1, height: 1, backgroundColor: theme.divider }} />
          </View>
          {/* Rows */}
          {[...Array(count)].map((_, ri) => (
            <View key={ri} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 20, paddingVertical: 12,
              borderBottomWidth: 1, borderBottomColor: theme.divider,
              gap: 12,
            }}>
              <SkeletonBox width={40} height={40} borderRadius={20} style={{ flexShrink: 0 }} />
              <View style={{ flex: 1, gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <SkeletonBox width={`${42 + (ri * 13) % 28}%`} height={13} borderRadius={5} />
                  <SkeletonBox width={52} height={10} borderRadius={4} style={{ flexShrink: 0 }} />
                </View>
                <SkeletonBox width={`${28 + (ri * 11) % 22}%`} height={11} borderRadius={4} />
                <SkeletonBox width={90 + (ri % 3) * 30} height={18} borderRadius={5} />
              </View>
              <SkeletonBox width={12} height={12} borderRadius={3} style={{ flexShrink: 0 }} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Profile: menu row skeletons ────────────────────────────────────────────────
export function ProfileMenuSkeleton() {
  const { theme } = useAppTheme();
  return (
    <View style={{ width: '100%', marginTop: 16 }}>
      {[...Array(5)].map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            borderBottomWidth: i < 4 ? 1 : 0,
            borderBottomColor: theme.divider,
          }}
        >
          <SkeletonBox width={42} height={42} borderRadius={21} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <SkeletonBox width={`${45 + (i % 3) * 15}%`} height={14} borderRadius={5} />
          </View>
          <SkeletonBox width={16} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}
