# Movement Tracking

## natHacks 2026

Movement Tracking helps clinicians measure rehabilitation progress without
requiring patients to travel to a lab or clinic for every assessment.

Joint-angle measurement and movement tracking are usually collected during
in-person appointments. Between visits, clinicians have limited objective data
about how a patient is progressing. We asked: **what if the measurement could
happen at home, on a device the patient already owns?**

Our product lets a patient record a movement on their phone. The app captures
motion-sensor data, sends it to a machine-learning model, and returns predicted
knee, ankle, and hip joint angles to the clinician's dashboard.

## How it works

1. A patient opens the web app on their phone and starts a movement session.
2. Safari captures the phone's IMU data, including accelerometer and
   gyroscope readings, without requiring an app installation.
3. The web app sends the recorded data through an API to our model.
4. The model predicts knee, ankle, and hip joint angles.
5. The results are returned to the clinician's dashboard for reviewing progress
   over time.

## How we built it

We developed two parallel parts:

### Web app

- TypeScript with React Native and Expo Router
- One codebase for iOS, Android, and web
- Supabase for the application backend
- Safari device-motion access for browser-based IMU capture
- Patient recording flows and clinician dashboard views
- Agentic development to rapidly build and iterate on the frontend

### Machine-learning model

- Python model trained in a local environment
- Transformer-based approach informed by the research cited below
- Local virtual machine deployment
- Tailscale for secure access from the web app
- API connecting captured motion data to model predictions

The machine-learning model is developed in a separate
`Movement-Tracking-Machine-Learning` repository.

## Run the frontend locally

See [`frontend/README.md`](frontend/README.md) for the full setup guide.

```sh
cd frontend
npm install
npx expo start --web
```

## Prototype note

This project is a hackathon prototype. Its measurements and movement checks
are not clinically validated and must not be used as a diagnosis or as a
pass/fail rehabilitation result.

## Credits and research

- **Dataset:** [Open-source biomechanics dataset](https://www.epic.gatech.edu/opensource-biomechanics-camargo-et-al/)
- **Research and transformer model inspiration:** [Sensors paper](https://www.mdpi.com/1424-8220/23/13/5778)
