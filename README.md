# PennyWise 2.0

A mobile-first personal finance app built with React Native and Expo. PennyWise helps users track expenses, manage budgets, monitor income, and visualize spending habits — all backed by a real-time cloud database.

---

## Features

- **Authentication** — Sign up, log in, and password reset via Supabase Auth
- **Dashboard** — Balance overview, savings goals, and recent transactions
- **Analytics** — Income and spending visualizations by period
- **Budget Management** — Expense categories with budget limits and tracking
- **Transaction History** — Unified income/expense log with recurring support
- **Profile & Settings** — Avatar, personal info, dark mode toggle
- **Dark Mode** — Full light/dark theme via custom `AppTheme` context

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) ~54 (SDK 54) |
| Language | TypeScript ~5.9 |
| UI | React Native 0.81.5 |
| Routing | [expo-router](https://expo.github.io/router) v6 (file-based) |
| Navigation | React Navigation (Bottom Tabs + Stack) |
| Icons | @expo/vector-icons (Ionicons) |
| Fonts | Google Fonts — Kumbh Sans, League Spartan |
| Backend / DB | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Session Storage | @react-native-async-storage/async-storage |
| Animations | react-native-reanimated |

---

## Project Structure

```
PennyWise-2.0/
├── PennyWise/                  # Main application
│   ├── app/
│   │   ├── _layout.tsx         # Root stack layout + auth listener
│   │   ├── index.tsx           # Splash screen
│   │   ├── login-form.tsx      # Login screen
│   │   ├── create-account.tsx  # Registration screen
│   │   ├── forgot-password.tsx # Password reset screen
│   │   └── (tabs)/
│   │       ├── _layout.tsx     # Bottom tab bar (5 tabs)
│   │       ├── index.tsx       # Home dashboard
│   │       ├── analytics.tsx   # Analytics & charts
│   │       ├── budget.tsx      # Budget tracking
│   │       ├── transaction.tsx # Transaction history
│   │       └── profile.tsx     # Profile & settings
│   ├── components/             # Reusable UI components
│   ├── constants/              # Colors, fonts, theme tokens
│   ├── contexts/               # AppTheme provider (light/dark)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   └── supabase.ts         # Supabase client
│   └── database/
│       └── schema.sql          # Full PostgreSQL schema
```

---

## Database Schema

The Supabase database contains the following tables:

- **profiles** — User profile data linked to `auth.users`
- **transactions** — Unified income/expense records with recurring support
- **expense_categories** — User-defined expense budget categories
- **expenses** — Individual expense entries
- **income_categories** — Income source categories
- **income_sources** — Individual income entries
- **savings_goals** — Savings targets shown on the home dashboard

See `PennyWise/database/schema.sql` for the full schema.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- [npm](https://npmjs.com) or [yarn](https://yarnpkg.com)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [Expo Go](https://expo.dev/go) app on your mobile device (for physical device testing)
- A [Supabase](https://supabase.com) project with the schema applied

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

Create a `.env.local` file inside the `PennyWise/` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project under **Settings → API**.

### 4. Apply the database schema

In your Supabase project, open the **SQL Editor** and run the contents of:

```
PennyWise/database/schema.sql
```

### 5. Start the development server

```bash
npm start
```

This opens the Expo Metro bundler. From there you can:

| Command | Platform |
|---|---|
| Press `a` | Android emulator |
| Press `i` | iOS simulator (macOS only) |
| Press `w` | Web browser |
| Scan QR code | Expo Go on physical device |

Or run directly:

```bash
npm run android   # Android
npm run ios       # iOS (macOS only)
npm run web       # Web browser
```

---

## Navigation Flow

```
Splash Screen (app/index.tsx)
    └── auto-redirect after 2.5s
         └── Login Screen (login-form.tsx)
              ├── Create Account (create-account.tsx)
              ├── Forgot Password (forgot-password.tsx)
              └── On sign-in → Home Dashboard (tabs/index.tsx)
                   └── Bottom Tabs
                        ├── Home
                        ├── Analytics
                        ├── Budget
                        ├── Transactions
                        └── Profile
```

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

---

## License

This project is for academic and personal use.
