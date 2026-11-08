// Supabase auth errors carry a `code`; our database functions raise a short `message`.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "That username and password don't match. Check them and try again.",
  email_not_confirmed: 'Confirm your email first. The link is in your inbox.',
  user_already_exists: 'An account with this email already exists. Sign in instead.',
  email_exists: 'An account with this email already exists. Sign in instead.',
  login_taken: 'That username or email is already in use. Pick another one.',
  invalid_username: 'Usernames are 3 to 24 letters or numbers, and may use . _ or -.',
  invalid_email: 'Enter a valid email address.',
  full_name_required: 'Enter a name.',
  care_code_required: 'Enter the care code from your clinician.',
  not_authenticated: 'Your session ended. Sign in again.',
  weak_password: 'Choose a longer password, at least 6 characters.',
  over_email_send_rate_limit: 'Too many emails were sent. Wait a minute, then try again.',
  email_address_invalid: "We can't send email to that address. Use an email you can open.",
  email_address_not_authorized: "We can't send a confirmation email to that address yet. Use a different email, or ask your I'M YOU admin.",
  over_request_rate_limit: 'Too many attempts. Wait a minute, then try again.',
  signup_disabled: 'New accounts are paused right now.',
  invalid_code: "That care code doesn't match an open profile. Check it with your clinician.",
  already_linked: 'Your account is already linked to a clinician.',
  role_already_set: 'This account already has a role. Use a different account to switch.',
  clinicians_only: 'Only clinician accounts can create patient profiles.',
  patients_only: 'Only patient accounts can use a care code.',
};

const FALLBACK = 'Something went wrong. Check your connection and try again.';

export function friendlyError(error: unknown): string {
  if (typeof error !== 'object' || error === null) return FALLBACK;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === 'string' && MESSAGES[code]) return MESSAGES[code];
  if (typeof message === 'string') {
    if (MESSAGES[message]) return MESSAGES[message];
    if (message.includes('provider is not enabled')) return 'This sign-in option is not switched on yet. Use email for now.';
  }
  return FALLBACK;
}
