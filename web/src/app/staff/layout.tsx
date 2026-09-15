import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffNav from "@/components/staff/StaffNav";

// Portal for cleaners/crew to see their assigned jobs and manage their own
// availability. Gated on profiles.role = 'staff' AND an active staff row --
// a staff profile with active = false (e.g. someone who's left) keeps their
// role for historical records but loses portal access.
export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/staff");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "staff") {
    redirect("/account");
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("active")
    .eq("id", user.id)
    .maybeSingle();

  if (!staff?.active) {
    redirect("/account");
  }

  return (
    <section className="section">
      <div className="wrap">
        <span className="eyebrow">Staff</span>
        <h1 style={{ fontSize: "clamp(28px,3.6vw,38px)" }}>
          Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <div className="account-shell" style={{ marginTop: 30 }}>
          <nav>
            <StaffNav />
          </nav>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}
