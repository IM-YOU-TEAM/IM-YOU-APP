// Creates ready-to-use logins, so nobody waits on a confirmation email.
//   { kind: 'clinician', login, password, displayName }  public: a doctor or researcher signs up.
//   { kind: 'patient', login, password, fullName }       a signed-in clinician adds one of their patients.
// `login` is a username or an email. Usernames sign in as `<username>@users.imu.app`, which never receives mail.
import { createClient } from 'npm:@supabase/supabase-js@2';

const USERNAME_DOMAIN = 'users.imu.app';
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Body =
  | { kind: 'clinician'; login: string; password: string; displayName: string }
  | { kind: 'patient'; login: string; password: string; fullName: string };

class Refusal extends Error {
  constructor(readonly code: string, readonly status = 400) {
    super(code);
  }
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function authEmail(login: string): string {
  const value = login.trim().toLowerCase();
  if (value.includes('@')) {
    if (!EMAIL.test(value)) throw new Refusal('invalid_email');
    if (value.endsWith(`@${USERNAME_DOMAIN}`)) throw new Refusal('invalid_email');
    return value;
  }
  if (!USERNAME.test(value)) throw new Refusal('invalid_username');
  return `${value}@${USERNAME_DOMAIN}`;
}

function requiredName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 1 || name.length > 80) throw new Refusal('full_name_required');
  return name;
}

async function callerClinicianId(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Refusal('not_authenticated', 401);
  const { data: profile } = await admin.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'clinician') throw new Refusal('clinicians_only', 403);
  return data.user.id;
}

async function createLogin(email: string, password: string, role: 'clinician' | 'patient'): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists') throw new Refusal('login_taken', 409);
    if (error.code === 'weak_password') throw new Refusal('weak_password');
    throw error;
  }
  return data.user.id;
}

async function handle(req: Request): Promise<Response> {
  const body = (await req.json()) as Partial<Body>;
  if (typeof body.login !== 'string' || typeof body.password !== 'string') throw new Refusal('invalid_request');
  if (body.password.length < MIN_PASSWORD) throw new Refusal('weak_password');
  const email = authEmail(body.login);

  switch (body.kind) {
    case 'clinician': {
      const displayName = requiredName(body.displayName);
      const userId = await createLogin(email, body.password, 'clinician');
      const { error } = await admin.from('profiles').update({ role: 'clinician', display_name: displayName }).eq('id', userId);
      if (error) {
        await admin.auth.admin.deleteUser(userId);
        throw error;
      }
      return reply(200, { userId });
    }
    case 'patient': {
      const clinicianId = await callerClinicianId(req);
      const fullName = requiredName(body.fullName);
      const userId = await createLogin(email, body.password, 'patient');
      const { data, error } = await admin.rpc('provision_patient_account', {
        p_user_id: userId,
        p_clinician_id: clinicianId,
        p_full_name: fullName,
      });
      if (error) {
        await admin.auth.admin.deleteUser(userId);
        throw error;
      }
      return reply(200, { userId, patientId: data.id });
    }
    default:
      throw new Refusal('invalid_request');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { code: 'invalid_request' });
  try {
    return await handle(req);
  } catch (error) {
    if (error instanceof Refusal) return reply(error.status, { code: error.code });
    console.error(error);
    return reply(500, { code: 'server_error' });
  }
});
