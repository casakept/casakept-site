import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ForgotPasswordPage() {
  return (
    <section className="section">
      <div className="wrap auth-wrap">
        <span className="eyebrow">Members</span>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>Reset your password.</h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 26 }}>
          Enter the email on your account and we&apos;ll send you a link to choose a new password.
        </p>
        <div className="card" style={{ padding: 30 }}>
          <ForgotPasswordForm />
        </div>
        <p className="auth-switch">
          <Link href="/login">Back to log in</Link>
        </p>
      </div>
    </section>
  );
}
