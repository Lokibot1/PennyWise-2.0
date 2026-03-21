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
import { logActivity, ACTION, ENTITY } from '@/lib/logActivity';
import { Font } from '@/constants/fonts';
import { useAppTheme } from '@/contexts/AppTheme';
import ConfirmModal from '@/components/ConfirmModal';
import SlideTabBar from '@/components/SlideTabBar';

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

// ── Shared modal sub-component ────────────────────────────────────────────────
function IconPicker({
  selected,
  onSelect,
  theme,
}: {
  selected: string;
  onSelect: (icon: string) => void;
  theme: import('@/contexts/AppTheme').Theme;
}) {
  return (
    <View style={styles.iconGrid}>
      {ICON_OPTIONS.map(icon => (
        <TouchableOpacity
          key={icon}
          style={[
            styles.iconOption,
            { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
            selected === icon && styles.iconOptionActive,
          ]}
          onPress={() => onSelect(icon)}
          activeOpacity={0.7}
        >
          <Ionicons name={icon as any} size={20} color={selected === icon ? '#fff' : theme.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SavingsGoalsScreen() {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<'Active' | 'Completed' | 'Archived'>('Active');
  const [goals, setGoals]         = useState<Goal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string | null>(null);

  // ── Add Goal modal state ───────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle]         = useState('');
  const [newTarget, setNewTarget]       = useState('');
  const [newIcon, setNewIcon]           = useState('wallet-outline');
  const [saving, setSaving]             = useState(false);

  // ── Edit Goal modal state ──────────────────────────────────────────────────
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editingGoal, setEditingGoal]       = useState<Goal | null>(null);
  const [editTitle, setEditTitle]           = useState('');
  const [editTarget, setEditTarget]         = useState('');
  const [editIcon, setEditIcon]             = useState('wallet-outline');
  const [editSaving, setEditSaving]         = useState(false);

  // ── Add Funds modal state ──────────────────────────────────────────────────
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [selectedGoal, setSelectedGoal]     = useState<Goal | null>(null);
  const [fundsAmount, setFundsAmount]       = useState('');
  const [addingFunds, setAddingFunds]       = useState(false);

  // ── Kebab menu state ───────────────────────────────────────────────────────
  const [menuGoalId, setMenuGoalId]                 = useState<string | null>(null);
  const [pendingArchiveGoal, setPendingArchiveGoal] = useState<Goal | null>(null);
  const [pendingDeleteGoal,  setPendingDeleteGoal]  = useState<Goal | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  /* Create */
  const handleSaveGoal = async () => {
    if (!newTitle.trim()) { Alert.alert('Missing info', 'Please enter a goal name.'); return; }
    const target = parseFloat(newTarget);
    if (!target || target <= 0) { Alert.alert('Missing info', 'Please enter a valid target amount.'); return; }
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase.from('savings_goals').insert({
      user_id: userId, title: newTitle.trim(), icon: newIcon,
      target_amount: target, current_amount: 0,
      is_completed: false, is_archived: false,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    setShowAddModal(false);
    setNewTitle(''); setNewTarget(''); setNewIcon('wallet-outline');
    fetchGoals(userId);
    logActivity({
      user_id: userId, action_type: ACTION.SAVINGS_GOAL_CREATED, entity_type: ENTITY.SAVINGS_GOAL,
      title: `New Goal: ${newTitle.trim()}`,
      description: `Target: ${formatCurrency(target)}`,
      icon: newIcon,
    });
  };

  /* Open edit modal pre-filled */
  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditTarget(String(goal.target_amount));
    setEditIcon(goal.icon);
    setShowEditModal(true);
  };

  /* Save edit */
  const handleEditGoal = async () => {
    if (!editingGoal || !userId) return;
    if (!editTitle.trim()) { Alert.alert('Missing info', 'Please enter a goal name.'); return; }
    const target = parseFloat(editTarget);
    if (!target || target <= 0) { Alert.alert('Missing info', 'Please enter a valid target amount.'); return; }
    if (target < editingGoal.current_amount) {
      Alert.alert('Invalid target', `Target can't be less than the amount already saved (${formatCurrency(editingGoal.current_amount)}).`);
      return;
    }

    setEditSaving(true);

    // Check if this edit makes the goal complete
    const isNowComplete = editingGoal.current_amount >= target;

    const { error } = await supabase
      .from('savings_goals')
      .update({
        title:         editTitle.trim(),
        icon:          editIcon,
        target_amount: target,
        is_completed:  isNowComplete,
        is_archived:   isNowComplete,
        completed_at:  isNowComplete ? new Date().toISOString() : editingGoal.completed_at,
      })
      .eq('id', editingGoal.id);

    setEditSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }

    // Build change description
    const changes: string[] = [];
    if (editTitle.trim() !== editingGoal.title)           changes.push(`Name → "${editTitle.trim()}"`);
    if (target          !== editingGoal.target_amount)    changes.push(`Target → ${formatCurrency(target)}`);
    if (editIcon        !== editingGoal.icon)             changes.push('Icon changed');

    setShowEditModal(false);
    setEditingGoal(null);
    fetchGoals(userId);

    logActivity({
      user_id:     userId,
      action_type: ACTION.SAVINGS_GOAL_UPDATED,
      entity_type: ENTITY.SAVINGS_GOAL,
      title:       `Goal Updated: ${editTitle.trim()}`,
      description: changes.length > 0 ? changes.join(' · ') : 'Goal details updated',
      icon:        editIcon,
    });

    if (isNowComplete && !editingGoal.is_completed) {
      setTimeout(() => {
        Alert.alert('Goal Achieved!', `"${editTitle.trim()}" has reached its target!`);
      }, 400);
    }
  };

  /* Add funds */
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
        is_completed:   isComplete,
        is_archived:    isComplete,
        completed_at:   isComplete ? new Date().toISOString() : null,
      })
      .eq('id', selectedGoal.id);
    setAddingFunds(false);
    if (error) { Alert.alert('Error', error.message); return; }

    const goal = selectedGoal;
    setShowFundsModal(false);
    setFundsAmount('');
    setSelectedGoal(null);
    fetchGoals(userId);

    if (isComplete) {
      logActivity({
        user_id: userId, action_type: ACTION.SAVINGS_GOAL_COMPLETED, entity_type: ENTITY.SAVINGS_GOAL,
        title: `Goal Achieved: ${goal.title}`,
        description: `Target of ${formatCurrency(goal.target_amount)} reached!`,
        icon: goal.icon,
      });
      setTimeout(() => {
        Alert.alert('Goal Achieved!', `Congratulations! You have reached your "${goal.title}" savings goal!`);
      }, 400);
    } else {
      logActivity({
        user_id: userId, action_type: ACTION.SAVINGS_GOAL_FUNDED, entity_type: ENTITY.SAVINGS_GOAL,
        title: `Goal Funded: ${goal.title}`,
        description: `${formatCurrency(amount)} added · ${formatCurrency(newCurrent)} of ${formatCurrency(goal.target_amount)}`,
        icon: goal.icon,
      });
    }
  };

  const openAddModal = () => {
    setNewTitle(''); setNewTarget(''); setNewIcon('wallet-outline');
    setShowAddModal(true);
  };

  const openFundsModal = (goal: Goal) => {
    setSelectedGoal(goal); setFundsAmount(''); setShowFundsModal(true);
  };

  /* Archive — show confirm modal */
  const handleArchiveGoal = (goal: Goal) => {
    setPendingArchiveGoal(goal);
  };

  /* Confirmed archive */
  const confirmArchive = async () => {
    if (!pendingArchiveGoal || !userId) return;
    const goal = pendingArchiveGoal;
    setPendingArchiveGoal(null);
    await supabase.from('savings_goals').update({ is_archived: true }).eq('id', goal.id);
    fetchGoals(userId);
    logActivity({
      user_id: userId, action_type: ACTION.SAVINGS_GOAL_ARCHIVED, entity_type: ENTITY.SAVINGS_GOAL,
      title: `Goal Archived: ${goal.title}`,
      description: `${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} saved`,
      icon: goal.icon,
    });
  };

  /* Delete permanently */
  const handleDeleteGoal = (goal: Goal) => setPendingDeleteGoal(goal);

  const confirmDelete = async () => {
    if (!pendingDeleteGoal || !userId) return;
    const goal = pendingDeleteGoal;
    setPendingDeleteGoal(null);
    await supabase.from('savings_goals').delete().eq('id', goal.id);
    fetchGoals(userId);
    logActivity({
      user_id: userId, action_type: ACTION.SAVINGS_GOAL_DELETED, entity_type: ENTITY.SAVINGS_GOAL,
      title: `Goal Deleted: ${goal.title}`,
      description: `Permanently removed · ${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} saved`,
      icon: goal.icon,
    });
  };

  /* Restore */
  const handleRestoreGoal = async (goal: Goal) => {
    if (!userId) return;
    await supabase.from('savings_goals').update({ is_archived: false }).eq('id', goal.id);
    fetchGoals(userId);
    logActivity({
      user_id: userId, action_type: ACTION.SAVINGS_GOAL_RESTORED, entity_type: ENTITY.SAVINGS_GOAL,
      title: `Goal Restored: ${goal.title}`,
      description: `${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)} saved`,
      icon: goal.icon,
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const activeGoals    = goals.filter(g => !g.is_completed && !g.is_archived);
  const completedGoals = goals.filter(g => g.is_completed);
  const archivedGoals  = goals.filter(g => g.is_archived && !g.is_completed);
  const displayedGoals = activeTab === 'Active' ? activeGoals
    : activeTab === 'Completed' ? completedGoals
    : archivedGoals;

  // ── Render ────────────────────────────────────────────────────────────────
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
      <SlideTabBar
        tabs={['Active', 'Completed', 'Archived']}
        active={activeTab}
        onChange={(t) => setActiveTab(t as typeof activeTab)}
        badge={{ Completed: completedGoals.length, Archived: archivedGoals.length }}
        trackColor="rgba(255,255,255,0.15)"
        activeColor="#3ECBA8"
        inactiveTextColor="rgba(255,255,255,0.7)"
        style={{ marginHorizontal: 20, marginBottom: 18 }}
      />

      {/* Content */}
      <View style={[styles.content, { backgroundColor: theme.cardBg }]}>
        {loading ? (
          <ActivityIndicator color="#3ECBA8" size="large" style={{ marginTop: 60 }} />
        ) : displayedGoals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={
                activeTab === 'Active' ? 'flag-outline'
                  : activeTab === 'Completed' ? 'checkmark-circle-outline'
                  : 'archive-outline'
              }
              size={52} color={theme.divider}
            />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {activeTab === 'Active' ? 'No active goals yet'
                : activeTab === 'Completed' ? 'No completed goals'
                : 'No archived goals'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {activeTab === 'Active' ? 'Tap + to create your first savings goal'
                : activeTab === 'Completed' ? 'Keep saving to reach your goals!'
                : 'Goals you archive will appear here.'}
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
              const pct         = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
              const isCompleted = goal.is_completed;
              const isArchived  = goal.is_archived && !goal.is_completed;
              const menuOpen    = menuGoalId === goal.id;
              const hasMenu     = !isCompleted;

              return (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.surface, zIndex: menuOpen ? 100 : 1 }]}>
                  {/* ── Main row ── */}
                  <View style={styles.goalCardRow}>
                    {/* Icon */}
                    <View style={[
                      styles.goalIcon,
                      isCompleted && styles.goalIconCompleted,
                      isArchived  && styles.goalIconArchived,
                    ]}>
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
                        {isArchived && (
                          <View style={styles.archivedBadge}>
                            <Ionicons name="archive-outline" size={12} color="#9AA5B4" />
                            <Text style={styles.archivedBadgeText}>Archived</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.goalAmounts, { color: theme.textSecondary }]}>
                        {formatCurrency(goal.current_amount)}
                        <Text style={{ color: theme.textMuted }}> / {formatCurrency(goal.target_amount)}</Text>
                      </Text>

                      <View style={[styles.progressTrack, { backgroundColor: theme.divider }]}>
                        <View style={[
                          styles.progressFill,
                          {
                            width: `${pct}%` as any,
                            backgroundColor: isCompleted ? '#3ECBA8' : isArchived ? '#9AA5B4' : '#4895EF',
                          },
                        ]} />
                      </View>

                      <Text style={[styles.pctText, { color: theme.textMuted }]}>
                        {isCompleted
                          ? `Completed${goal.completed_at ? ' · ' + formatDate(goal.completed_at) : ''}`
                          : `${pct.toFixed(0)}% of goal reached`}
                      </Text>
                    </View>
                  </View>

                  {/* ── Kebab button — absolute top-right ── */}
                  {hasMenu && (
                    <TouchableOpacity
                      style={styles.kebabBtn}
                      onPress={() => setMenuGoalId(menuOpen ? null : goal.id)}
                      activeOpacity={0.6}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}

                  {/* ── Floating action menu ── */}
                  {menuOpen && (
                    <View style={[styles.menuPanel, { backgroundColor: theme.modalBg }]}>
                      {!isArchived && (
                        <>
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuGoalId(null); openEditModal(goal); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(72,149,239,0.12)' }]}>
                              <Ionicons name="pencil-outline" size={14} color="#4895EF" />
                            </View>
                            <Text style={[styles.menuItemLabel, { color: theme.textPrimary }]}>Edit Goal</Text>
                          </TouchableOpacity>

                          <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />

                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuGoalId(null); openFundsModal(goal); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(62,203,168,0.12)' }]}>
                              <Ionicons name="wallet-outline" size={14} color="#3ECBA8" />
                            </View>
                            <Text style={[styles.menuItemLabel, { color: theme.textPrimary }]}>Add Funds</Text>
                          </TouchableOpacity>

                          <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />

                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuGoalId(null); handleArchiveGoal(goal); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(154,165,180,0.12)' }]}>
                              <Ionicons name="archive-outline" size={14} color="#9AA5B4" />
                            </View>
                            <Text style={[styles.menuItemLabel, { color: theme.textSecondary }]}>Archive</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {isArchived && (
                        <>
                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuGoalId(null); handleRestoreGoal(goal); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(62,203,168,0.12)' }]}>
                              <Ionicons name="refresh-outline" size={14} color="#3ECBA8" />
                            </View>
                            <Text style={[styles.menuItemLabel, { color: theme.textPrimary }]}>Restore Goal</Text>
                          </TouchableOpacity>

                          <View style={[styles.menuDivider, { backgroundColor: theme.divider }]} />

                          <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuGoalId(null); handleDeleteGoal(goal); }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </View>
                            <Text style={[styles.menuItemLabel, { color: '#EF4444' }]}>Delete Permanently</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Add Goal Modal ─────────────────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.divider }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>New Savings Goal</Text>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Goal Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="e.g. Buy a Car" placeholderTextColor={theme.textMuted}
              value={newTitle} onChangeText={setNewTitle}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target Amount (₱)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="0.00" placeholderTextColor={theme.textMuted}
              value={newTarget} onChangeText={setNewTarget} keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Choose Icon</Text>
            <IconPicker selected={newIcon} onSelect={setNewIcon} theme={theme} />

            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveGoal} disabled={saving} activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Goal</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Goal Modal ────────────────────────────────────────────────── */}
      <Modal visible={showEditModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.divider }]} />

            {/* Modal header row */}
            <View style={styles.editModalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary, marginBottom: 0 }]}>Edit Goal</Text>
              {editingGoal && (
                <View style={[styles.editCurrentBadge, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.editCurrentLabel, { color: theme.textMuted }]}>Saved</Text>
                  <Text style={[styles.editCurrentValue, { color: theme.textPrimary }]}>
                    {formatCurrency(editingGoal.current_amount)}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Goal Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="e.g. Buy a Car" placeholderTextColor={theme.textMuted}
              value={editTitle} onChangeText={setEditTitle}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Target Amount (₱)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.textPrimary, borderColor: theme.inputBorder }]}
              placeholder="0.00" placeholderTextColor={theme.textMuted}
              value={editTarget} onChangeText={setEditTarget} keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Choose Icon</Text>
            <IconPicker selected={editIcon} onSelect={setEditIcon} theme={theme} />

            <TouchableOpacity
              style={[styles.primaryBtn, editSaving && { opacity: 0.6 }]}
              onPress={handleEditGoal} disabled={editSaving} activeOpacity={0.85}
            >
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Archive Confirm Modal ──────────────────────────────────────────── */}
      <ConfirmModal
        visible={pendingArchiveGoal !== null}
        onClose={() => setPendingArchiveGoal(null)}
        onConfirm={confirmArchive}
        title="Archive Goal?"
        message={
          pendingArchiveGoal
            ? `"${pendingArchiveGoal.title}" will be hidden from your active goals. You can restore it anytime from the Archived tab.`
            : ''
        }
        confirmLabel="Archive"
        confirmColor="#F59E0B"
        icon="archive-outline"
      />

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      <ConfirmModal
        visible={pendingDeleteGoal !== null}
        onClose={() => setPendingDeleteGoal(null)}
        onConfirm={confirmDelete}
        title="Delete Permanently?"
        message={
          pendingDeleteGoal
            ? `"${pendingDeleteGoal.title}" will be deleted forever and cannot be recovered.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="#EF4444"
        icon="trash-outline"
      />

      {/* ── Add Funds Modal ────────────────────────────────────────────────── */}
      <Modal visible={showFundsModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowFundsModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.divider }]} />
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add Funds</Text>

            {selectedGoal && (
              <>
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
                  <Text style={styles.pctBadge}>
                    {Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100).toFixed(0)}%
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.divider, marginBottom: 4 }]}>
                  <View style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (selectedGoal.current_amount / selectedGoal.target_amount) * 100)}%` as any, backgroundColor: '#4895EF' },
                  ]} />
                </View>
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
              placeholder="0.00" placeholderTextColor={theme.textMuted}
              value={fundsAmount} onChangeText={setFundsAmount} keyboardType="decimal-pad" autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryBtn, addingFunds && { opacity: 0.6 }]}
              onPress={handleAddFunds} disabled={addingFunds} activeOpacity={0.85}
            >
              {addingFunds ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Add Funds</Text>}
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
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
  },
  headerTitle: { fontFamily: Font.headerBold, fontSize: 20, color: '#fff', letterSpacing: 0.2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },

  // Content
  content: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  listContent: { padding: 20, paddingBottom: 40, gap: 14 },

  // Goal card
  goalCard: {
    borderRadius: 18,
  },
  goalCardRow: {
    padding: 16,
    paddingRight: 36,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  goalIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#4895EF', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  goalIconCompleted: { backgroundColor: '#3ECBA8' },
  goalIconArchived:  { backgroundColor: '#9AA5B4' },
  goalInfo:          { flex: 1, gap: 4 },
  goalTitleRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalTitle:         { fontFamily: Font.bodySemiBold, fontSize: 15, flex: 1 },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(62,203,168,0.12)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  doneBadgeText:  { fontFamily: Font.bodySemiBold, fontSize: 10, color: '#3ECBA8' },
  archivedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(154,165,180,0.12)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  archivedBadgeText: { fontFamily: Font.bodySemiBold, fontSize: 10, color: '#9AA5B4' },
  goalAmounts:    { fontFamily: Font.bodyMedium, fontSize: 13 },
  progressTrack:  { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  progressFill:   { height: 6, borderRadius: 3 },
  pctText:        { fontFamily: Font.bodyRegular, fontSize: 11, marginTop: 2 },

  // Kebab button — absolute top-right of card
  kebabBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 2,
    padding: 4,
  },

  // Floating action menu
  menuPanel: {
    position: 'absolute', top: 34, right: 10, zIndex: 200,
    borderRadius: 12, minWidth: 152,
    paddingVertical: 4,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  menuItemIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemLabel: { fontFamily: Font.bodyMedium, fontSize: 13 },

  // Empty state
  emptyState:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle:     { fontFamily: Font.headerBold, fontSize: 18, textAlign: 'center', marginTop: 8 },
  emptySubtitle:  { fontFamily: Font.bodyRegular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn:    { marginTop: 8, backgroundColor: '#3ECBA8', borderRadius: 50, paddingHorizontal: 24, paddingVertical: 12 },
  emptyAddBtnText:{ fontFamily: Font.bodySemiBold, fontSize: 14, color: '#fff' },

  // Modals
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:    { fontFamily: Font.headerBold, fontSize: 20, marginBottom: 20 },
  inputLabel:    { fontFamily: Font.bodyMedium, fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Font.bodyRegular, fontSize: 15, marginBottom: 16,
  },

  // Edit modal header
  editModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  editCurrentBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'flex-end' },
  editCurrentLabel: { fontFamily: Font.bodyRegular, fontSize: 10 },
  editCurrentValue: { fontFamily: Font.headerBold, fontSize: 15 },

  // Icon grid
  iconGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  iconOption:     { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconOptionActive:{ backgroundColor: '#3ECBA8', borderColor: '#3ECBA8' },

  // Buttons
  primaryBtn:     { backgroundColor: '#3ECBA8', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { fontFamily: Font.bodySemiBold, fontSize: 16, color: '#fff' },
  cancelBtn:      { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText:  { fontFamily: Font.bodyMedium, fontSize: 14 },

  // Funds modal extras
  goalSummary:    { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, gap: 12, marginBottom: 12 },
  pctBadge:       { fontFamily: Font.headerBold, fontSize: 16, color: '#3ECBA8' },
  remainingHint:  { fontFamily: Font.bodyRegular, fontSize: 12, marginBottom: 4 },
});
