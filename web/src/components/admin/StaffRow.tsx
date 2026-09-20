"use client";

import Link from "next/link";
import { setStaffActiveAction } from "@/lib/actions/admin-staff";

export type AdminStaffMember = {
  id: string;
  active: boolean;
  hire_date: string;
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
};

export default function StaffRow({ staff }: { staff: AdminStaffMember }) {
  const action = setStaffActiveAction.bind(null, staff.id, !staff.active);

  return (
    <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div>
        <strong style={{ color: "var(--verde)" }}>{staff.profile?.full_name ?? "Unnamed staff"}</strong>{" "}
        <span className={`status-badge ${staff.active ? "confirmed" : "cancelled"}`}>
          {staff.active ? "Active" : "Inactive"}
        </span>
        <p>
          {staff.profile?.email}
          {staff.profile?.phone ? ` · ${staff.profile.phone}` : ""}
        </p>
        <p style={{ fontSize: 12, color: "#9aa49d" }}>
          Hired {new Date(staff.hire_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href={`/admin/staff/${staff.id}`} className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
          Manage availability
        </Link>
        <form
          action={action}
          onSubmit={(e) => {
            if (staff.active && !confirm(`Deactivate ${staff.profile?.full_name ?? "this staff member"}?`)) {
              e.preventDefault();
            }
          }}
        >
          <button type="submit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
            {staff.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
    </div>
  );
}
