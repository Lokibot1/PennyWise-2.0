import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { supabase } from '@/lib/supabase';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';

// ── Types ──────────────────────────────────────────────────────────────────────
type Goal = {
  id: string;
  title: string;
  icon: string;
  target_amount: number;
  current_amount: number;
  is_completed: boolean;
  is_archived: boolean;
  completed_at: string | null;
  created_at: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const ICON_OPTIONS = [
  'car-outline', 'home-outline', 'airplane-outline', 'school-outline',
  'medkit-outline', 'gift-outline', 'phone-portrait-outline', 'laptop-outline',
  'camera-outline', 'bicycle-outline', 'restaurant-outline', 'fitness-outline',
  'paw-outline', 'diamond-outline', 'trophy-outline', 'musical-notes-outline',
  'game-controller-outline', 'wallet-outline', 'trending-up-outline', 'heart-outline',
  'umbrella-outline', 'boat-outline', 'build-outline', 'leaf-outline',
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return '₱' + value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SavingsGoalsScreen() {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed'>('Active');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Add Goal modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newIcon, setNewIcon] = useState('wallet-outline');
  const [saving, setSaving] = useState(false);

  // Add Funds modal
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────────
  const fetchGoals = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, title, icon, target_amount, current_amount, is_completed, is_archived, completed_at, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!error && data) setGoals(data as Goal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchGoals(session.user.id);
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchGoals]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSaveGoal = async () => {
    if (!newTitle.trim()) { Alert.alert('Missing info', 'Please enter a goal name.'); return; }
    const target = parseFloat(newTarget);
    if (!target || target <= 0) { Alert.alert('Missing info', 'Please enter a valid target amount.'); return; }
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase.from('savings_goals').insert({
      user_id: userId,
      title: newTitle.trim(),
      icon: newIcon,
      target_amount: target,
      current_amount: 0,
      is_completed: false,
      is_archived: false,
    });
    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }

    setShowAddModal(false);
    setNewTitle('');
    setNewTarget('');
    setNewIcon('wallet-outline');
    fetchGoals(userId);
  };

  const handleAddFunds = async () => {
    if (!selectedGoal || !userId) return;
    const amount = parseFloat(fundsAmount);
    if (!amount || amount <= 0) { Alert.alert('Missing info', 'Please enter a valid amount.'); return; }

    setAddingFunds(true);
    const newCurrent = selectedGoal.current_amount + amount;
    const isComplete = newCurrent >= selectedGoal.target_amount;

    const { error } = await supabase
      .from('savings_goals')
      .update({
        current_amount: newCurrent,
        is_completed: isComplete,
        is_archived: isComplete,
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq('id', selectedGoal.id);
    setAddingFunds(false);

    if (error) { Alert.alert('Error', error.message); return; }

    setShowFundsModal(false);
    setFundsAmount('');
    setSelectedGoal(null);
    fetchGoals(userId);

    if (isComplete) {
      setTimeout(() => {
        Alert.alert('Goal Achieved!', `Congratulations! You have reached your "${selectedGoal.title}" savings goal!`);
      }, 400);
    }
  };

  const openAddModal = () => {
    setNewTitle('');
    setNewTarget('');
    setNewIcon('wallet-outline');
    setShowAddModal(true);
  };

  const openFundsModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setFundsAmount('');
    setShowFundsModal(true);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const activeGoals    = goals.filter(g => !g.is_completed && !g.is_archived);
  const completedGoals = goals.filter(g => g.is_completed || g.is_archived);
  const displayedGoals = activeTab === 'Active' ? activeGoals : completedGoals;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.statusBar} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Savings Goals</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={openAddModal} activeOpacity={0.7}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Pills */}
      <View style={styles.tabRow}>
        {(['Active', 'Completed'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
              {tab}
            </Text>
            {tab === 'Completed' && completedGoals.length > 0 && (
              <View style={[styles.countBadge, activeTab === tab && styles.countBadgeActive]}>
                <Text style={[styles.countBadgeText, activeTab === tab && styles.countBadgeTextActive]}>
                  {completedGoals.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Area */}
      <View style={[styles.content, { backgroundColor: theme.cardBg }]}>
        {loading ? (
          <ActivityIndicator color="#3ECBA8" size="large" style={{ marginTop: 60 }} />
        ) : displayedGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'Active' ? 'flag-outline' : 'checkmark-circle-outline'}
              size={52}
              color={theme.divider}
            />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {activeTab === 'Active' ? 'No active goals yet' : 'No completed goals'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {activeTab === 'Active'
                ? 'Tap + to create your first savings goal'
                : 'Keep saving to reach your goals!'}
            </Text>
            {activeTab === 'Active' && (
              <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
                <Text style={styles.emptyAddBtnText}>Create a Goal</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            {displayedGoals.map((goal) => {
              const pct = goal.target_amount > 0
                ? Math.min(100, (goal.current_amount / goal.target_amount) * 100)
                : 0;
              const isCompleted = goal.is_completed || goal.is_archived;

              return (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.surface }]}>
                  {/* Icon */}
                  <View style={[styles.goalIcon, isCompleted && styles.goalIconCompleted]}>
                    <Ionicons name={goal.icon as any} size={22} color="#fff" />
                  </View>

                  {/* Info */}
                  <View style={styles.goalInfo}>
                    <View style={styles.goalTitleRow}>
                      <Text style={[styles.goalTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      {isCompleted && (
                        <View style={styles.doneBadge}>
                          <Ionicons name="checkmark-circle" size={13} color="#3ECBA8" />
                          <Text style={styles.doneBadgeText}>Done</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.goalAmounts, { color: theme.textSecondary }]}>
                      {formatCurrency(goal.current_amount)}
                      <Text style={{ color: theme.textMuted }}> / {formatCurrency(goal.target_amount)}</Text>
                    </Text>

                    <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct}%` as any, backgroundColor: isCompleted ? '#3ECBA8' : '#4895EF' },
                        ]}
                      />
                    </View>

                    <Text style={[styles.pctText, { color: theme.textMuted }]}>
                      {isCompleted
                        ? `Completed${goal.completed_at ? ' · ' + formatDate(goal.completed_at) : ''}`
                        : `${pct.toFixed(0)}% of goal reached`}
                    </Text>
                  </View>

                  {/* Add funds button */}
                  {!isCompleted && (
                    <TouchableOpacity
                      style={styles.addFundsBtn}
                      onPress={() => openFundsModal(goal)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle" size={30} color="#3ECBA8" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Add Goal Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.divider }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Savings Goal</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Goal Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="e.g. Buy a Car"
              placeholderTextColor={theme.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target Amount (₱)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              value={newTarget}
              onChangeText={setNewTarget}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Choose Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                    newIcon === icon && styles.iconOptionActive,
                  ]}
                  onPress={() => setNewIcon(icon)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon as any} size={20} color={newIcon === icon ? '#fff' : theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveGoal}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Create Goal</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Funds Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showFundsModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowFundsModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.divider }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Funds</Text>

            {selectedGoal && (
              <>
                {/* Goal summary */}
                <View style={[styles.goalSummary, { backgroundColor: theme.surface }]}>
                  <View style={styles.goalIcon}>
                    <Ionicons name={selectedGoal.icon as any} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, { color: theme.textPrimary }]}>{selectedGoal.title}</Text>
                    <Text style={[styles.goalAmounts, { color: theme.textSecondary }]}>
                      {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}
                    </Text>
                  </View>
                  <Text style={[styles.pctBadge, { color: '#3ECBA8' }]}>
                    {Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100).toFixed(0)}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: theme.divider, marginBottom: 4 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100)}%` as any,
                        backgroundColor: '#4895EF',
                      },
                    ]}
                  />
                </View>

                {/* Remaining hint */}
                {selectedGoal.current_amount < selectedGoal.target_amount && (
                  <Text style={[styles.remainingHint, { color: theme.textMuted }]}>
                    {formatCurrency(selectedGoal.target_amount - selectedGoal.current_amount)} remaining to goal
                  </Text>
                )}
              </>
            )}

            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>Amount to Add (₱)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="0.00"
              placeholderTextColor={theme.textMuted}
              value={fundsAmount}
              onChangeText={setFundsAmount}
              keyboardType="decimal-pad"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryBtn, addingFunds && { opacity: 0.6 }]}
              onPress={handleAddFunds}
              disabled={addingFunds}
              activeOpacity={0.85}
            >
              {addingFunds
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Add Funds</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFundsModal(false)}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    color: '#fff',
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tab Pills ─────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 18,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.12)',
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#3ECBA8',
  },
  tabPillText: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  tabPillTextActive: {
    fontFamily: Font.bodySemiBold,
    color: '#fff',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  countBadgeText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  countBadgeTextActive: {
    color: '#fff',
  },

  // ── Content ───────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },

  // ── Goal Card ─────────────────────────────────────────────────────────────────
  goalCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4895EF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  goalIconCompleted: {
    backgroundColor: '#3ECBA8',
  },
  goalInfo: {
    flex: 1,
    gap: 4,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalTitle: {
    fontFamily: Font.bodySemiBold,
    fontSize: 15,
    flex: 1,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(62,203,168,0.12)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  doneBadgeText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 10,
    color: '#3ECBA8',
  },
  goalAmounts: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  pctText: {
    fontFamily: Font.bodyRegular,
    fontSize: 11,
    marginTop: 2,
  },
  addFundsBtn: {
    padding: 2,
    flexShrink: 0,
  },

  // ── Empty State ───────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Font.headerBold,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: Font.bodyRegular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAddBtn: {
    marginTop: 8,
    backgroundColor: '#3ECBA8',
    borderRadius: 50,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyAddBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  },

  // ── Modals ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: Font.headerBold,
    fontSize: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: Font.bodyMedium,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Font.bodyRegular,
    fontSize: 15,
    marginBottom: 16,
  },

  // ── Icon Grid ─────────────────────────────────────────────────────────────────
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionActive: {
    backgroundColor: '#3ECBA8',
    borderColor: '#3ECBA8',
  },

  // ── Buttons ───────────────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: '#3ECBA8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    fontFamily: Font.bodySemiBold,
    fontSize: 16,
    color: '#fff',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontFamily: Font.bodyMedium,
    fontSize: 14,
  },

  // ── Add Funds extras ──────────────────────────────────────────────────────────
  goalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  pctBadge: {
    fontFamily: Font.headerBold,
    fontSize: 16,
  },
  remainingHint: {
    fontFamily: Font.bodyRegular,
    fontSize: 12,
    marginBottom: 4,
  },
});
