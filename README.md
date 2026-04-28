# PennyWise 2.0

A mobile-first budget tracker app built with React Native and Expo. PennyWise helps users track income and expenses, manage budgets, set savings goals, and stay on top of their finances — all backed by a secure cloud database.

---

## Features

### Core
- **Dashboard** — Balance overview, budget progress, savings goals carousel, and recent transactions
- **Income Tracking** — Log income entries by category with date, description, and recurring support
- **Expense Tracking** — Track expenses by category with budget limit visualization
- **Transaction History** — Unified income/expense log with search, edit, delete, and CSV export
- **Savings Goals** — Create and track multiple savings goals shown in an auto-rotating carousel
- **Profile & Settings** — Edit personal info, upload avatar, toggle dark mode, manage notifications
- **Charts & Trends** — Spending bar chart and category donut chart with animated visualizations
- **Per-Category Budget Limits** — Set and track spending limits per expense category

### Penny the Owl (AI Mascot & Chatbot)
- **Animated Mascot** — Penny the Owl appears throughout the app with idle/talking animations
- **Financial Chatbot** — Rule-based chatbot (`pennyBrain`) with cloud AI via the `pennywise-chat` Edge Function
- **Contextual Advice** — Responds to spending queries, savings tips, and budget questions

### Authentication & Account
- **Sign Up** — Register with full name, email, phone, and date of birth (minimum age: 13)
- **Login** — Email and password authentication via Supabase Auth
- **Forgot Password** — OTP-based password reset flow sent to email
- **OTP Verification** — 6-digit code entry with auto-focus, paste support, resend cooldown, and attempt tracking
- **Password Reset** — Set a new password with strength requirements after OTP verification
- **Password Change** — Change password from the Profile screen with strength validation
- **Onboarding** — First-time setup flow after registration (name, preferences)

### Security
- **Input Sanitization** — All user inputs are stripped of HTML tags, null bytes, control characters, and emojis before being saved
- **OTP Hashing** — Reset codes are SHA-256 hashed before storage; plaintext is never saved to the database
- **Rate Limiting** — OTP requests are capped at 5 per hour and a 60-second minimum between sends
- **Attempt Limiting** — OTP verification is locked after 5 failed attempts
- **Anti-Enumeration** — Password reset always responds with HTTP 200 regardless of whether the email exists
- **Row Level Security (RLS)** — All database tables enforce `auth.uid() = user_id` at the PostgreSQL level
- **Session Management** — Auto token refresh; signs out automatically on session expiry
- **Clickjacking Prevention** — `filterTouchesWhenObscured={true}` applied to all auth screens
- **Password Changed Notification** — Users receive an email after a successful password change

### Offline & Performance
- **Offline-First Mutation Queue** — Changes made while offline are queued and auto-synced on reconnect
- **Offline Banner** — Visual indicator when the device has no network connection
- **Optimistic UI Updates** — UI reflects changes immediately before the server confirms
- **Auto-Save with Status Indicators** — Draft state is saved automatically with visible save status
- **In-Memory TTL Cache** — 5-minute cache for static data, 2-minute for transactional data to reduce redundant network calls
- **Debounced Search** — Transaction history search uses debouncing to reduce query frequency

### Notifications & Automation
- **Push Notifications** — Expo push notifications with per-category budget alert support
- **In-App Notification Panel** — Per-type notification preference toggles
- **Recurring Transactions** — Auto-processed on app open via `recurringProcessor`

### UX & Polish
- **Animated Splash Screen** — Coin flip animation with sound effects and haptic feedback
- **Glassmorphism UI** — Frosted-glass cards and headers throughout the app
- **Header Decorations** — Decorative elements (`HeaderDecor`) on key screens
- **Liquid Tab Bar** — Animated indicator pill with dual-spring stretchy effect
- **Skeleton Loaders** — Shown during data fetch on home and profile screens
- **Dark Mode** — Full light/dark theme via custom `AppTheme` context
- **Sound & Haptics** — Audio and haptic feedback on key interactions
- **CSV Export** — Export transaction history to a CSV file via `expo-sharing`
- **Activity Logging** — Audit trail of user actions stored in the database
- **Delete Account** — Permanently deletes the account and all associated data with confirmation
- **Help & Support** — FAQ topics and support section inside the Profile screen
- **About / Meet the Developers** — Info pages accessible from the Profile screen

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (TypeScript) via Expo Go |
| Backend | Supabase (Backend as a Service) |
| Database | PostgreSQL (hosted by Supabase) |

**Key SDKs & Libraries**

| Purpose | Package |
|---|---|
| App framework | `expo` ~54 (SDK 54) |
| File-based routing | `expo-router` v6 |
| Navigation | `@react-navigation/bottom-tabs`, `@react-navigation/stack` |
| Database & Auth | `@supabase/supabase-js` ^2 |
| Session storage | `@react-native-async-storage/async-storage` |
| Animations | `react-native-reanimated` ~4 |
| SVG / Charts | `react-native-svg` |
| Icons | `@expo/vector-icons` (Ionicons) |
| Fonts | `@expo-google-fonts/kumbh-sans`, `@expo-google-fonts/league-spartan` |
| Image picker | `expo-image-picker` |
| Sound | `expo-av` |
| Haptics | `expo-haptics` |
| Push notifications | `expo-notifications` |
| File sharing / CSV | `expo-file-system`, `expo-sharing` |
| Network state | `@react-native-community/netinfo` |
| Date picker | `@react-native-community/datetimepicker` |

---

## Project Structure

```
PennyWise-2.0/
├── PennyWise/                           # Main application
│   ├── app/
│   │   ├── _layout.tsx                  # Root stack layout + auth state listener
│   │   ├── index.tsx                    # Splash screen (animated coin flip)
│   │   ├── onboarding.tsx               # First-time user onboarding flow
│   │   ├── login-form.tsx               # Login screen
│   │   ├── create-account.tsx           # Registration screen
│   │   ├── forgot-password.tsx          # Password reset — email entry
│   │   ├── verify-code.tsx              # Password reset — OTP verification
│   │   ├── reset-password.tsx           # Password reset — new password entry
│   │   ├── savings-goals.tsx            # Savings goal management screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx              # Custom bottom tab bar (animated)
│   │       ├── index.tsx                # Home dashboard
│   │       ├── analytics.tsx            # Income tracking & categories
│   │       ├── budget.tsx               # Expense tracking & categories
│   │       ├── transaction.tsx          # Unified transaction history
│   │       └── profile.tsx              # Profile, settings, help & about
│   ├── components/                      # Reusable UI components
│   │   ├── AnimatedOwl.tsx              # Penny the Owl idle/talking animations
│   │   ├── PennyMascot.tsx              # Owl mascot wrapper component
│   │   ├── MascotChatbot.tsx            # Chatbot UI powered by pennyBrain
│   │   ├── CategoryDonutChart.tsx       # Donut chart for category breakdown
│   │   ├── SpendingBarChart.tsx         # Bar chart for spending trends
│   │   ├── HeaderDecor.tsx              # Decorative header elements
│   │   ├── DraftSaveIndicator.tsx       # Auto-save status indicator
│   │   ├── OfflineBanner.tsx            # Offline network status banner
│   │   ├── BudgetLimitModal.tsx
│   │   ├── CircularRing.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── DatePickerModal.tsx
│   │   ├── ErrorModal.tsx
│   │   ├── GlobalLoadingBar.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationPanel.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── SlideTabBar.tsx
│   │   ├── form-input.tsx
│   │   ├── password-strength.tsx
│   │   └── penny-wise-logo.tsx
│   ├── constants/                       # Design tokens (colors, fonts, theme)
│   ├── contexts/
│   │   ├── AppTheme.tsx                 # Light/dark theme provider
│   │   └── NotificationContext.tsx
│   ├── hooks/                           # Custom React hooks (useDebounce, etc.)
│   ├── lib/
│   │   ├── supabase.ts                  # Supabase client initialization
│   │   ├── sanitize.ts                  # Input sanitization helpers
│   │   ├── cache.ts                     # In-memory TTL cache
│   │   ├── dataCache.ts                 # Fetch-or-cache layer for Supabase
│   │   ├── callFunction.ts              # Supabase Edge Function caller
│   │   ├── logActivity.ts               # Activity audit logging
│   │   ├── activityNavTarget.ts         # Maps activity log entries to nav targets
│   │   ├── notifications.ts             # In-app notification helpers
│   │   ├── notificationPrefs.ts         # Notification preference storage
│   │   ├── pushNotifications.ts         # Expo push notification registration & dispatch
│   │   ├── recurringProcessor.ts        # Auto-processes recurring transactions on launch
│   │   ├── mutationQueue.ts             # Offline mutation queue
│   │   ├── syncEngine.ts                # Syncs queued mutations on reconnect
│   │   ├── network.ts                   # Network connectivity monitoring
│   │   ├── pennyBrain.ts                # Rule-based chatbot logic for Penny
│   │   └── sfx.ts                       # Sound effect helpers
│   ├── database/
│   │   ├── schema.sql                   # Full PostgreSQL schema
│   │   └── migrations/                  # Incremental schema changes
│   │       ├── add_activity_logs.sql
│   │       ├── add_savings_goals_completion.sql
│   │       ├── add_password_reset_otps.sql
│   │       ├── add_category_budget_limit.sql
│   │       └── add_recurring_last_processed.sql
│   └── supabase/
│       └── functions/
│           ├── send-reset-otp/          # Edge Function: generate & email OTP
│           └── verify-reset-otp/        # Edge Function: verify OTP, return token
└── supabase/
    └── functions/
        ├── send-password-changed-email/ # Edge Function: notify on password change
        └── pennywise-chat/              # Edge Function: AI-powered chatbot responses
```

---

## Database Schema

All tables have **Row Level Security (RLS)** enabled. Users can only access their own data.

| Table | Description |
|---|---|
| `profiles` | User profile data linked to `auth.users` (name, phone, DOB, avatar, budget limit) |
| `expenses` | Individual expense entries with category, date, amount, and recurring support |
| `expense_categories` | User-defined expense categories with label, icon, and monthly budget limit |
| `income_sources` | Individual income entries with category, date, amount, and recurring support |
| `income_categories` | User-defined income categories with label and icon |
| `savings_goals` | Savings targets with progress tracking and completion state |
| `activity_logs` | Audit trail of user actions (add, edit, delete) with timestamps |
| `password_reset_otps` | Hashed OTP records with expiry, attempt count, and used flag |

See [PennyWise/database/schema.sql](PennyWise/database/schema.sql) for the full schema.

---

## Navigation Flow

```
Splash Screen
    └── auto-redirect (4.8s)
         ├── Authenticated → Home Dashboard
         └── Unauthenticated → Login
              ├── Create Account
              │    └── Onboarding (first-time setup)
              │         └── Home Dashboard
              └── Forgot Password
                   └── OTP Verification
                        └── Reset Password
                             └── Login

Home Dashboard
    └── Bottom Tab Bar
         ├── Home (Dashboard)
         │    └── Penny the Owl Chatbot
         ├── Analytics (Income)
         ├── Budget (Expenses)
         ├── Transactions
         │    └── Edit / Delete / Export CSV
         └── Profile
              ├── Savings Goals
              ├── Notifications
              ├── Help & Support
              ├── About / Meet the Developers
              └── Change Password / Delete Account
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [Expo Go](https://expo.dev/go) on your mobile device
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/Lokibot1/PennyWise-2.0.git
cd PennyWise-2.0/PennyWise
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file inside `PennyWise/`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Find these values in your Supabase project under **Settings → API**.

### 4. Apply the database schema

In your Supabase project, open the **SQL Editor** and run:

```
PennyWise/database/schema.sql
```

Then apply migrations in `PennyWise/database/migrations/` in order.

### 5. Deploy Edge Functions (optional — required for password reset and chatbot)

```bash
supabase functions deploy send-reset-otp
supabase functions deploy verify-reset-otp
supabase functions deploy send-password-changed-email
supabase functions deploy pennywise-chat
```

Set the required secrets in your Supabase project:

```bash
supabase secrets set GMAIL_USER=your_gmail_address
supabase secrets set GMAIL_APP_PASSWORD=your_gmail_app_password
```

### 6. Start the development server

```bash
npm start
```

| Action | Platform |
|---|---|
| Press `a` | Android emulator |
| Press `i` | iOS simulator (macOS only) |
| Press `w` | Web browser |
| Scan QR code | Expo Go on physical device |

---

## License

This project is for academic and personal use.
