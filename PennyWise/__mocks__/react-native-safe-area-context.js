const React = require('react');
const { View } = require('react-native');

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

module.exports = {
  SafeAreaProvider:  ({ children }) => children,
  SafeAreaView:      ({ children, ...props }) => React.createElement(View, props, children),
  SafeAreaConsumer:  ({ children }) => children(insets),
  useSafeAreaInsets: () => insets,
  useSafeAreaFrame:  () => ({ x: 0, y: 0, width: 375, height: 812 }),
  initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 375, height: 812 } },
};
