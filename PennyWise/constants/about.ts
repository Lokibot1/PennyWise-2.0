// ── About Us ──────────────────────────────────────────────────────────────────

export type AboutSection = {
  type: "header" | "section" | "faq";
  title: string;
  subtitle?: string;
  body?: string;
};

export const ABOUT_SECTIONS: AboutSection[] = [
  // ── Header ──────────────────────────────────────────────────────────────
  {
    type: "header",
    title: "About PennyWise",
    subtitle: "Your smart companion for personal finance in the Philippines",
  },

  // ── Purpose ─────────────────────────────────────────────────────────────
  {
    type: "section",
    title: "Our Purpose",
    body: "PennyWise was built to make personal finance management simple, accessible, and effective for every Filipino. Whether you're tracking daily expenses, saving for a goal, or keeping your budget in check — PennyWise puts you in control of your money without the complexity of traditional finance tools.",
  },

  // ── Significance ────────────────────────────────────────────────────────
  {
    type: "section",
    title: "Why It Matters",
    body: "Financial literacy remains a challenge for many Filipinos. Studies show that a large portion of the population lives paycheck-to-paycheck with little to no savings buffer. PennyWise addresses this by giving users clear visibility into where their money goes, helping them set and reach savings goals, and nudging better spending habits — one transaction at a time.",
  },

  // ── What We Offer ────────────────────────────────────────────────────────
  {
    type: "section",
    title: "What We Offer",
    body: "• Transaction Tracking — record and categorize income and expenses instantly\n• Budget Management — set monthly spending limits and monitor your progress\n• Savings Goals — define goals and watch your savings grow with visual progress rings\n• Analytics — understand your financial patterns through clear summaries\n• Notifications — stay on top of budgets and activity with real-time alerts\n• Privacy First — your data is secured with Supabase row-level security and encrypted storage",
  },

  // ── Who We Are ───────────────────────────────────────────────────────────
  {
    type: "section",
    title: "Who We Are",
    body: "PennyWise is a student-developed project by third-year college students in the Philippines. It was created as a capstone project with the goal of solving a real-world problem: the lack of simple, intuitive personal finance tools tailored for Filipino users.\n\nWe are a small, passionate team committed to building software that makes a positive difference in people's everyday financial lives.",
  },

  // ── FAQs ─────────────────────────────────────────────────────────────────
  {
    type: "faq",
    title: "Frequently Asked Questions",
    body: "",
  },
  {
    type: "faq",
    title: "Is PennyWise free to use?",
    body: "Yes. PennyWise is completely free. There are no subscription fees, no hidden charges, and no premium tiers. All features are available to every user at no cost.",
  },
  {
    type: "faq",
    title: "Does PennyWise hold or move my money?",
    body: "No. PennyWise is a personal finance tracking tool only. It does not connect to your bank account, hold funds, or process any real financial transactions. All entries are manual records for your personal reference.",
  },
  {
    type: "faq",
    title: "How is my data protected?",
    body: "Your data is stored securely using Supabase with row-level security (RLS) — meaning only you can read or modify your own records. Passwords are hashed and never stored in plain text. All network communication is encrypted via HTTPS.",
  },
  {
    type: "faq",
    title: "Can I use PennyWise offline?",
    body: "PennyWise requires an internet connection to sync your data with the cloud. Offline support is not currently available, but we are exploring it for future versions.",
  },
  {
    type: "faq",
    title: "How do I delete my account?",
    body: "You can delete your account from Profile → Settings → Delete Account. This will permanently remove all your data from our servers and cannot be undone. We recommend exporting or noting any important records before proceeding.",
  },
  {
    type: "faq",
    title: "What devices are supported?",
    body: "PennyWise supports both Android and iOS devices via the Expo/React Native framework. We recommend keeping your device OS up to date for the best experience.",
  },
  {
    type: "faq",
    title: "I found a bug. How do I report it?",
    body: "We appreciate your help! You can reach out to our team via the Help & Support option in the Profile menu. Please include a short description of the issue and the steps to reproduce it so we can fix it quickly.",
  },
  {
    type: "faq",
    title: "Will PennyWise get new features?",
    body: "Yes! We are actively developing PennyWise and plan to add features such as recurring transaction reminders, export to CSV, multi-currency support, and offline mode. Stay tuned for updates.",
  },
];
