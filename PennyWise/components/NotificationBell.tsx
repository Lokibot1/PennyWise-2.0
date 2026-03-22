/**
 * components/NotificationBell.tsx
 * Drop-in replacement for any inert bell icon button.
 * Measures its own screen position and passes it to the panel so the
 * dropdown appears anchored directly below the bell.
 */
import { useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useNotifications } from '@/contexts/NotificationContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
};

export default function NotificationBell({ style, iconColor = '#fff' }: Props) {
  const { unreadCount, openPanel } = useNotifications();
  const ref = useRef<TouchableOpacity>(null);

  const handlePress = () => {
    ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
      openPanel({ pageX, pageY, width, height });
    });
  };

  return (
    <TouchableOpacity ref={ref} style={[{ position: 'relative' }, style]} onPress={handlePress} activeOpacity={0.8}>
      <Ionicons name="notifications-outline" size={20} color={iconColor} />
      {unreadCount > 0 && (
        <View style={{
          position:        'absolute',
          top:             -5,
          right:           -5,
          minWidth:        16,
          height:          16,
          borderRadius:    8,
          backgroundColor: '#E05555',
          alignItems:      'center',
          justifyContent:  'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{
            color:      '#fff',
            fontSize:   9,
            fontFamily: Font.bodySemiBold,
            lineHeight: 11,
          }}>
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
