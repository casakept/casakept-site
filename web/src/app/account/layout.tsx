import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "@/components/account/AccountNav";

// Customer-facing account area. Staff/admin dashboards are a separate,
// not-yet-built area — this layout only serves the customer role's own
// data (enforced by RLS regardless, but we don't build staff/admin UI here).
export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <section className="section">
      <div className="wrap">
        <span className="eyebrow">My account</span>
        <h1 style={{ fontSize: "clamp(28px,3.6vw,38px)" }}>
          Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <div className="account-shell" style={{ marginTop: 30 }}>
          <nav>
            <AccountNav />
          </nav>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}
