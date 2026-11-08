// App data. No synthetic data: these collections start empty and get filled
// from the real backend (Supabase) later. Screens must handle the empty state.
import type {
  CaptureMethod,
  Clinician,
  Feedback,
  IconName,
  Labels,
  MotionType,
  Patient,
  Session,
} from "@/types";

export const patients: Patient[] = [];
export const sessions: Session[] = [];
export const feedback: Feedback[] = [];

/** The signed-in clinician, once auth exists. */
export const clinician: Clinician | null = null;

/** Today's date as "YYYY-MM-DD" (local time). */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Labels and icons ----------
export const MOTION_LABELS: Labels<MotionType> = {
  walking: "Walking",
  running: "Running",
  stairs: "Stairs",
  sitToStand: "Sit-to-stand",
};

export const METHOD_LABELS: Labels<CaptureMethod> = {
  cv: "Camera",
  imu: "Phone sensors",
};

export const MOTION_ICONS: Record<MotionType, IconName> = {
  walking: "walk",
  running: "speedometer",
  stairs: "trending-up",
  sitToStand: "repeat",
};

export const METHOD_ICONS: Record<CaptureMethod, IconName> = {
  cv: "camera",
  imu: "phone-portrait",
};

// ---------- Helpers ----------
export function getPatient(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}

export function getSession(id: string): Session | undefined {
  return sessions.find((x) => x.id === id);
}

/** A patient's sessions, oldest first. */
export function sessionsFor(patientId: string): Session[] {
  return sessions
    .filter((x) => x.patientId === patientId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latestSession(patientId: string): Session | undefined {
  return sessionsFor(patientId).at(-1);
}

export function feedbackFor(sessionId: string): Feedback[] {
  return feedback.filter((f) => f.sessionId === sessionId);
}
