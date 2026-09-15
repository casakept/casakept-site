import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetPasswordForm from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = {
  title: "Set Your Password",
};

// Landing point after an invite (or password recovery) email link signs
// the user in via OTP through /auth/confirm. They have a valid session at
// that point but no password yet -- this is where they set one.
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=" + encodeURIComponent("That link has expired. Ask an admin to resend it."));
  }

  return (
    <section className="section">
      <div className="wrap auth-wrap">
        <span className="eyebrow">Welcome</span>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>Set your password.</h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 26 }}>
          Choose a password to finish setting up your CasaKept account.
        </p>
        <div className="card" style={{ padding: 30 }}>
          <SetPasswordForm />
        </div>
      </div>
    </section>
  );
}
