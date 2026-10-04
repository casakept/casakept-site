import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  EXTRA_ROOM_OPTIONS,
  SQ_FT_OPTIONS,
  formatBathrooms,
} from "@/lib/propertyDetails";

// The bedroom/bathroom/sq ft/extra room inputs, shared by the add-property
// form and the edit-home-details form. idPrefix keeps element ids unique
// when several forms are on one page.
export default function HomeDetailsFields({
  idPrefix = "",
  defaults,
}: {
  idPrefix?: string;
  defaults?: { bedrooms: number | null; bathrooms: number | null; sq_ft_min: number | null; extra_rooms: string[] };
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor={`${idPrefix}bedrooms`}>Bedrooms</label>
          <select id={`${idPrefix}bedrooms`} name="bedrooms" required defaultValue={defaults?.bedrooms ?? ""}>
            <option value="" disabled>
              Select
            </option>
            {BEDROOM_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "bedroom" : "bedrooms"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}bathrooms`}>Bathrooms</label>
          <select id={`${idPrefix}bathrooms`} name="bathrooms" required defaultValue={defaults?.bathrooms ?? ""}>
            <option value="" disabled>
              Select
            </option>
            {BATHROOM_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {formatBathrooms(n)} {n === 1 ? "bathroom" : "bathrooms"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}sq_ft_min`}>Square footage</label>
        <select id={`${idPrefix}sq_ft_min`} name="sq_ft_min" required defaultValue={defaults?.sq_ft_min ?? ""}>
          <option value="" disabled>
            Select
          </option>
          {SQ_FT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="field" style={{ border: "none", padding: 0, margin: "0 0 16px" }}>
        <legend
          style={{
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--verde)",
          }}
        >
          Extra rooms{" "}
          <span style={{ textTransform: "none", fontWeight: 400, color: "#9aa49d" }}>(choose any that apply)</span>
        </legend>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {EXTRA_ROOM_OPTIONS.map((o) => (
            <div key={o.value} className="form-check" style={{ margin: 0 }}>
              <input
                id={`${idPrefix}extra_room_${o.value}`}
                type="checkbox"
                name="extra_rooms"
                value={o.value}
                defaultChecked={defaults?.extra_rooms.includes(o.value)}
              />
              <label htmlFor={`${idPrefix}extra_room_${o.value}`} style={{ margin: 0 }}>
                {o.label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    </>
  );
}
