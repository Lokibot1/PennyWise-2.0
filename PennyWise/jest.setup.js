// Suppress React Native's SafeAreaView deprecation warning.
// login.tsx and transfer.tsx use the RN built-in SafeAreaView; that's a
// source-code concern, not a test concern.
const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('SafeAreaView has been deprecated')
  ) {
    return;
  }
  originalWarn(...args);
};
