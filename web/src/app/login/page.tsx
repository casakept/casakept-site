import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your CasaKept account to book and manage visits.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/account";
  const initialError = typeof params.error === "string" ? params.error : undefined;

  return (
    <section className="section">
      <div className="wrap auth-wrap">
        <span className="eyebrow">Members</span>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>Welcome back.</h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 26 }}>
          Log in to book a visit, manage your membership, or update your
          properties.
        </p>
        <div className="card" style={{ padding: 30 }}>
          <LoginForm next={next} initialError={initialError} />
        </div>
        <p className="auth-switch">
          New to CasaKept? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link>
        </p>
      </div>
    </section>
  );
}
