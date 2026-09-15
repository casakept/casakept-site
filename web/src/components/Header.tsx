"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOutAction } from "@/lib/actions/auth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Memberships" },
  { href: "/cocina", label: "Cocina" },
];

type Role = "customer" | "staff" | "admin";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; role: Role };

const PORTAL: Record<Role, { href: string; label: string }> = {
  customer: { href: "/account", label: "My account" },
  staff: { href: "/staff", label: "Staff portal" },
  admin: { href: "/admin", label: "Admin dashboard" },
};

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const isCocina = pathname === "/cocina";

  // The header persists across client-side navigations (it lives in the
  // root layout), so this can't just run once and read whatever was true on
  // first mount -- it needs onAuthStateChange too, to pick up sign-in/
  // sign-out that happens without a full page reload.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadUser(userId: string | undefined) {
      if (!userId) {
        if (active) setAuth({ status: "signed-out" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (active) {
        setAuth({ status: "signed-in", role: (profile?.role as Role) ?? "customer" });
      }
    }

    supabase.auth.getUser().then(({ data }) => loadUser(data.user?.id));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user?.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {isCocina && <div className="picado" aria-hidden="true"></div>}
      <header
        className="site-header"
        style={isCocina ? { borderBottomColor: "var(--chile)" } : undefined}
      >
        <div className="wrap nav">
          <Link className="logo" href="/">
            Casa
            <span style={isCocina ? { color: "var(--chile)" } : undefined}>
              Kept
            </span>
            {isCocina && " Cocina"}
          </Link>
          <button
            className="nav-toggle"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "✕" : "☰"}
          </button>
          <ul className={`nav-links${open ? " open" : ""}`}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                className="nav-cta"
                href="/book"
                aria-current={pathname === "/book" ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {isCocina ? "Order dinner" : "Book a visit"}
              </Link>
            </li>
            {auth.status === "signed-out" && (
              <li>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </li>
            )}
            {auth.status === "signed-in" && (
              <>
                <li>
                  <Link
                    href={PORTAL[auth.role].href}
                    aria-current={pathname === PORTAL[auth.role].href ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {PORTAL[auth.role].label}
                  </Link>
                </li>
                <li>
                  <form action={signOutAction}>
                    <button type="submit" className="nav-logout">
                      Log out
                    </button>
                  </form>
                </li>
              </>
            )}
          </ul>
        </div>
      </header>
    </>
  );
}
