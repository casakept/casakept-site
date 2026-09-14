import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Create a CasaKept account to book cleaning, laundry, groceries, meals, and errands across the Dallas–Fort Worth metroplex.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/account";

  return (
    <section className="section">
      <div className="wrap auth-wrap">
        <span className="eyebrow">Get started</span>
        <h1 style={{ fontSize: "clamp(30px,4vw,42px)" }}>
          Let&apos;s get your home handled.
        </h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 26 }}>
          Create an account to book a visit, join a membership, and manage
          everything in one place.
        </p>
        <div className="card" style={{ padding: 30 }}>
          <SignupForm next={next} />
        </div>
        <p className="auth-switch">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link>
        </p>
      </div>
    </section>
  );
}
