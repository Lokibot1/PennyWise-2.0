# PennyWise 2.0

A mobile-first budget tracker app built with React Native and Expo. PennyWise helps users track income and expenses, manage budgets, set savings goals, and stay on top of their finances — all backed by a secure cloud database.

---

## Features

### Core
- **Dashboard** — Balance overview, budget progress, savings goals carousel, and recent transactions
- **Income Tracking** — Log income entries by category with date, description, and recurring support
- **Expense Tracking** — Track expenses by category with budget limit visualization
- **Transaction History** — Unified income/expense log filterable by Daily, Weekly, or Monthly period
- **Savings Goals** — Create and track multiple savings goals shown in an auto-rotating carousel
- **Profile & Settings** — Edit personal info, upload avatar, toggle dark mode, manage notifications

### Authentication & Account
- **Sign Up** — Register with full name, email, phone, and date of birth (minimum age: 13)
- **Login** — Email and password authentication via Supabase Auth
- **Forgot Password** — OTP-based password reset flow sent to email
- **OTP Verification** — 6-digit code entry with auto-focus, paste support, resend cooldown, and attempt tracking
- **Password Reset** — Set a new password with strength requirements after OTP verification
- **Password Change** — Change password from the Profile screen with strength validation

### Security
- **Input Sanitization** — All user inputs (names, emails, phone numbers, titles, descriptions) are stripped of HTML tags, null bytes, and control characters before being saved
- **OTP Hashing** — Reset codes are SHA-256 hashed before storage; plaintext is never saved to the database
- **Rate Limiting** — OTP requests are capped at 5 per hour and a 60-second minimum between sends
- **Attempt Limiting** — OTP verification is locked after 5 failed attempts
- **Anti-Enumeration** — Password reset always responds with HTTP 200 regardless of whether the email exists
- **Row Level Security (RLS)** — All database tables enforce `auth.uid() = user_id` at the PostgreSQL level
- **Session Management** — Auto token refresh; signs out automatically on session expiry
- **Clickjacking Prevention** — `filterTouchesWhenObscured={true}` applied to all auth screens
- **Password Changed Notification** — Users receive an email after a successful password change

### UX & Polish
- **Animated Splash Screen** — Coin flip animation with sound effects and haptic feedback
- **Liquid Tab Bar** — Animated indicator pill with dual-spring stretchy effect
- **Skeleton Loaders** — Shown during data fetch on home and profile screens
- **Caching** — In-memory TTL cache (5 min for static data, 2 min for transactional data) to reduce redundant network calls
- **Activity Logging** — Audit trail of user actions (income added, expense deleted, etc.) stored in the database
- **Dark Mode** — Full light/dark theme via custom `AppTheme` context
- **Notifications** — In-app notification panel with per-type preference toggles
- **Sound & Haptics** — Audio and haptic feedback on key interactions
- **Delete Account** — Permanently deletes the account and all associated data with confirmation

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
| Icons | `@expo/vector-icons` (Ionicons) |
| Fonts | `@expo-google-fonts/kumbh-sans`, `@expo-google-fonts/league-spartan` |
| Image picker | `expo-image-picker` |
| Sound | `expo-av` |
| Haptics | `expo-haptics` |

---

## Project Structure

```
PennyWise-2.0/
├── PennyWise/                       # Main application
│   ├── app/
│   │   ├── _layout.tsx              # Root stack layout + auth state listener
│   │   ├── index.tsx                # Splash screen (animated coin flip)
│   │   ├── login-form.tsx           # Login screen
│   │   ├── create-account.tsx       # Registration screen
│   │   ├── forgot-password.tsx      # Password reset — email entry
│   │   ├── verify-code.tsx          # Password reset — OTP verification
│   │   ├── reset-password.tsx       # Password reset — new password entry
│   │   ├── savings-goals.tsx        # Savings goal management screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx          # Custom bottom tab bar (animated)
│   │       ├── index.tsx            # Home dashboard
│   │       ├── analytics.tsx        # Income tracking & categories
│   │       ├── budget.tsx           # Expense tracking & categories
│   │       ├── transaction.tsx      # Unified transaction history
│   │       └── profile.tsx          # Profile & settings
│   ├── components/                  # Reusable UI components
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
│   ├── constants/                   # Design tokens (colors, fonts, theme)
│   ├── contexts/
│   │   ├── AppTheme.tsx             # Light/dark theme provider
│   │   └── NotificationContext.tsx
│   ├── hooks/                       # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client initialization
│   │   ├── sanitize.ts              # Input sanitization helpers
│   │   ├── cache.ts                 # In-memory TTL cache
│   │   ├── dataCache.ts             # Fetch-or-cache layer for Supabase
│   │   ├── callFunction.ts          # Supabase Edge Function caller
│   │   ├── logActivity.ts           # Activity audit logging
│   │   └── notifications.ts
│   ├── database/
│   │   ├── schema.sql               # Full PostgreSQL schema
│   │   └── migrations/              # Incremental schema changes
│   └── supabase/
│       └── functions/
│           ├── send-reset-otp/      # Edge Function: generate & email OTP
│           └── verify-reset-otp/   # Edge Function: verify OTP, return token
└── supabase/
    └── functions/
        └── send-password-changed-email/  # Edge Function: notify on password change
```

---

## Database Schema

All tables have **Row Level Security (RLS)** enabled. Users can only access their own data.

| Table | Description |
|---|---|
| `profiles` | User profile data linked to `auth.users` (name, phone, DOB, avatar, budget limit) |
| `expenses` | Individual expense entries with category, date, amount, and recurring support |
| `expense_categories` | User-defined expense categories with label and icon |
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
              └── Forgot Password
                   └── OTP Verification
                        └── Reset Password
                             └── Login

Home Dashboard
    └── Bottom Tab Bar
         ├── Home (Dashboard)
         ├── Analytics (Income)
         ├── Budget (Expenses)
         ├── Transactions
         └── Profile
              └── Savings Goals
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

Then apply any migrations in `PennyWise/database/migrations/` in order.

### 5. Deploy Edge Functions (optional — required for password reset)

```bash
supabase functions deploy send-reset-otp
supabase functions deploy verify-reset-otp
supabase functions deploy send-password-changed-email
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

## Design System

| Token | Value | Usage |
|---|---|---|
| Sage Green | `#7CB898` | Header backgrounds, splash |
| Teal | `#3ECBA8` | Active tabs, primary buttons |
| Dark Teal | `#1E9C70` | Savings card |
| Light Mint | `#F0FAF6` | Login screen background |
| Dark bg | `#141414` | Dark mode cards |
| Dark header | `#1B3028` | Dark mode header |

**Fonts:** Kumbh Sans (body) · League Spartan (headings & logo)

---

## License

This project is for academic and personal use.
