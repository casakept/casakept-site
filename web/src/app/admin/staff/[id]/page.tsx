import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AvailabilityGrid from "@/components/staff/AvailabilityGrid";
import AddTimeOffForm from "@/components/staff/AddTimeOffForm";
import DeleteTimeOffButton from "@/components/staff/DeleteTimeOffButton";
import {
  adminAddTimeOffAction,
  adminDeleteTimeOffAction,
  adminToggleAvailabilityAction,
} from "@/lib/actions/admin-staff-availability";

export const metadata: Metadata = {
  title: "Admin · Staff availability",
};

export default async function AdminStaffDetailPage({ params }: PageProps<"/admin/staff/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff")
    .select("id, active, profile:profiles!staff_id_fkey(full_name, email, phone)")
    .eq("id", id)
    .maybeSingle();
  if (!staff) notFound();

  const [{ data: availability }, { data: timeOff }] = await Promise.all([
    supabase.from("staff_availability").select("day_of_week, time_window").eq("staff_id", id),
    supabase
      .from("staff_time_off")
      .select("id, start_date, end_date, reason")
      .eq("staff_id", id)
      .order("start_date", { ascending: true }),
  ]);

  const available = new Set((availability ?? []).map((a) => `${a.day_of_week}:${a.time_window}`));
  const name = staff.profile?.full_name ?? "Unnamed staff";

  return (
    <div>
      <Link href="/admin/staff" style={{ fontSize: 13, color: "#6a746c" }}>
        ← All staff
      </Link>

      <h3 style={{ marginTop: 16 }}>
        {name} <span className={`status-badge ${staff.active ? "confirmed" : "cancelled"}`}>{staff.active ? "Active" : "Inactive"}</span>
      </h3>
      <p>
        {staff.profile?.email}
        {staff.profile?.phone ? ` · ${staff.profile.phone}` : ""}
      </p>

      <div style={{ marginTop: 32 }}>
        <h3>Weekly availability</h3>
        <p style={{ marginTop: 6, color: "#6a746c" }}>
          Tap a slot to mark {name} available or off for that day and time window.
        </p>
        <div style={{ marginTop: 16 }}>
          <AvailabilityGrid available={available} toggleAction={adminToggleAvailabilityAction.bind(null, id)} />
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Time off</h3>
        <div style={{ marginTop: 14 }} className="card">
          <AddTimeOffForm action={adminAddTimeOffAction.bind(null, id)} />
        </div>

        {timeOff && timeOff.length > 0 && (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {timeOff.map((t) => (
              <div
                className="card"
                key={t.id}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
              >
                <div>
                  <p style={{ fontWeight: 700, color: "var(--verde)" }}>
                    {new Date(t.start_date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    –{" "}
                    {new Date(t.end_date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {t.reason && <p>{t.reason}</p>}
                </div>
                <DeleteTimeOffButton action={adminDeleteTimeOffAction.bind(null, id, t.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
