# I'M YOU · frontend

The app for patients and clinicians: TypeScript, React Native and Expo Router, one codebase for iOS, Android and web. What the project is and how the model works: see the [main README](../README.md).

## Backend

The app runs on **Supabase**. There is no separate server.

| Piece | What it does |
| --- | --- |
| **Auth** | Username or email logins. Clinicians sign up themselves; each patient's login is created by their clinician. |
| **Postgres** | `profiles`, `patients`, `sessions` (scores, counts and the model's joint-angle curves), `session_notes`, `exercise_clips`, `imu_pairings` |
| **Row-level security** | A patient sees only their own sessions; a clinician sees only their own patients. |
| **Realtime** | Pairs the second phone by QR code and keeps Start, Pause and Stop in step on both phones. |
| **Edge Function** | `create-account` makes ready-to-use logins without a confirmation email. |
| **Storage** | Demo clips for each movement. |

The schema lives in [`../supabase/migrations`](../supabase/migrations) and the function in [`../supabase/functions`](../supabase/functions).

The joint-angle model is served separately by the **live API** in [Movement-Tracking-Machine-Learning](https://github.com/Movement-Tracking-Team/Movement-Tracking-Machine-Learning). The phones stream sensor data to it over a WebSocket.

## Setup

```sh
cp .env.example .env
npm install          # also copies the MediaPipe pose runtime into public/
npx expo start --web
```

`.env` needs three values:

| Variable | Value |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard > Project Settings > API |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page. Never the secret key. |
| `EXPO_PUBLIC_LIVE_API_URL` | The live API: `ws://127.0.0.1:8000` locally, a `wss://` address once deployed (an HTTPS page can't open `ws://`) |

On Vercel, set the same three variables. They are built into the app, so redeploy after changing them.

## Native builds

```sh
npm run ios -- --device
npm run android -- --device
```

The pose camera uses native modules, so it needs a development build; Expo Go can't load it. Phone-sensor sessions run in Safari on the web build.

## Before you push

```sh
npx tsc --noEmit
```

Team rules (branches, migrations, shared files) are in [`../AGENTS.md`](../AGENTS.md).

## Layout

```text
app/                  screens (folder = route)
  (auth)/             login, role setup
  (patient)/          home, track flow, results
  (clinician)/        dashboard, patient detail
  pair/[code].tsx     second phone, opened from the QR code
src/
  components/         shared UI
  features/           auth, capture/cv (camera), capture/imu (phone sensors), care, results
  lib/supabase/       the single Supabase client
  types/              shared types
assets/
  placement-guides/   phone placement figures
  readme/             charts used in the main README
```
