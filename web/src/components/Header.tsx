"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Memberships" },
  { href: "/cocina", label: "Cocina" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isCocina = pathname === "/cocina";

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
                {isCocina ? "Order dinner" : "Book a free walkthrough"}
              </Link>
            </li>
          </ul>
        </div>
      </header>
    </>
  );
}
