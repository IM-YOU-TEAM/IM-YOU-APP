# Movement Tracking

## natHacks 2026

Movement Tracking is a web app that helps clinicians measure rehabilitation
progress without requiring patients to travel to a lab or clinic for every
assessment.

Joint-angle measurement and movement tracking are usually collected during
in-person appointments. Between visits, clinicians have limited objective data
about how a patient is progressing. We asked: **what if the measurement could
happen at home, on a device the patient already owns?**

Our product lets a patient record a movement on their phone. The app captures
motion-sensor data, sends it to a machine-learning model, and returns predicted
knee, ankle, and hip joint angles to the clinician's dashboard.

## How it works

1. A patient opens the web app on their phone and starts a movement session.
2. The browser captures the phone's IMU data, including accelerometer and
   gyroscope readings. Safari support lets patients record directly from their
   browser without installing an app.
3. The web app sends the recorded data through an API to our model.
4. The model predicts joint angles for the movement.
5. The results are returned to the app and made available in the clinician
   dashboard for reviewing progress over time.

## How we built it

We developed two parallel parts:

### Web app

- TypeScript with React Native and Expo Router
- A shared codebase for iOS, Android, and web
- Supabase for the application backend
- Safari device-motion access for browser-based IMU capture
- Clinician and patient flows, including movement selection, recording,
  guidance, results, and dashboard views

We used agentic development to build and iterate on the frontend quickly while
keeping the app organized around reusable components and shared types.

### Machine-learning model

- Python model trained in a local environment
- Transformer-based approach informed by the research cited below
- Local virtual machine deployment
- Tailscale used to make the model securely reachable from the web app
- API connecting the web app's captured motion data to model predictions

## Project structure

```text
frontend/
  app/                  Expo Router screens
    (auth)/             Login and signup
    (patient)/          Patient home, tracking, and results
    (clinician)/        Clinician dashboard and patient views
  src/
    components/         Shared UI components
    features/           Authentication, capture, and results
    lib/supabase/       Supabase client
    types/              Shared TypeScript types
  assets/placement-guides/
supabase/
  migrations/           Database migrations
  functions/            Supabase Edge Functions
```

The machine-learning model is developed in a separate
`Movement-Tracking-Machine-Learning` repository.

## Run the frontend locally

```sh
npm install
npx expo start --web
npx tsc --noEmit
```

For native development:

```sh
npm run ios -- --device
npm run android -- --device
```

The phone camera and motion-capture features require a development build;
Expo Go cannot load the pose camera's native modules.

## Important prototype note

This project is a hackathon prototype. Its measurements and movement checks
are not clinically validated and must not be used as a diagnosis or as a
pass/fail rehabilitation result.

## Credits and research

- **Dataset:** [Open-source biomechanics dataset](https://www.epic.gatech.edu/opensource-biomechanics-camargo-et-al/)
- **Research and transformer model inspiration:** [Sensors paper: Deep Learning for Human Motion Analysis](https://www.mdpi.com/1424-8220/23/13/5778)
