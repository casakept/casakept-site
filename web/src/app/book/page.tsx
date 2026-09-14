import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Free Walkthrough",
  description:
    "Book your free CasaKept walkthrough in Dallas–Fort Worth. Get an exact quote for cleaning, laundry, groceries, and meals — no pressure, estimate valid 14 days.",
};

export default function BookPage() {
  return (
    <section className="section">
      <div
        className="wrap"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 52,
          alignItems: "start",
        }}
      >
        <div>
          <span className="eyebrow">Free walkthrough · no pressure</span>
          <h1 style={{ fontSize: "clamp(32px,4.5vw,46px)" }}>
            Let&apos;s look at your list.
          </h1>
          <p className="lede" style={{ marginTop: 14 }}>
            A 20-minute walkthrough gets you an exact quote on one page —
            services, membership options, and your founding rate, locked for
            life. Estimate valid 14 days, and nothing starts until you say
            so.
          </p>
          <div style={{ marginTop: 26 }}>
            <h3 style={{ fontSize: 16 }}>What to expect</h3>
            <ul className="chk" style={{ marginTop: 8 }}>
              <li>We walk the home together and note your priorities</li>
              <li>You get an exact price — no ranges, no surprises</li>
              <li>
                Membership signups claim the 50%-off onboarding deep clean
              </li>
              <li>
                Prefer to skip the visit? Book a one-time clean directly by
                text
              </li>
            </ul>
          </div>
          <div
            className="card"
            style={{
              marginTop: 26,
              background: "var(--verde)",
              borderColor: "var(--verde)",
            }}
          >
            <p style={{ color: "var(--paper)", fontSize: 15 }}>
              <strong style={{ color: "var(--marigold)" }}>
                Faster by text:
              </strong>{" "}
              send &quot;DONE&quot; to{" "}
              <strong style={{ color: "var(--paper)" }}>
                (817) 555-0142
              </strong>{" "}
              and we&apos;ll set it up in one thread. Se habla español.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 30 }}>
          <h3 style={{ marginBottom: 16 }}>Request your walkthrough</h3>
          {/* Wire this form to Formspree, Netlify Forms, or your booking platform.
              For Netlify: add data-netlify="true" to the form tag and deploy on Netlify.
              For Formspree: set action="https://formspree.io/f/YOUR_ID" method="POST" */}
          <form name="walkthrough" method="POST" action="#">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" autoComplete="name" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (call/text)</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" required />
            </div>
            <div className="field">
              <label htmlFor="zip">ZIP code</label>
              <input
                id="zip"
                name="zip"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="size">Approximate home size</label>
              <select id="size" name="size" defaultValue="1,500–2,500 sq ft">
                <option>Under 1,500 sq ft</option>
                <option>1,500–2,500 sq ft</option>
                <option>2,500–3,500 sq ft</option>
                <option>3,500+ sq ft</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="interest">Most interested in</label>
              <select id="interest" name="interest">
                <option>Casa Familia membership</option>
                <option>Casa Base membership</option>
                <option>Casa Completa membership</option>
                <option>One-time deep clean</option>
                <option>Laundry service</option>
                <option>Cocina meals</option>
                <option>Not sure yet — walk me through it</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="notes">
                Anything we should know?{" "}
                <span
                  style={{
                    textTransform: "none",
                    fontWeight: 400,
                    color: "#9aa49d",
                  }}
                >
                  (pets, gate codes, priorities)
                </span>
              </label>
              <textarea id="notes" name="notes" rows={3}></textarea>
            </div>
            <button className="btn" type="submit" style={{ width: "100%" }}>
              Request my free walkthrough
            </button>
            <p style={{ fontSize: 11, color: "#9aa49d", marginTop: 10 }}>
              We&apos;ll text you within one business day to confirm a time.
              No spam, ever.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
