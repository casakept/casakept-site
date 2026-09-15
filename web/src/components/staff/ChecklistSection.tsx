"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { toggleChecklistItemAction, uploadChecklistPhotoAction } from "@/lib/actions/staff-checklist";

export type ChecklistCatalogItem = {
  id: string;
  name: string;
  deep_clean_only: boolean;
  requires_photo: boolean;
  sort_order: number;
};

export type ChecklistEntry = {
  checklist_item_id: string;
  completed: boolean;
  photo_path: string | null;
};

export default function ChecklistSection({
  bookingId,
  staffId,
  items,
  entries,
  isDeepClean,
}: {
  bookingId: string;
  staffId: string;
  items: ChecklistCatalogItem[];
  entries: ChecklistEntry[];
  isDeepClean: boolean;
}) {
  const visibleItems = items
    .filter((item) => isDeepClean || !item.deep_clean_only)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const entryByItem = new Map(entries.map((e) => [e.checklist_item_id, e]));

  if (visibleItems.length === 0) return null;

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--verde)" }}>
        Quality checklist
      </p>
      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        {visibleItems.map((item) => (
          <ChecklistItemRow
            key={item.id}
            bookingId={bookingId}
            staffId={staffId}
            item={item}
            entry={entryByItem.get(item.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistItemRow({
  bookingId,
  staffId,
  item,
  entry,
}: {
  bookingId: string;
  staffId: string;
  item: ChecklistCatalogItem;
  entry: ChecklistEntry | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const completed = entry?.completed ?? false;

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleChecklistItemAction(bookingId, staffId, item.id, !completed);
      if (result.error) setError(result.error);
    });
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("photo", file);
    startTransition(async () => {
      const result = await uploadChecklistPhotoAction(bookingId, staffId, item.id, formData);
      if (result.error) setError(result.error);
    });
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {item.requires_photo ? (
        <label className="btn ghost" style={{ padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>
          {pending ? "Uploading…" : entry?.photo_path ? "Retake photo" : "Add photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            disabled={pending}
            style={{ display: "none" }}
          />
        </label>
      ) : (
        <input type="checkbox" checked={completed} onChange={handleToggle} disabled={pending} style={{ width: 16, height: 16 }} />
      )}
      <span style={{ fontSize: 13, color: completed ? "var(--verde)" : "#3d443f" }}>
        {completed ? "✓ " : ""}
        {item.name}
      </span>
      {error && (
        <span className="form-msg error" style={{ margin: 0, padding: "4px 10px", fontSize: 11 }}>
          {error}
        </span>
      )}
    </div>
  );
}
