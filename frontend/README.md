# I'M U frontend

Expo Router + React Native + TypeScript. One codebase for iOS, Android and web.

## Run

```sh
npm install              # also copies the pose runtime into public/mediapipe
npx expo start --web     # camera tracking runs in the browser
npx expo run:ios         # or run:android. Expo Go cannot load the pose camera
npx tsc --noEmit         # type-check before pushing
```

## Where things live

- `app/` screens (folder = route): `(auth)` login/signup, `(patient)` home/track/results, `(clinician)` dashboard/patients
- `src/lib/theme.ts` design tokens: colors, radii, spacing, shadows, type scale, font, `WIDE` breakpoint
- `src/components/` shared UI (`Text`, `Card`, `PillButton`, charts, `TopBar`, `Sidebar`, `BottomBar`, `ScreenContainer`...), exported from `index.ts`
- `src/lib/data.ts` app data, labels and lookup helpers
- `src/lib/format.ts` date/duration formatters
- `src/types/` shared types

No backend yet: login just routes by role. A camera session's numbers stay in memory until you reload.
`src/lib/data.ts` holds no synthetic records. Its collections stay empty until a session is recorded or real data is connected.
