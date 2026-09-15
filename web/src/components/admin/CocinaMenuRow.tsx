"use client";

import { useActionState } from "react";
import {
  updateMenuItemAction,
  setMenuItemActiveAction,
  deleteMenuItemAction,
  moveMenuItemAction,
  type AdminCocinaActionState,
} from "@/lib/actions/admin-cocina";

export type AdminCocinaMenuItem = {
  id: string;
  dish_name: string;
  description: string;
  active: boolean;
};

const initialState: AdminCocinaActionState = {};

export default function CocinaMenuRow({
  item,
  isFirst,
  isLast,
}: {
  item: AdminCocinaMenuItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const action = updateMenuItemAction.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  const toggleAction = setMenuItemActiveAction.bind(null, item.id, !item.active);
  const deleteAction = deleteMenuItemAction.bind(null, item.id);
  const moveUpAction = moveMenuItemAction.bind(null, item.id, "up");
  const moveDownAction = moveMenuItemAction.bind(null, item.id, "down");

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <span className={`status-badge ${item.active ? "confirmed" : "cancelled"}`}>
          {item.active ? "On menu" : "Hidden"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <form action={moveUpAction}>
            <button type="submit" className="btn ghost" disabled={isFirst} style={{ padding: "4px 10px", fontSize: 12 }}>
              ↑
            </button>
          </form>
          <form action={moveDownAction}>
            <button type="submit" className="btn ghost" disabled={isLast} style={{ padding: "4px 10px", fontSize: 12 }}>
              ↓
            </button>
          </form>
          <form action={toggleAction}>
            <button type="submit" className="btn ghost" style={{ padding: "4px 12px", fontSize: 12 }}>
              {item.active ? "Hide" : "Show"}
            </button>
          </form>
          <form
            action={deleteAction}
            onSubmit={(e) => {
              if (!confirm(`Delete "${item.dish_name}" permanently?`)) e.preventDefault();
            }}
          >
            <button type="submit" className="btn ghost" style={{ padding: "4px 12px", fontSize: 12, color: "var(--chile)" }}>
              Delete
            </button>
          </form>
        </div>
      </div>

      <form action={formAction} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 14 }}>
        <div className="field" style={{ flex: "1 1 200px", margin: 0 }}>
          <label htmlFor={`dish_name_${item.id}`}>Dish name</label>
          <input id={`dish_name_${item.id}`} name="dish_name" type="text" defaultValue={item.dish_name} required />
        </div>
        <div className="field" style={{ flex: "2 1 280px", margin: 0 }}>
          <label htmlFor={`description_${item.id}`}>Description</label>
          <input id={`description_${item.id}`} name="description" type="text" defaultValue={item.description} required />
        </div>
        <button className="btn ghost" type="submit" disabled={pending} style={{ padding: "6px 16px", fontSize: 13 }}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state.error && (
          <span className="form-msg error" style={{ margin: 0, padding: "6px 12px" }}>
            {state.error}
          </span>
        )}
      </form>
    </div>
  );
}
