"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const error = state.error ?? initialError;

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      {error && <p className="form-msg error">{error}</p>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <p style={{ textAlign: "right", marginTop: -10, marginBottom: 18 }}>
        <Link href="/forgot-password" style={{ fontSize: 13 }}>
          Forgot password?
        </Link>
      </p>
      <button className="btn" type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
