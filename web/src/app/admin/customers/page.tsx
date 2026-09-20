import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin · Customers",
};

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createClient();

  let customersQuery = supabase
    .from("profiles")
    .select("id, full_name, email, phone, created_at, founding_member, properties(count)")
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (q) {
    const escaped = q.replace(/[%_]/g, "");
    customersQuery = customersQuery.or(
      `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`
    );
  }

  const { data: customers } = await customersQuery;
  const customerIds = (customers ?? []).map((c) => c.id);

  // Separate query rather than an embedded/ordered subscriptions select --
  // simpler to reason about than PostgREST's per-parent embed ordering, and
  // this list is small enough that it doesn't need to be one round trip.
  const { data: activeSubs } = customerIds.length
    ? await supabase
        .from("subscriptions")
        .select("customer_id, membership_plans(name)")
        .in("customer_id", customerIds)
        .in("status", ["active", "past_due"])
    : { data: [] as { customer_id: string; membership_plans: { name: string } | null }[] };

  const planByCustomer = new Map(
    (activeSubs ?? []).map((s) => [s.customer_id, s.membership_plans?.name ?? null])
  );

  return (
    <div>
      <form style={{ display: "flex", gap: 10, maxWidth: 420 }}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, email, or phone"
          style={{ flex: 1 }}
        />
        <button className="btn ghost" type="submit" style={{ padding: "8px 18px", fontSize: 13 }}>
          Search
        </button>
      </form>

      {!customers || customers.length === 0 ? (
        <p style={{ marginTop: 20, color: "#6a746c" }}>
          {q ? "No customers match that search." : "No customers yet."}
        </p>
      ) : (
        <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {customers.map((c) => {
            const propertyCount = c.properties?.[0]?.count ?? 0;
            const planName = planByCustomer.get(c.id);
            return (
              <Link key={c.id} href={`/admin/customers/${c.id}`} className="card" style={{ display: "block", textDecoration: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <strong style={{ color: "var(--verde)" }}>{c.full_name ?? "Unnamed customer"}</strong>{" "}
                    {c.founding_member && <span className="status-badge founding">Founding member</span>}{" "}
                    {planName && <span className="status-badge confirmed">{planName}</span>}
                    <p>
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p>
                      {propertyCount} {propertyCount === 1 ? "property" : "properties"}
                    </p>
                    <p style={{ fontSize: 12, color: "#9aa49d" }}>
                      Joined{" "}
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
