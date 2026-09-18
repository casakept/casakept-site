import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap foot-grid">
        <div>
          <Link className="logo" href="/">
            Casa<span>Kept</span>
          </Link>
          <p style={{ marginTop: 10, maxWidth: 300 }}>
            Your home, handled. Cleaning, laundry, groceries &amp; errands
            across the Dallas–Fort Worth metroplex.
          </p>
          <p style={{ marginTop: 12 }}>
            <strong style={{ color: "var(--paper)" }}>
              Text &quot;DONE&quot; to (817) 555-0142
            </strong>
            <br />
            hola@casakept.com
          </p>
        </div>
        <div>
          <p className="foot-head">Explore</p>
          <ul>
            <li>
              <Link href="/services">Services &amp; what&apos;s included</Link>
            </li>
            <li>
              <Link href="/pricing">Memberships &amp; pricing</Link>
            </li>
            <li>
              <Link href="/book">Book a visit</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="foot-head">Service area</p>
          <ul>
            <li>Watauga · Keller · North Richland Hills</li>
            <li>Fort Worth · Southlake · Colleyville</li>
            <li>&amp; the greater DFW metroplex</li>
          </ul>
        </div>
      </div>
      <div className="wrap fineprint">
        <span>© 2026 CasaKept LLC · Licensed &amp; insured · Se habla español</span>
        <span>Memberships require a three-month minimum · Prices subject to change</span>
      </div>
    </footer>
  );
}
