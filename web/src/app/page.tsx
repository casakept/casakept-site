import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description:
    "CasaKept is your all-in-one home concierge in DFW: house cleaning, laundry with 48-hour turnaround, grocery delivery, home-cooked Mexican meals, and errands — one membership, one trusted local team.",
};

export default function HomePage() {
  return (
    <>
      <section className="wrap hero">
        <div>
          <span className="eyebrow">
            Home concierge · Dallas–Fort Worth · Se habla español
          </span>
          <h1>
            Consider it <em>done.</em>
          </h1>
          <p className="lede" style={{ marginTop: 18 }}>
            CasaKept is your all-in-one home concierge, designed to give you
            back your time. One membership, one app, one trusted local team
            for cleaning, laundry, groceries, dinner, and the errands in
            between.
          </p>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <Link className="btn" href="/book">
              Get started
            </Link>
            <Link className="btn ghost" href="/pricing">
              See memberships
            </Link>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "#7a8078" }}>
            Founding members lock today&apos;s rate for life.
          </p>
        </div>
        <div className="todo" aria-label="A Saturday to-do list with chores crossed off">
          <h3>Your Saturday</h3>
          <ul>
            <li className="done">
              <span className="box">✓</span> Deep clean the bathrooms
            </li>
            <li className="done">
              <span className="box">✓</span> Four loads of laundry
            </li>
            <li className="done">
              <span className="box">✓</span> Grocery run + stock fridge
            </li>
            <li className="done">
              <span className="box">✓</span> Return the Amazon boxes
            </li>
            <li className="done">
              <span className="box">✓</span> Cook dinner
            </li>
            <li className="you">
              <span className="box"></span> The soccer game
            </li>
            <li className="you">
              <span className="box"></span> Actually relax
            </li>
          </ul>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="eyebrow">What we take off your plate</span>
          <h2>Every chore. One team.</h2>
          <div className="grid-3" style={{ marginTop: 28 }}>
            <div className="card reveal">
              <h3>Home cleaning</h3>
              <p>
                Recurring or one-time, basic refresh to full deep clean —
                kitchens, baths, blinds, fans, baseboards, carpet, windows in
                &amp; out.
              </p>
              <p className="price-line">
                From $199 · included in every membership
              </p>
            </div>
            <div className="card reveal">
              <h3>Laundry, by the bag</h3>
              <p>
                Fill the CasaKept bag, leave it on the porch. Washed in its
                own machine, folded drawer-ready, back in 24–48 hours —
                guaranteed.
              </p>
              <p className="price-line">$35/bag · $30 for members</p>
            </div>
            <div className="card reveal">
              <h3>Cocina meals</h3>
              <p>
                Same-day cooked family dinners with a specialty in authentic
                Mexican home cooking. Order by 11am, eat by 6.
              </p>
              <p className="price-line">Family dinner drops from $75</p>
            </div>
            <div className="card reveal">
              <h3>Groceries, handled</h3>
              <p>
                Your list, shopped and delivered to your kitchen — cold items
                put away, receipt photo sent, groceries at actual cost.
              </p>
              <p className="price-line">
                $45/run · included on Familia &amp; Completa
              </p>
            </div>
            <div className="card reveal">
              <h3>Home organization</h3>
              <p>
                Pantries, closets, garages, playrooms — systems built for real
                life, labeled so they survive it.
              </p>
              <p className="price-line">$75/hr · members save 10–20%</p>
            </div>
            <div className="card reveal">
              <h3>Errands &amp; extras</h3>
              <p>
                Package returns, dry-cleaning runs, waiting on the repair
                tech, fridge cleanouts, filter changes.
              </p>
              <p className="price-line">
                Errand runs $35 · wait-at-home $30/hr
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section dark">
        <div className="wrap">
          <span className="eyebrow" style={{ color: "var(--marigold)" }}>
            Why families trust CasaKept
          </span>
          <h2>
            Run like an operation.
            <br />
            Feels like a favor.
          </h2>
          <div className="grid-3" style={{ marginTop: 30 }}>
            <div className="reveal">
              <h3 style={{ color: "var(--marigold)", fontSize: 17 }}>
                The same crew, every visit
              </h3>
              <p style={{ fontSize: 14, color: "#cfd6cc" }}>
                Background-checked, insured W-2 teams who know your home, your
                pets, and your preferences.
              </p>
            </div>
            <div className="reveal">
              <h3 style={{ color: "var(--marigold)", fontSize: 17 }}>
                Photo-verified checklists
              </h3>
              <p style={{ fontSize: 14, color: "#cfd6cc" }}>
                Every visit follows a written checklist. When we finish, it
                lands on your phone with photos — so you know it&apos;s done
                right.
              </p>
            </div>
            <div className="reveal">
              <h3 style={{ color: "var(--marigold)", fontSize: 17 }}>
                Guarantees in writing
              </h3>
              <p style={{ fontSize: 14, color: "#cfd6cc" }}>
                Anything missed, re-done free within 24 hours. Laundry back in
                48 hours or it&apos;s free. Arrival windows we actually hit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="eyebrow">Memberships</span>
          <h2>Pick your peace of mind.</h2>
          <p className="lede" style={{ marginTop: 12 }}>
            Three plans, three-month minimum, founding rate locked for life.
            Every membership includes priority scheduling and the 24-hour
            re-do guarantee.
          </p>
          <div className="tiers" style={{ marginTop: 34 }}>
            <div className="tier reveal">
              <h3>Casa Base</h3>
              <div className="price">
                $199<small>/mo</small>
              </div>
              <div className="saves">
                Your clean at the one-time price — perks free
              </div>
              <ul>
                <li>1 standard clean per month</li>
                <li>Member laundry rate: $30/bag</li>
                <li>10% off all other services</li>
              </ul>
              <Link className="btn ghost" href="/pricing">
                See details
              </Link>
            </div>
            <div className="tier featured reveal">
              <span className="badge">Most popular</span>
              <h3>Casa Familia</h3>
              <div className="price">
                $449<small>/mo</small>
              </div>
              <div className="saves">Save ~25% + perks</div>
              <ul>
                <li>Biweekly standard cleans</li>
                <li>Biweekly grocery pickup + delivery</li>
                <li>2 laundry bags/mo included</li>
                <li>Monthly errand run + 15% off extras</li>
              </ul>
              <Link className="btn" href="/book">
                Join Casa Familia
              </Link>
            </div>
            <div className="tier reveal">
              <h3>Casa Completa</h3>
              <div className="price">
                $949<small>/mo</small>
              </div>
              <div className="saves">Save ~40% vs one-time</div>
              <ul>
                <li>Weekly cleans, laundry &amp; groceries</li>
                <li>Fridge cleanout every other week</li>
                <li>2 Cocina meal drops + quarterly deep clean</li>
                <li>Dedicated household manager + 20% off</li>
              </ul>
              <Link className="btn ghost" href="/pricing">
                See details
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="wrap">
          <div className="band reveal">
            <div>
              <h3>New members: first deep clean 50% off</h3>
              <p>
                Every membership starts with a top-to-bottom reset so your
                recurring visits stay flawless. $325 → $162 at signup.
              </p>
            </div>
            <Link
              className="btn"
              style={{ background: "var(--verde)", color: "var(--paper)" }}
              href="/book"
            >
              Claim it when you join
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
