"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const LINKS = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/jobs", label: "My jobs" },
  { href: "/staff/availability", label: "Availability" },
  { href: "/staff/bonuses", label: "My bonuses" },
];

export default function StaffNav() {
  const pathname = usePathname();

  return (
    <ul className="account-nav">
      {LINKS.map((link) => (
        <li key={link.href}>
          <Link href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
            {link.label}
          </Link>
        </li>
      ))}
      <li className="signout">
        <form action={signOutAction}>
          <button type="submit">Log out</button>
        </form>
      </li>
    </ul>
  );
}
