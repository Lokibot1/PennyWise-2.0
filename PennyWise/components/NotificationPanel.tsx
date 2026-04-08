/**
 * components/NotificationPanel.tsx
 * Floating dropdown anchored directly below the notification bell.
 * Shows animated skeleton cards while notifications are loading.
 */
import { useEffect } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Font } from '@/constants/fonts';
import { sfx } from '@/lib/sfx';
import { useAppTheme } from '@/contexts/AppTheme';
import { useNotifications } from '@/contexts/NotificationContext';
import type { AppNotification } from '@/lib/notifications';

const SCREEN_W = Dimensions.get('window').width;
const PANEL_MX = 12;
const CARET_W  = 9;
const CARET_H  = 7;
const DEFAULT_SKELETON_COUNT = 3;

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  warning:  '#F59E0B',
  critical: '#EF4444',
  info:     '#3B82F6',
  success:  '#1B7A4A',
};
const TYPE_BG: Record<AppNotification['type'], string> = {
  warning:  'rgba(245,158,11,0.08)',
  critical: 'rgba(239,68,68,0.08)',
  info:     'rgba(59,130,246,0.08)',
  success:  'rgba(27,122,74,0.08)',
};
const TYPE_LABEL: Record<AppNotification['type'], string> = {
  warning: 'Warning', critical: 'Alert', info: 'Info', success: 'Tip',
};

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({ sweep }: { sweep: Animated.SharedValue<number> }) {
  const { theme } = useAppTheme();

  const shimBg  = theme.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.75)';
  const blockBg = theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-180, 260]) }],
  }));

  const Bone = ({
    w, h = 10, r = 5, mt = 0,
  }: { w: number | `${number}%`; h?: number; r?: number; mt?: number }) => (
    <View style={{
      width: w, height: h, borderRadius: r,
      backgroundColor: blockBg,
      marginTop: mt,
      overflow: 'hidden',
    }}>
      <Animated.View style={[{
        position: 'absolute', top: 0, bottom: 0, width: 90,
        backgroundColor: shimBg,
        transform: [{ skewX: '-20deg' }],
      }, sweepStyle]} />
    </View>
  );

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start',
      borderRadius: 12, marginBottom: 8,
      paddingHorizontal: 10, paddingVertical: 10,
      gap: 10,
      backgroundColor: theme.surface,
    }}>
      {/* Icon circle bone */}
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: blockBg,
        overflow: 'hidden', flexShrink: 0,
      }}>
        <Animated.View style={[{
          position: 'absolute', top: 0, bottom: 0, width: 90,
          backgroundColor: shimBg,
          transform: [{ skewX: '-20deg' }],
        }, sweepStyle]} />
      </View>

      {/* Text bones */}
      <View style={{ flex: 1, gap: 7 }}>
        <Bone w="62%" h={11} />
        <Bone w="90%" h={9} />
        <Bone w="75%" h={9} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 1 }}>
          <Bone w={38} h={15} r={4} />
          <Bone w={52} h={15} r={4} />
        </View>
      </View>
    </View>
  );
}

// ── Notification card ─────────────────────────────────────────────────────────
function NotifCard({ notif, isRead }: { notif: AppNotification; isRead: boolean }) {
  const { theme }    = useAppTheme();
  const { markRead } = useNotifications();
  const accent = TYPE_COLOR[notif.type];
  const bg     = TYPE_BG[notif.type];

  return (
    <TouchableOpacity
      onPress={() => { sfx.tap(); markRead(notif.id); }}
      activeOpacity={0.65}
      style={{
        flexDirection:   'row',
        alignItems:      'flex-start',
        backgroundColor: isRead ? 'transparent' : theme.surface,
        borderRadius:    12,
        marginBottom:    6,
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap:             10,
        borderWidth:     isRead ? 0 : 1,
        borderColor:     `${accent}28`,
        opacity:         isRead ? 0.6 : 1,
      }}
    >
      {/* Icon */}
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Ionicons name={notif.icon as any} size={17} color={accent} />
      </View>

      {/* Text */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: Font.bodySemiBold, fontSize: 12.5, color: theme.textPrimary, flex: 1 }} numberOfLines={1}>
            {notif.title}
          </Text>
          {!isRead && (
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent, marginLeft: 6 }} />
          )}
        </View>

        <Text style={{ fontFamily: Font.bodyRegular, fontSize: 11.5, color: theme.textSecondary, lineHeight: 16 }}>
          {notif.body}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <View style={{ backgroundColor: `${accent}18`, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5 }}>
            <Text style={{ fontFamily: Font.bodySemiBold, fontSize: 9.5, color: accent, letterSpacing: 0.3 }}>
              {TYPE_LABEL[notif.type].toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontFamily: Font.bodyRegular, fontSize: 10, color: theme.textMuted }}>
            {relativeTime(notif.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function NotificationPanel() {
  const { theme } = useAppTheme();
  const {
    notifications, readIds, panelVisible, bellLayout,
    closePanel, markAllRead, unreadCount, loading,
  } = useNotifications();

  const progress = useSharedValue(0);
  const sweep    = useSharedValue(0);   // shared shimmer sweep for all skeletons

  useEffect(() => {
    if (panelVisible) {
      progress.value = withSpring(1, { damping: 24, stiffness: 300, mass: 0.75 });
      // start / restart shimmer sweep loop
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: 1100 }),
        -1,
        false,
      );
    } else {
      progress.value = withTiming(0, { duration: 150 });
    }
  }, [panelVisible]);

  const floatStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(progress.value, [0, 0.5, 1], [0, 0.8, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-8, 0]) },
      { scale:      interpolate(progress.value, [0, 1], [0.98, 1]) },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  // ── Positioning ─────────────────────────────────────────────────────────────
  const bellBottom  = bellLayout ? bellLayout.pageY + bellLayout.height : 108;
  const panelTop    = bellBottom + CARET_H;
  const panelWidth  = SCREEN_W - PANEL_MX * 2;
  const bellCenterX = bellLayout
    ? bellLayout.pageX + bellLayout.width / 2 - PANEL_MX
    : panelWidth - 28;
  const caretLeft   = Math.max(CARET_W + 8, Math.min(panelWidth - CARET_W - 8, bellCenterX - CARET_W));

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <Modal
      visible={panelVisible}
      transparent
      animationType="none"
      onRequestClose={closePanel}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.2)',
        }, backdropStyle]}
        pointerEvents="none"
      />
      <Pressable
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        onPress={closePanel}
        testID="notification-panel-backdrop"
      />

      {/* Floating panel */}
      <Animated.View
        style={[{
          position:        'absolute',
          top:             panelTop,
          left:            PANEL_MX,
          right:           PANEL_MX,
          maxHeight:       '72%',
          backgroundColor: theme.cardBg,
          borderRadius:    18,
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 8 },
          shadowOpacity:   0.15,
          shadowRadius:    20,
          elevation:       20,
        }, floatStyle]}
      >
        {/* Caret shadow */}
        <View style={{
          position:          'absolute',
          top:               -CARET_H - 1,
          left:              caretLeft - 1,
          width:             0, height: 0,
          borderLeftWidth:   CARET_W + 1,
          borderRightWidth:  CARET_W + 1,
          borderBottomWidth: CARET_H + 1,
          borderLeftColor:   'transparent',
          borderRightColor:  'transparent',
          borderBottomColor: 'rgba(0,0,0,0.08)',
        }} />

        {/* Caret */}
        <View style={{
          position:          'absolute',
          top:               -CARET_H,
          left:              caretLeft,
          width:             0, height: 0,
          borderLeftWidth:   CARET_W,
          borderRightWidth:  CARET_W,
          borderBottomWidth: CARET_H,
          borderLeftColor:   'transparent',
          borderRightColor:  'transparent',
          borderBottomColor: theme.cardBg,
        }} />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection:     'row',
          alignItems:        'center',
          justifyContent:    'space-between',
          paddingHorizontal: 14,
          paddingTop:        14,
          paddingBottom:     12,
          borderBottomWidth: 1,
          borderBottomColor: theme.divider,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(27,122,74,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="notifications-outline" size={16} color="#1B7A4A" />
            </View>
            <View>
              <Text style={{ fontFamily: Font.headerBold, fontSize: 15, color: theme.textPrimary, lineHeight: 18 }}>
                Notifications
              </Text>
              <Text style={{ fontFamily: Font.bodyRegular, fontSize: 10.5, color: theme.textMuted }}>
                {loading ? 'Loading…' : unread > 0 ? `${unread} unread` : 'All caught up'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {!loading && unreadCount > 0 && (
              <TouchableOpacity
                onPress={() => { sfx.success(); markAllRead(); }}
                activeOpacity={0.7}
                style={{
                  backgroundColor: 'rgba(27,122,74,0.08)',
                  borderRadius: 20,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontFamily: Font.bodySemiBold, fontSize: 11, color: '#1B7A4A' }}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={closePanel}
              activeOpacity={0.7}
              style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: theme.surface,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={15} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── List ────────────────────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 14 }}
          scrollEnabled={!loading}
        >
          {loading ? (
            // Show exactly as many skeletons as the previous notification count (or default if first load)
            Array.from({ length: notifications.length || DEFAULT_SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} sweep={sweep} />
            ))
          ) : notifications.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <View style={{
                width: 52, height: 52, borderRadius: 26,
                backgroundColor: 'rgba(27,122,74,0.07)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#1B7A4A" />
              </View>
              <Text style={{ fontFamily: Font.headerBold, fontSize: 13.5, color: theme.textPrimary }}>
                All caught up!
              </Text>
              <Text style={{ fontFamily: Font.bodyRegular, fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 20 }}>
                No notifications right now.
              </Text>
            </View>
          ) : (
            notifications.map(n => (
              <NotifCard key={n.id} notif={n} isRead={readIds.has(n.id)} />
            ))
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
