"use client";

import { useActionState } from "react";
import { setPasswordAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);

  return (
    <form action={formAction}>
      {state.error && <p className="form-msg error">{state.error}</p>}
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="field">
        <label htmlFor="confirm_password">Confirm password</label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
