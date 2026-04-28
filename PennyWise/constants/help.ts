export type HelpSection = {
  type: 'topic' | 'faq' | 'faq-header' | 'contact';
  title: string;
  body?: string;
  icon?: string;
};

export const HELP_TOPICS: HelpSection[] = [
  {
    type: 'topic',
    title: 'Adding Income',
    icon: 'cash-outline',
    body: 'Tap the + button on the Home screen or go to Income Sources. Fill in the source name, amount, category, and date. Toggle "Recurring" if it repeats on a schedule. Your income will appear in your balance and activity history right away.',
  },
  {
    type: 'topic',
    title: 'Recording Expenses',
    icon: 'receipt-outline',
    body: 'Open My Spending and tap "+ Add Expense". Choose a category, enter the amount and description, then save. Expenses are deducted from your remaining budget and reflected in your analytics.',
  },
  {
    type: 'topic',
    title: 'Setting a Budget',
    icon: 'wallet-outline',
    body: 'In My Spending, tap the pencil icon on any category to set a spending limit. PennyWise will track your spending against that limit and alert you when you are approaching or have exceeded it.',
  },
  {
    type: 'topic',
    title: 'Savings Goals',
    icon: 'trending-up-outline',
    body: 'Go to the Savings section on the Home screen. Tap "+ New Goal", set a name, target amount, and optional deadline. Each time you log a savings entry, your progress ring updates automatically.',
  },
  {
    type: 'topic',
    title: 'Exporting History',
    icon: 'share-outline',
    body: 'Open Activity History and tap the share icon in the top-right corner. Your transaction history will be exported as a CSV file that you can open in any spreadsheet app or share via email.',
  },
];

export const HELP_FAQS: HelpSection[] = [
  {
    type: 'faq-header',
    title: 'Frequently Asked Questions',
  },
  {
    type: 'faq',
    title: 'Why is my balance not updating?',
    body: 'Pull down to refresh any screen or tap the refresh icon in Activity History. If the issue persists, check your internet connection — PennyWise syncs in real time with the cloud.',
  },
  {
    type: 'faq',
    title: 'How do I edit or delete a transaction?',
    body: 'In Activity History, tap the "···" icon on any transaction row to open the action menu. From there you can edit the details or permanently delete the entry.',
  },
  {
    type: 'faq',
    title: "I'm not receiving push notifications.",
    body: "Go to Profile → Settings → Notification Settings and make sure notifications are enabled. Also check that your device has granted PennyWise notification permission in your phone's system settings.",
  },
  {
    type: 'faq',
    title: 'How do I change my profile photo?',
    body: 'Go to Profile → Edit Profile and tap the camera icon on your avatar. You can choose a photo from your gallery. The image is securely stored and linked only to your account.',
  },
  {
    type: 'faq',
    title: 'Is my financial data secure?',
    body: 'Yes. All data is stored in Supabase with row-level security — only you can access your records. Passwords are never stored in plain text, and your session is protected with secure token management.',
  },
  {
    type: 'faq',
    title: 'Can I use PennyWise without an internet connection?',
    body: 'PennyWise requires an internet connection to sync your data. Offline support is on our roadmap for a future update.',
  },
  {
    type: 'faq',
    title: 'How do I delete my account?',
    body: 'Go to Profile → scroll to the bottom → tap "Delete Account". This is permanent and will erase all your data including transactions, budgets, and goals. Make sure to export your history first if you need a record.',
  },
  {
    type: 'faq',
    title: 'Why does a category show "over budget"?',
    body: 'A category turns red when your total expenses in that category exceed the limit you set. You can raise the limit by tapping the pencil icon on the category in My Spending.',
  },
];
