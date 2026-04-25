// @ts-nocheck
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Types (mirrors PennyBrain FinancialData) ──────────────────────────────────
interface CategorySummary { label: string; icon: string; amount: number; count: number }
interface GoalSummary     { title: string; icon: string; target: number; current: number; pct: number }
interface RecurringItem   { title: string; amount: number; frequency: string; categoryLabel: string }
interface Snapshot {
  name:                       string;
  budgetLimit:                number;
  monthIncome:                number;
  monthExpenses:              number;
  budgetPercent:              number;
  topExpenseCategories:       CategorySummary[];
  topIncomeCategories:        CategorySummary[];
  lastMonthIncome:            number;
  lastMonthExpenses:          number;
  lastMonthExpenseCategories: CategorySummary[];
  lastMonthName:              string;
  allTimeIncome:              number;
  allTimeExpenses:            number;
  recurringExpenses:          RecurringItem[];
  recurringIncome:            RecurringItem[];
  activeGoals:                GoalSummary[];
  completedGoalsCount:        number;
  daysInMonth:                number;
  currentDay:                 number;
  daysLeft:                   number;
}

// ── System-prompt builder ─────────────────────────────────────────────────────
function buildSystemPrompt(snap: Partial<Snapshot>, userName?: string): string {
  const name = userName || snap.name || "there";

  const fmt = (n: number) =>
    "₱" + Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lines: string[] = [
    `You are Penny, PennyWise's friendly AI financial advisor — a Philippine-focused personal finance app.`,
    `You are talking with ${name}.`,
    `Personality: warm, concise, practical, occasionally uses Filipino words (ipon, utang, ulam) naturally.`,
    `Format: short paragraphs or bullet points, mobile-friendly. Use emojis sparingly but helpfully.`,
    `Currency: always Philippine Peso (₱). Never use $ or other currencies.`,
    `Scope: ONLY discuss personal finance, budgeting, saving, expenses, income, investments, the user's PennyWise data.`,
    `If asked anything unrelated to finance, politely redirect back to financial topics.`,
    `Do NOT make up data. If a value is zero or missing, say so honestly.`,
    ``,
    `## ${name}'s Financial Data`,
  ];

  const bl  = snap.budgetLimit   ?? 0;
  const me  = snap.monthExpenses ?? 0;
  const mi  = snap.monthIncome   ?? 0;
  const pct = snap.budgetPercent ?? (bl > 0 ? (me / bl) * 100 : 0);
  const dl  = snap.daysLeft      ?? 0;
  const cd  = snap.currentDay    ?? 1;
  const dim = snap.daysInMonth   ?? 30;

  if (bl > 0)  lines.push(`Monthly Budget: ${fmt(bl)}`);
  if (mi > 0)  lines.push(`Income This Month: ${fmt(mi)}`);
  lines.push(`Spent This Month: ${fmt(me)}`);
  if (bl > 0) {
    const remaining = bl - me;
    lines.push(`Budget Used: ${pct.toFixed(1)}% — ${fmt(remaining)} remaining`);
    if (dl > 0) {
      const safeDailySpend = remaining / dl;
      lines.push(`Safe Daily Spend: ${fmt(safeDailySpend)} (${dl} days left in month)`);
    }
  }
  if (mi > 0 && me > 0) {
    const savingsRate = Math.max(0, ((mi - me) / mi) * 100);
    lines.push(`Savings Rate: ${savingsRate.toFixed(1)}%`);
  }
  if (dim > 0 && cd > 0) {
    const avgDailySpend = me / cd;
    lines.push(`Avg Daily Spend: ${fmt(avgDailySpend)} (based on ${cd} days elapsed)`);
  }

  const topExp = snap.topExpenseCategories ?? [];
  if (topExp.length > 0) {
    lines.push(`\nTop Expense Categories (this month):`);
    topExp.slice(0, 6).forEach(c => lines.push(`  • ${c.icon} ${c.label}: ${fmt(c.amount)} (${c.count} transaction${c.count !== 1 ? "s" : ""})`));
  }

  const topInc = snap.topIncomeCategories ?? [];
  if (topInc.length > 0) {
    lines.push(`\nIncome Sources (this month):`);
    topInc.slice(0, 4).forEach(c => lines.push(`  • ${c.icon} ${c.label}: ${fmt(c.amount)}`));
  }

  const lme = snap.lastMonthExpenses ?? 0;
  const lmi = snap.lastMonthIncome   ?? 0;
  const lmn = snap.lastMonthName     ?? "Last Month";
  if (lme > 0 || lmi > 0) {
    lines.push(`\n${lmn} Summary:`);
    if (lmi > 0) lines.push(`  Income: ${fmt(lmi)}`);
    lines.push(`  Expenses: ${fmt(lme)}`);
    const lmExp = snap.lastMonthExpenseCategories ?? [];
    if (lmExp.length > 0) {
      lines.push(`  Top categories:`);
      lmExp.slice(0, 4).forEach(c => lines.push(`    • ${c.label}: ${fmt(c.amount)}`));
    }
  }

  const goals = snap.activeGoals ?? [];
  if (goals.length > 0) {
    lines.push(`\nActive Savings Goals:`);
    goals.slice(0, 5).forEach(g =>
      lines.push(`  • ${g.icon} ${g.title}: ${fmt(g.current)} / ${fmt(g.target)} (${g.pct.toFixed(0)}%)`));
  }
  if ((snap.completedGoalsCount ?? 0) > 0) {
    lines.push(`  Completed goals: ${snap.completedGoalsCount}`);
  }

  const recExp = snap.recurringExpenses ?? [];
  if (recExp.length > 0) {
    const recTotal = recExp.reduce((s, r) => s + r.amount, 0);
    lines.push(`\nRecurring Expenses (total ${fmt(recTotal)}/month):`);
    recExp.slice(0, 6).forEach(r =>
      lines.push(`  • ${r.title}: ${fmt(r.amount)} / ${r.frequency}`));
  }

  const recInc = snap.recurringIncome ?? [];
  if (recInc.length > 0) {
    lines.push(`\nRecurring Income:`);
    recInc.slice(0, 4).forEach(r =>
      lines.push(`  • ${r.title}: ${fmt(r.amount)} / ${r.frequency}`));
  }

  if ((snap.allTimeIncome ?? 0) > 0 || (snap.allTimeExpenses ?? 0) > 0) {
    lines.push(`\nAll-Time Totals:`);
    lines.push(`  Income: ${fmt(snap.allTimeIncome ?? 0)}`);
    lines.push(`  Expenses: ${fmt(snap.allTimeExpenses ?? 0)}`);
  }

  lines.push(`\nIf data fields are 0 it may mean no transactions have been entered yet.`);
  lines.push(`Base all advice on the numbers above. Cite specific figures to make answers feel personal.`);

  return lines.join("\n");
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // ── Request body ──────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { message, history = [], snapshot = {} } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return json({ error: "message is required" }, 400);
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return json({ error: "AI service not configured", fallback: true }, 503);

    // ── Build Claude messages ─────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(snapshot, user.user_metadata?.full_name);

    // Keep last 8 turns (4 back-and-forth) to cap context size
    const recentHistory = (history as { role: string; content: string }[])
      .slice(-8)
      .map(h => ({ role: h.role as "user" | "assistant", content: String(h.content) }));

    const messages = [
      ...recentHistory,
      { role: "user" as const, content: message.trim() },
    ];

    // ── Call Anthropic ────────────────────────────────────────────────────────
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system:     systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("[pennywise-chat] Anthropic error:", errBody);
      return json({ error: "AI unavailable", fallback: true }, 502);
    }

    const aiData = await anthropicRes.json();
    const reply  = aiData.content?.[0]?.type === "text"
      ? (aiData.content[0].text as string)
      : "";

    if (!reply) return json({ error: "Empty AI response", fallback: true }, 502);

    return json({ reply });

  } catch (err) {
    console.error("[pennywise-chat] error:", String(err));
    return json({ error: String(err), fallback: true }, 500);
  }
});
