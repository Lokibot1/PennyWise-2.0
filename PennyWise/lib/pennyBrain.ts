/**
 * PennyBrain — Rule-based financial analysis engine
 *
 * No AI, no API. Keyword + phrase scoring + real user data → personalized insights.
 *
 * How it works:
 *  1. MascotChatbot loads the user's actual financial data into a FinancialData snapshot.
 *  2. processMessage() scores every message against INTENTS[] (multi-word phrases
 *     score 2×; single keywords 1×). The top-scoring intent wins.
 *  3. A separate out-of-scope gate fires when score=0 AND off-topic signals are found.
 *  4. Period detection ("all time", "overall") routes handlers to use all-time data.
 */

// ── Data types ────────────────────────────────────────────────────────────────

export interface CategorySummary {
  label: string;
  icon:  string;
  amount: number;   // total ₱ for this period
  count:  number;   // number of transactions
}

export interface GoalSummary {
  title:   string;
  icon:    string;
  target:  number;
  current: number;
  pct:     number;
}

export interface RecurringItem {
  title:         string;
  amount:        number;
  frequency:     string;
  categoryLabel: string;
}

export interface FinancialData {
  name:        string;
  budgetLimit: number;

  // Current-month totals
  monthIncome:   number;
  monthExpenses: number;
  budgetPercent: number;   // monthExpenses / budgetLimit * 100

  // Current-month category breakdowns (sorted desc by amount)
  topExpenseCategories: CategorySummary[];
  topIncomeCategories:  CategorySummary[];

  // Last-month totals
  lastMonthIncome:   number;
  lastMonthExpenses: number;
  lastMonthExpenseCategories: CategorySummary[];
  lastMonthIncomeCategories:  CategorySummary[];
  lastMonthName: string;   // e.g. "March"

  // All-time totals
  allTimeIncome:   number;
  allTimeExpenses: number;
  allTimeExpenseCategories: CategorySummary[];
  allTimeIncomeCategories:  CategorySummary[];
  totalExpenseCount: number;
  totalIncomeCount:  number;

  // Recurring items (structural — all time)
  recurringExpenses: RecurringItem[];
  recurringIncome:   RecurringItem[];

  // Savings
  activeGoals:         GoalSummary[];
  completedGoalsCount: number;

  // Time context
  daysInMonth: number;
  currentDay:  number;
  daysLeft:    number;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₱${Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

function budgetHealthEmoji(percent: number): string {
  if (percent >= 100) return '🚨';
  if (percent >= 80)  return '⚠️';
  if (percent >= 50)  return '📊';
  return '💚';
}

// ── Period detection ──────────────────────────────────────────────────────────

type Period = 'month' | 'lastmonth' | 'alltime';

function detectPeriod(lower: string): Period {
  if (/all[\s-]?time|all\s+expense|all\s+income|overall|total\s+expense|total\s+income|ever|history|since|lahat|all\s+records?|all\s+months?/.test(lower)) {
    return 'alltime';
  }
  if (/last\s+month|previous\s+month|past\s+month|noong\s+isang\s+buwan|nakaraang\s+buwan|prev\s+month/.test(lower)) {
    return 'lastmonth';
  }
  return 'month';
}

// ── Out-of-scope detection ────────────────────────────────────────────────────

const OFF_TOPIC_PATTERNS = [
  /\bweather\b|\bforecast\b|\brain\b|\bsunny\b|\btemperature\b|\bclimate\b/,
  /\brecipe\b|\bhow to cook\b|\bcooking\b|\bingredient\b/,
  /\bsport\b|\bbasketball\b|\bfootball\b|\bsoccer\b|\bnba\b|\bpba\b|\bscore\b|\bgame result\b/,
  /\bnews\b|\bpolitics\b|\belection\b|\bgovernment\b|\bpresident\b/,
  /\brelationship\b|\bgirlfriend\b|\bboyfriend\b|\bdating\b|\bmarriage\b/,
  /\bmovie\b|\bseries\b|\banime\b|\bnetflix show\b|\byoutube\b|\bwatch\b/,
  /\btell me a joke\b|\bfunny\b|\bmeme\b/,
  /\btranslate\b|\bmeaning of\b/,
  /\bdoctor\b|\bsymptom\b|\bdisease\b|\bmedicine\b|\bhealth tip\b/,
  /\bwho is\b|\bwhat is [a-z]+ city\b|\bcapital of\b|\bpopulation of\b/,
  /\bhoroscope\b|\bzodiac\b|\blucky number\b/,
];

function isOffTopic(lower: string): boolean {
  return OFF_TOPIC_PATTERNS.some(p => p.test(lower));
}

// ── Intent handlers ───────────────────────────────────────────────────────────

function handleOutOfScope(): string {
  return (
    `That question is outside my scope as your financial advisor. 🦉\n\n` +
    `I'm designed specifically to help with:\n` +
    `• Budget status & daily spending pace\n` +
    `• Expense & income breakdowns\n` +
    `• Cost-cutting recommendations\n` +
    `• Savings goal progress\n` +
    `• Overall financial health analysis\n\n` +
    `Try asking: "How's my budget?", "Show my expenses", or "Give me an analysis".`
  );
}

function handleGreeting(d: FinancialData): string {
  const hour  = new Date().getHours();
  const tod   = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const emoji = budgetHealthEmoji(d.budgetPercent);
  const net   = d.monthIncome - d.monthExpenses;
  const month = new Date().toLocaleString('en-PH', { month: 'long' });

  return (
    `Good ${tod}, ${d.name || 'there'}! 🦉\n\n` +
    `Here's your ${month} snapshot:\n\n` +
    `${emoji} Budget used: ${pct(d.budgetPercent)} (${fmt(d.monthExpenses)} of ${fmt(d.budgetLimit)})\n` +
    `💰 Income: ${fmt(d.monthIncome)}\n` +
    `💸 Expenses: ${fmt(d.monthExpenses)}\n` +
    `📈 Net: ${net >= 0 ? '+' : ''}${fmt(net)}\n\n` +
    `What would you like to know? Type "help" to see all options.`
  );
}

function handleBudget(d: FinancialData): string {
  const remaining = d.budgetLimit - d.monthExpenses;
  const dailyLeft = d.daysLeft > 0 ? remaining / d.daysLeft : 0;
  const emoji     = budgetHealthEmoji(d.budgetPercent);

  let status: string;
  if (d.budgetPercent >= 100) {
    status = `🚨 You've exceeded your budget by ${fmt(d.monthExpenses - d.budgetLimit)}. Avoid new non-essential expenses for the rest of the month.`;
  } else if (d.budgetPercent >= 80) {
    status = `⚠️ You're close to your limit! Only ${fmt(remaining)} left with ${d.daysLeft} day${d.daysLeft !== 1 ? 's' : ''} to go. Tread carefully.`;
  } else if (d.budgetPercent >= 50) {
    status = `📊 Halfway through your budget with ${d.daysLeft} days left. Keep the pace and you'll be fine.`;
  } else {
    status = `💚 Well within budget! You have ${fmt(remaining)} left — about ${fmt(Math.max(0, dailyLeft))}/day.`;
  }

  return (
    `${emoji} Budget — ${new Date().toLocaleString('en-PH', { month: 'long' })}:\n\n` +
    `Limit:     ${fmt(d.budgetLimit)}\n` +
    `Spent:     ${fmt(d.monthExpenses)} (${pct(d.budgetPercent)})\n` +
    `Remaining: ${fmt(Math.max(0, remaining))}\n` +
    `Days left: ${d.daysLeft}\n` +
    `Safe spend/day: ${fmt(Math.max(0, dailyLeft))}\n\n` +
    status
  );
}

function handleExpenses(d: FinancialData, message: string): string {
  const period = detectPeriod(message.toLowerCase());

  if (period === 'alltime') {
    if (d.allTimeExpenses === 0) {
      return `You have no recorded expenses at all. Start logging them in the Budget tab! 📝`;
    }
    const lines = d.allTimeExpenseCategories.slice(0, 5).map((c, i) => {
      const share = (c.amount / d.allTimeExpenses) * 100;
      const bar   = '█'.repeat(Math.round(share / 10)).padEnd(10, '░');
      return `${i + 1}. ${c.label} — ${fmt(c.amount)} (${pct(share)}) · ${c.count} transaction${c.count !== 1 ? 's' : ''}\n   ${bar}`;
    });
    return (
      `💸 All-time expenses (${fmt(d.allTimeExpenses)} total · ${d.totalExpenseCount} transactions):\n\n` +
      lines.join('\n') +
      (d.allTimeExpenseCategories[0]
        ? `\n\n🔍 "${d.allTimeExpenseCategories[0].label}" is your biggest spend overall.`
        : '')
    );
  }

  if (period === 'lastmonth') {
    if (d.lastMonthExpenses === 0) {
      return (
        `No expenses were recorded for ${d.lastMonthName}.\n\n` +
        (d.allTimeExpenses > 0
          ? `Your all-time total is ${fmt(d.allTimeExpenses)} across ${d.totalExpenseCount} transactions.`
          : `Start logging your expenses in the Budget tab! 📝`)
      );
    }
    const lines = d.lastMonthExpenseCategories.slice(0, 5).map((c, i) => {
      const share = (c.amount / d.lastMonthExpenses) * 100;
      const bar   = '█'.repeat(Math.round(share / 10)).padEnd(10, '░');
      return `${i + 1}. ${c.label} — ${fmt(c.amount)} (${pct(share)})\n   ${bar}`;
    });
    return (
      `💸 Expenses in ${d.lastMonthName} — ${fmt(d.lastMonthExpenses)} total:\n\n` +
      lines.join('\n') +
      (d.lastMonthExpenseCategories[0]
        ? `\n\n🔍 "${d.lastMonthExpenseCategories[0].label}" was your biggest spend in ${d.lastMonthName}.`
        : '')
    );
  }

  // Current month
  if (d.monthExpenses === 0) {
    const currentMonth = new Date().toLocaleString('en-PH', { month: 'long' });
    return (
      `No expenses recorded for ${currentMonth} yet.\n\n` +
      (d.lastMonthExpenses > 0
        ? `Last month (${d.lastMonthName}) you spent ${fmt(d.lastMonthExpenses)}. Try "Show my expenses last month" for the breakdown! 📊`
        : d.allTimeExpenses > 0
        ? `Your all-time total is ${fmt(d.allTimeExpenses)} across ${d.totalExpenseCount} transactions. Try "Show my expenses all time"! 📊`
        : `Start logging your expenses in the Budget tab so I can give you better insights! 📝`)
    );
  }

  const lines = d.topExpenseCategories.slice(0, 5).map((c, i) => {
    const share = (c.amount / d.monthExpenses) * 100;
    const bar   = '█'.repeat(Math.round(share / 10)).padEnd(10, '░');
    return `${i + 1}. ${c.label} — ${fmt(c.amount)} (${pct(share)})\n   ${bar}`;
  });

  return (
    `💸 Expenses this month — ${fmt(d.monthExpenses)} total:\n\n` +
    lines.join('\n') +
    (d.topExpenseCategories[0]
      ? `\n\n🔍 "${d.topExpenseCategories[0].label}" is your biggest spend at ${pct((d.topExpenseCategories[0].amount / d.monthExpenses) * 100)} of total.`
      : '')
  );
}

function handleIncome(d: FinancialData, message: string): string {
  const period = detectPeriod(message.toLowerCase());

  if (period === 'alltime') {
    if (d.allTimeIncome === 0) {
      return `No income has been recorded yet. Log your income in the Analytics tab! 💰`;
    }
    const lines = d.allTimeIncomeCategories.slice(0, 4).map((c, i) => {
      const share = (c.amount / d.allTimeIncome) * 100;
      return `${i + 1}. ${c.label} — ${fmt(c.amount)} (${pct(share)}) · ${c.count} entries`;
    });
    return `💰 All-time income: ${fmt(d.allTimeIncome)}\n\n` + lines.join('\n');
  }

  if (period === 'lastmonth') {
    if (d.lastMonthIncome === 0) {
      return (
        `No income was recorded for ${d.lastMonthName}.\n\n` +
        (d.allTimeIncome > 0 ? `Your all-time income is ${fmt(d.allTimeIncome)}.` : `Log your income in the Analytics tab! 💰`)
      );
    }
    const lines = d.lastMonthIncomeCategories.slice(0, 4).map((c, i) => {
      const share = (c.amount / d.lastMonthIncome) * 100;
      return `${i + 1}. ${c.label} — ${fmt(c.amount)} (${pct(share)})`;
    });
    const ratio = d.lastMonthIncome > 0 ? (d.lastMonthExpenses / d.lastMonthIncome) * 100 : 0;
    const ratioNote = ratio > 0 ? `\n\nExpense ratio in ${d.lastMonthName}: ${pct(ratio)} of income` : '';
    return `💰 Income in ${d.lastMonthName}: ${fmt(d.lastMonthIncome)}\n\n` + lines.join('\n') + ratioNote;
  }

  if (d.monthIncome === 0) {
    const currentMonth = new Date().toLocaleString('en-PH', { month: 'long' });
    return (
      `No income recorded for ${currentMonth} yet.\n\n` +
      (d.lastMonthIncome > 0
        ? `Last month (${d.lastMonthName}) you earned ${fmt(d.lastMonthIncome)}. Try "Show my income last month"! 💰`
        : d.allTimeIncome > 0
        ? `Your all-time income is ${fmt(d.allTimeIncome)}. Ask "Show my income all time" for the full picture! 💰`
        : `Log your income sources in the Analytics tab so I can track your earnings! 💰`)
    );
  }

  const lines = d.topIncomeCategories.slice(0, 4).map((c, i) => {
    const share = (c.amount / d.monthIncome) * 100;
    return `${i + 1}. ${c.label} — ${fmt(c.amount)} (${pct(share)})`;
  });

  const ratio = d.monthIncome > 0 ? (d.monthExpenses / d.monthIncome) * 100 : 0;
  let ratioNote: string;
  if (ratio >= 90) ratioNote = `\n\n🚨 You're spending ${pct(ratio)} of your income — very little is left for savings.`;
  else if (ratio >= 70) ratioNote = `\n\n⚠️ ${pct(ratio)} of income is going to expenses. Try to keep this below 70%.`;
  else ratioNote = `\n\n💚 You're spending ${pct(ratio)} of your income — a healthy balance!`;

  return `💰 Income this month: ${fmt(d.monthIncome)}\n\n` + lines.join('\n') + ratioNote;
}

function handleSavings(d: FinancialData): string {
  if (d.activeGoals.length === 0 && d.completedGoalsCount === 0) {
    return (
      `You don't have any savings goals yet! 🎯\n\n` +
      `Create one in the Savings Goals tab. A great starting point is an emergency fund — ` +
      `aim for ${fmt(d.budgetLimit * 3)} (3 months of your budget limit).`
    );
  }

  if (d.activeGoals.length === 0) {
    return `🎉 You've completed all ${d.completedGoalsCount} savings goal${d.completedGoalsCount > 1 ? 's' : ''}! Set a new one to keep building wealth.`;
  }

  const lines = d.activeGoals.map((g, i) => {
    const bar = '█'.repeat(Math.round(g.pct / 10)).padEnd(10, '░');
    return `${i + 1}. ${g.title}\n   ${fmt(g.current)} / ${fmt(g.target)} (${pct(g.pct)})\n   ${bar}`;
  });

  const closest = [...d.activeGoals].sort((a, b) => b.pct - a.pct)[0];
  let tip: string;
  if (closest.pct >= 80) tip = `\n\n🔥 "${closest.title}" is almost done at ${pct(closest.pct)}! One last push!`;
  else if (closest.pct >= 50) tip = `\n\n💪 "${closest.title}" is more than halfway there — keep going!`;
  else tip = `\n\n💡 Even saving ${fmt(d.budgetLimit * 0.05)}/month adds up quickly over time.`;

  return `🎯 Active savings goals:\n\n` + lines.join('\n\n') + tip;
}

function handleCutExpenses(d: FinancialData): string {
  if (d.monthExpenses === 0) {
    const hint = d.allTimeExpenses > 0
      ? `Your all-time spending is ${fmt(d.allTimeExpenses)} — add this month's expenses in the Budget tab for a fresh analysis.`
      : `Add your expenses in the Budget tab and I'll tell you exactly where to cut! 📝`;
    return hint;
  }

  const suggestions: string[] = [];

  // Daily overshoot warning
  if (d.budgetPercent >= 70 && d.daysLeft > 5) {
    const safeDaily = Math.max(0, (d.budgetLimit - d.monthExpenses) / d.daysLeft);
    suggestions.push(`⚡ Immediate action: Stay under ${fmt(safeDaily)}/day for the next ${d.daysLeft} days to avoid busting your budget.`);
  }

  // Category-specific advice for big spenders
  for (const cat of d.topExpenseCategories.slice(0, 5)) {
    const share = d.monthExpenses > 0 ? (cat.amount / d.monthExpenses) * 100 : 0;
    if (share < 20 && cat.amount < d.budgetLimit * 0.15) continue; // skip small categories
    const label = cat.label.toLowerCase();

    if (/food|dining|restaurant|groceri|fastfood|snack|eat/.test(label)) {
      suggestions.push(`🍱 Food & Dining (${fmt(cat.amount)}, ${pct(share)}): Meal-prepping 3–4×/week can cut this by 30–40%. Batch-cook rice and viands on weekends.`);
    } else if (/transport|commute|fuel|grab|ride|gas|vehicle/.test(label)) {
      suggestions.push(`🚌 Transport (${fmt(cat.amount)}, ${pct(share)}): Combine trips and use cheaper alternatives on low-priority days. Carpooling saves 30–50%.`);
    } else if (/entertainment|leisure|fun|games|game/.test(label)) {
      suggestions.push(`🎮 Entertainment (${fmt(cat.amount)}, ${pct(share)}): Set a monthly cap of ${fmt(d.budgetLimit * 0.05)} (~5% of budget) — and stick to it.`);
    } else if (/shopping|clothes|fashion|apparel/.test(label)) {
      suggestions.push(`🛍️ Shopping (${fmt(cat.amount)}, ${pct(share)}): Try a 24-hour rule — wait a day before buying anything over ₱500. Impulse urges usually fade.`);
    } else if (/subscri|netflix|spotify|streaming|app|software/.test(label)) {
      suggestions.push(`📺 Subscriptions (${fmt(cat.amount)}, ${pct(share)}): Audit these — share accounts or downgrade tiers where you can.`);
    } else if (/utilities|electric|water|internet|wifi/.test(label)) {
      suggestions.push(`💡 Utilities (${fmt(cat.amount)}, ${pct(share)}): Unplug idle devices and switch off lights. Even small habits trim utility bills by 10–15%.`);
    } else {
      suggestions.push(`📌 ${cat.label} (${fmt(cat.amount)}, ${pct(share)}): This is a large spend category. Try setting a monthly cap and reviewing each transaction weekly.`);
    }
  }

  // Recurring expenses audit
  const recurTotal = d.recurringExpenses.reduce((s, r) => s + r.amount, 0);
  if (recurTotal > d.budgetLimit * 0.35) {
    suggestions.push(`🔄 Recurring bills total ${fmt(recurTotal)}/month (${pct((recurTotal / d.budgetLimit) * 100)} of budget). Cancel or pause any you haven't used in 30 days.`);
  }

  if (suggestions.length === 0) {
    return (
      `💚 Your spending looks well-balanced — no single category is alarmingly high.\n\n` +
      `General reminders:\n` +
      `• Keep non-essentials under 30% of income\n` +
      `• Pay yourself first — save before you spend\n` +
      `• Review recurring expenses every 3 months\n` +
      `• Build an emergency fund of 3–6 months of expenses`
    );
  }

  return `✂️ How to cut your expenses:\n\n` + suggestions.join('\n\n');
}

function handleTopExpenses(d: FinancialData, message: string): string {
  const period = detectPeriod(message.toLowerCase());

  let cats: CategorySummary[];
  let total: number;
  let label: string;

  if (period === 'alltime') {
    cats = d.allTimeExpenseCategories; total = d.allTimeExpenses; label = 'all-time';
  } else if (period === 'lastmonth') {
    cats = d.lastMonthExpenseCategories; total = d.lastMonthExpenses; label = d.lastMonthName;
  } else {
    cats = d.topExpenseCategories; total = d.monthExpenses; label = 'this month';
  }

  if (total === 0) {
    if (period === 'lastmonth') return `No expenses were recorded for ${d.lastMonthName}.`;
    if (period === 'alltime')   return `No expenses recorded at all. Start in the Budget tab! 📝`;
    return (
      `No expenses this month yet.\n\n` +
      (d.lastMonthExpenses > 0
        ? `Last month (${d.lastMonthName}) you spent ${fmt(d.lastMonthExpenses)}. Try "biggest expense last month"!`
        : `Try "Show my expenses all time" to see historical data. 📝`)
    );
  }

  const lines = cats.slice(0, 5).map((c, i) => {
    const share = (c.amount / total) * 100;
    const flag  = share >= 40 ? ' 🚨 HIGH' : share >= 25 ? ' ⚠️' : '';
    return `${i + 1}. ${c.label}${flag}\n   ${fmt(c.amount)} · ${pct(share)} of total · ${c.count} transaction${c.count !== 1 ? 's' : ''}`;
  });

  const highest = cats[0];
  let advice = '';
  if (highest && (highest.amount / total) >= 0.35) {
    advice = `\n\n🔍 "${highest.label}" alone is ${pct((highest.amount / total) * 100)} of ${label} spending — a strong candidate to cut first.`;
  }

  return `📊 Top expenses (${label}):\n\n` + lines.join('\n\n') + advice;
}

function handleRecurring(d: FinancialData): string {
  if (d.recurringExpenses.length === 0) {
    return (
      `You have no recurring expenses logged.\n\n` +
      `If you have regular bills (rent, subscriptions, utilities), mark them as recurring in the Budget tab for better tracking! 🔄`
    );
  }

  const total = d.recurringExpenses.reduce((s, r) => s + r.amount, 0);
  const lines = d.recurringExpenses.map(r =>
    `• ${r.title} (${r.categoryLabel}) — ${fmt(r.amount)}/${r.frequency?.toLowerCase() ?? 'month'}`
  );

  const budgetShare = d.budgetLimit > 0 ? (total / d.budgetLimit) * 100 : 0;
  let note: string;
  if (budgetShare >= 60) {
    note = `\n\n🚨 Recurring costs are ${pct(budgetShare)} of your budget! That leaves only ${fmt(Math.max(0, d.budgetLimit - total))} for flexible spending.`;
  } else if (budgetShare >= 40) {
    note = `\n\n⚠️ Recurring costs take up ${pct(budgetShare)} of your budget. Review which ones you still actually need.`;
  } else {
    note = `\n\n💚 Recurring expenses are ${pct(budgetShare)} of your budget — a manageable proportion.`;
  }

  return `🔄 Recurring expenses:\n\n` + lines.join('\n') + `\n\nTotal: ${fmt(total)}/month` + note;
}

function handleRatio(d: FinancialData): string {
  const net         = d.monthIncome - d.monthExpenses;
  const savingsRate = d.monthIncome > 0 ? (net / d.monthIncome) * 100 : 0;
  const expRatio    = d.monthIncome > 0 ? (d.monthExpenses / d.monthIncome) * 100 : 0;

  let health: string;
  if (savingsRate >= 20)  health = `💚 Excellent! Saving ${pct(savingsRate)} of income — you're actively building wealth.`;
  else if (savingsRate >= 10) health = `📊 Good. Push savings above 20% of income for stronger financial security.`;
  else if (savingsRate > 0)   health = `⚠️ Only ${pct(savingsRate)} savings rate. Try cutting one expense category by 20%.`;
  else if (net === 0)          health = `📊 Breaking even this month — income equals expenses.`;
  else                         health = `🚨 Spending more than you earn! Reduce your top expense category urgently.`;

  return (
    `⚖️ Income vs. Expenses — ${new Date().toLocaleString('en-PH', { month: 'long' })}:\n\n` +
    `Income:        ${fmt(d.monthIncome)}\n` +
    `Expenses:      ${fmt(d.monthExpenses)}\n` +
    `Net:           ${net >= 0 ? '+' : ''}${fmt(net)}\n` +
    `Expense ratio: ${pct(expRatio)} of income\n` +
    `Savings rate:  ${pct(Math.max(0, savingsRate))}\n\n` +
    health
  );
}

function handleDaily(d: FinancialData): string {
  const avgDaily  = d.currentDay > 0 ? d.monthExpenses / d.currentDay : 0;
  const remaining = Math.max(0, d.budgetLimit - d.monthExpenses);
  const safeDaily = d.daysLeft > 0 ? remaining / d.daysLeft : 0;

  let verdict: string;
  if (avgDaily === 0) {
    verdict = `No expenses logged this month — you can't run out of budget you haven't touched! 😄`;
  } else if (safeDaily < avgDaily * 0.7) {
    verdict = `🚨 You're overspending! Current pace is ${fmt(avgDaily)}/day but you can only afford ${fmt(safeDaily)}/day to stay within budget.`;
  } else if (safeDaily < avgDaily) {
    verdict = `⚠️ Slightly over pace. Try trimming a few expenses each day to stay safe.`;
  } else {
    verdict = `💚 Daily pace is sustainable. At ${fmt(avgDaily)}/day you're well within the safe zone.`;
  }

  return (
    `📅 Daily spending:\n\n` +
    `Avg spend/day (this month): ${fmt(avgDaily)}\n` +
    `Days elapsed: ${d.currentDay} of ${d.daysInMonth}\n` +
    `Days left: ${d.daysLeft}\n` +
    `Budget remaining: ${fmt(remaining)}\n` +
    `Safe spend/day: ${fmt(safeDaily)}\n\n` +
    verdict
  );
}

function handleAnalysis(d: FinancialData): string {
  const net         = d.monthIncome - d.monthExpenses;
  const savingsRate = d.monthIncome > 0 ? Math.max(0, (net / d.monthIncome) * 100) : 0;
  const emoji       = budgetHealthEmoji(d.budgetPercent);
  const month       = new Date().toLocaleString('en-PH', { month: 'long', year: 'numeric' });

  const lines = [
    `${emoji} Financial Health — ${month}\n`,
    `Budget:       ${pct(d.budgetPercent)} used (${fmt(d.monthExpenses)} / ${fmt(d.budgetLimit)})`,
    `Income:       ${fmt(d.monthIncome)}`,
    `Expenses:     ${fmt(d.monthExpenses)}`,
    `Net:          ${net >= 0 ? '+' : ''}${fmt(net)}`,
    `Savings rate: ${pct(savingsRate)}`,
    `Active goals: ${d.activeGoals.length}`,
  ];

  if (d.topExpenseCategories.length > 0) {
    lines.push(`\n🔝 Biggest expense: ${d.topExpenseCategories[0].label} (${fmt(d.topExpenseCategories[0].amount)})`);
  }

  if (d.allTimeExpenses > 0) {
    lines.push(`📦 All-time spending: ${fmt(d.allTimeExpenses)} across ${d.totalExpenseCount} transactions`);
  }

  let rec: string;
  if (d.budgetPercent >= 100) {
    rec = `\n⚡ URGENT: You've exceeded your budget! Freeze all non-essential spending now.`;
  } else if (d.budgetPercent >= 80) {
    rec = `\n⚡ Action needed: Only ${fmt(d.budgetLimit - d.monthExpenses)} remaining — spend carefully.`;
  } else if (savingsRate < 10 && d.monthIncome > 0) {
    rec = `\n💡 Recommendation: Cut your top expense by 20% to push savings above 10%.`;
  } else if (d.activeGoals.length === 0) {
    rec = `\n🎯 Suggestion: Set a savings goal — even a small emergency fund makes a big difference.`;
  } else {
    rec = `\n💚 Looking good! Keep logging transactions for more accurate insights.`;
  }

  return lines.join('\n') + rec;
}

function handleAffordability(d: FinancialData, message: string): string {
  // Try to extract an amount from the message
  const match = message.match(/[₱p]?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const amount = match ? parseFloat(match[1].replace(/,/g, '')) : null;
  const remaining = Math.max(0, d.budgetLimit - d.monthExpenses);
  const safeDaily = d.daysLeft > 0 ? remaining / d.daysLeft : 0;

  if (amount !== null) {
    if (amount <= 0) {
      return `That doesn't look like a valid amount. Try asking "Can I afford ₱500?" 🦉`;
    }
    if (amount > remaining) {
      return (
        `🚨 You can't comfortably afford ${fmt(amount)} right now.\n\n` +
        `Remaining budget: ${fmt(remaining)}\n` +
        `Cost: ${fmt(amount)}\n` +
        `Shortfall: ${fmt(amount - remaining)}\n\n` +
        `Wait until next month, or cut another expense first.`
      );
    }
    const newRemaining = remaining - amount;
    const newDailyBudget = d.daysLeft > 0 ? newRemaining / d.daysLeft : 0;
    let verdict: string;
    if (amount <= safeDaily) {
      verdict = `💚 Yes, you can comfortably afford this. It's within your daily budget.`;
    } else if (amount <= remaining * 0.3) {
      verdict = `📊 Affordable, but it will reduce your safe daily spend to ${fmt(newDailyBudget)}/day for the rest of the month.`;
    } else {
      verdict = `⚠️ Technically within budget, but this is a significant purchase. It would leave only ${fmt(newRemaining)} for ${d.daysLeft} days.`;
    }
    return (
      `💳 Affordability check — ${fmt(amount)}:\n\n` +
      `Current remaining budget: ${fmt(remaining)}\n` +
      `After purchase: ${fmt(newRemaining)}\n` +
      `New safe spend/day: ${fmt(newDailyBudget)}\n\n` +
      verdict
    );
  }

  // No amount detected
  return (
    `To check if you can afford something, include the amount!\n\n` +
    `Example: "Can I afford ₱1,500?"\n\n` +
    `Your current remaining budget is ${fmt(remaining)} with ${d.daysLeft} days left this month.`
  );
}

function handleTips(d: FinancialData): string {
  const tips: string[] = [];

  if (d.budgetPercent >= 80) {
    tips.push(`🛑 Budget alert: You've used ${pct(d.budgetPercent)} — avoid new non-essential purchases.`);
  }
  if (d.recurringExpenses.length > 3) {
    tips.push(`🔄 You have ${d.recurringExpenses.length} recurring expenses. Review them every 3 months — cancel what you don't use.`);
  }
  if (d.activeGoals.length === 0) {
    tips.push(`🎯 No savings goals! Set one — it gives your money a purpose.`);
  }
  if (d.topExpenseCategories.length > 0 && d.monthExpenses > 0 && (d.topExpenseCategories[0].amount / d.monthExpenses) >= 0.4) {
    tips.push(`📌 "${d.topExpenseCategories[0].label}" is eating ${pct((d.topExpenseCategories[0].amount / d.monthExpenses) * 100)} of your budget. Reducing your biggest category is the fastest win.`);
  }
  if (d.monthIncome > 0 && d.monthExpenses / d.monthIncome > 0.8) {
    tips.push(`💸 You're spending over 80% of your income. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`);
  }

  // Always include a general tip
  const generalTips = [
    `💡 Pay yourself first: move savings to a separate account on payday — what you don't see, you won't spend.`,
    `💡 An emergency fund of 3–6 months of expenses is your financial safety net.`,
    `💡 Automate savings. Even ₱500/month compounds significantly over years.`,
    `💡 Review subscriptions monthly. Unused ones are pure waste.`,
    `💡 Small daily cuts — skipping one milk tea/week — free up ₱500+/month easily.`,
  ];
  tips.push(generalTips[new Date().getDate() % generalTips.length]);

  return `💡 Personalized tips:\n\n` + tips.join('\n\n');
}

function handleSavingAdvice(d: FinancialData): string {
  const savingsRate = d.monthIncome > 0
    ? Math.max(0, ((d.monthIncome - d.monthExpenses) / d.monthIncome) * 100)
    : 0;

  const strategies: string[] = [];

  // 1. Pay-yourself-first rule
  strategies.push(
    `💰 Pay yourself first\nAs soon as you receive your income, set aside your savings before spending anything else. Even ₱500–₱1,000/month adds up significantly over time.`
  );

  // 2. 50/30/20 rule — contextualized to actual data
  if (d.monthIncome > 0) {
    const needs   = fmt(d.monthIncome * 0.5);
    const wants   = fmt(d.monthIncome * 0.3);
    const savings = fmt(d.monthIncome * 0.2);
    strategies.push(
      `📐 Use the 50/30/20 rule\nSplit your ₱${fmt(d.monthIncome).replace('₱', '')} income as:\n• 50% (${needs}) → Needs (rent, food, transport)\n• 30% (${wants}) → Wants (dining out, leisure)\n• 20% (${savings}) → Savings & goals`
    );
  } else {
    strategies.push(
      `📐 Use the 50/30/20 rule\nSplit income as:\n• 50% → Needs (rent, food, transport)\n• 30% → Wants (dining out, leisure)\n• 20% → Savings & investment goals`
    );
  }

  // 3. Emergency fund
  if (d.budgetLimit > 0) {
    strategies.push(
      `🛡️ Build an emergency fund\nAim for ${fmt(d.budgetLimit * 3)}–${fmt(d.budgetLimit * 6)} (3–6 months of expenses) in a separate savings account. This keeps you from going into debt when unexpected costs hit.`
    );
  } else {
    strategies.push(
      `🛡️ Build an emergency fund\nAim for 3–6 months of living expenses set aside in a dedicated account. This is your financial safety net.`
    );
  }

  // 4. Automate savings
  strategies.push(
    `🤖 Automate your savings\nSet up an auto-transfer to a separate account on payday. What you don't see in your main account, you won't spend. Even ₱300/week = ₱15,600/year.`
  );

  // 5. Avoid impulse buying
  strategies.push(
    `🛍️ Beat impulse buying\nApply the 24-hour rule: wait a full day before buying anything over ₱500. Most impulse urges fade within hours. Remove saved card details from shopping apps to add friction.`
  );

  // 6. Track every peso
  strategies.push(
    `📝 Track every expense\nYou're already using PennyWise — log every transaction, no matter how small. Studies show people who track spending save 15–20% more than those who don't. The Budget tab is your best tool here.`
  );

  // 7. Cook at home / meal prep
  strategies.push(
    `🍱 Meal-prep to slash food costs\nCooking at home instead of buying outside 4–5×/week can cut food expenses by 30–50%. Batch-cook ulam on weekends and bring packed lunch to work/school.`
  );

  // 8. Review & cancel subscriptions
  if (d.recurringExpenses.length > 0) {
    const recurTotal = d.recurringExpenses.reduce((s, r) => s + r.amount, 0);
    strategies.push(
      `📺 Audit your ₱${fmt(recurTotal).replace('₱', '')} in recurring bills\nYou have ${d.recurringExpenses.length} recurring expense${d.recurringExpenses.length > 1 ? 's' : ''}. Cancel anything you haven't used in 30 days. Share streaming accounts with family or friends where allowed.`
    );
  } else {
    strategies.push(
      `📺 Cancel unused subscriptions\nReview all recurring charges every 3 months. Streaming services, apps, and gym memberships you rarely use are silent budget drains.`
    );
  }

  // 9. Low savings rate nudge
  if (d.monthIncome > 0 && savingsRate < 15) {
    strategies.push(
      `📈 Boost your ${pct(savingsRate)} savings rate\nFinancial experts recommend saving at least 20% of income. Start small — try cutting your top expense category by just 10% this month and redirect those pesos to savings.`
    );
  } else if (d.monthIncome > 0 && savingsRate >= 20) {
    strategies.push(
      `🌱 You're saving ${pct(savingsRate)} — now grow it\nGreat savings rate! Consider moving idle savings into a UITF, time deposit, or MP2 (Pag-IBIG) fund to earn higher returns than a regular savings account.`
    );
  }

  // 10. Debt-free strategy
  strategies.push(
    `🚫 Stay away from high-interest debt\nAvoid "buy now, pay later" schemes and credit card revolving balances — interest rates of 2–3%/month mean you pay 24–36% extra per year. If you have existing debt, pay it off before aggressively growing savings.`
  );

  return (
    `💡 How to Save Money — Penny's Guide:\n\n` +
    strategies.join('\n\n') +
    `\n\n🦉 Start with just one habit this month — small consistent actions beat big one-time changes.`
  );
}

function handleHelp(_d: FinancialData): string {
  return (
    `🦉 Here's what you can ask me:\n\n` +
    `📊 "How's my budget?" — usage, remaining, safe daily spend\n` +
    `💸 "Show my expenses" — this month's category breakdown\n` +
    `💸 "Show my expenses all time" — all-time spending history\n` +
    `💰 "Show my income" — income sources this month\n` +
    `✂️ "How can I save more?" — cut-expense advice from your data\n` +
    `💡 "Money saving tips" — general strategies to save money\n` +
    `🔝 "What's my biggest expense?" — top spending categories\n` +
    `🔄 "Show recurring bills" — subscriptions & fixed bills\n` +
    `⚖️ "Income vs expenses" — net & savings rate\n` +
    `📅 "Daily spending" — avg vs safe daily budget\n` +
    `💳 "Can I afford ₱500?" — affordability check\n` +
    `📈 "Give me an analysis" — full financial overview\n` +
    `💡 "Give me tips" — personalized advice`
  );
}

function handleFallback(d: FinancialData, message: string): string {
  // If the message looks like a genuine question but no intent matched
  const isQuestion = /\?|what|how|when|where|why|can i|should i|is my|am i|do i|did i/.test(message.toLowerCase());
  const emoji = budgetHealthEmoji(d.budgetPercent);

  if (isQuestion) {
    return (
      `I'm not sure I understood that. 🦉\n\n` +
      `I can only help with questions about your personal finances in PennyWise — things like budget, expenses, income, savings goals, and cost-cutting.\n\n` +
      `Try rephrasing, or type "help" to see everything I can answer.`
    );
  }

  return (
    `${emoji} I didn't quite catch that.\n\n` +
    `Here's what I can help with:\n` +
    `• Budget status & daily pace\n` +
    `• Expense breakdown (this month or all time)\n` +
    `• Income summary\n` +
    `• How to cut specific expenses\n` +
    `• Savings goal progress\n` +
    `• Affordability checks\n\n` +
    `Type "help" for the full list!`
  );
}

// ── Intent registry ───────────────────────────────────────────────────────────

type Handler = (data: FinancialData, message: string) => string;

interface Intent {
  keywords: string[];
  handler:  Handler;
}

const INTENTS: Intent[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'sup', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'musta', 'howdy', "what's up", 'yo '],
    handler: handleGreeting,
  },
  {
    keywords: [
      'budget', 'limit', 'how much left', 'how much can i spend', 'can i still spend',
      'remaining budget', 'meron pa', 'nalabi', 'magkano na', 'left in my budget',
    ],
    handler: handleBudget,
  },
  {
    keywords: [
      'expense', 'expenses', 'spent', 'spending', 'gastos', 'nagastos', 'ginastos',
      'purchases', 'where does my money go', 'where is my money going', 'show my expense',
      'all time expense', 'all expenses', 'all my expenses', 'total expenses',
      'last month expense', 'expenses last month', 'last month spending',
    ],
    handler: handleExpenses,
  },
  {
    keywords: [
      'income', 'earn', 'earned', 'salary', 'kita', 'revenue',
      'how much do i make', 'income sources', 'show my income', 'all time income',
      'total income', 'all my income', 'last month income', 'income last month',
    ],
    handler: handleIncome,
  },
  {
    keywords: [
      'saving', 'savings', 'goal', 'goals', 'target', 'ipon', 'how close',
      'goal progress', 'savings goals', 'how much have i saved',
    ],
    handler: handleSavings,
  },
  {
    keywords: [
      'cut', 'reduce', 'save more', 'makatipid', 'tipid', 'how to save',
      'paano makatipid', 'too much', 'overspending', 'spending too much',
      'where to cut', 'trim', 'lower my expenses', 'save money', 'help me save',
    ],
    handler: handleCutExpenses,
  },
  {
    keywords: [
      'biggest', 'highest', 'most expensive', 'top expense', 'largest',
      'pinakamataas', 'pinakamadaming', 'expensive', 'costly', 'most i spend on',
      'biggest expense', 'top spending',
    ],
    handler: handleTopExpenses,
  },
  {
    keywords: [
      'recurring', 'subscription', 'subscriptions', 'regular bills', 'bills',
      'fixed expense', 'monthly bills', 'show recurring', 'my bills',
    ],
    handler: handleRecurring,
  },
  {
    keywords: [
      'ratio', 'income vs', 'vs expenses', 'income versus', 'net income',
      'balance', 'surplus', 'deficit', 'savings rate', 'how am i doing',
      'how much do i save', 'am i saving', 'net savings',
    ],
    handler: handleRatio,
  },
  {
    keywords: [
      'daily', 'per day', 'araw-araw', 'average daily', 'day by day',
      'safe to spend', 'how much a day', 'spend per day', 'daily budget',
    ],
    handler: handleDaily,
  },
  {
    keywords: [
      'analysis', 'overview', 'summary', 'full report', 'financial health',
      'overall', 'give me a summary', 'how are my finances', 'assess',
      'complete picture', 'tell me everything',
    ],
    handler: handleAnalysis,
  },
  {
    keywords: [
      'can i afford', 'afford', 'is it okay to buy', 'should i buy',
      'kaya ko ba', 'do i have enough', 'can i spend', 'purchase',
    ],
    handler: handleAffordability,
  },
  {
    keywords: [
      'tip', 'tips', 'advice', 'suggest', 'recommend', 'payo',
      'what should i do', 'financial advice', 'money advice',
    ],
    handler: handleTips,
  },
  {
    keywords: [
      'money saving tips', 'saving tips', 'saving advice', 'how to save money',
      'ways to save', 'saving strategies', 'saving guide', 'teach me to save',
      'paano mag-ipon', 'ipon tips', 'ipon advice', 'magkano dapat itabi',
      'money habits', 'financial habits', 'good money habits', 'saving habits',
      'how do i save', 'how can i start saving',
    ],
    handler: handleSavingAdvice,
  },
  {
    keywords: [
      'help', 'what can you do', 'commands', 'options', 'what can i ask',
      'what to ask', 'how do i use', 'capabilities',
    ],
    handler: handleHelp,
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Process a user message and return Penny's response.
 *
 * Scoring rules:
 *  - Multi-word keyword phrase match  → +2
 *  - Single-word keyword match        → +1
 * The highest-scoring intent wins.
 * If score = 0 and the message looks off-topic → polite out-of-scope reply.
 */
export function processMessage(message: string, data: FinancialData): string {
  const lower = message.toLowerCase().trim();

  let bestScore   = 0;
  let bestHandler: Handler = handleFallback;

  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (lower.includes(kw)) {
        // Reward multi-word phrases more
        score += kw.includes(' ') ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore   = score;
      bestHandler = intent.handler;
    }
  }

  // Nothing financial matched — check for off-topic content
  if (bestScore === 0 && isOffTopic(lower)) {
    return handleOutOfScope();
  }

  return bestHandler(data, message);
}

/**
 * Build the FinancialData snapshot from raw DataCache results.
 * Computes both current-month and all-time aggregates.
 */
export function buildSnapshot(params: {
  name:        string;
  budgetLimit: number;
  incomeSources: Array<{
    amount: number; date: string; is_recurring: boolean; frequency: string | null;
    title: string; category_id: string; is_archived: boolean;
  }>;
  incomeCategories:  Array<{ id: string; label: string; icon: string }>;
  expenses: Array<{
    amount: number; date: string; is_recurring: boolean; frequency: string | null;
    title: string; category_id: string; is_archived: boolean;
  }>;
  expenseCategories: Array<{ id: string; label: string; icon: string }>;
  savingsGoals: Array<{
    target_amount: number; current_amount: number;
    title: string; icon: string; is_completed: boolean; is_archived: boolean;
  }>;
}): FinancialData {
  const now        = new Date();
  const month      = now.getMonth();
  const year       = now.getFullYear();
  const currentDay = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysLeft   = daysInMonth - currentDay;

  // Last month helpers
  const lastMonthDate  = new Date(year, month - 1, 1);
  const lastMonth      = lastMonthDate.getMonth();
  const lastMonthYear  = lastMonthDate.getFullYear();
  const lastMonthName  = lastMonthDate.toLocaleString('en-PH', { month: 'long' });

  // Parse date safely without timezone shifts (treat as local date)
  const parseDateParts = (dateStr: string): [number, number] => {
    const datePart = dateStr.split('T')[0];   // "2026-04-01"
    const parts    = datePart.split('-').map(Number);
    return [parts[0], parts[1] - 1];          // [year, zeroBasedMonth]
  };

  const isThisMonth = (dateStr: string) => {
    const [y, m] = parseDateParts(dateStr);
    return m === month && y === year;
  };

  const isLastMonth = (dateStr: string) => {
    const [y, m] = parseDateParts(dateStr);
    return m === lastMonth && y === lastMonthYear;
  };

  // Category lookup maps
  const incCatMap = Object.fromEntries(params.incomeCategories.map(c => [c.id, c]));
  const expCatMap = Object.fromEntries(params.expenseCategories.map(c => [c.id, c]));

  // ── Current-month income ───────────────────────────────────────────────────
  const monthlyIncome  = params.incomeSources.filter(s => !s.is_archived && isThisMonth(s.date));
  const monthIncome    = monthlyIncome.reduce((s, i) => s + Number(i.amount), 0);

  // ── Current-month expenses ─────────────────────────────────────────────────
  const monthlyExpenses = params.expenses.filter(e => !e.is_archived && isThisMonth(e.date));
  const monthExpenses   = monthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const budgetPercent = params.budgetLimit > 0
    ? Math.min(200, (monthExpenses / params.budgetLimit) * 100)
    : 0;

  // ── Month expense categories ───────────────────────────────────────────────
  const expCatAgg: Record<string, CategorySummary> = {};
  for (const e of monthlyExpenses) {
    const cat = expCatMap[e.category_id];
    if (!cat) continue;
    if (!expCatAgg[cat.id]) expCatAgg[cat.id] = { label: cat.label, icon: cat.icon, amount: 0, count: 0 };
    expCatAgg[cat.id].amount += Number(e.amount);
    expCatAgg[cat.id].count++;
  }
  const topExpenseCategories = Object.values(expCatAgg).sort((a, b) => b.amount - a.amount);

  // ── Month income categories ────────────────────────────────────────────────
  const incCatAgg: Record<string, CategorySummary> = {};
  for (const i of monthlyIncome) {
    const cat = incCatMap[i.category_id];
    if (!cat) continue;
    if (!incCatAgg[cat.id]) incCatAgg[cat.id] = { label: cat.label, icon: cat.icon, amount: 0, count: 0 };
    incCatAgg[cat.id].amount += Number(i.amount);
    incCatAgg[cat.id].count++;
  }
  const topIncomeCategories = Object.values(incCatAgg).sort((a, b) => b.amount - a.amount);

  // ── Last-month expenses ────────────────────────────────────────────────────
  const lastMonthlyExpenses  = params.expenses.filter(e => !e.is_archived && isLastMonth(e.date));
  const lastMonthExpenses    = lastMonthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const lastExpCatAgg: Record<string, CategorySummary> = {};
  for (const e of lastMonthlyExpenses) {
    const cat = expCatMap[e.category_id];
    if (!cat) continue;
    if (!lastExpCatAgg[cat.id]) lastExpCatAgg[cat.id] = { label: cat.label, icon: cat.icon, amount: 0, count: 0 };
    lastExpCatAgg[cat.id].amount += Number(e.amount);
    lastExpCatAgg[cat.id].count++;
  }
  const lastMonthExpenseCategories = Object.values(lastExpCatAgg).sort((a, b) => b.amount - a.amount);

  // ── Last-month income ──────────────────────────────────────────────────────
  const lastMonthlyIncome  = params.incomeSources.filter(s => !s.is_archived && isLastMonth(s.date));
  const lastMonthIncome    = lastMonthlyIncome.reduce((s, i) => s + Number(i.amount), 0);

  const lastIncCatAgg: Record<string, CategorySummary> = {};
  for (const i of lastMonthlyIncome) {
    const cat = incCatMap[i.category_id];
    if (!cat) continue;
    if (!lastIncCatAgg[cat.id]) lastIncCatAgg[cat.id] = { label: cat.label, icon: cat.icon, amount: 0, count: 0 };
    lastIncCatAgg[cat.id].amount += Number(i.amount);
    lastIncCatAgg[cat.id].count++;
  }
  const lastMonthIncomeCategories = Object.values(lastIncCatAgg).sort((a, b) => b.amount - a.amount);

  // ── All-time expenses ──────────────────────────────────────────────────────
  const allExpenses    = params.expenses.filter(e => !e.is_archived);
  const allTimeExpenses = allExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const allExpCatAgg: Record<string, CategorySummary> = {};
  for (const e of allExpenses) {
    const cat = expCatMap[e.category_id];
    if (!cat) continue;
    if (!allExpCatAgg[cat.id]) allExpCatAgg[cat.id] = { label: cat.label, icon: cat.icon, amount: 0, count: 0 };
    allExpCatAgg[cat.id].amount += Number(e.amount);
    allExpCatAgg[cat.id].count++;
  }
  const allTimeExpenseCategories = Object.values(allExpCatAgg).sort((a, b) => b.amount - a.amount);

  // ── All-time income ────────────────────────────────────────────────────────
  const allIncome    = params.incomeSources.filter(s => !s.is_archived);
  const allTimeIncome = allIncome.reduce((s, i) => s + Number(i.amount), 0);

  const allIncCatAgg: Record<string, CategorySummary> = {};
  for (const i of allIncome) {
    const cat = incCatMap[i.category_id];
    if (!cat) continue;
    if (!allIncCatAgg[cat.id]) allIncCatAgg[cat.id] = { label: cat.label, icon: cat.icon, amount: 0, count: 0 };
    allIncCatAgg[cat.id].amount += Number(i.amount);
    allIncCatAgg[cat.id].count++;
  }
  const allTimeIncomeCategories = Object.values(allIncCatAgg).sort((a, b) => b.amount - a.amount);

  // ── Recurring expenses ─────────────────────────────────────────────────────
  const recurringExpenses: RecurringItem[] = params.expenses
    .filter(e => !e.is_archived && e.is_recurring)
    .map(e => ({
      title:         e.title,
      amount:        Number(e.amount),
      frequency:     e.frequency ?? 'Monthly',
      categoryLabel: expCatMap[e.category_id]?.label ?? 'Expense',
    }))
    .filter((r, idx, arr) => arr.findIndex(x => x.title === r.title) === idx);

  // ── Recurring income ───────────────────────────────────────────────────────
  const recurringIncome: RecurringItem[] = params.incomeSources
    .filter(s => !s.is_archived && s.is_recurring)
    .map(s => ({
      title:         s.title,
      amount:        Number(s.amount),
      frequency:     s.frequency ?? 'Monthly',
      categoryLabel: incCatMap[s.category_id]?.label ?? 'Income',
    }))
    .filter((r, idx, arr) => arr.findIndex(x => x.title === r.title) === idx);

  // ── Savings goals ──────────────────────────────────────────────────────────
  const activeGoals: GoalSummary[] = params.savingsGoals
    .filter(g => !g.is_completed && !g.is_archived)
    .map(g => ({
      title:   g.title,
      icon:    g.icon,
      target:  Number(g.target_amount),
      current: Number(g.current_amount),
      pct:     g.target_amount > 0
        ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100)
        : 0,
    }));

  const completedGoalsCount = params.savingsGoals.filter(g => g.is_completed).length;

  return {
    name:        params.name,
    budgetLimit: params.budgetLimit,
    monthIncome,
    monthExpenses,
    budgetPercent,
    topExpenseCategories,
    topIncomeCategories,
    lastMonthIncome,
    lastMonthExpenses,
    lastMonthExpenseCategories,
    lastMonthIncomeCategories,
    lastMonthName,
    allTimeIncome,
    allTimeExpenses,
    allTimeExpenseCategories,
    allTimeIncomeCategories,
    totalExpenseCount: allExpenses.length,
    totalIncomeCount:  allIncome.length,
    recurringExpenses,
    recurringIncome,
    activeGoals,
    completedGoalsCount,
    daysInMonth,
    currentDay,
    daysLeft,
  };
}
