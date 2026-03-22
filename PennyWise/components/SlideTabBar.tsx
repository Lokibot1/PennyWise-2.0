import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { Font } from '@/constants/fonts';

type Props = {
  tabs: readonly string[];
  active: string;
  onChange: (tab: string) => void;
  /** Optional count badge per tab label. Badge only shows when count > 0. */
  badge?: Partial<Record<string, number>>;
  /** Background colour of the track. Default: '#F0F0F0' */
  trackColor?: string;
  /** Colour of the sliding indicator pill. Default: '#1B7A4A' */
  activeColor?: string;
  /** Text colour for inactive tabs. Default: '#888' */
  inactiveTextColor?: string;
  /** Extra styles applied to the outer track container. */
  style?: ViewStyle;
};

export default function SlideTabBar({
  tabs,
  active,
  onChange,
  badge,
  trackColor = '#F0F0F0',
  activeColor = '#1B7A4A',
  inactiveTextColor = '#888',
  style,
}: Props) {
  const [tabWidth, setTabWidth] = useState(0);
  const tabWidthRef             = useRef(0);
  const indicatorX              = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleLayout = (width: number) => {
    const w = (width - 8) / tabs.length;
    tabWidthRef.current = w;
    setTabWidth(w);
    // Snap to the initial active position without animation
    indicatorX.value = tabs.indexOf(active) * w;
  };

  // Keep the indicator in sync when `active` changes from outside
  useEffect(() => {
    if (tabWidthRef.current > 0) {
      indicatorX.value = withSpring(tabs.indexOf(active) * tabWidthRef.current, {
        damping: 26,
        stiffness: 340,
      });
    }
  }, [active]);

  const handlePress = (tab: string) => {
    indicatorX.value = withSpring(tabs.indexOf(tab) * tabWidthRef.current, {
      damping: 26,
      stiffness: 340,
    });
    onChange(tab);
  };

  return (
    <View
      style={[st.track, { backgroundColor: trackColor }, style]}
      onLayout={(e) => handleLayout(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[st.indicator, { width: tabWidth, backgroundColor: activeColor }, indicatorStyle]}
      />
      {tabs.map(tab => {
        const isActive = active === tab;
        const count    = badge?.[tab];
        return (
          <TouchableOpacity
            key={tab}
            style={st.tab}
            onPress={() => handlePress(tab)}
            activeOpacity={0.8}
          >
            <Text style={[st.tabText, { color: isActive ? '#fff' : inactiveTextColor }, isActive && st.tabTextActive]}>
              {tab}
            </Text>
            {count != null && count > 0 && (
              <View style={[st.badge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]}>
                <Text style={[st.badgeTxt, { color: isActive ? '#fff' : inactiveTextColor }]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 50,
    padding: 4,
  },
  indicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 50,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 50,
    gap: 6,
  },
  tabText: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
  },
  tabTextActive: {
    fontFamily: Font.bodySemiBold,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: {
    fontFamily: Font.bodySemiBold,
    fontSize: 11,
  },
});
