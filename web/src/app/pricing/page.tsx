import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SERVICE_LABELS, FREQUENCY_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Memberships & Pricing",
  description:
    "CasaKept membership pricing: Casa Base $199/mo, Casa Familia $449/mo, Casa Completa $949/mo. One-time cleaning, laundry, and grocery pricing for Dallas–Fort Worth.",
};

// Public catalog data, no per-user auth dependency -- revalidated hourly
// via the anon-key public client (not the cookie-based server client, which
// would force this route dynamic on every request) rather than fetched on
// every request, same reasoning as /.
export const revalidate = 3600;

const SERVICE_TYPE_ORDER = Object.keys(SERVICE_LABELS) as Database["public"]["Enums"]["service_type"][];

// Floor rather than round -- half of $325 is $162.50, and whole-dollar
// display should truncate down to $162, not round up to $163.
function formatCents(cents: number): string {
  return `$${Math.floor(cents / 100)}`;
}

export default async function PricingPage() {
  const supabase = createPublicClient();

  const [{ data: plans }, { data: services }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select(
        "id, slug, name, description, monthly_price_cents, annual_price_cents, extra_services_discount_pct, perks"
      )
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("services")
      .select("id, service_type, name, description, base_price_cents")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const { data: entitlements } = await supabase
    .from("plan_entitlements")
    .select("plan_id, service_type, quantity, frequency")
    .in("plan_id", (plans ?? []).map((p) => p.id));

  const deepClean = services?.find((s) => s.service_type === "deep_clean");
  const deepCleanDiscounted = deepClean ? deepClean.base_price_cents * 0.85 : null;

  return (
    <>
      <section className="section" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <span className="eyebrow">Memberships &amp; pricing</span>
          <h1 style={{ fontSize: "clamp(34px,5vw,52px)" }}>Pick your peace of mind.</h1>
          <p className="lede" style={{ marginTop: 14 }}>
            Every membership includes the same background-checked crew each visit, photo-verified checklists,
            priority scheduling, a 24-hour re-do guarantee — and 10% off with annual prepay. Founding members
            lock today&apos;s rate for life.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="tiers">
            {plans?.map((plan) => {
              const planEntitlements = (entitlements ?? [])
                .filter((e) => e.plan_id === plan.id)
                .slice()
                .sort((a, b) => SERVICE_TYPE_ORDER.indexOf(a.service_type) - SERVICE_TYPE_ORDER.indexOf(b.service_type));
              const featured = plan.slug === "casa-familia";

              return (
                <div className={`tier${featured ? " featured" : ""}`} key={plan.id}>
                  {featured && <span className="badge">Most popular</span>}
                  <h3>{plan.name}</h3>
                  <div className="price">
                    {formatCents(plan.monthly_price_cents)}
                    <small>/mo</small>
                  </div>
                  {plan.annual_price_cents != null && (
                    <p style={{ fontSize: 12, color: featured ? "#aebbaf" : "#7a8078" }}>
                      or {formatCents(plan.annual_price_cents)}/yr — save 10% billed annually
                    </p>
                  )}
                  <ul>
                    {planEntitlements.map((e) => (
                      <li key={e.service_type}>
                        {e.quantity}× {SERVICE_LABELS[e.service_type] ?? e.service_type} — {FREQUENCY_LABELS[e.frequency]}
                      </li>
                    ))}
                    <li>{plan.extra_services_discount_pct}% off all other services</li>
                    {plan.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <p
                    style={{
                      fontSize: 12,
                      color: featured ? "#aebbaf" : "#7a8078",
                      fontStyle: "italic",
                      marginTop: 10,
                    }}
                  >
                    {plan.description}
                  </p>
                  <Link className={featured ? "btn" : "btn ghost"} href="/book">
                    Join {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>

          {deepClean && deepCleanDiscounted !== null && (
            <div className="band" style={{ marginTop: 26 }}>
              <div>
                <h3>New members: first deep clean 15% off</h3>
                <p>
                  Every membership starts with a top-to-bottom reset so your recurring visits stay flawless.{" "}
                  {formatCents(deepClean.base_price_cents)} → {formatCents(deepCleanDiscounted)} at signup.
                </p>
              </div>
              <Link className="btn" style={{ background: "var(--verde)", color: "var(--paper)" }} href="/book">
                Get started
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <span className="eyebrow">One-time services</span>
          <h2>No membership? No problem.</h2>
          <p className="lede" style={{ marginTop: 10 }}>
            Book any service on its own. (Though once you do the math, the membership usually wins.)
          </p>
          <div className="grid-2" style={{ marginTop: 26 }}>
            {services?.map((s) => (
              <div className="card" key={s.id}>
                <h3 style={{ fontSize: 16 }}>
                  {s.name} — {formatCents(s.base_price_cents)}
                </h3>
                {s.description && <p style={{ marginTop: 4 }}>{s.description}</p>}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "#7a8078" }}>
            Pricing covers homes up to 2,500 sq ft; add $30 per visit for each additional 500 sq ft. Grocery and
            restock pricing excludes cost of groceries — billed at actual cost with a receipt photo, no markup.
            Memberships require a three-month minimum, month-to-month thereafter.
          </p>
        </div>
      </section>
    </>
  );
}
