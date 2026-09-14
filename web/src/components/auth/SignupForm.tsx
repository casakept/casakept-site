"use client";

import { useActionState } from "react";
import { signUpAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function SignupForm({ next = "/account" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  if (state.message) {
    return <p className="form-msg success">{state.message}</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      {state.error && <p className="form-msg error">{state.error}</p>}
      <div className="field">
        <label htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" type="text" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="form-check">
        <input id="sms_opt_in" name="sms_opt_in" type="checkbox" />
        <label htmlFor="sms_opt_in">
          Text me booking reminders too (we&apos;ll always email you — SMS is
          optional).
        </label>
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
