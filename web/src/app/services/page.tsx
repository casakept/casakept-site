import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services & What's Included",
  description:
    "Exactly what's included in every CasaKept service: standard vs deep cleaning checklists, per-bag laundry, grocery delivery, fridge restock, Cocina meals, organization, and errands.",
};

export default function ServicesPage() {
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
              <h3>Standard Clean — $199</h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--chile)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                ~2–2.5 hrs · included in every membership
              </p>
              <p className="room">Every room</p>
              <ul className="chk">
                <li>Vacuum &amp; mop all floors, edge to edge</li>
                <li>Dust all reachable surfaces, shelves &amp; sills</li>
                <li>Wipe switches, handles &amp; high-touch points</li>
                <li>Trash out, beds made, general tidy</li>
              </ul>
              <p className="room">Kitchen</p>
              <ul className="chk">
                <li>Counters &amp; backsplash sanitized, sink polished</li>
                <li>Appliance exteriors, microwave in &amp; out</li>
                <li>Stovetop degreased, cabinet fronts spot-wiped</li>
              </ul>
              <p className="room">Bathrooms</p>
              <ul className="chk">
                <li>Toilets, showers &amp; tubs scrubbed and disinfected</li>
                <li>Sinks, counters, fixtures &amp; mirrors shined</li>
                <li>Floors sanitized</li>
              </ul>
            </div>
            <div
              className="card"
              style={{ borderColor: "var(--verde)", boxShadow: "6px 6px 0 var(--sage)" }}
            >
              <h3>Deep Clean — $325</h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--chile)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                ~4–6 hrs · everything in standard, plus:
              </p>
              <p className="room">Every room — added</p>
              <ul className="chk">
                <li className="plus">Baseboards hand-wiped throughout</li>
                <li className="plus">
                  Ceiling fans &amp; blinds cleaned slat by slat
                </li>
                <li className="plus">
                  Door frames, trim, vents &amp; window tracks
                </li>
                <li className="plus">
                  Under &amp; behind reachable furniture; wall spot-cleaning
                </li>
              </ul>
              <p className="room">Kitchen — added</p>
              <ul className="chk">
                <li className="plus">Oven cleaned inside, racks included</li>
                <li className="plus">
                  Refrigerator cleaned inside, shelf by shelf
                </li>
                <li className="plus">
                  Range hood degreased; cabinets washed top to bottom
                </li>
              </ul>
              <p className="room">Bathrooms — added</p>
              <ul className="chk">
                <li className="plus">Grout &amp; tile detail scrub</li>
                <li className="plus">Hard-water &amp; soap-scum removal</li>
              </ul>
              <p
                style={{
                  fontSize: 12,
                  color: "#7a8078",
                  fontStyle: "italic",
                  marginTop: 12,
                }}
              >
                New members start with a deep clean at 50% off. Included
                quarterly on Casa Completa.
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
              <h3>Errands &amp; wait-at-home</h3>
              <p>
                Package returns, dry cleaning, post office, pharmacy —
                proof-of-drop photos every stop. Or we&apos;ll wait at your
                home for the &quot;between 8 and 2&quot; repair window so you
                don&apos;t burn a vacation day.
              </p>
              <p className="price-line">
                Errand run (3 stops) $35 · wait-at-home $30/hr
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
            <div className="card">
              <h3>Cocina meals</h3>
              <p>
                Same-day cooked family dinners — main, two sides, tortillas
                where they belong — with a specialty in authentic Mexican
                home cooking. Weekly menu drops every Sunday.
              </p>
              <p className="price-line">
                $75 per family dinner ·{" "}
                <Link href="/cocina" style={{ color: "var(--chile)" }}>
                  see this week&apos;s menu →
                </Link>
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
              Book a free walkthrough
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
