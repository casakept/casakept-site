import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SERVICE_DETAILS } from "@/lib/serviceDetails";

export const metadata: Metadata = {
  title: "Services & What's Included",
  description:
    "Exactly what's included in every CasaKept service: standard vs deep cleaning checklists, per-bag laundry, grocery delivery, fridge restock, organization, and errands.",
};

// Public catalog data -- revalidated hourly via the anon-key public client
// rather than fetched on every request, same reasoning as / and /pricing.
export const revalidate = 3600;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default async function ServicesPage() {
  const supabase = createPublicClient();
  const { data: services } = await supabase
    .from("services")
    .select("service_type, name, base_price_cents")
    .in("service_type", ["standard_clean", "deep_clean", "errand"]);
  const standardPrice = services?.find((s) => s.service_type === "standard_clean")?.base_price_cents ?? 19900;
  const deepPrice = services?.find((s) => s.service_type === "deep_clean")?.base_price_cents ?? 32500;
  const errandToGoPrice = services?.find((s) => s.name === "Errands - To Go")?.base_price_cents ?? 3500;
  const errandWaitPrice = services?.find((s) => s.name === "Errands - Wait at Home")?.base_price_cents ?? 3000;
  const deepDiscountedPrice = Math.floor((deepPrice * 0.85) / 100);
  const standardDetail = SERVICE_DETAILS["Standard clean"];
  const deepDetail = SERVICE_DETAILS["Deep clean"];

  return (
    <>
      <section className="section" style={{ paddingBottom: 36 }}>
        <div className="wrap">
          <span className="eyebrow">Services guide</span>
          <h1 style={{ fontSize: "clamp(34px,5vw,52px)" }}>
            Exactly what you&apos;re paying for.
          </h1>
          <p className="lede" style={{ marginTop: 14 }}>
            No vague &quot;we clean your house.&quot; Every service follows a
            written checklist — the same one our crew works from is the one
            you see here, and the one you get back photo-verified when the
            job is done. If we miss anything, we&apos;re back within 24
            hours, free.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2>Home cleaning: Standard vs. Deep</h2>
          <div className="grid-2" style={{ marginTop: 24, alignItems: "start" }}>
            <div className="card">
              <h3>Standard Clean — {formatCents(standardPrice)}</h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--chile)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {standardDetail?.summaryTag}
              </p>
              {standardDetail?.blocks?.map((block) => (
                <div key={block.heading}>
                  <p className="room">{block.heading}</p>
                  <ul className="chk">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p
                style={{
                  fontSize: 12,
                  color: "#7a8078",
                  fontStyle: "italic",
                  marginTop: 12,
                }}
              >
                {standardDetail?.footnote}
              </p>
            </div>
            <div
              className="card"
              style={{ borderColor: "var(--verde)", boxShadow: "6px 6px 0 var(--sage)" }}
            >
              <h3>Deep Clean — {formatCents(deepPrice)}</h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--chile)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {deepDetail?.summaryTag}
              </p>
              {deepDetail?.blocks
                ?.filter((block) => block.heading.includes("added"))
                .map((block) => (
                  <div key={block.heading}>
                    <p className="room">{block.heading}</p>
                    <ul className="chk">
                      {block.items.map((item) => (
                        <li className="plus" key={item}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              <p
                style={{
                  fontSize: 12,
                  color: "#7a8078",
                  fontStyle: "italic",
                  marginTop: 12,
                }}
              >
                New members get 15% off their first deep clean ({formatCents(deepPrice)} → ${deepDiscountedPrice}).
                Included quarterly on Casa Completa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <h2>Everything else we handle</h2>
          <div className="grid-2" style={{ marginTop: 24 }}>
            <div className="card">
              <h3>Laundry — by the bag</h3>
              <p>
                Fill the CasaKept bag (~15–18 lbs), leave it on the porch.
                Sorted, washed in its own machine — never mixed with other
                households — stain pre-treated, folded drawer-ready, back in
                24–48 hours with a photo of the finished order.{" "}
                <strong>Late past 48 hours? That order&apos;s free.</strong>
              </p>
              <p className="price-line">
                $35/bag · $30 members · rush $45 · bedding per piece
              </p>
            </div>
            <div className="card">
              <h3>Groceries + fridge care</h3>
              <p>
                Your list, your store. We shop, deliver to your kitchen, and
                put cold items away — receipt photo sent, groceries at actual
                cost. Add the fridge cleanout: everything out, shelves
                washed, restocked oldest-first so food stops dying in the
                back.
              </p>
              <p className="price-line">
                $45/run · fridge cleanout + restock $85
              </p>
            </div>
            <div className="card">
              <h3>Home organization</h3>
              <p>
                Pantries, closets, garages, playrooms. Full empty-out, sort
                with you deciding keep/donate/toss, donation drop-off
                included, labeled systems that survive real life. Product
                budgets always approved first.
              </p>
              <p className="price-line">
                $75/hr, 3-hr minimum · members save 10–20%
              </p>
            </div>
            <div className="card">
              <h3>Errands — To Go &amp; Wait at Home</h3>
              <p>
                Package returns, dry cleaning, post office, pharmacy — proof-of-drop photos every stop, within a
                25-mile radius, up to 3 stops. Or we&apos;ll wait at your home for the &quot;between 8 and 2&quot;
                repair window (booked hourly) so you don&apos;t burn a vacation day.
              </p>
              <p className="price-line">
                To Go {formatCents(errandToGoPrice)} · Wait at Home {formatCents(errandWaitPrice)}/hr
              </p>
            </div>
            <div className="card">
              <h3>Specialty cleaning</h3>
              <p>
                Move-in/move-out cleans with a deposit-back photo set. Carpet
                cleaning with hot-water extraction (large furniture removed
                beforehand for wall-to-wall). Windows in &amp; out, tracks
                and screens included.
              </p>
              <p className="price-line">
                Move-out from $425 · carpet $45–60/rm · windows $125
              </p>
            </div>
          </div>
          <p style={{ marginTop: 22, fontSize: 13, color: "#7a8078" }}>
            Pricing covers homes up to 2,500 sq ft; add $30 per visit for each
            additional 500 sq ft. Anything quoted separately is confirmed in
            writing before work begins.
          </p>
          <div style={{ marginTop: 26 }}>
            <Link className="btn" href="/book">
              Book a visit
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
