import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AddPropertyForm from "@/components/account/AddPropertyForm";
import DeletePropertyButton from "@/components/account/DeletePropertyButton";

export const metadata: Metadata = {
  title: "Properties",
};

export default async function PropertiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, label, address_line1, address_line2, city, state, zip, access_notes")
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: true });

  return (
    <div style={{ display: "grid", gap: 32 }}>
      <div>
        <h3>Your properties</h3>
        {!properties || properties.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>
            No properties yet — add one below so you can book a visit.
          </p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {properties.map((p) => (
              <div className="card" key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    {p.label && <strong style={{ color: "var(--verde)" }}>{p.label}</strong>}
                    <p>
                      {p.address_line1}
                      {p.address_line2 ? `, ${p.address_line2}` : ""}
                      <br />
                      {p.city}, {p.state} {p.zip}
                    </p>
                    {p.access_notes && (
                      <p style={{ fontSize: 12, color: "#9aa49d", marginTop: 6 }}>{p.access_notes}</p>
                    )}
                  </div>
                  <DeletePropertyButton propertyId={p.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 26, maxWidth: 520 }}>
        <h3 style={{ marginBottom: 16 }}>Add a property</h3>
        <AddPropertyForm />
      </div>
    </div>
  );
}
