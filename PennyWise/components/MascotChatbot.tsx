/**
 * MascotChatbot
 *
 * Rule-based chat with Penny the Owl.
 * - Loads the user's real financial data (income, expenses, goals, profile)
 *   via DataCache when the modal opens.
 * - Every message is answered locally by pennyBrain — no API, no internet needed.
 * - Works perfectly offline.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import { supabase } from '@/lib/supabase';
import { DataCache } from '@/lib/dataCache';
import { buildSnapshot, processMessage, type FinancialData } from '@/lib/pennyBrain';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "How's my budget?",
  "Show my expenses",
  "Money saving tips",
  "How can I save more?",
  "What's my biggest expense?",
  "Income vs expenses",
  "Daily spending",
  "Show recurring bills",
  "Give me an analysis",
];

// ── Greeting ──────────────────────────────────────────────────────────────────
const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hoo there! 🦉 I'm Penny — I can read your actual PennyWise data and give you real insights.\n\nAsk me about your budget, expenses, savings goals, or how to cut costs. Everything I say is based on your numbers — no guessing!",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function MascotChatbot({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);   // data loading
  const [thinking, setThinking] = useState(false);   // "Penny is typing"
  const [data, setData]         = useState<FinancialData | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // ── Slide-up animation ─────────────────────────────────────────────────────
  const slideY = useRef(new Animated.Value(700)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, friction: 9, tension: 100, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideY, { toValue: 700, duration: 260, easing: Easing.in(Easing.ease), useNativeDriver: true }).start();
    }
  }, [visible]);

  // ── Load financial data when modal opens ───────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const [profile, incomeSources, incomeCategories, expenses, expenseCategories, savingsGoals] =
          await Promise.all([
            DataCache.fetchProfile(user.id),
            DataCache.fetchIncomeSources(user.id),
            DataCache.fetchIncomeCategories(user.id),
            DataCache.fetchExpenses(user.id),
            DataCache.fetchExpenseCategories(user.id),
            DataCache.fetchSavingsGoals(user.id),
          ]);

        if (cancelled) return;

        const snapshot = buildSnapshot({
          name:             profile?.full_name ?? 'there',
          budgetLimit:      profile?.budget_limit ?? 0,
          incomeSources:    incomeSources as any,
          incomeCategories: incomeCategories as any,
          expenses:         expenses as any,
          expenseCategories: expenseCategories as any,
          savingsGoals:     savingsGoals as any,
        });

        setData(snapshot);
      } catch {
        // silently fail — chatbot will handle missing data gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible]);

  // ── Typing indicator dots ──────────────────────────────────────────────────
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!thinking) return;
    const blink = (dot: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]));
    const a1 = blink(dot1, 0); const a2 = blink(dot2, 150); const a3 = blink(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [thinking]);

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    scrollToBottom();

    // Tiny delay so the "thinking" dots are visible before replying
    setTimeout(() => {
      const reply = data
        ? processMessage(trimmed, data)
        : "I'm still loading your data — give me a second and try again! 🦉";

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setThinking(false);
      scrollToBottom();
    }, 420);
  };

  const reset = () => { setMessages([GREETING]); setInput(''); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: theme.cardBg,
            paddingBottom: insets.bottom + 8,
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerOwl}>🦉</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerName, { color: theme.textPrimary }]}>Penny</Text>
            <Text style={styles.headerSub}>
              {loading ? 'Loading your data…' : '● Your financial advisor'}
            </Text>
          </View>
          <TouchableOpacity onPress={reset} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={19} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Loading bar */}
        {loading && (
          <View style={[styles.loadingBar, { backgroundColor: theme.surface }]}>
            <ActivityIndicator size="small" color="#3ECBA8" />
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>
              Reading your account data…
            </Text>
          </View>
        )}

        {/* ── Messages + Input ──────────────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.msgRow,
                  msg.role === 'user' ? styles.msgRowUser : styles.msgRowPenny,
                ]}
              >
                {msg.role === 'assistant' && (
                  <View style={styles.msgAvatar}>
                    <Text style={styles.msgAvatarEmoji}>🦉</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    msg.role === 'user'
                      ? styles.bubbleUser
                      : [styles.bubblePenny, { backgroundColor: theme.surface, borderColor: theme.divider }],
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      msg.role === 'user'
                        ? styles.bubbleTextUser
                        : [styles.bubbleTextPenny, { color: theme.textPrimary }],
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}

            {/* Typing indicator */}
            {thinking && (
              <View style={[styles.msgRow, styles.msgRowPenny]}>
                <View style={styles.msgAvatar}>
                  <Text style={styles.msgAvatarEmoji}>🦉</Text>
                </View>
                <View style={[styles.bubble, styles.bubblePenny, { backgroundColor: theme.surface, borderColor: theme.divider }]}>
                  <View style={styles.typingDots}>
                    {[dot1, dot2, dot3].map((dot, i) => (
                      <Animated.View
                        key={i}
                        style={[styles.typingDot, { opacity: dot, backgroundColor: '#3ECBA8' }]}
                      />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── Suggestion chips (first message only) ─────────────────────── */}
          {messages.length === 1 && !loading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsRow}
              style={styles.suggestionsContainer}
            >
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.divider }]}
                  onPress={() => send(s)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Input row ─────────────────────────────────────────────────── */}
          <View style={[styles.inputRow, { borderTopColor: theme.divider, backgroundColor: theme.cardBg }]}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                },
              ]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask Penny about your finances…"
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={300}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => send(input)}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() && !thinking ? '#3ECBA8' : theme.surface },
              ]}
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}
              activeOpacity={0.8}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() && !thinking ? '#fff' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3ECBA8',
    alignItems: 'center', justifyContent: 'center',
  },
  headerOwl: { fontSize: 24 },
  headerText: { flex: 1 },
  headerName: { fontFamily: Font.bodyBold, fontSize: 16 },
  headerSub: {
    fontFamily: Font.bodyRegular,
    fontSize: 11.5,
    color: '#3ECBA8',
    marginTop: 1,
  },
  headerBtn: { padding: 6 },

  // Loading bar
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: { fontFamily: Font.bodyRegular, fontSize: 12.5 },

  // Messages
  messageList: { flex: 1 },
  messageContent: { padding: 16, gap: 14 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowPenny: { justifyContent: 'flex-start' },
  msgRowUser:  { justifyContent: 'flex-end' },

  msgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#3ECBA8',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  msgAvatarEmoji: { fontSize: 18 },

  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bubblePenny: { borderBottomLeftRadius: 4 },
  bubbleUser:  { borderBottomRightRadius: 4, backgroundColor: '#3ECBA8' },

  bubbleText: { fontFamily: Font.bodyRegular, fontSize: 14, lineHeight: 21 },
  bubbleTextUser:  { color: '#fff' },
  bubbleTextPenny: {},

  // Typing dots
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 2 },
  typingDot:  { width: 8, height: 8, borderRadius: 4 },

  // Suggestions
  suggestionsContainer: { maxHeight: 50, marginBottom: 2 },
  suggestionsRow: { paddingHorizontal: 14, gap: 8, paddingVertical: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontFamily: Font.bodyRegular, fontSize: 12.5 },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    maxHeight: 110,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});
