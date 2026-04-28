import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '@/contexts/AppTheme';

// ── Config ─────────────────────────────────────────────────────────────────────
type IoniconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; icon: IoniconName }[] = [
  { name: 'index',       icon: 'home' },
  { name: 'analytics',  icon: 'trending-up-outline' },
  { name: 'budget',     icon: 'layers-outline' },
  { name: 'transaction', icon: 'swap-horizontal-outline' },
  { name: 'profile',    icon: 'person-outline' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH      = SCREEN_WIDTH / TABS.length;
const INDICATOR_SIZE = 46;
const BAR_HEIGHT     = 70;
const PAD_TOP        = 8;
const PAD_BOTTOM     = 10;
const INDICATOR_TOP  = PAD_TOP + (BAR_HEIGHT - PAD_TOP - PAD_BOTTOM - INDICATOR_SIZE) / 2;

const pillCenter = (index: number) => index * TAB_WIDTH + TAB_WIDTH / 2;

// ── TabItem ────────────────────────────────────────────────────────────────────
function TabItem({
  icon,
  isFocused,
  inactiveColor,
  onPress,
  onLongPress,
}: {
  icon: IoniconName;
  isFocused: boolean;
  inactiveColor: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(isFocused ? 1 : 0.82);
  const ty    = useSharedValue(isFocused ? -3 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0.82, { damping: 18, stiffness: 300 });
    ty.value    = withSpring(isFocused ? -3 : 0,   { damping: 16, stiffness: 280 });
  }, [isFocused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: ty.value }],
  }));

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
    >
      <Animated.View style={animStyle}>
        <Ionicons name={icon} size={22} color={isFocused ? '#fff' : inactiveColor} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// Screens inside (tabs) that must NOT show the nav bar
const AUTH_SCREENS = new Set(['login']);

// ── CustomTabBar ───────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter(r => TABS.some(t => t.name === r.name));

  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex(r => r.key === state.routes[state.index].key),
  );

  // ── Stretchy liquid pill ───────────────────────────────────────────────────
  // Each edge animates independently with different spring tensions.
  // The "leading" edge (the one facing the target) springs ahead fast;
  // the "trailing" edge lags behind — creating an elastic stretch effect.
  const initCenter = pillCenter(activeIndex);
  const pillLeft  = useSharedValue(initCenter - INDICATOR_SIZE / 2);
  const pillRight = useSharedValue(initCenter + INDICATOR_SIZE / 2);

  useEffect(() => {
    const targetCenter = pillCenter(activeIndex);
    const targetLeft   = targetCenter - INDICATOR_SIZE / 2;
    const targetRight  = targetCenter + INDICATOR_SIZE / 2;

    // Determine which side is the leading edge
    const movingRight = targetLeft > pillLeft.value;

    const FAST = { damping: 22, stiffness: 400, mass: 0.85 } as const;
    const SLOW = { damping: 28, stiffness: 220, mass: 0.85 } as const;

    if (movingRight) {
      pillRight.value = withSpring(targetRight, FAST);
      pillLeft.value  = withSpring(targetLeft,  SLOW);
    } else {
      pillLeft.value  = withSpring(targetLeft,  FAST);
      pillRight.value = withSpring(targetRight, SLOW);
    }
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left:  pillLeft.value,
    width: pillRight.value - pillLeft.value,
  }));

  if (AUTH_SCREENS.has(state.routes[state.index].name)) return null;

  return (
    <View style={[
      styles.tabBar,
      {
        paddingBottom: PAD_BOTTOM + insets.bottom,
        height: BAR_HEIGHT + insets.bottom,
        backgroundColor: theme.tabBarBg,
      },
    ]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {visibleRoutes.map((route, index) => {
        const tab = TABS.find(t => t.name === route.name)!;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (index !== activeIndex && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () =>
          navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <TabItem
            key={route.key}
            icon={tab.icon}
            isFocused={index === activeIndex}
            inactiveColor={theme.tabBarInactive}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="transaction" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="explore"  options={{ href: null }} />
      <Tabs.Screen name="login"    options={{ href: null }} />
      <Tabs.Screen name="transfer" options={{ href: null }} />
    </Tabs>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    paddingTop: PAD_TOP,
    paddingBottom: PAD_BOTTOM,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 20,
  },
  indicator: {
    position: 'absolute',
    top: INDICATOR_TOP,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: '#1B7A4A',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
