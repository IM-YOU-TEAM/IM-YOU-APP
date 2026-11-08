# I'M U frontend

Expo Router + React Native + TypeScript. One codebase for iOS, Android and web.

## Run

```sh
npm install
npx expo start --web     # or: npx expo start, then open on a phone with Expo Go
npx tsc --noEmit         # type-check before pushing
```

## Where things live

- `app/` screens (folder = route): `(auth)` login/signup, `(patient)` home/track/results, `(clinician)` dashboard/patients
- `src/lib/theme.ts` design tokens: colors, radii, spacing, shadows, type scale, font, `WIDE` breakpoint
- `src/components/` shared UI (`Text`, `Card`, `PillButton`, charts, `Sidebar`, `BottomBar`, `ScreenContainer`...), exported from `index.ts`
- `src/lib/data.ts` app data, labels and lookup helpers
- `src/lib/format.ts` date/duration formatters
- `src/types/` shared types

No backend yet: there are no network calls, and login just routes by role.
`src/lib/data.ts` holds no synthetic records. Its collections stay empty until real data is connected.
