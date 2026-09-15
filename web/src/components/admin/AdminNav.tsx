"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/staff", label: "Staff" },
];

export default function AdminNav() {
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
