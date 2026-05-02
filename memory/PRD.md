# Fintracker – Personal Finance & Wealth Management Application

## Original Problem Statement
Transition the fully-built "Bill Tracker" app into a Production-Ready Personal Finance & Wealth Management Application named **Fintracker**, featuring offline-first + cloud-sync architecture, customizable dashboard, unified accounts (individual/joint/business), financial hub with auto-calculated ROI/CAGR/XIRR, notes with subheadings, global calendar, and enhanced auth (MPIN, Mobile+OTP, Gmail OAuth).

## Tech Stack
- **Frontend**: Expo (React Native web + mobile), expo-router, TypeScript
- **Backend**: FastAPI (Python), monolithic `server.py`
- **Database**: Google Firebase Firestore (via custom MongoDB-compatible wrapper in `firebase_config.py`)
- **Auth**: JWT + Firebase Auth (email/password, phone, Google OAuth)

## Architecture Tasks Done
- MongoDB → Firebase Firestore migration via MongoDB-compatible wrapper (`firebase_config.py`) — preserves all existing endpoints without rewrites
- Custom CrossPlatformPicker for date/time selection across web/iOS/Android
- Family Member system for multi-person household finances
- Dashboard widget toggle settings persisted in `/api/settings`
- Note categorization via headings (`/api/note-headings` + `/api/notes`)

## User Personas
1. **Solo user** — single-user-mode, no auth, all data on one device
2. **Family manager** — tracks transactions for self + spouse + children via Family Member picker
3. **Investor** — tracks stocks/MFs/FDs/gold/crypto with ROI/CAGR calculations
4. **Credit tracker** — manages credit cards, EMIs, loans, lending

## Core Requirements (Static)
- Offline-first local DB with cloud sync
- Unified accounts: Bank (Saving/Current/Other), Cash, UPI, Credit Card with Individual/Joint/Business ownership
- Transactions with category + sub-category + family member + payment type
- Bills with recurring support + summary (overdue/upcoming/paid)
- Investment portfolio with ROI/CAGR/XIRR
- Credit cards with limit tracking + outstanding report
- Loans + Lending + Rentals
- Budgets with progress tracking
- Reminders + Global Calendar
- Notes with heading-based folders
- Customizable dashboard widgets
- MPIN + Mobile OTP + Gmail OAuth

## What's Been Implemented
- **Phase 1 UI Overhaul** (Landing, Profile, Hub, Dashboard) — DONE
- **Unified Accounts** (ownership type, institution, bank sub-types) — DONE
- **MPIN Authentication** (backend + UI) — DONE
- **Calendar System** module — DONE
- **Notes Engine** with heading-based categorization — DONE
- **Portfolio Analytics** (ROI/CAGR) — DONE
- **Dashboard Widget Toggle** settings — DONE
- **CrossPlatformPicker** for dates/times — DONE
- **Family Member** integration (filter chips + "For whom?" picker) — DONE
- **MongoDB → Firebase Firestore** migration (via wrapper) — DONE

## Work Done This Session (2026-05-02)
### Critical Bug Fixes
1. **Firestore wrapper `$inc` + `$set` operator fix** (`/app/backend/firebase_config.py`)
   - Root cause: `elif` branch silently dropped `$inc` when both operators were sent together
   - Impact: ALL balance updates on income/expense create/update/delete silently failed
   - Fix: Independent `if` blocks so `$set` and `$inc` both apply cumulatively
   - Verified: Income +5000 → balance 15000 ✅ | Expense -2000 → balance 13000 ✅
   - Backend regression: 21/21 tests pass

2. **Frontend focus-refresh bug** (`/app/frontend/app/(tabs)/*.tsx`)
   - Root cause: Dashboard/Accounts/Transactions/Bills tabs never re-fetched data on focus return → backend updates never reflected in UI
   - Fix: Added `useFocusEffect(useCallback(loadAll))` to all 4 tab screens + analytics
   - Also added `useRootNavigationState()?.key` guard to prevent pre-mount `router.replace()` race

3. **router.back() fallback** in transactions/add.tsx and accounts/add.tsx
   - Uses `router.canGoBack()` → `router.back()` else `router.replace('/(tabs)/...')`

4. **Runtime page title** — set via `document.title` in `_layout.tsx` useEffect (web)

### Testing
- Backend: 21/21 pytest pass (`/app/backend/tests/test_fintracker_api.py`)
- Frontend: Critical refresh bug verified fixed (iteration 3 report)

## Prioritized Backlog
### P0 (Critical, not yet done)
- **Offline-First Architecture**: Integrate local SQLite/WatermelonDB + sync queue layer
- **Mobile + OTP Auth**: Enable Firebase Phone Auth flow in UI
- **Gmail OAuth**: Wire Google sign-in via Firebase Auth

### P1 (Important)
- **Backend Modularization**: Safely move endpoints from 4000-line `server.py` to `/app/backend/routers/*.py` (files exist, dormant)
- **Cloud Sync**: Google Drive + OneDrive manual/auto-sync toggles
- **XIRR calculation** (currently only ROI/CAGR)

### P2 (Nice to have)
- Data-testid on all chips/buttons for automation
- Fix stray `.` text-node React warning in transactions/add.tsx
- Rename "Home" tab to "Dashboard" in `(tabs)/_layout.tsx`
- Empty-state "Add a family member" hint in FamilyMemberPicker

## Next Tasks (in priority order)
1. P0: Offline-first (SQLite + sync queue) OR Mobile+OTP + Gmail OAuth (user's choice)
2. P1: Backend modularization (move monolith endpoints into routers/)
3. P2: Cosmetic polish items above

## Known Issues / Mocked Integrations
- None mocked. Live Firebase Firestore connected (project: `bill-vault-a24ad`).
- Firestore wrapper uses client-side filtering to avoid composite index requirements — acceptable for per-user personal finance data volumes but not web-scale.

## Files of Reference
- `/app/backend/firebase_config.py` — MongoDB-compatible Firestore wrapper (✅ `$inc`+`$set` fix applied)
- `/app/backend/server.py` — 4000-line FastAPI monolith (to be modularized)
- `/app/backend/routers/` — dormant router modules (not wired yet)
- `/app/frontend/app/(tabs)/*.tsx` — all tabs now use useFocusEffect + navState guard
- `/app/frontend/components/CrossPlatformPicker.tsx` — unified date/time picker
- `/app/frontend/components/FamilyMemberSelector.tsx` — family filter + picker
- `/app/memory/test_credentials.md` — test users + Firebase project info

## Session 2 Update (2026-05-02)

### Account Recovery System Implemented
Secure, rate-limited recovery flows using Firebase Auth + Firestore.

**Backend** (`/app/backend/recovery.py` — 418 lines):
- `POST /api/recovery/status` — rate-limit status for an identifier
- `POST /api/recovery/password/email` — rate-limited email password reset (no-enumeration)
- `POST /api/recovery/password/phone/verify` — reset password after Firebase Phone OTP
- `POST /api/recovery/email/reveal` — reveal masked emails after Phone OTP verification
- Rate limiting: Firestore `recovery_attempts` — 5 attempts / 15-min window → 30-min block
- Audit logging: Firestore `recovery_logs` (identifier hash only, first-char preview)
- Password strength: min 8 chars + 1 uppercase + 1 digit
- Email masking: `j***n@gmail.com` / `a***@x.com` for short locals
- Firebase Auth password sync for users with `firebase_uid`

**Frontend** (Expo):
- `/app/frontend/app/auth/forgot-password.tsx` — Email/Phone toggle with 3-step flow
- `/app/frontend/app/auth/forgot-email.tsx` — Phone → masked email reveal
- `/app/frontend/app/auth/login.tsx` — Forgot password/email links added
- `/app/frontend/utils/firebasePhoneAuth.ts` — RecaptchaVerifier + signInWithPhoneNumber helper
- `/app/frontend/utils/firebase.ts` — sendPasswordResetEmail export
- Invisible reCAPTCHA v2 on web for Phone OTP

**Security** (`/app/firestore.rules`):
- Deploy-ready rules — ALL client access denied; backend Admin SDK only
- Especially locks down `users`, `recovery_attempts`, `recovery_logs`

### Testing
- 17 new recovery tests + 21 regression = 38/38 backend pass
- Frontend UI verified via screenshot: login links visible, Reset Password page renders, Email/Phone toggle works
- Balance update regression: still passing (income +5000 → 15000, expense -2000 → 13000)

### Known Limitations
- Phone OTP recovery works on **web only** (Firebase JS SDK requires reCAPTCHA + DOM). Mobile Expo requires native Firebase module (future work).
- Frontend dual-call pattern: email forgot password calls BOTH `/api/recovery/password/email` (rate-limit + log) AND Firebase Web SDK `sendPasswordResetEmail` (actual email delivery via Firebase).

### Firestore Rules Deployment
User must run `firebase deploy --only firestore:rules` from project root after first-time setup. Not deployed automatically.


## Session 3 Update (2026-05-02)

### MPIN Quick-Login System Enhanced
Post-login MPIN setup prompt, weak-MPIN rejection, 4/6-digit choice, brute-force protection.

**Backend** (`/app/backend/server.py`):
- `POST /api/mpin/setup` — now rejects weak MPINs (1111/1234/4321/1212/common list) and persists `pin_length`
- `POST /api/mpin/verify` — bcrypt check + 5-attempt brute-force counter → 15-min lockout (429)
- `POST /api/mpin/dismiss-prompt` — persists "don't ask again" in user_settings
- `GET /api/mpin/status` — returns `{is_enabled, pin_length, prompt_dismissed}`
- `POST /api/mpin/disable` — unchanged
- `_is_weak_mpin()` helper rejects: all-same-digit, ascending/descending sequences, repeating pairs, and a COMMON_WEAK set
- Rate limiter shares Firestore `recovery_attempts` collection via `mpin_<user_id>` key

**Frontend**:
- `/app/frontend/app/auth/mpin-setup-prompt.tsx` — NEW post-login prompt with Set-up/Skip/Don't-ask-again
- `/app/frontend/app/security/mpin.tsx` — REWRITTEN with length picker (4/6), client-side weak check, step machine, disable flow
- `/app/frontend/utils/mpinPolicy.ts` — NEW client-side `isWeakMpin()` (mirrors backend)
- `/app/frontend/utils/postLoginRoute.ts` — NEW `routeAfterLogin()` helper that decides MPIN prompt vs dashboard
- `/app/frontend/app/auth/login.tsx` + `register.tsx` — use `routeAfterLogin()` instead of hardcoded dashboard redirect
- `/app/frontend/app/_layout.tsx` — registered new route

**Fixed side-effect**: Updated `/app/frontend/metro.config.js` with `resolver.blockList` to exclude `node_modules/*/android|ios|windows|macos` from Metro's file watcher — resolved a persistent ENOSPC inotify crash at startup.

### Testing
- 30 new MPIN pytest + 21 fintracker + 17 recovery = **68/68 backend pass**
- Frontend UI verified via screenshot — post-login prompt + 6-digit keypad + length picker all render correctly
- Manual rate-limit verification: 5 wrong attempts → 6th gets 429 block

