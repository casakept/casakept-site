import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import InviteStaffForm, { type ReferrableStaff } from "@/components/admin/InviteStaffForm";
import StaffRow, { type AdminStaffMember } from "@/components/admin/StaffRow";

export const metadata: Metadata = {
  title: "Admin · Staff",
};

export default async function AdminStaffPage() {
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, active, hire_date, profile:profiles!staff_id_fkey(full_name, email, phone)")
    .order("active", { ascending: false });

  const existingStaff: ReferrableStaff[] = (staff ?? [])
    .filter((s) => s.active)
    .map((s) => ({ id: s.id, full_name: s.profile?.full_name ?? null }));

  return (
    <div>
      <h3>Invite a staff member</h3>
      <p style={{ marginTop: 6, marginBottom: 16, color: "#6a746c" }}>
        They&apos;ll get an email to set their password and get access to the staff portal.
      </p>
      <div className="card">
        <InviteStaffForm existingStaff={existingStaff} />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Staff directory</h3>
        {!staff || staff.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>No staff yet.</p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {staff.map((s) => (
              <StaffRow key={s.id} staff={s as AdminStaffMember} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
