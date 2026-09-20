"use client";

import { WINDOW_LABELS } from "@/lib/serviceLabels";
import type { Database } from "@/lib/supabase/database.types";

type Window = Database["public"]["Enums"]["schedule_window"];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WINDOWS: Window[] = ["morning", "midday", "afternoon"];

export default function AvailabilityGrid({
  available,
  toggleAction,
}: {
  available: Set<string>;
  toggleAction: (dayOfWeek: number, timeWindow: Window) => Promise<void>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 12px" }}></th>
            {WINDOWS.map((w) => (
              <th key={w} style={{ padding: "8px 12px", fontSize: 13, color: "#6a746c" }}>
                {WINDOW_LABELS[w]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, dayOfWeek) => (
            <tr key={day}>
              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{day}</td>
              {WINDOWS.map((w) => {
                const key = `${dayOfWeek}:${w}`;
                const isAvailable = available.has(key);
                const action = toggleAction.bind(null, dayOfWeek, w);
                return (
                  <td key={w} style={{ padding: "8px 12px", textAlign: "center" }}>
                    <form action={action}>
                      <button
                        type="submit"
                        className={isAvailable ? "btn" : "btn ghost"}
                        style={{ padding: "6px 14px", fontSize: 13 }}
                      >
                        {isAvailable ? "Available" : "Off"}
                      </button>
                    </form>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
