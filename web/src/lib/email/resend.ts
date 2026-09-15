import { Resend } from "resend";

// Server-only Resend client. Never import from client code.
//
// Constructed lazily: Resend's constructor throws synchronously when no API
// key is present (even via its own env fallback), which would break Next's
// build-time module collection for any route that imports this module,
// before RESEND_API_KEY is ever configured in the environment.
let client: Resend | null = null;
export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const EMAIL_FROM = process.env.EMAIL_FROM ?? "CasaKept <notifications@casakept.com>";
