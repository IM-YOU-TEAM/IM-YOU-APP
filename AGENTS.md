# AGENTS.md

Read this before making changes. It applies to humans and AI agents.

## Tech stack

- **Language:** TypeScript only (`strict`). No `.js` source files, no `any` without a comment explaining why.
- **Frontend:** React Native + Expo Router, one codebase for iOS, Android, and web (`frontend/`).
- **Backend:** Supabase only (Auth, Postgres, Storage, Edge Functions). No separate Node/Express server. No other external APIs.
- **Motion capture:** phone camera (computer vision) or phone IMU (accelerometer/gyroscope), chosen by the patient per session.
- **ML model:** lives in the separate `Movement-Tracking-Machine-Learning` repo. Do not add models, datasets, or training code here.
- **Hosting:** web build deployed on Vercel.
- **Package manager:** npm. Do not use yarn, pnpm, or bun.
- **Design:** Apple-style, bubbly, glossy, fresh health look. For UI refinement use the project skill in `.claude/skills/impeccable/`, which holds the design brief.

## Structure

```
frontend/
  app/                  screens (Expo Router: folder = route)
    (auth)/             login, signup
    (patient)/          home, track/{motion-type, method, placement-guide, session}, results
    (clinician)/        dashboard, patients/[patientId]
  src/
    components/         shared UI
    features/           auth, capture/{cv, imu}, results
    lib/supabase/       the single Supabase client
    types/              shared types
  assets/placement-guides/
supabase/
  migrations/           SQL schema changes
  functions/            Edge Functions (TypeScript)
```

Do not add top-level folders or new dependencies without the team agreeing first.

## Guardrails (to avoid merge conflicts)

1. **Never commit directly to `main`.** Create a branch per task: `<your-name>/<short-task>`, e.g. `alex/login-screen`.
2. **Sync before you start and before you open a PR:** `git pull --rebase origin main`.
3. **One task per PR.** Keep PRs small and limited to the folders that task needs.
4. **Stay in your lane.** Don't rename, move, or reformat files you aren't changing.
5. **Shared files need a heads-up:** `src/lib/supabase/`, `src/types/`, `package.json`, and app config. Tell the team before editing them.
6. **Lockfile:** never hand-edit `package-lock.json`. On a conflict, take `main`'s version and run `npm install`.
7. **Migrations:** add a new timestamped file (`supabase migration new <name>`). Never edit a migration that is already on `main`.
8. **Never force-push `main`** and never rewrite history others have pulled.
9. **No secrets in git.** Keys go in `.env` (git-ignored). Only the Supabase anon/publishable key may appear in frontend code.
10. **No generated or junk files:** `node_modules/`, build output, `.DS_Store`, datasets.
11. **Before pushing:** the app type-checks (`npx tsc --noEmit`) and runs.
