import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

// Staff/admin operations dashboard. Distinct from /account (customer-facing)
// -- gated on profiles.role = 'admin' here, on top of the RLS policies
// (bookings_all_admin etc.) that already restrict what an admin session can
// actually read/write.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/account");
  }

  return (
    <section className="section">
      <div className="wrap">
        <span className="eyebrow">Admin</span>
        <h1 style={{ fontSize: "clamp(28px,3.6vw,38px)" }}>Dashboard</h1>
        <div className="account-shell" style={{ marginTop: 30 }}>
          <nav>
            <AdminNav />
          </nav>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}
