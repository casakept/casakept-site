import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AvailabilityGrid from "@/components/staff/AvailabilityGrid";
import AddTimeOffForm from "@/components/staff/AddTimeOffForm";
import DeleteTimeOffButton from "@/components/staff/DeleteTimeOffButton";

export const metadata: Metadata = {
  title: "Staff · Availability",
};

export default async function StaffAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: availability }, { data: timeOff }] = await Promise.all([
    supabase
      .from("staff_availability")
      .select("day_of_week, time_window")
      .eq("staff_id", user!.id),
    supabase
      .from("staff_time_off")
      .select("id, start_date, end_date, reason")
      .eq("staff_id", user!.id)
      .order("start_date", { ascending: true }),
  ]);

  const available = new Set((availability ?? []).map((a) => `${a.day_of_week}:${a.time_window}`));

  return (
    <div>
      <h3>Weekly availability</h3>
      <p style={{ marginTop: 6, color: "#6a746c" }}>
        Tap a slot to mark yourself available or off for that day and time window.
      </p>
      <div style={{ marginTop: 16 }}>
        <AvailabilityGrid available={available} />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>Time off</h3>
        <div style={{ marginTop: 14 }} className="card">
          <AddTimeOffForm />
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
                <DeleteTimeOffButton timeOffId={t.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
