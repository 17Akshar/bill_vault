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


## Session 4 Update (2026-05-02)

### Dashboard Pixel-Perfect Redesign
Refactored existing dashboard screen to spec-exact dark finance UI without changing navigation or app structure.

**Spec theme tokens applied** (hard-coded, not from ThemeContext):
- bg `#08082A`, card `#12123A`, primary `#6C47FF`, gradient `#4B2FBF→#7B4FEF`
- success `#00C48C`, danger `#FF4D67`, info `#4D9EFF`
- text `#FFFFFF`, dim `#A0A3BD`
- 16px card radius, 50px pill radius

**Modified files**:
- `/app/frontend/app/(tabs)/dashboard.tsx` — fully rewritten with reusable atomic components: `MiniChart` (SVG sparkline), `SectionHeader`, `FilterPill`, `StatPill`, `QuickActionBtn`, `ListRow`. All 8 spec sections implemented:
  1. Header (avatar + name + greeting + bell + cog)
  2. Filter row (2 pill dropdowns)
  3. Net Worth gradient hero (label + info icon + amount + delta % + delta abs + sparkline + 3 inline stat pills)
  4. Quick Actions card (3 circular buttons)
  5. Accounts horizontal FlatList grouped into Bank/Cash & Wallets/UPI/Overdraft buckets
  6. Upcoming Reminders list with icon/title/due/amount/chevron
  7. Recent Transactions list with icon/title/sub/amount/date
  8. Financial Hub 6-tile grid
- `/app/frontend/app/(tabs)/_layout.tsx` — bottom tab bar restyled: dark `#12123A`, active purple `#6C47FF` pill, labels updated to **Dashboard / Transactions / Wealth / Insights / More**

**Data wiring preserved**:
- `loadAll()`, `useFocusEffect`, `useRootNavigationState` guard all retained
- `authLoading` guard added to prevent pre-mount `router.replace` race when navigating directly to `/(tabs)/dashboard` URL
- Widget-toggle gating preserved (`w('net_worth')`, `w('quick_actions')`, etc.)
- Family member filter still functional (now revealed as a chip strip when "All Members" pill is tapped)
- `useTheme()` import retained but not used in dashboard — file is intentionally hard-themed per design brief

**Iconography**: switched from Ionicons to MaterialCommunityIcons in dashboard per spec ("react-native-vector-icons/MaterialCommunityIcons" — available in this Expo project via `@expo/vector-icons/MaterialCommunityIcons`).

### Regression
- Backend: `balance_fix_test.py` still passes (income +5000 → 15000, expense -2000 → 13000, net-worth 13000)
- Frontend: dashboard renders end-to-end after single-user-mode login; all sections visible; bottom tab bar correctly styled


## Session 5 Update (2026-05-03)

### CRITICAL Latent Bug Fixed — Multi-Record Overwrite
**Root cause**: `firebase_config.py insert_one()` used `user_id` as the Firestore doc-id for collections that carry both `user_id` (foreign key) AND a per-record unique id (`income_id`, `expense_id`, `bill_id`, etc.). Every new insert overwrote the previous record for the same user.

**Impact (pre-fix)**: Income, expenses, bills, credit cards, loans, lending, investments, rentals, reminders, notes, family_members, recovery_attempts, recovery_logs — each collection silently kept **only the last record per user**. Previous test iterations passed by coincidence (tests create 1 record at a time).

**Fix** (`/app/backend/firebase_config.py`):
- Reordered doc-id preference list — per-record unique IDs first (`income_id`, `expense_id`, `bill_id`, `attempt_id`, `log_id`, …) and `user_id` last
- Added `SINGLE_USER_DOC_COLLECTIONS = {'users', 'user_settings', 'user_mpin'}` allowlist — for any other collection, if only `user_id` is present, doc-id is set to `None` so Firestore auto-generates a unique ID

### Dashboard Cross-Month Deltas
**Backend** (`/app/backend/server.py` /api/dashboard):
- Added prev-month window calculation (wraps Dec→Jan correctly)
- `_pct_delta()` helper handles edge cases (prev=0 → 100% if curr!=0 else 0; rounds to 1 decimal)
- 8 new response fields: `net_worth_delta_pct`, `net_worth_delta_abs`, `income_delta_pct`, `expense_delta_pct`, `savings_delta_pct`, `prev_month_income`, `prev_month_expenses`, `prev_month_savings`
- Net-worth delta is an APPROXIMATION (uses `current_balance - this_month_net_flow`) — accurate for flow-driven changes, ignores investment value changes. Documented in code comment.

**Frontend** (`/app/frontend/app/(tabs)/dashboard.tsx`):
- Consumes real deltas (fallback to 0 if API doesn't supply)
- Sign-aware arrow+color for Net Worth card + 3 stat pills:
  - Income: ▲ green when up, ▼ red when down
  - Expense: ▲ red when up (BAD), ▼ green when down (GOOD)
  - Savings: ▲ green when up, ▼ red when down
  - Net Worth: full-color deltas on both the % and absolute sub-texts

### Testing
- 14 new pytest in `/app/backend/tests/test_multirecord_and_deltas.py`
- Total: **82/82 backend tests pass** (14 new + 21 fintracker + 17 recovery + 30 MPIN)
- `balance_fix_test.py` still green
- Frontend dashboard screenshots verified

### New regression guardrails
- test_multirecord_and_deltas.py::TestMultiRecordPersistence asserts multiple records per user in 9 collections
- Any NEW top-level resource collection added in future MUST:
  1. Have a per-record unique ID field placed BEFORE `user_id` in `firebase_config.insert_one()`'s key preference list
  2. Be added to the test_multirecord_and_deltas.py suite
  3. NOT be added to SINGLE_USER_DOC_COLLECTIONS unless it legitimately stores one doc per user


## Session 6 Update (2026-05-03)

### Deploy-Verify (user-requested action)
Built `/app/deploy_verify_multirecord.py` — a live-backend smoke test that registers a fresh user on the **real Firebase project (bill-vault-a24ad)** and asserts 3 records persist correctly in each of `income`, `expenses`, `bills`, `reminders`, `family_members`. **Result: PASS.** The multi-record overwrite bug fix is confirmed working in the deployed Firebase environment.

### Net-Worth Snapshots System (NEW)
Long-term accurate delta tracking via point-in-time captures, not just flow approximation.

**Module** (`/app/backend/snapshots.py`, ~270 lines):
- `_compute_networth(user_id)`: aggregates assets (positive-balance accounts + investment current_value) and liabilities (|negative balances| + loan outstanding + CC outstanding)
- `_save_snapshot(user_id, type)`: persists to `net_worth_snapshots` collection
- `get_prev_month_snapshot(user_id, reference)`: returns most recent snapshot captured BEFORE the 1st of reference month
- Background scheduler (`asyncio.Task`, no new deps) starts in FastAPI lifespan — stagger 60s, tick hourly, captures missing daily + monthly snapshots per user

**Endpoints**:
- `POST /api/snapshots/capture` — manual fresh capture
- `GET /api/snapshots?type=daily|monthly|manual` — list (newest first)
- `GET /api/snapshots/last-month` — most recent prior-month snapshot

**Dashboard integration**:
- `/api/dashboard` now calls `get_prev_month_snapshot()` first. If one exists, uses real `net_worth - snapshot.net_worth` for `net_worth_delta_abs` and `basis='snapshot'`
- Falls back to flow-approximation (`net_flow = income - expenses`) when no snapshot history yet
- New response field: `net_worth_delta_basis: 'snapshot' | 'flow_approx'`

**Frontend** (`/app/frontend/app/(tabs)/dashboard.tsx`):
- Shows subtle `~est` pill next to the net-worth delta when basis is `flow_approx` so users know the first month's delta is estimated

**Hardening**:
- Added `snapshot_id` to `firebase_config.insert_one()` doc-id preference list for symmetry with other per-record IDs

### Testing
- **95/95 backend tests pass** (13 new snapshot + 14 multi-record + 21 fintracker + 30 MPIN + 17 recovery)
- Both smoke scripts pass: `balance_fix_test.py`, `deploy_verify_multirecord.py`
- Manual E2E verified snapshot-backed delta (injected prior-month snapshot of 50000 → dashboard returned delta_abs=-50000 / basis='snapshot')

### Next Action Items
- After ~31 days of scheduler running, every active user will have snapshot-backed deltas automatically. New users see `~est` for the first month, `snapshot` thereafter.
- **User should still test on physical iOS** for haptics + SF Pro font confirmation.

## Session 7 Update (2026-05-05)

### Income / Expense / Transfer Optional Fields + Attachments (Phase 1 Complete)
Wired the design-spec optional fields onto all 3 transaction forms with image attachment support.

**Backend** (NEW):
- `/app/backend/uploads.py` (~145 lines):
  - `POST /api/uploads/attachment` — multipart file upload, allowlist (jpeg/png/webp/heic/heif), 10 MB cap. Tries Firebase Storage first; on failure falls back to local disk under `/app/backend/uploads_data/` and returns a relative `/api/uploads/files/<path>` URL.
  - `GET /api/uploads/files/{path}` — serves locally-stored files with directory-traversal guard.
  - `GET /api/labels` — distinct labels previously used by the user across `income`+`expenses`+`transfers` (chip-suggestion source).
- `firebase_config.py` — initializes Firebase with `storageBucket` env var; new `get_storage_bucket()` helper.

**Storage Status**: Firebase Storage bucket `bill-vault-a24ad.firebasestorage.app` is **not yet provisioned** by user. Local-disk fallback is active and verified working end-to-end (upload → URL → image renders). When user enables Storage in Firebase Console, code switches to `storage='firebase'` automatically — no code change needed.

**Frontend** (NEW components + wiring):
- `/app/frontend/components/LabelsInput.tsx` — chip input: type + Enter/comma/space adds chip, X removes, suggestion row pulled from `/api/labels`. Cap 12 labels × 24 chars.
- `/app/frontend/components/AttachmentPicker.tsx` — Camera/Gallery picker buttons; on success shows 56×56 thumb + remove button.
- `/app/frontend/utils/uploadAttachment.ts` — `pickImageFromGallery|Camera()` + `uploadAttachment(asset)` (handles RN vs web FormData), plus `absolutizeUrl()` for the relative-URL fallback.
- `/app/frontend/app/transactions/add.tsx` — added Payee (expense+transfer), Labels (all), Location (all), Attachment (all). Payment Type now also shown for transfer per spec.
- All fields piped into create payloads for `/api/income`, `/api/expenses`, `/api/transfers`.

### Testing
- 9 new pytest in `/app/backend/tests/test_uploads_and_labels.py` — **9/9 PASS** in 59s
  - Upload happy path + local-served bytes round-trip
  - Reject non-image (400), empty (400), >10MB (413)
  - `/api/labels` reflects recent labels
  - Transfer with all 5 optional fields round-trips + balance side-effects preserved
  - 3 backward-compat tests (income/expense/transfer without new fields)
- Frontend smoke verified via screenshot: payee+labels+location+attachment fields render on the correct transaction types
- Curl E2E verified: upload PNG → expense saved with `attachment_url` → `/api/labels` returns the new labels

### Known Limitations
- Firebase Storage bucket not provisioned → using local-disk fallback (ephemeral on container restart). Recommend user enables Firebase Storage at https://console.firebase.google.com/project/bill-vault-a24ad/storage
- Full 118-test regression hit Firestore daily-read quota (`RESOURCE_EXHAUSTED`) — environment limit, not code regression. New tests pass in isolation.

### Outstanding from User's Latest Spec (Phase 2 — NOT YET IMPLEMENTED)
User provided 5 UI screens for **Add Account** redesign covering Bank / Cash / UPI / Overdraft account types, plus a new **Accounts overview** screen with Total Balance / In Accounts / In Liabilities. This is the next big block of work. Account model needs new fields:
- Bank: `account_holder_name`, `account_number`, `ifsc_code`, `bank_name`, `branch_name`, `account_type` (sub-type), `opening_balance`, `account_color`
- Cash: `name`, `currency`, `initial_balance`, `cash_location`, `include_in_net_worth`, `notes`
- UPI: `name`, `account_type`, `bank_name`, `upi_id`, `linked_app`, `upi_status`, `is_primary`, `vpa`
- Overdraft: `name`, `account_type`, `bank_name`, `overdraft_limit`, `interest_rate`, `currently_used`, `available_overdraft` (DERIVED), `start_date`, `end_date`, `charges`

Net-worth math must treat overdraft `currently_used` as a liability.

