import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Memberships & Pricing",
  description:
    "CasaKept membership pricing: Casa Base $199/mo, Casa Familia $449/mo, Casa Completa $949/mo. One-time cleaning, laundry, grocery, and meal pricing for Dallas–Fort Worth.",
};

export default function PricingPage() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <span className="eyebrow">Memberships &amp; pricing</span>
          <h1 style={{ fontSize: "clamp(34px,5vw,52px)" }}>
            Pick your peace of mind.
          </h1>
          <p className="lede" style={{ marginTop: 14 }}>
            Every membership includes the same background-checked crew each
            visit, photo-verified checklists, priority scheduling, a 24-hour
            re-do guarantee — and 10% off with annual prepay. Founding
            members lock today&apos;s rate for life.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="tiers">
            <div className="tier">
              <h3>Casa Base</h3>
              <div className="price">
                $199<small>/mo</small>
              </div>
              <div className="saves">
                Your clean at the one-time price — perks free
              </div>
              <ul>
                <li>1 standard clean per month</li>
                <li>Member laundry rate: $30/bag, on demand</li>
                <li>10% off all other services</li>
                <li>Priority scheduling &amp; the same crew every visit</li>
              </ul>
              <p
                style={{
                  fontSize: 12,
                  color: "#7a8078",
                  fontStyle: "italic",
                  marginTop: 10,
                }}
              >
                For couples &amp; &quot;just keep it clean&quot; homes.
              </p>
              <Link className="btn ghost" href="/book">
                Join Casa Base
              </Link>
            </div>

            <div className="tier featured">
              <span className="badge">Most popular</span>
              <h3>Casa Familia</h3>
              <div className="price">
                $449<small>/mo</small>
              </div>
              <div className="saves">Save ~25% + perks</div>
              <ul>
                <li>Biweekly standard cleans (2/mo)</li>
                <li>Biweekly grocery pickup + home delivery (2/mo)</li>
                <li>2 laundry bags/mo included — biweekly pickup</li>
                <li>1 free errand run each month</li>
                <li>15% off deep cleans, meals &amp; organization</li>
              </ul>
              <p
                style={{
                  fontSize: 12,
                  color: "#aebbaf",
                  fontStyle: "italic",
                  marginTop: 10,
                }}
              >
                For busy families who want the week handled.
              </p>
              <Link className="btn" href="/book">
                Join Casa Familia
              </Link>
            </div>

            <div className="tier">
              <h3>Casa Completa</h3>
              <div className="price">
                $949<small>/mo</small>
              </div>
              <div className="saves">Save ~40% vs one-time</div>
              <ul>
                <li>Weekly cleans (4/mo)</li>
                <li>Weekly laundry — 1 bag included each visit</li>
                <li>Weekly grocery pickup + home delivery</li>
                <li>Fridge cleanout &amp; restock every other week</li>
                <li>2 Cocina family meal drops /mo</li>
                <li>Quarterly deep clean included</li>
                <li>Dedicated household manager + 20% off extras</li>
              </ul>
              <p
                style={{
                  fontSize: 12,
                  color: "#7a8078",
                  fontStyle: "italic",
                  marginTop: 10,
                }}
              >
                The full household plan — one text, all of it done.
              </p>
              <Link className="btn ghost" href="/book">
                Join Casa Completa
              </Link>
            </div>
          </div>

          <div className="band" style={{ marginTop: 26 }}>
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
              Get started
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="wrap">
          <span className="eyebrow">One-time services</span>
          <h2>No membership? No problem.</h2>
          <p className="lede" style={{ marginTop: 10 }}>
            Book any service on its own. (Though once you do the math, the
            membership usually wins.)
          </p>
          <div className="grid-2" style={{ marginTop: 26 }}>
            <div>
              <div className="pricerow">
                <b>Standard clean</b>
                <div className="dots"></div>
                <span>$199</span>
              </div>
              <div className="pricerow">
                <b>Deep clean</b>
                <div className="dots"></div>
                <span>$325</span>
              </div>
              <div className="pricerow">
                <b>Move-in / move-out clean</b>
                <div className="dots"></div>
                <span>from $425</span>
              </div>
              <div className="pricerow">
                <b>Carpet cleaning (3-room min)</b>
                <div className="dots"></div>
                <span>$45/rm add-on · $60/rm solo</span>
              </div>
              <div className="pricerow">
                <b>Windows, inside &amp; out (to 15)</b>
                <div className="dots"></div>
                <span>$125</span>
              </div>
              <div className="pricerow">
                <b>Home organization (3-hr min)</b>
                <div className="dots"></div>
                <span>$75/hr</span>
              </div>
            </div>
            <div>
              <div className="pricerow">
                <b>Laundry, per bag (48-hr return)</b>
                <div className="dots"></div>
                <span>$35/bag</span>
              </div>
              <div className="pricerow">
                <b>Laundry, same-day rush</b>
                <div className="dots"></div>
                <span>$45/bag</span>
              </div>
              <div className="pricerow">
                <b>Grocery pickup + delivery</b>
                <div className="dots"></div>
                <span>$45/run</span>
              </div>
              <div className="pricerow">
                <b>Fridge cleanout + restock</b>
                <div className="dots"></div>
                <span>$85</span>
              </div>
              <div className="pricerow">
                <b>Cocina family meal drop (feeds 4–5)</b>
                <div className="dots"></div>
                <span>$75</span>
              </div>
              <div className="pricerow">
                <b>Errands (3 stops) / wait-at-home</b>
                <div className="dots"></div>
                <span>$35 / $30/hr</span>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: "#7a8078" }}>
            Pricing covers homes up to 2,500 sq ft; add $30 per visit for each
            additional 500 sq ft. CasaKept laundry bag holds ~15–18 lbs;
            comforters &amp; oversized bedding priced per piece. Grocery and
            restock pricing excludes cost of groceries — billed at actual
            cost with a receipt photo, no markup. Memberships require a
            three-month minimum, month-to-month thereafter.
          </p>
        </div>
      </section>
    </>
  );
}
