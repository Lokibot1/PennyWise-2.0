# PennyWise 2.0

A mobile-first budget tracker app built with React Native and Expo. PennyWise helps users track income and expenses, manage budgets, set savings goals, and stay on top of their finances — all backed by a secure cloud database and an AI-powered financial advisor.

---

## Features

### Core
- **Dashboard** — Balance overview, budget progress, savings goals carousel, period summary (daily/weekly/monthly), and recent transactions
- **Income Tracking** — Log income entries by category with date, time, description, and recurring support
- **Expense Tracking** — Track expenses by category with per-category budget limit visualization
- **Transaction History** — Unified income/expense/activity log with filters, search, edit, delete, and CSV export
- **Savings Goals** — Create and track multiple savings goals shown in an auto-rotating carousel with circular progress rings
- **Profile & Settings** — Edit personal info, upload avatar, toggle dark mode, manage notification preferences
- **Charts & Trends** — 6-month spending bar chart and category donut chart with animated visualizations
- **Per-Category Budget Limits** — Set and track spending limits per expense category
- **Period Summary** — Daily, weekly, and monthly income/expense/saved/balance breakdown on the home screen

### Penny the Owl (AI Mascot & Chatbot)
- **Animated Mascot** — Penny the Owl appears throughout the app with idle, blink, and talking animations
- **Rule-Based Chatbot** (`pennyBrain`) — 14+ intent engine with no external API calls; handles greetings, budget queries, expense breakdowns, income summaries, savings goal checks, recurring bill listings, income-vs-expense ratios, daily pace, full financial analysis, affordability checks, and personalized tips
- **Cloud AI Fallback** — Enhanced advice via the `pennywise-chat` Edge Function powered by the Claude API (Anthropic)
- **Bilingual Support** — Understands both English and Filipino/Tagalog keywords
- **Contextual Advice** — Responds with actual data from the user's account (amounts, categories, goals)
- **Out-of-Scope Detection** — Politely redirects non-financial questions back to budgeting topics
- **Philippine Peso (₱)** — All monetary values formatted in en-PH locale

### Authentication & Account
- **Sign Up** — Register with full name, email, phone, and date of birth (minimum age: 13)
- **Login** — Email and password authentication via Supabase Auth
- **Social Sign-In** — Google and Apple OAuth sign-in (OAuth users do not see password-change options)
- **Email Verification** — PKCE-flow email confirmation link; dedicated check-email screen after sign-up
- **Forgot Password** — OTP-based password reset flow sent to email
- **OTP Verification** — 6-digit code entry with auto-focus, paste support, resend cooldown, and attempt tracking
- **Password Reset** — Set a new password with strength requirements after OTP verification
- **Password Change** — Change password from the Profile screen with strength validation
- **Onboarding** — 4-step first-time setup flow after registration (feature highlights → name + budget → Terms & Conditions → completion)
- **Terms & Conditions Gate** — Scroll-to-accept gating on sign-up and a version-based re-prompt for existing users
- **Privacy Policy** — Accessible from the profile screen; full policy text bundled in-app

### Security
- **Input Sanitization** — All user inputs are stripped of HTML tags, null bytes, control characters, and emojis before being saved
- **OTP Hashing** — Reset codes are SHA-256 hashed before storage; plaintext is never saved to the database
- **Rate Limiting** — OTP requests are capped at 5 per hour and a 60-second minimum between sends
- **Attempt Limiting** — OTP verification is locked after 5 failed attempts
- **Anti-Enumeration** — Password reset always responds with HTTP 200 regardless of whether the email exists
- **Email Uniqueness Check** — PostgreSQL RPC (`check_email_exists`) prevents duplicate registrations including OAuth accounts
- **Row Level Security (RLS)** — All database tables enforce `auth.uid() = user_id` at the PostgreSQL level
- **Session Management** — Auto token refresh; signs out automatically on session expiry
- **Clickjacking Prevention** — `filterTouchesWhenObscured={true}` applied to all auth screens
- **Password Changed Notification** — Users receive an email after a successful password change

### Offline & Performance
- **Offline-First Mutation Queue** — Changes made while offline are queued and auto-synced on reconnect
- **Offline Banner** — Visual indicator when the device has no network connection
- **Optimistic UI Updates** — UI reflects changes immediately before the server confirms
- **Draft Auto-Save with Status Indicators** — Form state is saved automatically to AsyncStorage with a visible save/saved indicator
- **In-Memory TTL Cache** — 5-minute cache for static data (profiles, categories), 2-minute for transactional data (sources, expenses, goals)
- **Pending Invalidation Handling** — Cache invalidations queued while offline are flushed on reconnect
- **Debounced Search** — Transaction history search uses debouncing to reduce query frequency

### Notifications & Automation
- **Push Notifications** — Expo push notifications with per-category budget alert support
- **In-App Notification Panel** — Toast-style notifications with per-type preference toggles
- **Seen Notification Tracking** — Unread count badge on the notification bell; count resets when panel is opened
- **Recurring Transactions** — Auto-processed on app open via `recurringProcessor`

### Testing
- **Comprehensive Test Suite** — 40+ Jest test suites covering screens, components, and lib modules
- **React Native Testing Library** — All UI components tested for rendering and interaction
- **Unit Tests** — Core utilities (cache, sanitize, pennyBrain, mutationQueue, syncEngine, etc.) fully tested

### UX & Polish
- **Animated Splash Screen** — Coin flip animation with sound effects and haptic feedback
- **Glassmorphism UI** — Frosted-glass cards and headers throughout the app
- **Header Decorations** — Decorative gradient blob elements on key screens
- **Liquid Tab Bar** — Animated indicator pill with dual-spring stretchy effect
- **Skeleton Loaders** — Shown during data fetch on home and profile screens
- **Dark Mode** — Full light/dark theme via custom `AppTheme` context
- **Sound & Haptics** — Audio and haptic feedback on key interactions
- **CSV Export** — Export transaction history to a CSV file via `expo-sharing`
- **Activity Logging** — Audit trail of user actions stored in the database with navigation deep-links
- **Delete Account** — Permanently deletes the account and all associated data with confirmation
- **Help & Support** — FAQ topics and support section inside the Profile screen (content bundled in `constants/help.ts`)
- **About / Meet the Developers** — Info pages accessible from the Profile screen (content in `constants/about.ts`)
- **Terms & Conditions / Privacy Policy** — Full text bundled in `constants/terms.ts` and `constants/privacy.ts` with version control

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (TypeScript) via Expo Go |
| Backend | Supabase (Backend as a Service) |
| Database | PostgreSQL (hosted by Supabase) |
| AI / Chatbot | Anthropic Claude API (via Supabase Edge Function) |

**Key SDKs & Libraries**

| Purpose | Package |
|---|---|
| App framework | `expo` ~54 (SDK 54) |
| File-based routing | `expo-router` v6 |
| Navigation | `@react-navigation/bottom-tabs`, `@react-navigation/stack` |
| Database & Auth | `@supabase/supabase-js` ^2 |
| Session storage | `@react-native-async-storage/async-storage` |
| Animations | `react-native-reanimated` ~4 |
| Gestures | `react-native-gesture-handler` |
| SVG / Charts | `react-native-svg` |
| Icons | `@expo/vector-icons` (Ionicons) |
| Fonts | `@expo-google-fonts/kumbh-sans`, `@expo-google-fonts/league-spartan` |
| Image picker | `expo-image-picker` |
| Image rendering | `expo-image` |
| Sound | `expo-av` |
| Haptics | `expo-haptics` |
| Push notifications | `expo-notifications` |
| File sharing / CSV | `expo-file-system`, `expo-sharing` |
| Network state | `@react-native-community/netinfo` |
| Date picker | `@react-native-community/datetimepicker` |
| Base64 encoding | `base64-arraybuffer` |
| URL polyfill | `react-native-url-polyfill` |

---

## Project Structure

```
PennyWise-2.0/
├── PennyWise/                                    # Main application
│   ├── app/
│   │   ├── _layout.tsx                           # Root stack layout + auth state listener + T&C re-prompt
│   │   ├── index.tsx                             # Splash screen (animated coin flip, 4.8s)
│   │   ├── onboarding.tsx                        # 4-step first-time onboarding wizard
│   │   ├── login-form.tsx                        # Login screen (email/password + social auth)
│   │   ├── create-account.tsx                    # Registration screen + T&C acceptance
│   │   ├── check-email.tsx                       # Post-signup email verification instructions
│   │   ├── forgot-password.tsx                   # Password reset — email entry
│   │   ├── verify-code.tsx                       # Password reset — OTP verification
│   │   ├── reset-password.tsx                    # Password reset — new password entry
│   │   ├── savings-goals.tsx                     # Savings goal management screen
│   │   ├── modal.tsx                             # Generic modal route (stub)
│   │   └── (tabs)/
│   │       ├── _layout.tsx                       # Custom animated bottom tab bar
│   │       ├── index.tsx                         # Home dashboard
│   │       ├── analytics.tsx                     # Income tracking & categories
│   │       ├── budget.tsx                        # Expense tracking & categories
│   │       ├── transaction.tsx                   # Unified transaction history + activity log
│   │       └── profile.tsx                       # Profile, settings, help, about, privacy
│   ├── components/
│   │   ├── AnimatedOwl.tsx                       # Penny the Owl with blink/idle animations
│   │   ├── PennyMascot.tsx                       # Static owl mascot illustration
│   │   ├── MascotChatbot.tsx                     # Penny chatbot modal powered by pennyBrain + Claude
│   │   ├── CategoryDonutChart.tsx                # Donut chart for category breakdown
│   │   ├── SpendingBarChart.tsx                  # 6-month spending bar chart
│   │   ├── CircularRing.tsx                      # Circular progress ring with centered icon
│   │   ├── SlideTabBar.tsx                       # Animated sliding tab bar
│   │   ├── HeaderDecor.tsx                       # Decorative gradient blob background for headers
│   │   ├── DraftSaveIndicator.tsx                # Auto-save status indicator (saving / saved)
│   │   ├── OfflineBanner.tsx                     # Offline network status banner
│   │   ├── GlobalLoadingBar.tsx                  # Top-of-screen loading progress bar
│   │   ├── SkeletonLoader.tsx                    # Skeleton placeholders during async data load
│   │   ├── NotificationBell.tsx                  # Bell icon with unread count badge
│   │   ├── NotificationPanel.tsx                 # Toast / in-app notification panel
│   │   ├── BudgetLimitModal.tsx                  # Budget limit adjustment modal
│   │   ├── ConfirmModal.tsx                      # Confirmation dialog (delete, restore, etc.)
│   │   ├── ErrorModal.tsx                        # Error notification modal
│   │   ├── DatePickerModal.tsx                   # Date picker modal wrapper
│   │   ├── form-input.tsx                        # Custom styled TextInput with labels and icons
│   │   ├── password-strength.tsx                 # Real-time password strength meter
│   │   ├── penny-wise-logo.tsx                   # Logo SVG component
│   │   └── ui/
│   │       ├── collapsible.tsx                   # Collapsible / accordion component
│   │       └── icon-symbol.tsx                   # Platform-specific icon rendering
│   ├── constants/
│   │   ├── colors.ts                             # Color palette tokens
│   │   ├── fonts.ts                              # Font family constants
│   │   ├── theme.ts                              # Theme definitions (light / dark)
│   │   ├── terms.ts                              # Terms & Conditions text with version control
│   │   ├── privacy.ts                            # Privacy policy text
│   │   ├── about.ts                              # About & feature descriptions
│   │   └── help.ts                               # Help / FAQ content
│   ├── contexts/
│   │   ├── AppTheme.tsx                          # Light / dark theme provider
│   │   ├── NetworkContext.tsx                    # Network connectivity state (online / offline)
│   │   └── NotificationContext.tsx               # Global notification / toast state
│   ├── hooks/
│   │   ├── use-color-scheme.ts                   # Detect system dark / light mode
│   │   ├── use-theme-color.ts                    # Access current theme colors
│   │   ├── use-debounce.ts                       # Debounce hook for search input
│   │   └── useFormDraft.ts                       # Persist form drafts to AsyncStorage
│   ├── lib/
│   │   ├── supabase.ts                           # Supabase client initialization
│   │   ├── sanitize.ts                           # Input sanitization helpers (XSS, amount parsing)
│   │   ├── cache.ts                              # Low-level in-memory TTL cache
│   │   ├── dataCache.ts                          # Fetch-or-cache layer for Supabase queries
│   │   ├── callFunction.ts                       # Supabase Edge Function caller
│   │   ├── logActivity.ts                        # Activity audit logging
│   │   ├── activityNavTarget.ts                  # Maps activity log entries to navigation targets
│   │   ├── notifications.ts                      # In-app notification helpers
│   │   ├── notificationPrefs.ts                  # Notification preference persistence
│   │   ├── pushNotifications.ts                  # Expo push notification registration & dispatch
│   │   ├── recurringProcessor.ts                 # Auto-processes recurring transactions on launch
│   │   ├── mutationQueue.ts                      # Queue for offline mutations (create/update/delete)
│   │   ├── syncEngine.ts                         # Flushes queued mutations on reconnect
│   │   ├── network.ts                            # Network connectivity monitoring (NetInfo)
│   │   ├── pennyBrain.ts                         # Rule-based chatbot engine (14+ intents, bilingual)
│   │   ├── socialAuth.ts                         # Google and Apple OAuth integration helpers
│   │   └── sfx.ts                               # Sound effect playback helpers
│   ├── database/
│   │   ├── schema.sql                            # Full PostgreSQL schema
│   │   └── migrations/
│   │       ├── add_activity_logs.sql
│   │       ├── add_savings_goals_completion.sql
│   │       ├── add_password_reset_otps.sql
│   │       ├── add_category_budget_limit.sql
│   │       ├── add_recurring_last_processed.sql
│   │       └── add_email_check_rpc.sql           # RPC for email uniqueness check
│   └── supabase/
│       └── functions/
│           ├── send-reset-otp/                   # Edge Function: generate & email OTP
│           └── verify-reset-otp/                 # Edge Function: verify OTP, return token
└── supabase/
    └── functions/
        ├── send-password-changed-email/          # Edge Function: notify user on password change
        └── pennywise-chat/                       # Edge Function: Claude AI-powered chatbot
```

---

## Database Schema

All tables have **Row Level Security (RLS)** enabled. Users can only access their own data.

| Table | Description |
|---|---|
| `profiles` | User profile data linked to `auth.users` (name, phone, DOB, avatar, theme, budget limit) |
| `expenses` | Individual expense entries with category, date, time, amount, description, and recurring support |
| `expense_categories` | User-defined expense categories with label, icon, and optional monthly budget limit |
| `income_sources` | Individual income entries with category, date, time, amount, description, and recurring support |
| `income_categories` | User-defined income categories with label and icon |
| `savings_goals` | Savings targets with current/target amounts, completion state, and archival support |
| `activity_logs` | Audit trail of user actions (add, edit, delete, archive) with timestamps and navigation targets |
| `password_reset_otps` | Hashed OTP records with expiry, attempt count, and used flag |

**PostgreSQL RPC:** `check_email_exists(email)` — checks for existing accounts (including OAuth) to prevent duplicate registrations.

See [PennyWise/database/schema.sql](PennyWise/database/schema.sql) for the full schema.

---

## Navigation Flow

```
Splash Screen (4.8s animated coin flip)
    └── auto-redirect
         ├── Authenticated → Home Dashboard
         └── Unauthenticated → Login
              ├── Create Account
              │    └── Check Email (email verification)
              │         └── Onboarding (4-step wizard)
              │              └── Home Dashboard
              └── Forgot Password
                   └── OTP Verification
                        └── Reset Password
                             └── Login

Home Dashboard
    └── Bottom Tab Bar
         ├── Home (Dashboard)
         │    ├── Period Summary (Daily / Weekly / Monthly)
         │    ├── Budget Progress & Balance Card
         │    ├── Savings Goals Carousel
         │    └── Penny the Owl Chatbot (rule-based + Claude AI)
         ├── Analytics (Income)
         │    ├── Income Sources (CRUD)
         │    ├── Income Categories (CRUD)
         │    └── Monthly Income Chart
         ├── Budget (Expenses)
         │    ├── Expense Entries (CRUD)
         │    ├── Expense Categories with Limits (CRUD)
         │    └── Monthly Expense Chart
         ├── Transactions (Activity Log)
         │    ├── Filters: All / Income / Expenses / Goals / Archives
         │    ├── Search with Debounce
         │    └── Export to CSV
         └── Profile
              ├── Edit Profile (name, phone, DOB, avatar)
              ├── Change Password (hidden for OAuth users)
              ├── Savings Goals
              ├── Notification Preferences
              ├── Terms & Conditions
              ├── Privacy Policy
              ├── Help & Support (FAQ)
              ├── About / Meet the Developers
              └── Delete Account
```

---

## Testing

PennyWise 2.0 has comprehensive test coverage with **Jest** and **React Native Testing Library**.

```bash
npm test                  # run all tests
npm run test:screens      # app screen tests only
npm run test:components   # component tests only
npm run test:lib          # lib utility tests only
npm run test:watch        # watch mode
npm run test:coverage     # generate coverage report
npm run test:verbose      # detailed output
```

**Test areas:**
- All auth screens (login, sign-up, OTP, password reset, check-email)
- Onboarding, savings goals, home dashboard, analytics, budget, transactions, profile
- All UI components (charts, modals, mascot, notifications, skeleton loaders, etc.)
- All lib modules (cache, sanitize, pennyBrain, mutationQueue, syncEngine, recurringProcessor, etc.)
- All contexts (AppTheme, NetworkContext, NotificationContext)

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

### 5. Deploy Edge Functions (optional — required for password reset, email notifications, and AI chatbot)

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
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_api_key
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
