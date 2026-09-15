import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: {
    absolute:
      "CasaKept Cocina — Same-Day Home-Cooked Mexican Meals in DFW",
  },
  description:
    "Same-day cooked family dinners delivered to your fridge in Dallas–Fort Worth. Authentic Mexican and Hispanic home cooking — order by 11am, eat by 6pm. Tamales in season.",
};

export default async function CocinaPage() {
  const supabase = createPublicClient();
  const { data: menuItems } = await supabase
    .from("cocina_menu_items")
    .select("id, dish_name, description")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  return (
    <>
      <section className="section" style={{ textAlign: "center", paddingBottom: 40 }}>
        <div className="wrap">
          <span className="script">como en casa de mamá</span>
          <h1 style={{ marginTop: 6 }}>Real dinner. Zero dishes.</h1>
          <p className="lede" style={{ margin: "16px auto 0" }}>
            Same-day cooked and prepped meals delivered to your fridge — with
            a specialty in authentic Mexican and Hispanic home cooking. Order
            by 11am, eat like family by 6.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="menu-card">
            <h2
              style={{
                textAlign: "center",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              — This week from the cocina —
            </h2>
            <div style={{ marginTop: 18 }}>
              {(menuItems ?? []).map((item) => (
                <div className="pricerow" key={item.id}>
                  <b
                    style={{
                      fontFamily: "var(--font-fraunces)",
                      fontWeight: 600,
                      fontSize: 18,
                      color: "var(--verde)",
                    }}
                  >
                    {item.dish_name}
                  </b>
                  <div className="dots"></div>
                  <span style={{ fontWeight: 400, color: "#5a5245", fontSize: 13 }}>
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#8a8375", marginTop: 16 }}>
              New menu posted every Sunday · custom portions &amp;
              kid-friendly spice levels · allergies saved to your family
              profile
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <h2 style={{ textAlign: "center" }}>How it works</h2>
          <div className="steps" style={{ marginTop: 26 }}>
            <div className="step">
              <div className="n">1</div>
              <h3>Text your order</h3>
              <p style={{ fontSize: 14, color: "#4a544e" }}>
                Pick from this week&apos;s menu or send us a family recipe —
                we&apos;ll quote it. Order by 11:00 AM for same-day dinner.
              </p>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3>We shop &amp; cook</h3>
              <p style={{ fontSize: 14, color: "#4a544e" }}>
                Fresh ingredients the same day, prepared in a licensed
                kitchen — never frozen trays, never reheated restaurant food.
              </p>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3>Fridge-stocked by 6</h3>
              <p style={{ fontSize: 14, color: "#4a544e" }}>
                Delivered in labeled, oven-ready dishes with reheat
                instructions. Main + two sides + tortillas where they belong.
              </p>
            </div>
          </div>
          <div className="band" style={{ marginTop: 30 }}>
            <div>
              <h3>Family dinner drops from $75</h3>
              <p>
                Feeds 4–5 · weekly meal plans available · included twice
                monthly on the Casa Completa membership, 15–20% off for all
                other members.
              </p>
            </div>
            <Link
              className="btn"
              style={{ background: "var(--chile)", color: "var(--paper)" }}
              href="/book"
            >
              Order this week&apos;s menu
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
