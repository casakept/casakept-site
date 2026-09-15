import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AddCocinaMenuItemForm from "@/components/admin/AddCocinaMenuItemForm";
import CocinaMenuRow, { type AdminCocinaMenuItem } from "@/components/admin/CocinaMenuRow";

export const metadata: Metadata = {
  title: "Admin · Cocina menu",
};

export default async function AdminCocinaPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("cocina_menu_items")
    .select("id, dish_name, description, active")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h3>Add a dish</h3>
      <p style={{ marginTop: 6, marginBottom: 16, color: "#6a746c" }}>
        Appears on the public Cocina page immediately. Order below matches the order shown on the site.
      </p>
      <div className="card">
        <AddCocinaMenuItemForm />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3>This week&apos;s menu</h3>
        {!items || items.length === 0 ? (
          <p style={{ marginTop: 10, color: "#6a746c" }}>No dishes yet.</p>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {items.map((item, index) => (
              <CocinaMenuRow
                key={item.id}
                item={item as AdminCocinaMenuItem}
                isFirst={index === 0}
                isLast={index === items.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
