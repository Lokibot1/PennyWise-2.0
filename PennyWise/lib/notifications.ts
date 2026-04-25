/**
 * lib/notifications.ts
 * Pure data function — queries Supabase and returns a list of in-app notifications.
 * No side effects; safe to call on every focus.
 */
import { supabase } from './supabase';

export type NotifType = 'warning' | 'critical' | 'info' | 'success';

export type AppNotification = {
  id: string;           // deterministic, month-scoped for most triggers
  type: NotifType;
  icon: string;         // Ionicons name
  iconColor: string;
  title: string;
  body: string;
  createdAt: string;    // ISO timestamp string
};

function fmtPHP(amount: number): string {
  return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateNotifications(userId: string): Promise<AppNotification[]> {
  const now        = new Date();
  const year       = now.getFullYear();
  const month      = String(now.getMonth() + 1).padStart(2, '0');
  const ym         = `${year}-${month}`;
  const monthStart = `${ym}-01`;
  const dayOfMonth = now.getDate();
  const ts         = now.toISOString();

  const [profileRes, expensesRes, incomeRes, goalsRes, expenseCatsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('budget_limit, full_name')
      .eq('id', userId)
      .single(),

    supabase
      .from('expenses')
      .select('amount, date, category_id')
      .eq('user_id', userId)
      .eq('is_archived', false),

    supabase
      .from('income_sources')
      .select('amount')
      .eq('user_id', userId)
      .eq('is_archived', false),

    supabase
      .from('savings_goals')
      .select('id, title, icon, target_amount, current_amount, is_completed')
      .eq('user_id', userId)
      .eq('is_archived', false),

    supabase
      .from('expense_categories')
      .select('id, label, budget_limit')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .not('budget_limit', 'is', null),
  ]);

  const notifications: AppNotification[] = [];

  const budgetLimit: number = profileRes.data?.budget_limit ?? 20000;
  const totalIncome  = (incomeRes.data  ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalBalance = totalIncome - totalExpense;

  const monthlyExpense = (expensesRes.data ?? [])
    .filter(r => r.date >= monthStart)
    .reduce((s, r) => s + Number(r.amount), 0);

  // ── Budget notifications ───────────────────────────────────────────────────
  const budgetPct = budgetLimit > 0 ? (monthlyExpense / budgetLimit) * 100 : 0;

  if (budgetPct >= 100) {
    notifications.push({
      id:        `budget_exceeded_${ym}`,
      type:      'critical',
      icon:      'warning-outline',
      iconColor: '#E05555',
      title:     'Budget Exceeded!',
      body:      `You've spent ${fmtPHP(monthlyExpense)} this month — exceeding your ${fmtPHP(budgetLimit)} monthly budget.`,
      createdAt: ts,
    });
  } else if (budgetPct >= 90) {
    notifications.push({
      id:        `budget_90_${ym}`,
      type:      'critical',
      icon:      'alert-circle-outline',
      iconColor: '#E05555',
      title:     'Budget Almost Gone',
      body:      `You've used ${budgetPct.toFixed(0)}% of your monthly budget. Only ${fmtPHP(budgetLimit - monthlyExpense)} remaining.`,
      createdAt: ts,
    });
  } else if (budgetPct >= 70) {
    notifications.push({
      id:        `budget_70_${ym}`,
      type:      'warning',
      icon:      'alert-outline',
      iconColor: '#F59E0B',
      title:     'Budget Getting Low',
      body:      `You've used ${budgetPct.toFixed(0)}% of your monthly budget. Consider slowing down on spending.`,
      createdAt: ts,
    });
  }

  // ── Per-category budget notifications ─────────────────────────────────────
  const cats = expenseCatsRes.data ?? [];
  if (cats.length > 0) {
    // Build a map of category_id → current-month spending
    const catSpend = new Map<string, number>();
    for (const e of (expensesRes.data ?? [])) {
      if (e.date >= monthStart) {
        catSpend.set(e.category_id, (catSpend.get(e.category_id) ?? 0) + Number(e.amount));
      }
    }

    for (const cat of cats) {
      const limit = Number(cat.budget_limit);
      if (limit <= 0) continue;
      const spent = catSpend.get(cat.id) ?? 0;
      const pct   = (spent / limit) * 100;

      if (pct >= 100) {
        notifications.push({
          id:        `cat_budget_exceeded_${cat.id}_${ym}`,
          type:      'critical',
          icon:      'warning-outline',
          iconColor: '#E05555',
          title:     `${cat.label} Budget Exceeded`,
          body:      `You've spent ${fmtPHP(spent)} on ${cat.label} this month, exceeding your ${fmtPHP(limit)} limit.`,
          createdAt: ts,
        });
      } else if (pct >= 90) {
        notifications.push({
          id:        `cat_budget_90_${cat.id}_${ym}`,
          type:      'critical',
          icon:      'alert-circle-outline',
          iconColor: '#E05555',
          title:     `${cat.label} Budget Almost Gone`,
          body:      `${pct.toFixed(0)}% of your ${cat.label} budget used. Only ${fmtPHP(limit - spent)} remaining this month.`,
          createdAt: ts,
        });
      } else if (pct >= 70) {
        notifications.push({
          id:        `cat_budget_70_${cat.id}_${ym}`,
          type:      'warning',
          icon:      'alert-outline',
          iconColor: '#F59E0B',
          title:     `${cat.label} Budget Getting Low`,
          body:      `You've used ${pct.toFixed(0)}% of your ${cat.label} budget (${fmtPHP(spent)} / ${fmtPHP(limit)}).`,
          createdAt: ts,
        });
      }
    }
  }

  // ── Low balance ────────────────────────────────────────────────────────────
  if (totalBalance >= 0 && totalBalance < budgetLimit * 0.1) {
    notifications.push({
      id:        `low_balance_${ym}`,
      type:      'warning',
      icon:      'wallet-outline',
      iconColor: '#F59E0B',
      title:     'Low Balance',
      body:      `Your total balance is ${fmtPHP(totalBalance)}. Consider adding more income sources.`,
      createdAt: ts,
    });
  }

  // ── Savings goal notifications ─────────────────────────────────────────────
  const goals = goalsRes.data ?? [];

  if (goals.length === 0) {
    notifications.push({
      id:        `no_goals_${ym}`,
      type:      'info',
      icon:      'flag-outline',
      iconColor: '#1B7A4A',
      title:     'Set a Savings Goal',
      body:      "You don't have any savings goals yet. Start one to build toward something meaningful!",
      createdAt: ts,
    });
  } else {
    for (const goal of goals) {
      const pct = goal.target_amount > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;

      if (goal.is_completed || pct >= 100) {
        notifications.push({
          id:        `goal_100_${goal.id}`,
          type:      'success',
          icon:      'checkmark-circle-outline',
          iconColor: '#1B7A4A',
          title:     'Savings Goal Reached! 🎉',
          body:      `You've hit your "${goal.title}" target of ${fmtPHP(Number(goal.target_amount))}. Congratulations!`,
          createdAt: ts,
        });
      } else if (pct >= 75) {
        notifications.push({
          id:        `goal_75_${goal.id}_${ym}`,
          type:      'success',
          icon:      'trending-up-outline',
          iconColor: '#1B7A4A',
          title:     'Almost There!',
          body:      `"${goal.title}" is ${pct.toFixed(0)}% complete. Just ${fmtPHP(Number(goal.target_amount) - Number(goal.current_amount))} to go!`,
          createdAt: ts,
        });
      } else if (pct >= 50) {
        notifications.push({
          id:        `goal_50_${goal.id}_${ym}`,
          type:      'info',
          icon:      'golf-outline',
          iconColor: '#3B82F6',
          title:     'Halfway There!',
          body:      `"${goal.title}" is 50% funded. Keep up the momentum!`,
          createdAt: ts,
        });
      }
    }
  }

  // ── New month greeting (first 3 days) ──────────────────────────────────────
  if (dayOfMonth <= 3) {
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    notifications.push({
      id:        `new_month_${ym}`,
      type:      'info',
      icon:      'sparkles-outline',
      iconColor: '#8B5CF6',
      title:     `Welcome to ${monthName}!`,
      body:      'A fresh month begins. Review your budget, update your savings targets, and make it count.',
      createdAt: ts,
    });
  }

  // ── Recurring expense reminder (first 7 days) ──────────────────────────────
  if (dayOfMonth <= 7) {
    notifications.push({
      id:        `recurring_reminder_${ym}`,
      type:      'info',
      icon:      'repeat-outline',
      iconColor: '#06B6D4',
      title:     'Log Your Monthly Expenses',
      body:      "It's the start of the month — don't forget to log your recurring bills and subscriptions.",
      createdAt: ts,
    });
  }

  return notifications;
}
